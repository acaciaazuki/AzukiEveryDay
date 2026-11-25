import type { BusySlot, CalendarEvent, CollectionSyncMeta } from './schema'

/**
 * 忙碌時段投射：把自己的個人行程以「只有時間區間」的形式投射到共享空間。
 * - 時段 id 由空間、擁有者與個人行程 id 雜湊而成，看不出原始行程 id，不同空間互不相關
 * - 只投射過去 7 天到未來 90 天、未刪除的行程；不含標題與備註
 * - 只整理自己的時段，其他成員的時段原封不動
 */

const PAST_WINDOW_DAYS = 7
const FUTURE_WINDOW_DAYS = 90

export function hashBusySlotId(spaceId: string, ownerUid: string, personalEventId: string): string {
  const input = `acacia_busy_v2|${spaceId}|${ownerUid}|${personalEventId}`
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 ^= ch
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= ch
    h2 = Math.imul(h2, 0x811c9dc5)
  }
  return `busy_${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}`
}

function addDaysToDateString(baseDateStr: string, offsetDays: number): string {
  const d = new Date(`${baseDateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function isSameBusySlotContent(a: BusySlot, b: BusySlot): boolean {
  return (
    a.ownerUid === b.ownerUid &&
    a.ownerDisplayName === b.ownerDisplayName &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate &&
    a.isAllDay === b.isAllDay &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime
  )
}

export function reconcileUserBusySlotsInSpace(params: {
  spaceId: string
  ownerUid: string
  ownerDisplayName: string
  projectEnabled: boolean
  personalEvents: Record<string, CalendarEvent>
  existingBusySlots: Record<string, BusySlot>
  existingMeta: CollectionSyncMeta | undefined
  nowIso?: string
}): {
  busySlots: Record<string, BusySlot>
  meta: CollectionSyncMeta
  hasChanges: boolean
} {
  const { spaceId, ownerUid, ownerDisplayName, projectEnabled, personalEvents, existingBusySlots, existingMeta, nowIso = new Date().toISOString() } = params

  const todayStr = nowIso.slice(0, 10)
  const minDate = addDaysToDateString(todayStr, -PAST_WINDOW_DAYS)
  const maxDate = addDaysToDateString(todayStr, FUTURE_WINDOW_DAYS)

  const desiredByMe: Record<string, BusySlot> = {}

  if (projectEnabled) {
    for (const evt of Object.values(personalEvents)) {
      if (evt.trashedAt !== null) continue
      if (evt.endDate < minDate || evt.startDate > maxDate) continue

      const slotId = hashBusySlotId(spaceId, ownerUid, evt.id)
      desiredByMe[slotId] = {
        id: slotId,
        ownerUid,
        ownerDisplayName,
        startDate: evt.startDate,
        endDate: evt.endDate,
        isAllDay: evt.isAllDay,
        startTime: evt.isAllDay ? undefined : evt.startTime,
        endTime: evt.isAllDay ? undefined : evt.endTime,
      }
    }
  }

  const nextSlots: Record<string, BusySlot> = {}
  const nextUpd: Record<string, string> = { ...(existingMeta?.updatedAt ?? {}) }
  const nextTomb: Record<string, string> = { ...(existingMeta?.tombstones ?? {}) }
  let hasChanges = false

  for (const [slotId, slot] of Object.entries(existingBusySlots)) {
    if (slot.ownerUid !== ownerUid) {
      nextSlots[slotId] = slot
      continue
    }
    if (!(slotId in desiredByMe)) {
      delete nextUpd[slotId]
      nextTomb[slotId] = nowIso
      hasChanges = true
    }
  }

  for (const [slotId, desiredSlot] of Object.entries(desiredByMe)) {
    const prev = existingBusySlots[slotId]
    if (!prev || !isSameBusySlotContent(prev, desiredSlot)) {
      nextSlots[slotId] = desiredSlot
      nextUpd[slotId] = nowIso
      delete nextTomb[slotId]
      hasChanges = true
    } else {
      nextSlots[slotId] = prev
    }
  }

  if (!hasChanges) {
    return {
      busySlots: existingBusySlots,
      meta: existingMeta ?? { updatedAt: {}, tombstones: {} },
      hasChanges: false,
    }
  }

  return {
    busySlots: nextSlots,
    meta: { updatedAt: nextUpd, tombstones: nextTomb },
    hasChanges: true,
  }
}

/** 自己在空間裡看得到自己忙碌時段的原始標題（只在本機計算，不會寫進共享檔） */
export function buildOwnBusySlotTitleMap(spaceId: string, ownerUid: string, personalEvents: Record<string, CalendarEvent>): Record<string, string> {
  const titleMap: Record<string, string> = {}
  for (const evt of Object.values(personalEvents)) {
    if (evt.trashedAt !== null) continue
    const slotId = hashBusySlotId(spaceId, ownerUid, evt.id)
    titleMap[slotId] = evt.title
  }
  return titleMap
}
