import type { CollectionSyncMeta } from './schema'

/**
 * 逐筆修改紀錄的小工具：store 每次新增、修改、刪除時呼叫，合併（core/merge.ts）才知道哪一邊比較新。
 */
export const emptyMeta = (): CollectionSyncMeta => ({ updatedAt: {}, tombstones: {} })

/** 新增或修改：記下修改時間，並取消先前的刪除標記 */
export function touchMeta(meta: CollectionSyncMeta | undefined, ids: readonly string[], nowIso: string): CollectionSyncMeta {
  const updatedAt = { ...(meta?.updatedAt ?? {}) }
  const tombstones = { ...(meta?.tombstones ?? {}) }
  for (const id of ids) {
    updatedAt[id] = nowIso
    delete tombstones[id]
  }
  return { updatedAt, tombstones }
}

/** 永久刪除：移除修改時間，留下刪除標記同步給其他裝置 */
export function tombstoneMeta(meta: CollectionSyncMeta | undefined, ids: readonly string[], nowIso: string): CollectionSyncMeta {
  const updatedAt = { ...(meta?.updatedAt ?? {}) }
  const tombstones = { ...(meta?.tombstones ?? {}) }
  for (const id of ids) {
    delete updatedAt[id]
    tombstones[id] = nowIso
  }
  return { updatedAt, tombstones }
}

/** 比較兩份資料內容是否相同（忽略最上層的 updatedAt）；決定要不要上傳 */
export function sameContent(a: unknown, b: unknown): boolean {
  return stableStringify(stripUpdatedAt(a)) === stableStringify(stripUpdatedAt(b))
}

function stripUpdatedAt(v: unknown): unknown {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v
  const rest: Record<string, unknown> = { ...(v as Record<string, unknown>) }
  delete rest.updatedAt
  return rest
}

/** 物件 key 排序後再轉字串，key 順序不同也視為相同；undefined 的欄位忽略 */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'undefined'
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  const entries = Object.entries(v as Record<string, unknown>)
    .filter(([, x]) => x !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${stableStringify(x)}`).join(',')}}`
}
