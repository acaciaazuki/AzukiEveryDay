import type { z } from 'zod'
import { SPACE_FILE_PREFIX } from '../core/defaults'
import { sameContent } from '../core/syncMeta'

/**
 * Google Drive 同步轉接層（只用 drive.file 權限）。
 *
 * 檔案都放在使用者 Drive 裡 App 建立的資料夾「ACACIA Everyday」：
 * - acacia_data_v2.json：個人主資料（行程、記帳本、設定），只有自己看得到
 * - acacia_backup_v2.json：最新一份自動備份
 * - acacia_space_<spaceId>.json：共享空間，由建立者以 Drive 權限（writer）分享給成員
 *
 * 寫入一律帶 If-Match（樂觀鎖）：另一台裝置或其他成員剛好先寫入時 Drive 回 412，
 * 這時重新讀取雲端、重新合併再寫一次（指數退避＋隨機 jitter），不會覆蓋別人的修改。
 * 受邀成員第一次開啟共享空間時要透過 Google Picker 選一次檔案，檔案才會進入 drive.file 的授權範圍。
 */

export const APP_FOLDER_NAME = 'ACACIA Everyday'
export const PERSONAL_DRIVE_FILE = 'acacia_data_v2.json'
export const BACKUP_DRIVE_FILE = 'acacia_backup_v2.json'

const API = 'https://www.googleapis.com'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

/** Drive 回應錯誤（401／403／404 等）；檔案在垃圾桶也視為 404 */
export class DriveAuthError extends Error {
  readonly status: number
  /** Google 錯誤回應裡的原因代碼（例如 insufficientPermissions、ACCESS_TOKEN_SCOPE_INSUFFICIENT） */
  readonly reasons: readonly string[]
  constructor(message: string, status: number, reasons: readonly string[] = []) {
    super(message)
    this.name = 'DriveAuthError'
    this.status = status
    this.reasons = reasons
  }
}

/** If-Match 的版本已過期（HTTP 412）：雲端在讀取之後被別人改過 */
export class DrivePreconditionFailedError extends Error {
  constructor() {
    super('Drive 412 Precondition Failed')
    this.name = 'DrivePreconditionFailedError'
  }
}

