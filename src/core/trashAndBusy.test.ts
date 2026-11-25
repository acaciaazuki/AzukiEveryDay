import { describe, expect, it } from 'vitest'
import { buildOwnBusySlotTitleMap, hashBusySlotId, reconcileUserBusySlotsInSpace } from './busyProjection'
import type { BusySlot, CalendarEvent, CollectionSyncMeta } from './schema'
import { purgeExpiredTrash } from './trash'

const NOW = '2026-11-25T12:00:00.000Z'
const DAY = 24 * 60 * 60 * 1000
const ago = (days: number) => new Date(Date.parse(NOW) - days * DAY).toISOString()

const ev = (id: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: `行程 ${id}`,
  startDate: '2026-11-26',
  endDate: '2026-11-26',
  isAllDay: false,
  startTime: '10:00',
  endTime: '11:00',
  color: 'sage',
  note: '',
  trashedAt: null,
  ...extra,
})

describe('purgeExpiredTrash：30 天最近刪除', () => {
  it('未滿 30 天保留，滿 30 天轉成刪除標記', () => {
    const events = { fresh: ev('fresh', { trashedAt: ago(29) }), expired: ev('expired', { trashedAt: ago(30) }), alive: ev('alive') }
    const meta: CollectionSyncMeta = { updatedAt: { fresh: ago(29), expired: ago(30), alive: ago(1) }, tombstones: {} }
    const res = purgeExpiredTrash(events, meta, NOW)
    expect(Object.keys(res.events).sort()).toEqual(['alive', 'fresh'])
    expect(res.purgedIds).toEqual(['expired'])
    expect(res.meta.tombstones).toEqual({ expired: NOW })
    expect(res.meta.updatedAt.expired).toBeUndefined()
  })

  it('沒有任何變動時回傳原本的參照', () => {
    const events = { a: ev('a'), b: ev('b', { trashedAt: ago(3) }) }
    const meta: CollectionSyncMeta = { updatedAt: {}, tombstones: { old: ago(10) } }
    const res = purgeExpiredTrash(events, meta, NOW)
    expect(res.events).toBe(events)
    expect(res.meta).toBe(meta)
    expect(res.purgedIds).toEqual([])
  })

  it('超過 180 天的刪除標記一併清除', () => {
    const res = purgeExpiredTrash({}, { updatedAt: {}, tombstones: { old: ago(181), keep: ago(10) } }, NOW)
    expect(res.meta.tombstones).toEqual({ keep: ago(10) })
  })
})

describe('忙碌時段投射', () => {
  const base = { ownerUid: 'me', ownerDisplayName: '我', existingBusySlots: {} as Record<string, BusySlot>, existingMeta: undefined, nowIso: NOW }

  it('不同空間的 hashBusySlotId 互不相同，且看不出原始行程 ID', () => {
    const a = hashBusySlotId('spaceA', 'me', 'secret-event-id')
    const b = hashBusySlotId('spaceB', 'me', 'secret-event-id')
    expect(a).not.toBe(b)
    expect(a).toBe(hashBusySlotId('spaceA', 'me', 'secret-event-id'))
    expect(a).not.toContain('secret')
  })

  it('序列化後的忙碌時段完全不含標題、備註與原始 ID', () => {
    const events = { 'secret-event-id': ev('secret-event-id', { title: '心理諮商', note: '私人備註內容' }) }
    const res = reconcileUserBusySlotsInSpace({ ...base, spaceId: 'sp1', projectEnabled: true, personalEvents: events })
    const json = JSON.stringify(res)
    expect(Object.keys(res.busySlots)).toHaveLength(1)
    expect(json).not.toContain('心理諮商')
    expect(json).not.toContain('私人備註內容')
    expect(json).not.toContain('secret-event-id')
    const slot = Object.values(res.busySlots)[0]
    expect(slot).toEqual({ id: hashBusySlotId('sp1', 'me', 'secret-event-id'), ownerUid: 'me', ownerDisplayName: '我', startDate: '2026-11-26', endDate: '2026-11-26', isAllDay: false, startTime: '10:00', endTime: '11:00' })
  })

  it('只投射過去 7 天到未來 90 天、未刪除的行程', () => {
    const events = {
      past7: ev('past7', { startDate: '2026-11-18', endDate: '2026-11-18' }),
      past8: ev('past8', { startDate: '2026-11-17', endDate: '2026-11-17' }),
      future90: ev('future90', { startDate: '2027-02-23', endDate: '2027-02-23' }),
      future91: ev('future91', { startDate: '2027-02-24', endDate: '2027-02-24' }),
      longSpan: ev('longSpan', { startDate: '2026-10-01', endDate: '2026-11-20' }),
      trashed: ev('trashed', { trashedAt: ago(1) }),
    }
    const res = reconcileUserBusySlotsInSpace({ ...base, spaceId: 'sp1', projectEnabled: true, personalEvents: events })
    const expected = ['past7', 'future90', 'longSpan'].map((id) => hashBusySlotId('sp1', 'me', id)).sort()
    expect(Object.keys(res.busySlots).sort()).toEqual(expected)
  })

  it('關閉投射時撤除自己的時段（留下刪除標記），其他成員的時段不受影響', () => {
    const events = { e1: ev('e1') }
    const on = reconcileUserBusySlotsInSpace({ ...base, spaceId: 'sp1', projectEnabled: true, personalEvents: events })
    const other: BusySlot = { id: 'busy_other', ownerUid: 'friend', ownerDisplayName: '朋友', startDate: '2026-11-27', endDate: '2026-11-27', isAllDay: true }
    const slots = { ...on.busySlots, busy_other: other }
    const meta = { updatedAt: { ...on.meta.updatedAt, busy_other: ago(1) }, tombstones: {} }

    const off = reconcileUserBusySlotsInSpace({ ...base, spaceId: 'sp1', projectEnabled: false, personalEvents: events, existingBusySlots: slots, existingMeta: meta, nowIso: NOW })
    const mine = hashBusySlotId('sp1', 'me', 'e1')
    expect(off.hasChanges).toBe(true)
    expect(off.busySlots).toEqual({ busy_other: other })
    expect(off.meta.tombstones[mine]).toBe(NOW)
    expect(off.meta.updatedAt.busy_other).toBe(ago(1))
  })

  it('內容沒變時不產生變動', () => {
    const events = { e1: ev('e1') }
    const first = reconcileUserBusySlotsInSpace({ ...base, spaceId: 'sp1', projectEnabled: true, personalEvents: events })
    const again = reconcileUserBusySlotsInSpace({ ...base, spaceId: 'sp1', projectEnabled: true, personalEvents: events, existingBusySlots: first.busySlots, existingMeta: first.meta })
    expect(again.hasChanges).toBe(false)
    expect(again.busySlots).toBe(first.busySlots)
  })

  it('buildOwnBusySlotTitleMap 對照出自己未刪除行程的標題', () => {
    const events = { e1: ev('e1', { title: '健身' }), e2: ev('e2', { title: '已刪除', trashedAt: ago(1) }) }
    const map = buildOwnBusySlotTitleMap('sp1', 'me', events)
    expect(map).toEqual({ [hashBusySlotId('sp1', 'me', 'e1')]: '健身' })
  })
})
