import type { PersonalAppData, SharedSpaceData } from './schema'

/** 自動備份的間隔：距離上次備份超過 12 小時才會再備份 */
export const BACKUP_INTERVAL_MS = 12 * 60 * 60 * 1000
/** 本機最多保留幾份快照，超過時刪掉最舊的 */
export const MAX_SNAPSHOTS = 7

/** auto：自動備份；manual：按「立即備份」；beforeRestore：還原前替當時的資料留一份；beforeImport：匯入 JSON 前留一份 */
export type BackupReason = 'auto' | 'manual' | 'beforeRestore' | 'beforeImport'

/** 快照的完整內容：個人主資料＋當時本機的共享空間（還原時只還原個人資料，共享空間以雲端為準） */
export interface SnapshotData {
  kind: 'acacia-snapshot-v2'
  personal: PersonalAppData
  spaces: Record<string, SharedSpaceData>
}

export interface SnapshotCounts {
  events: number
  ledgerEntries: number
  spaces: number
}

/** 快照清單只存摘要，完整資料另外存 */
export interface SnapshotMeta {
  id: string
  createdAt: number
  reason: BackupReason
  /** 快照內容的指紋，用來判斷資料有沒有變過 */
  fingerprint: string
  counts: SnapshotCounts
}

export interface BackupIndex {
  /** 是否啟用自動備份（每台裝置各自設定，預設開啟） */
  enabled: boolean
  lastAt: number | null
  /** 新的在前 */
  snapshots: SnapshotMeta[]
}

export const emptyBackupIndex = (): BackupIndex => ({ enabled: true, lastAt: null, snapshots: [] })

export const countsOf = (d: SnapshotData): SnapshotCounts => ({
  events: Object.values(d.personal.events).filter((e) => e.trashedAt === null).length,
  ledgerEntries: Object.keys(d.personal.ledgerEntries).length,
  spaces: Object.keys(d.personal.joinedSpaces).length,
})

/** 資料是否從來沒有內容（新裝置、剛清除）：不建立空白快照 */
export const isBlank = (d: SnapshotData) => Object.keys(d.personal.events).length + Object.keys(d.personal.ledgerEntries).length + Object.keys(d.personal.customCategories).length === 0

/** 自動備份是否該執行：有啟用、有資料、距上次超過間隔，而且資料跟最新一份快照不同 */
export function shouldAutoBackup(index: BackupIndex, fingerprint: string, blank: boolean, now: number, interval = BACKUP_INTERVAL_MS): boolean {
  if (!index.enabled || blank) return false
  if (index.lastAt !== null && now - index.lastAt < interval) return false
  return index.snapshots[0]?.fingerprint !== fingerprint
}

/** 加入新快照並滾動覆蓋，回傳新的清單與要刪掉的舊快照 id */
export function addSnapshot<T extends { id: string; createdAt: number }>(snapshots: T[], meta: T, max = MAX_SNAPSHOTS): { snapshots: T[]; removed: string[] } {
  const all = [meta, ...snapshots.filter((s) => s.id !== meta.id)].sort((a, b) => b.createdAt - a.createdAt)
  return { snapshots: all.slice(0, max), removed: all.slice(max).map((s) => s.id) }
}

/** 簡單的字串指紋（FNV-1a 32 位元，兩組不同種子） */
export function fingerprintOf(text: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x9e3779b1
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x85ebca6b)
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}_${text.length}`
}