const SCOPE_REASONS = new Set(['insufficientPermissions', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT'])

/** token 沒有 drive.file 權限（使用者登入時漏勾）：重送同一個 token 不會好，要重新授權 */
export const isInsufficientPermission = (e: unknown) => e instanceof DriveAuthError && e.status === 403 && e.reasons.some((r) => SCOPE_REASONS.has(r))

/** 共享空間被移除分享、刪除或丟進垃圾桶：只停掉這個空間，不影響其他同步 */
export const isRevokedError = (e: unknown) => e instanceof DriveAuthError && (e.status === 404 || (e.status === 403 && !isInsufficientPermission(e)))

async function errorReasons(res: Response): Promise<string[]> {
  try {
    const body = (await res.json()) as { error?: { errors?: { reason?: string }[]; details?: { reason?: string }[] } }
    return [...(body.error?.errors ?? []), ...(body.error?.details ?? [])].map((x) => x.reason).filter((r): r is string => typeof r === 'string')
  } catch {
    return []
  }
}

/** Drive 查詢字串裡的單引號與反斜線要跳脫 */
const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

export interface DriveFileRef {
  id: string
  etag: string
}

export interface PickedSpaceFile {
  fileId: string
  name: string
}

export interface SyncJsonResult<T> {
  data: T
  etag: string
  /** 這次有沒有寫入雲端（合併結果跟雲端相同時不寫） */
  wrote: boolean
  /** 遇到 412 重試的次數 */
  retries: number
}

export interface DriveSyncAdapterOptions {
  getToken: () => string | null
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  /** 退避的基本等待時間（毫秒），第 n 次重試等 base × 2^n ＋ jitter */
  backoffBaseMs?: number
}

export function createGoogleDriveSyncAdapter(opts: DriveSyncAdapterOptions) {
  const doFetch = opts.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const random = opts.random ?? Math.random
  const base = opts.backoffBaseMs ?? 400

  async function call(url: string, init: RequestInit = {}): Promise<Response> {
    const token = opts.getToken()
    if (!token) throw new DriveAuthError('尚未登入 Google', 401)
    const res = await doFetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) } })
    if (res.status === 412) throw new DrivePreconditionFailedError()
    if (!res.ok) throw new DriveAuthError(`Drive ${res.status}`, res.status, await errorReasons(res))
    return res
  }

  /** ETag 標頭優先；沒有時用檔案版本號組成（兩者都能代表「讀取當下的版本」） */
  const etagOf = (res: Response, body: { version?: string | number }) => res.headers.get('ETag') ?? `"v${body.version ?? '0'}"`

  async function listFiles(q: string): Promise<{ id: string; name: string }[]> {
    const res = await call(`${API}/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=10&spaces=drive`)
    const body = (await res.json()) as { files?: { id: string; name: string }[] }
    return body.files ?? []
  }

  const adapter = {
    /** 找到（或建立）App 的資料夾，回傳資料夾 id */
    async ensureFolder(folderName: string = APP_FOLDER_NAME): Promise<string> {
      const found = await listFiles(`name = ${quote(folderName)} and mimeType = '${FOLDER_MIME}' and trashed = false`)
      if (found[0]) return found[0].id
      const res = await call(`${API}/drive/v3/files?fields=id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName, mimeType: FOLDER_MIME }),
      })
      return ((await res.json()) as { id: string }).id
    },

    async findFileByName(fileName: string, parentFolderId?: string): Promise<string | null> {
      const parent = parentFolderId ? ` and ${quote(parentFolderId)} in parents` : ''
      const found = await listFiles(`name = ${quote(fileName)} and trashed = false${parent}`)
      return found[0]?.id ?? null
    },

    async createJsonFile(fileName: string, initialData: unknown, parentFolderId?: string): Promise<DriveFileRef> {
      const boundary = `acacia-${crypto.randomUUID()}`
      const meta = { name: fileName, mimeType: 'application/json', ...(parentFolderId ? { parents: [parentFolderId] } : {}) }
      const part = (body: string) => `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${body}\r\n`
      const res = await call(`${API}/upload/drive/v3/files?uploadType=multipart&fields=id,version`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: `${part(JSON.stringify(meta))}${part(JSON.stringify(initialData))}--${boundary}--`,
      })
      const body = (await res.json()) as { id: string; version?: string }
      return { id: body.id, etag: etagOf(res, body) }
    },

    /** 讀取檔案：先讀 metadata 取得 ETag（在垃圾桶就當作 404），再讀內容並以 Zod 驗證 */
    async readJsonFile<S extends z.ZodType>(fileId: string, schema: S): Promise<{ data: z.output<S>; etag: string }> {
      const metaRes = await call(`${API}/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,trashed,version`)
      const meta = (await metaRes.json()) as { trashed?: boolean; version?: string }
      if (meta.trashed) throw new DriveAuthError('檔案已在垃圾桶', 404)
      const etag = etagOf(metaRes, meta)
      const res = await call(`${API}/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`)
      return { data: schema.parse(await res.json()), etag }
    },

    /** 帶 If-Match 寫入；雲端版本已變（412）時丟出 DrivePreconditionFailedError。回傳新的 ETag */
    async writeJsonFileWithEtag(fileId: string, data: unknown, expectedEtag: string): Promise<string> {
      const res = await call(`${API}/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,version`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=UTF-8', 'If-Match': expectedEtag },
        body: JSON.stringify(data),
      })
      return etagOf(res, (await res.json()) as { version?: string })
    },

    /**
     * 讀取 → 合併 → 帶 If-Match 寫入；遇到 412 時退避後重新讀取、重新合併，最多重試 maxRetries 次。
     * 合併結果跟雲端內容相同時不寫入。
     */
    async syncJsonWithRetry<S extends z.ZodType, T extends z.output<S>>(params: {
      fileId: string
      localData: T
      schema: S
      mergeFn: (local: T, remote: z.output<S>) => T
      maxRetries?: number
    }): Promise<SyncJsonResult<T>> {
      const { fileId, localData, schema, mergeFn, maxRetries = 3 } = params
      for (let attempt = 0; ; attempt++) {
        const remote = await adapter.readJsonFile(fileId, schema)
        const merged = mergeFn(localData, remote.data)
        if (sameContent(merged, remote.data)) return { data: merged, etag: remote.etag, wrote: false, retries: attempt }
        try {
          const etag = await adapter.writeJsonFileWithEtag(fileId, merged, remote.etag)
          return { data: merged, etag, wrote: true, retries: attempt }
        } catch (e) {
          if (!(e instanceof DrivePreconditionFailedError) || attempt >= maxRetries) throw e
          await sleep(base * 2 ** attempt + Math.floor(random() * base))
        }
      }
    },

    /** 邀請成員：在空間檔加上 writer 權限（Google 會寄通知信給對方） */
    async inviteMemberToSpaceFile(spaceFileId: string, memberEmail: string): Promise<void> {
      await call(`${API}/drive/v3/files/${encodeURIComponent(spaceFileId)}/permissions?sendNotificationEmail=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: memberEmail.trim() }),
      })
    },

    /** 刪除檔案（「刪除所有資料」用）；已經不存在時視為成功 */
    async deleteFile(fileId: string): Promise<void> {
      try {
        await call(`${API}/drive/v3/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
      } catch (e) {
        if (!(e instanceof DriveAuthError && e.status === 404)) throw e
      }
    },

    /** 受邀成員用 Google Picker 選取別人分享的空間檔（點選一次即納入 drive.file 授權範圍） */
    pickSharedSpaceFile: (): Promise<PickedSpaceFile | null> => pickSharedSpaceFile(opts.getToken),
  }
  return adapter
}

export type GoogleDriveSyncAdapter = ReturnType<typeof createGoogleDriveSyncAdapter>

// ─── Google Picker ───

interface PickerDoc {
  id: string
  name: string
}
interface PickerBuilder {
  addView(v: unknown): PickerBuilder
  setOAuthToken(t: string): PickerBuilder
  setDeveloperKey(k: string): PickerBuilder
  setAppId(id: string): PickerBuilder
  setCallback(cb: (d: { action: string; docs?: PickerDoc[] }) => void): PickerBuilder
  build(): { setVisible(v: boolean): void }
}
interface PickerNamespace {
  PickerBuilder: new () => PickerBuilder
  DocsView: new (viewId?: string) => { setMimeTypes(m: string): unknown; setQuery(q: string): unknown; setOwnedByMe(v: boolean): unknown; setIncludeFolders(v: boolean): unknown }
  ViewId: { DOCS: string }
  Action: { PICKED: string; CANCEL: string }
}
interface Gapi {
  load(lib: string, cb: { callback: () => void; onerror: () => void }): void
}

let pickerPromise: Promise<PickerNamespace> | null = null

/** 動態載入 https://apis.google.com/js/api.js 與 picker 模組（只有按「加入共享空間」時才下載） */
function loadPicker(): Promise<PickerNamespace> {
  pickerPromise ??= new Promise<PickerNamespace>((resolve, reject) => {
    const w = window as unknown as { gapi?: Gapi; google?: { picker?: PickerNamespace } }
    const ready = () =>
      w.gapi!.load('picker', {
        callback: () => (w.google?.picker ? resolve(w.google.picker) : reject(new Error('Picker 載入失敗'))),
        onerror: () => reject(new Error('Picker 載入失敗')),
      })
    if (w.gapi) return ready()
    const s = document.createElement('script')
    s.src = 'https://apis.google.com/js/api.js'
    s.async = true
    s.onload = ready
    s.onerror = () => reject(new Error('Picker 載入失敗'))
    document.head.appendChild(s)
  }).catch((e: unknown) => {
    pickerPromise = null
    throw e
  })
  return pickerPromise
}

export async function pickSharedSpaceFile(getToken: () => string | null): Promise<PickedSpaceFile | null> {
  const token = getToken()
  if (!token) throw new DriveAuthError('尚未登入 Google', 401)
  const picker = await loadPicker()
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
    view.setMimeTypes('application/json')
    view.setQuery(SPACE_FILE_PREFIX)
    view.setOwnedByMe(false)
    view.setIncludeFolders(false)
    let builder = new picker.PickerBuilder().addView(view).setOAuthToken(token)
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined
    const appId = import.meta.env.VITE_GOOGLE_APP_ID as string | undefined
    if (apiKey) builder = builder.setDeveloperKey(apiKey)
    if (appId) builder = builder.setAppId(appId)
    builder
      .setCallback((d) => {
        if (d.action === picker.Action.CANCEL) return resolve(null)
        if (d.action !== picker.Action.PICKED) return
        const doc = d.docs?.find((x) => x.name.startsWith(SPACE_FILE_PREFIX) && x.name.endsWith('.json'))
        resolve(doc ? { fileId: doc.id, name: doc.name } : null)
      })
      .build()
      .setVisible(true)
  })
}
