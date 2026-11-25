/**
 * 鍵值儲存介面：網頁版用 IndexedDB（idb-keyval），iOS（Capacitor）用 App 內的 JSON 檔案。
 * 主資料與快照都透過這個介面讀寫，store 與畫面不需要知道底層是哪一種。
 */
export interface KeyValueStore {
  get<T = unknown>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  del(key: string): Promise<void>
  /** 清空這個命名空間的所有資料 */
  clear(): Promise<void>
  keys(): Promise<string[]>
}

/**
 * 命名空間與網頁版的 IndexedDB 位置：
 * - state：個人主資料（acacia-personal-v2）與共享空間（acacia-spaces），在預設的 keyval-store
 * - backups：自動備份快照（acacia-backups 資料庫，最多 7 份）
 */
export const KV_NAMESPACES = ['state', 'backups'] as const
export type KvNamespace = (typeof KV_NAMESPACES)[number]

/** 網頁版 IndexedDB 位置；null 表示 idb-keyval 預設的 keyval-store／keyval */
export const IDB_LOCATION: Record<KvNamespace, readonly [db: string, store: string] | null> = {
  state: null,
  backups: ['acacia-backups', 'snapshots'],
}
