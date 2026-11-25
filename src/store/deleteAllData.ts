import { clearBackups } from '../adapters/backupStorage'
import { clearStateStorage } from '../adapters/storage'
import { useBackupStore } from './useBackupStore'
import { useConsentStore } from './useConsentStore'
import { usePersonalStore } from './usePersonalStore'
import { useSpacesStore } from './useSpacesStore'
import { useSyncStore } from './useSyncStore'

/**
 * 刪除所有資料：
 * 1. 已登入時刪除 Drive 上的個人檔、備份檔與自己建立的共享空間檔（別人建立的空間只離開，不刪檔）
 * 2. 清空本機主資料、共享空間副本、自動備份與同意紀錄
 * 3. 清除 acacia 開頭的 localStorage／sessionStorage（語言等小偏好、Google token）
 * 雲端刪除失敗時丟出錯誤，本機資料不動，讓使用者可以再試一次。
 */
export async function deleteAllData(opts: { includeCloud: boolean }) {
  if (opts.includeCloud) await useSyncStore.getState().deleteCloudData()
  await useSyncStore.getState().signOut()
  usePersonalStore.getState().resetLocal()
  useSpacesStore.getState().clearAllSpacesLocal()
  await Promise.all([clearStateStorage(), clearBackups()])
  useBackupStore.getState().reset()
  for (const store of [localStorage, sessionStorage]) {
    try {
      for (const k of Object.keys(store)) if (k.startsWith('acacia')) store.removeItem(k)
    } catch {
      /* 無痕模式等情況可忽略 */
    }
  }
  await useConsentStore.getState().reset()
}
