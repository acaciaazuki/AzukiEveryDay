import { z } from 'zod'
import { create } from 'zustand'
import {
  BACKUP_DRIVE_FILE,
  createGoogleDriveSyncAdapter,
  isInsufficientPermission,
  isRevokedError,
  PERSONAL_DRIVE_FILE,
  type GoogleDriveSyncAdapter,
} from '../adapters/googleDriveSync'
import { clearStoredToken, fetchProfile, MissingDriveScopeError, restoreToken, signIn as googleSignIn, signOut as googleSignOut, type GoogleProfile } from '../adapters/googleAuth'
import { isNativeApp } from '../adapters/kv'
import { emptySpace, newId, spaceFileName } from '../core/defaults'
import { mergeAppData, mergeSpaceData } from '../core/merge'
import { PersonalAppDataSchema, type SharedSpaceData, SharedSpaceDataSchema } from '../core/schema'
import { usePersonalStore, whenHydrated } from './usePersonalStore'
import { useSpacesStore } from './useSpacesStore'

/**
 * Google Drive 同步狀態與動作（登入、同步、建立／加入／邀請共享空間）。
 * 自動觸發（防抖上傳、回到前景、恢復連線）由 hooks/useCloudSyncCoordinator 負責。
 *
 * account_mismatch：登入的 Google 帳號跟這台裝置上次同步的帳號不同，而本機還有舊帳號的行程或記帳；
 * 暫停自動同步，等使用者確認 confirmSwitchAccountAndResetLocal() 後清空本機再改用新帳號，避免兩個帳號的資料混在一起。
 */
export type SyncStatus = 'signedOut' | 'connecting' | 'syncing' | 'synced' | 'error' | 'needsPermission' | 'account_mismatch'

interface SyncState {
  status: SyncStatus
  profile: GoogleProfile | null
  token: string | null
  lastSyncedAt: number | null
  /** 被移除分享、刪除或丟進垃圾桶的共享空間（403／404），只停掉這些空間 */
  revokedSpaceIds: string[]
  folderId: string | null
  personalFileId: string | null

  signIn: () => Promise<void>
  /** 沿用這個分頁已有的 token（重新整理後自動恢復登入），沒有 token 就什麼都不做 */
  resume: () => Promise<void>
  reauthorize: () => Promise<void>
  signOut: () => Promise<void>
  /** 立即同步個人資料與所有共享空間；同步中再呼叫時會在完成後補跑一輪 */
  syncNow: () => Promise<void>
  confirmSwitchAccountAndResetLocal: () => Promise<void>
  createSpace: (name: string) => Promise<string>
  joinSpaceViaPicker: () => Promise<string | null>
  inviteMember: (spaceId: string, email: string) => Promise<void>
  leaveSpace: (spaceId: string) => void
  /** 自動備份上傳到 Drive 的備份槽 */
  uploadBackup: (payload: unknown) => Promise<void>
  /** 刪除所有資料：刪掉 Drive 上的個人檔、備份檔與自己建立的空間檔 */
  deleteCloudData: () => Promise<void>
}

/** 備份槽的內容不需要嚴格驗證，只要是物件即可（每次整份覆寫） */
const BackupSlotSchema = z.record(z.string(), z.unknown())

let drive: GoogleDriveSyncAdapter | null = null
/** Drive 轉接層（測試可以換掉） */
export const driveAdapter = (): GoogleDriveSyncAdapter => (drive ??= createGoogleDriveSyncAdapter({ getToken: () => useSyncStore.getState().token }))
export const setDriveAdapterForTests = (a: GoogleDriveSyncAdapter | null) => {
  drive = a
}

/** 登入後但帳號不一致時，等待使用者確認的新帳號 */
let pendingUser: { uid: string; displayName: string } | null = null
let inflight: Promise<void> | null = null
let queued = false

const needsPermission = (e: unknown) => e instanceof MissingDriveScopeError || isInsufficientPermission(e)

const hasLocalContent = () => {
  const d = usePersonalStore.getState().data
  return Object.keys(d.events).length + Object.keys(d.ledgerEntries).length + Object.keys(d.customCategories).length > 0
}

