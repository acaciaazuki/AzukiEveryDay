import type { KeyValueStore, KvNamespace } from './types'

/** 用到的 Capacitor Preferences 動作（測試時換成記憶體版） */
export interface PrefsApi {
  get(o: { key: string }): Promise<{ value: string | null }>
  set(o: { key: string; value: string }): Promise<void>
  remove(o: { key: string }): Promise<void>
}

export const migratedFlag = (ns: KvNamespace) => `acacia-kv-migrated:${ns}`

/**
 * iOS 第一次啟動時，把 WebView IndexedDB 裡的舊資料搬到 App 的 JSON 檔（例如用過早期 TestFlight 版本的人）。
 * - 每個命名空間只做一次（完成標記存在 Preferences）
 * - 檔案裡已經有的 key 不覆蓋
 * - 搬完刪掉 IndexedDB 的舊資料，避免之後「刪除所有資料」清空檔案後又被搬回來
 * - skip：不搬的 key（同意紀錄另外由 consentStorage 處理）
 * 失敗時不設完成標記，下次開啟再試；這次仍照常使用檔案儲存。回傳搬了幾筆。
 */
export async function migrateFromIndexedDb(ns: KvNamespace, target: KeyValueStore, legacy: KeyValueStore, prefs: PrefsApi, skip: readonly string[] = []): Promise<number> {
  const flag = migratedFlag(ns)
  if ((await prefs.get({ key: flag })).value) return 0
  let moved = 0
  try {
    const existing = new Set(await target.keys())
    for (const key of await legacy.keys()) {
      if (skip.includes(key)) continue
      if (!existing.has(key)) {
        const value = await legacy.get(key)
        if (value !== undefined) {
          await target.set(key, value)
          moved++
        }
      }
      await legacy.del(key)
    }
    await prefs.set({ key: flag, value: String(Date.now()) })
  } catch (e) {
    console.error('搬移舊資料失敗，下次開啟會再試', ns, e)
  }
  return moved
}
