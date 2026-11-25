import { buildOwnBusySlotTitleMap } from './busyProjection'
import { coversDate, effectiveEndDate } from './calendar'
import type { CalendarEvent, JoinedSpaceRef, SharedEvent, SharedSpaceData } from './schema'

/**
 * 行事曆畫面上的一筆項目：個人行程、共享行程或忙碌時段，疊加顯示時統一成同一種格式。
 * - 其他成員的忙碌時段只顯示「某某 忙碌中」（共享檔裡本來就沒有標題）
 * - 自己的忙碌時段：個人行事曆有顯示時就不重複畫；隱藏個人行事曆時用 buildOwnBusySlotTitleMap 在本機還原原始標題
 */
export type CalendarItem =
  | { kind: 'personal'; key: string; title: string; color: string; event: CalendarEvent }
  | { kind: 'shared'; key: string; title: string; color: string; spaceId: string; spaceName: string; event: SharedEvent }
  | { kind: 'busy'; key: string; title: string | null; ownerName: string; own: boolean; color: string; spaceId: string; spaceName: string; event: Pick<CalendarEvent, 'id' | 'startDate' | 'endDate' | 'isAllDay' | 'startTime' | 'endTime'> }

export function buildCalendarItems(params: {
  personalEvents: Record<string, CalendarEvent>
  personalVisible: boolean
  spaces: Record<string, SharedSpaceData>
  joinedSpaces: Record<string, JoinedSpaceRef>
  currentUid: string | null
}): CalendarItem[] {
  const { personalEvents, personalVisible, spaces, joinedSpaces, currentUid } = params
  const items: CalendarItem[] = []
  if (personalVisible) {
    for (const e of Object.values(personalEvents)) if (e.trashedAt === null) items.push({ kind: 'personal', key: `p:${e.id}`, title: e.title, color: e.color, event: e })
  }
  for (const ref of Object.values(joinedSpaces)) {
    const space = spaces[ref.spaceId]
    if (!space || !ref.visible) continue
    const spaceName = ref.localAlias || space.name
    for (const e of Object.values(space.events)) {
      if (e.trashedAt === null) items.push({ kind: 'shared', key: `s:${space.spaceId}:${e.id}`, title: e.title, color: e.color || ref.color, spaceId: space.spaceId, spaceName, event: e })
    }
    const titles = currentUid ? buildOwnBusySlotTitleMap(space.spaceId, currentUid, personalEvents) : {}
    for (const slot of Object.values(space.busySlots)) {
      const own = slot.ownerUid === currentUid
      if (own && personalVisible) continue
      items.push({
        kind: 'busy',
        key: `b:${space.spaceId}:${slot.id}`,
        title: own ? (titles[slot.id] ?? null) : null,
        ownerName: slot.ownerDisplayName,
        own,
        color: ref.color,
        spaceId: space.spaceId,
        spaceName,
        event: { id: slot.id, startDate: slot.startDate, endDate: slot.endDate, isAllDay: slot.isAllDay, startTime: slot.startTime, endTime: slot.endTime },
      })
    }
  }
  return items
}

/** 某一天的項目（跨日、跨午夜行程每天都會出現），全天在前，再依時間 */
export function itemsOnDate(items: readonly CalendarItem[], date: string): CalendarItem[] {
  return items
    .filter((i) => coversDate({ startDate: i.event.startDate, endDate: effectiveEndDate(i.event) }, date))
    .sort((a, b) => {
      if (a.event.isAllDay !== b.event.isAllDay) return a.event.isAllDay ? -1 : 1
      const ta = a.event.startTime ?? ''
      const tb = b.event.startTime ?? ''
      return ta !== tb ? ta.localeCompare(tb) : a.key.localeCompare(b.key)
    })
}
