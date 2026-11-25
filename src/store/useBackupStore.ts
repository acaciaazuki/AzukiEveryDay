import { create } from 'zustand'
import { deleteSnapshotData, loadIndex, loadSnapshotData, saveIndex, saveSnapshotData } from '../adapters/backupStorage'
import { addSnapshot, countsOf, emptyBackupIndex, fingerprintOf, isBlank, shouldAutoBackup, type BackupIndex, type BackupReason, type SnapshotData, type SnapshotMeta } from '../core/backup'
import { newId } from '../core/defaults'
import { PersonalAppDataSchema } from '../core/schema'
import { stableStringify } from '../core/syncMeta'
import { usePersonalStore, whenHydrated } from './usePersonalStore'
import { useSpacesStore } from './useSpacesStore'
import { useSyncStore } from './useSyncStore'

/**
 * 自動備份：本機快照存在 IndexedDB（acacia-backups，最多 7 份；iOS App 存在 Library/acacia/backups/），
 * 已登入 Google 時另外把最新一份上傳到 Drive 的 acacia_backup_v2.json。
 */
export type CloudBackupStatus = 'idle' | 'uploading' | 'ok' | 'error'

interface BackupState extends BackupIndex {
  ready: boolean
  cloudStatus: CloudBackupStatus
  cloudAt: number | null
  load: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<void>
  backupNow: (reason: BackupReason) => Promise<SnapshotMeta | null>
  runAuto: (now?: number) => Promise<SnapshotMeta | null>
  /** 還原快照的個人資料：先替目前的資料留一份「還原前」快照 */
  restore: (id: string) => Promise<void>
  reset: () => void
}

/** 讀寫快照的動作排隊依序執行，避免自動備份與手動操作同時改清單 */
let queue: Promise<unknown> = Promise.resolve()
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn, fn)
  queue = next.catch(() => {})
  return next
}

export const currentSnapshot = (): SnapshotData => ({ kind: 'acacia-snapshot-v2', personal: usePersonalStore.getState().data, spaces: useSpacesStore.getState().spaces })

/** 指紋不含 updatedAt：只有內容真的變了才算不同 */
const fingerprint = (d: SnapshotData) => fingerprintOf(stableStringify({ ...d, personal: { ...d.personal, updatedAt: undefined } }))

const indexOf = (s: BackupState): BackupIndex => ({ enabled: s.enabled, lastAt: s.lastAt, snapshots: s.snapshots })

export const useBackupStore = create<BackupState>()((set, get) => {
  const ensureLoaded = async () => {
    if (!get().ready) set({ ...(await loadIndex()), ready: true })
  }

  const pushCloud = async (meta: SnapshotMeta, data: SnapshotData) => {
    if (!useSyncStore.getState().token) return
    set({ cloudStatus: 'uploading' })
    try {
      await useSyncStore.getState().uploadBackup({ kind: 'acacia-backup-v2', createdAt: meta.createdAt, reason: meta.reason, data })
      set({ cloudStatus: 'ok', cloudAt: Date.now() })
    } catch (e) {
      console.error('Drive 備份上傳失敗', e)
      set({ cloudStatus: 'error' })
    }
  }

  const snapshot = async (reason: BackupReason, now = Date.now()): Promise<SnapshotMeta | null> => {
    await ensureLoaded()
    const data = currentSnapshot()
    const fp = fingerprint(data)
    if (get().snapshots[0]?.fingerprint === fp) return null
    const meta: SnapshotMeta = { id: newId(), createdAt: now, reason, fingerprint: fp, counts: countsOf(data) }
    await saveSnapshotData(meta.id, data)
    const r = addSnapshot(get().snapshots, meta)
    const index = { ...indexOf(get()), snapshots: r.snapshots, lastAt: now }
    await saveIndex(index)
    set(index)
    await Promise.all(r.removed.map(deleteSnapshotData))
    if (reason === 'auto' || reason === 'manual') void pushCloud(meta, data)
    return meta
  }

  return {
    ...emptyBackupIndex(),
    ready: false,
    cloudStatus: 'idle',
    cloudAt: null,

    load: () => serial(ensureLoaded),

    setEnabled: (enabled) =>
      serial(async () => {
        await ensureLoaded()
        set({ enabled })
        await saveIndex(indexOf(get()))
      }),

    backupNow: (reason) => serial(() => snapshot(reason)),

    runAuto: (now = Date.now()) =>
      serial(async () => {
        await ensureLoaded()
        const data = currentSnapshot()
        return shouldAutoBackup(indexOf(get()), fingerprint(data), isBlank(data), now) ? snapshot('auto', now) : null
      }),

    restore: (id) =>
      serial(async () => {
        await ensureLoaded()
        const raw = await loadSnapshotData(id)
        if (!raw) throw new Error('snapshot missing')
        // 先驗證快照，失敗就不動目前資料
        const personal = PersonalAppDataSchema.parse(raw.personal)
        await snapshot('beforeRestore')
        usePersonalStore.getState().replaceWithSnapshot(personal)
      }),

    reset: () => set({ ...emptyBackupIndex(), ready: true, cloudStatus: 'idle', cloudAt: null }),
  }
})

const whenIdle = (fn: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 10_000 })
  else setTimeout(fn, 1500)
}

let started = false
/** 開始自動備份：開啟時檢查一次，之後資料變動（5 秒內沒再變動）時再檢查；是否真的備份由 shouldAutoBackup 決定 */
export function startAutoBackup() {
  if (started) return
  started = true
  const check = () => whenIdle(() => void useBackupStore.getState().runAuto().catch((e) => console.error('自動備份失敗', e)))
  void whenHydrated().then(check)
  let timer: ReturnType<typeof setTimeout> | undefined
  usePersonalStore.subscribe((s, prev) => {
    if (s.data === prev.data) return
    clearTimeout(timer)
    timer = setTimeout(check, 5000)
  })
}
