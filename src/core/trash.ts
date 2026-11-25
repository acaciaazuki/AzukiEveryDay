import { type CalendarEvent, type CollectionSyncMeta, TOMBSTONE_TTL_MS, TRASH_RETENTION_MS } from './schema'

/**
 * 「最近刪除」：行程軟刪除（trashedAt）後保留 30 天，期滿自動轉成刪除標記（tombstone）同步到其他裝置；
 * 刪除標記本身保留 180 天後清掉。沒有任何變動時回傳原本的參照，store 可以直接比較是否需要更新。
 */
const DAY_MS = 24 * 60 * 60 * 1000

/** 剩幾天會被永久刪除（最少 0） */
export const daysLeft = (trashedAt: string, nowMs: number = Date.now()): number => Math.max(0, Math.ceil((Date.parse(trashedAt) + TRASH_RETENTION_MS - nowMs) / DAY_MS))

export interface PurgeTrashResult<T extends CalendarEvent> {
  events: Record<string, T>
  meta: CollectionSyncMeta
  purgedIds: string[]
}

export function purgeExpiredTrash<T extends CalendarEvent>(events: Record<string, T>, meta: CollectionSyncMeta | undefined, nowIso: string = new Date().toISOString()): PurgeTrashResult<T> {
  const nowMs = Date.parse(nowIso)
  const currentUpd = meta?.updatedAt ?? {}
  const currentTomb = meta?.tombstones ?? {}

  let changed = false
  const nextEvents: Record<string, T> = { ...events }
  const nextUpd: Record<string, string> = { ...currentUpd }
  const nextTomb: Record<string, string> = {}
  const purgedIds: string[] = []

  for (const [id, delIso] of Object.entries(currentTomb)) {
    if (nowMs - Date.parse(delIso) < TOMBSTONE_TTL_MS) {
      nextTomb[id] = delIso
    } else {
      changed = true
    }
  }

  for (const [id, evt] of Object.entries(events)) {
    if (!evt.trashedAt) continue
    const trashedMs = Date.parse(evt.trashedAt)
    if (!Number.isNaN(trashedMs) && nowMs - trashedMs >= TRASH_RETENTION_MS) {
      delete nextEvents[id]
      delete nextUpd[id]
      nextTomb[id] = nowIso
      purgedIds.push(id)
      changed = true
    }
  }

  if (!changed) {
    return {
      events,
      meta: meta ?? { updatedAt: {}, tombstones: {} },
      purgedIds: [],
    }
  }

  return {
    events: nextEvents,
    meta: { updatedAt: nextUpd, tombstones: nextTomb },
    purgedIds,
  }
}