export const useSyncStore = create<SyncState>()((set, get) => {
  const fail = (e: unknown) => {
    console.error('Drive 同步失敗', e)
    if (needsPermission(e)) {
      clearStoredToken()
      set({ status: 'needsPermission', token: null })
    } else set({ status: get().token ? 'error' : 'signedOut' })
  }

  const ensureFolder = async () => {
    const folderId = get().folderId ?? (await driveAdapter().ensureFolder())
    set({ folderId })
    return folderId
  }

  /** 個人主資料：讀取 → 合併 → If-Match 寫入（412 時重試）；同步期間本機又有修改就再合併一次並維持待上傳 */
  const syncPersonal = async () => {
    const folderId = await ensureFolder()
    let fileId = get().personalFileId ?? (await driveAdapter().findFileByName(PERSONAL_DRIVE_FILE, folderId))
    if (!fileId) {
      const created = await driveAdapter().createJsonFile(PERSONAL_DRIVE_FILE, usePersonalStore.getState().data, folderId)
      fileId = created.id
      set({ personalFileId: fileId })
      usePersonalStore.getState().markSynced(created.etag)
      return
    }
    set({ personalFileId: fileId })
    let used = usePersonalStore.getState().data
    const res = await driveAdapter().syncJsonWithRetry({
      fileId,
      localData: used,
      schema: PersonalAppDataSchema,
      mergeFn: (_local, remote) => {
        used = usePersonalStore.getState().data
        return mergeAppData(used, remote)
      },
    })
    const current = usePersonalStore.getState().data
    if (current === used) usePersonalStore.getState().applyMergedFromCloud(res.data, res.etag)
    else usePersonalStore.getState().applyMergedFromCloud(mergeAppData(current, res.data), res.etag, { stillDirty: true })
  }

  /** 單一共享空間；403／404 只把這個空間標成已失效，不中斷其他同步 */
  const syncSpace = async (spaceId: string, driveFileId: string) => {
    const spaces = useSpacesStore.getState()
    try {
      if (!spaces.spaces[spaceId]) {
        const remote = await driveAdapter().readJsonFile(driveFileId, SharedSpaceDataSchema)
        spaces.applyMergedSpaceFromCloud(remote.data, remote.etag)
        usePersonalStore.getState().syncBusyProjections()
        if (!useSpacesStore.getState().dirtySpaceIds.includes(spaceId)) return
      }
      let used = useSpacesStore.getState().spaces[spaceId]
      const res = await driveAdapter().syncJsonWithRetry({
        fileId: driveFileId,
        localData: used,
        schema: SharedSpaceDataSchema,
        mergeFn: (_local, remote) => {
          used = useSpacesStore.getState().spaces[spaceId] ?? remote
          return mergeSpaceData(used, remote)
        },
      })
      const current = useSpacesStore.getState().spaces[spaceId]
      if (!current) return
      if (current === used) useSpacesStore.getState().applyMergedSpaceFromCloud(res.data, res.etag)
      else useSpacesStore.getState().applyMergedSpaceFromCloud(mergeSpaceData(current, res.data), res.etag, { stillDirty: true })
      set((s) => ({ revokedSpaceIds: s.revokedSpaceIds.filter((x) => x !== spaceId) }))
    } catch (e) {
      if (isRevokedError(e)) {
        set((s) => ({ revokedSpaceIds: s.revokedSpaceIds.includes(spaceId) ? s.revokedSpaceIds : [...s.revokedSpaceIds, spaceId] }))
        return
      }
      throw e
    }
  }

  const runSyncOnce = async () => {
    await whenHydrated()
    await syncPersonal()
    // 其他裝置已離開的空間，本機副本一併移除
    const joined = usePersonalStore.getState().data.joinedSpaces
    for (const id of Object.keys(useSpacesStore.getState().spaces)) if (!joined[id]) useSpacesStore.getState().removeSpaceLocal(id)
    usePersonalStore.getState().syncBusyProjections()
    for (const ref of Object.values(joined)) await syncSpace(ref.spaceId, ref.driveFileId)
  }

  /** 登入後確認帳號，再開始同步 */
  const afterSignIn = async (token: string) => {
    const profile = await fetchProfile(token)
    if (!profile?.sub) throw new Error('無法取得 Google 帳號資訊')
    set({ token, profile })
    await whenHydrated()
    const user = { uid: profile.sub, displayName: (profile.name ?? '').slice(0, 80) || 'Google' }
    const bound = usePersonalStore.getState().currentUser
    if (bound && bound.uid !== user.uid && hasLocalContent()) {
      pendingUser = user
      set({ status: 'account_mismatch' })
      return
    }
    if (bound && bound.uid !== user.uid) {
      // 舊帳號沒有留下任何資料：直接清掉共享空間的本機副本
      useSpacesStore.getState().clearAllSpacesLocal()
      usePersonalStore.getState().resetLocal()
    }
    usePersonalStore.getState().setCurrentUser(user)
    await get().syncNow()
  }

  const connect = async (mode: 'silent' | 'prompt' | 'consent') => {
    // iOS App 還沒有原生 Google 登入：不發出任何網路請求，資料只存在本機（隨 iCloud 備份）
    if (isNativeApp()) return
    const stored = mode === 'consent' ? null : restoreToken()
    if (!stored && mode === 'silent') return
    set({ status: 'connecting' })
    try {
      const { token } = stored ?? (await googleSignIn({ consent: mode === 'consent' }))
      await afterSignIn(token)
    } catch (e) {
      fail(e)
    }
  }

  return {
    status: 'signedOut',
    profile: null,
    token: null,
    lastSyncedAt: null,
    revokedSpaceIds: [],
    folderId: null,
    personalFileId: null,

    signIn: () => connect('prompt'),
    resume: () => connect('silent'),
    reauthorize: () => connect('consent'),

    signOut: async () => {
      const token = get().token
      pendingUser = null
      set({ status: 'signedOut', profile: null, token: null, lastSyncedAt: null, folderId: null, personalFileId: null, revokedSpaceIds: [] })
      await googleSignOut(token)
    },

    syncNow: async () => {
      if (!get().token || get().status === 'account_mismatch') return
      if (inflight) {
        queued = true
        return inflight
      }
      inflight = (async () => {
        set({ status: 'syncing' })
        try {
          do {
            queued = false
            await runSyncOnce()
          } while (queued)
          set({ status: 'synced', lastSyncedAt: Date.now() })
        } catch (e) {
          fail(e)
        } finally {
          inflight = null
        }
      })()
      return inflight
    },

    confirmSwitchAccountAndResetLocal: async () => {
      if (!pendingUser) return
      const user = pendingUser
      pendingUser = null
      useSpacesStore.getState().clearAllSpacesLocal()
      usePersonalStore.getState().resetLocal()
      usePersonalStore.getState().setCurrentUser(user)
      set({ status: 'syncing', personalFileId: null, revokedSpaceIds: [] })
      await get().syncNow()
    },

    createSpace: async (name) => {
      const user = usePersonalStore.getState().currentUser
      if (!get().token || !user) throw new Error('尚未登入 Google')
      const folderId = await ensureFolder()
      const spaceId = newId()
      const space: SharedSpaceData = emptySpace({ spaceId, name: name.trim().slice(0, 100) || 'ACACIA', ownerUid: user.uid, nowIso: new Date().toISOString() })
      const created = await driveAdapter().createJsonFile(spaceFileName(spaceId), space, folderId)
      useSpacesStore.getState().applyMergedSpaceFromCloud(space, created.etag)
      usePersonalStore.getState().addJoinedSpace({ spaceId, driveFileId: created.id, color: 'forest', visible: true, projectBusySlots: false })
      return spaceId
    },

    joinSpaceViaPicker: async () => {
      if (!get().token) throw new Error('尚未登入 Google')
      const picked = await driveAdapter().pickSharedSpaceFile()
      if (!picked) return null
      const remote = await driveAdapter().readJsonFile(picked.fileId, SharedSpaceDataSchema)
      useSpacesStore.getState().applyMergedSpaceFromCloud(remote.data, remote.etag)
      const prev = usePersonalStore.getState().data.joinedSpaces[remote.data.spaceId]
      usePersonalStore.getState().addJoinedSpace({ spaceId: remote.data.spaceId, driveFileId: picked.fileId, color: prev?.color ?? 'sky', visible: true, projectBusySlots: prev?.projectBusySlots ?? false, localAlias: prev?.localAlias })
      set((s) => ({ revokedSpaceIds: s.revokedSpaceIds.filter((x) => x !== remote.data.spaceId) }))
      return remote.data.spaceId
    },

    inviteMember: async (spaceId, email) => {
      const ref = usePersonalStore.getState().data.joinedSpaces[spaceId]
      if (!ref) throw new Error('找不到共享空間')
      await driveAdapter().inviteMemberToSpaceFile(ref.driveFileId, email)
    },

    leaveSpace: (spaceId) => {
      usePersonalStore.getState().removeJoinedSpace(spaceId)
      // 先把撤除忙碌時段的修改傳上去，再移除本機副本
      const ref = usePersonalStore.getState().data.joinedSpaces[spaceId]
      void (async () => {
        try {
          if (get().token && ref && useSpacesStore.getState().dirtySpaceIds.includes(spaceId)) await syncSpace(spaceId, ref.driveFileId)
        } catch (e) {
          console.error('離開共享空間時同步失敗', e)
        }
        useSpacesStore.getState().removeSpaceLocal(spaceId)
        set((s) => ({ revokedSpaceIds: s.revokedSpaceIds.filter((x) => x !== spaceId) }))
      })()
    },

    uploadBackup: async (payload) => {
      if (!get().token) return
      const folderId = await ensureFolder()
      const id = await driveAdapter().findFileByName(BACKUP_DRIVE_FILE, folderId)
      if (!id) {
        await driveAdapter().createJsonFile(BACKUP_DRIVE_FILE, payload, folderId)
        return
      }
      // 備份槽只放最新一份，直接覆寫（以目前版本的 ETag 寫入）
      const data = payload as Record<string, unknown>
      await driveAdapter().syncJsonWithRetry({ fileId: id, localData: data, schema: BackupSlotSchema, mergeFn: () => data })
    },

    deleteCloudData: async () => {
      if (!get().token) return
      const folderId = await ensureFolder()
      const me = usePersonalStore.getState().currentUser?.uid
      for (const name of [PERSONAL_DRIVE_FILE, BACKUP_DRIVE_FILE]) {
        const id = await driveAdapter().findFileByName(name, folderId)
        if (id) await driveAdapter().deleteFile(id)
      }
      for (const ref of Object.values(usePersonalStore.getState().data.joinedSpaces)) {
        const space = useSpacesStore.getState().spaces[ref.spaceId]
        if (space && me && space.ownerUid === me) await driveAdapter().deleteFile(ref.driveFileId)
      }
      set({ personalFileId: null })
    },
  }
})
