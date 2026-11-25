import { kv } from './kv'
import { emptyBackupIndex, type BackupIndex, type SnapshotData } from '../core/backup'

/**
 * 自動備份快照的儲存位置，跟主資料（acacia-personal-v2）分開，主資料毀損時快照不受影響，清除時也能整個清掉。
 * 網頁版：IndexedDB 裡獨立的資料庫（acacia-backups）；iOS App：Library/acacia/backups/ 的 JSON 檔（見 adapters/kv）。
 */
const db = kv('backups')

const INDEX_KEY = 'index'
const dataKey = (id: string) => `snapshot:${id}`

export async function loadIndex(): Promise<BackupIndex> {
  const raw = await db.get<BackupIndex>(INDEX_KEY)
  return raw ? { ...emptyBackupIndex(), ...raw } : emptyBackupIndex()
}

export const saveIndex = (index: BackupIndex) => db.set(INDEX_KEY, index)
export const saveSnapshotData = (id: string, data: SnapshotData) => db.set(dataKey(id), data)
export const loadSnapshotData = (id: string) => db.get<SnapshotData>(dataKey(id))
export const deleteSnapshotData = (id: string) => db.del(dataKey(id))

/** 刪除所有快照與設定 */
export const clearBackups = () => db.clear()
