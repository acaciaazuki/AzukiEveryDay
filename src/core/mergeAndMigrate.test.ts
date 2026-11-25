import { describe, expect, it } from 'vitest'
import { emptyPersonalData, emptySpace } from './defaults'
import { mergeAppData, mergeSpaceData } from './merge'
import { migrateToV2 } from './migrate'
import type { BusySlot, PersonalAppData, SharedEvent, SharedSpaceData } from './schema'
import { TOMBSTONE_TTL_MS } from './schema'

const T0 = '2026-11-01T00:00:00.000Z'
const T1 = '2026-11-02T00:00:00.000Z'
const T2 = '2026-11-03T00:00:00.000Z'
const NOW = '2026-11-25T00:00:00.000Z'

const sharedEvent = (id: string, title: string, extra: Partial<SharedEvent> = {}): SharedEvent => ({
  id,
  title,
  startDate: '2026-11-20',
  endDate: '2026-11-20',
  isAllDay: true,
  color: 'sage',
  note: '',
  trashedAt: null,
  createdByUid: 'u1',
  createdByName: '小明',
  lastEditedByName: '小明',
  ...extra,
})

const busy = (id: string, ownerUid: string): BusySlot => ({ id, ownerUid, ownerDisplayName: ownerUid, startDate: '2026-11-21', endDate: '2026-11-21', isAllDay: true })

const space = (patch: (s: SharedSpaceData) => void): SharedSpaceData => {
  const s = emptySpace({ spaceId: 'sp1', name: '家庭', ownerUid: 'u1', nowIso: T0 })
  patch(s)
  return s
}

const personal = (patch: (d: PersonalAppData) => void): PersonalAppData => {
  const d = emptyPersonalData(T0)
  patch(d)
  return d
}

describe('mergeSpaceData：共享空間合併', () => {
  it('離線時兩邊各自新增的共享行程與忙碌時段都會保留', () => {
    const a = space((s) => {
      s.events.e1 = sharedEvent('e1', 'A 新增')
      s.syncMeta.events.updatedAt.e1 = T1
      s.busySlots.b1 = busy('b1', 'u1')
      s.syncMeta.busySlots.updatedAt.b1 = T1
    })
    const b = space((s) => {
      s.events.e2 = sharedEvent('e2', 'B 新增')
      s.syncMeta.events.updatedAt.e2 = T2
      s.busySlots.b2 = busy('b2', 'u2')
      s.syncMeta.busySlots.updatedAt.b2 = T2
    })
    const merged = mergeSpaceData(a, b, NOW)
    expect(Object.keys(merged.events).sort()).toEqual(['e1', 'e2'])
    expect(Object.keys(merged.busySlots).sort()).toEqual(['b1', 'b2'])
    expect(merged.syncMeta.events.updatedAt).toEqual({ e1: T1, e2: T2 })
  })

  it('修改時間到毫秒都相同時，用確定性的 tie-break：合併 A、B 與合併 B、A 結果完全相同', () => {
    const same = '2026-11-02T08:00:00.123Z'
    const a = space((s) => {
      s.events.e1 = sharedEvent('e1', '版本甲')
      s.syncMeta.events.updatedAt.e1 = same
    })
    const b = space((s) => {
      s.events.e1 = sharedEvent('e1', '版本乙')
      s.syncMeta.events.updatedAt.e1 = same
    })
    const ab = mergeSpaceData(a, b, NOW)
    const ba = mergeSpaceData(b, a, NOW)
    expect(ab).toEqual(ba)
    expect(['版本甲', '版本乙']).toContain(ab.events.e1.title)
  })

  it('刪除與修改衝突：刪除時間較新或相同時以刪除為準，修改較新時保留修改', () => {
    const edited = (at: string) =>
      space((s) => {
        s.events.e1 = sharedEvent('e1', '修改後')
        s.syncMeta.events.updatedAt.e1 = at
      })
    const deleted = (at: string) =>
      space((s) => {
        s.syncMeta.events.tombstones.e1 = at
      })

    // 同時間：刪除優先
    const tie = mergeSpaceData(edited(T1), deleted(T1), NOW)
    expect(tie.events.e1).toBeUndefined()
    expect(tie.syncMeta.events.tombstones.e1).toBe(T1)
    expect(mergeSpaceData(deleted(T1), edited(T1), NOW).events.e1).toBeUndefined()

    // 修改比刪除新：保留修改，刪除標記不再傳遞
    const editWins = mergeSpaceData(edited(T2), deleted(T1), NOW)
    expect(editWins.events.e1.title).toBe('修改後')
    expect(editWins.syncMeta.events.tombstones.e1).toBeUndefined()
  })

  it('超過 180 天（TOMBSTONE_TTL）的刪除標記會被清掉，未滿的保留', () => {
    const old = new Date(Date.parse(NOW) - TOMBSTONE_TTL_MS - 1000).toISOString()
    const recent = new Date(Date.parse(NOW) - TOMBSTONE_TTL_MS + 60_000).toISOString()
    const a = space((s) => {
      s.syncMeta.events.tombstones.oldOne = old
      s.syncMeta.events.tombstones.newOne = recent
    })
    const merged = mergeSpaceData(a, space(() => {}), NOW)
    expect(merged.syncMeta.events.tombstones).toEqual({ newOne: recent })
  })

  it('30 天軟刪除（trashedAt）會同步到另一邊，之後的還原也會同步', () => {
    const base = space((s) => {
      s.events.e1 = sharedEvent('e1', '聚餐')
      s.syncMeta.events.updatedAt.e1 = T0
    })
    const trashed = space((s) => {
      s.events.e1 = sharedEvent('e1', '聚餐', { trashedAt: T1 })
      s.syncMeta.events.updatedAt.e1 = T1
    })
    const afterTrash = mergeSpaceData(base, trashed, NOW)
    expect(afterTrash.events.e1.trashedAt).toBe(T1)

    const restored = space((s) => {
      s.events.e1 = sharedEvent('e1', '聚餐', { trashedAt: null })
      s.syncMeta.events.updatedAt.e1 = T2
    })
    const afterRestore = mergeSpaceData(afterTrash, restored, NOW)
    expect(afterRestore.events.e1.trashedAt).toBeNull()
  })
})

describe('mergeAppData：個人資料合併', () => {
  it('個人設定逐欄位合併：各自較新的欄位都會保留', () => {
    const local = personal((d) => {
      d.settings.billingCycleStartDay = 25
      d.settings.locale = 'en'
      d.syncMeta!.settingsFieldUpdatedAt = { billingCycleStartDay: T2, locale: T0 }
    })
    const remote = personal((d) => {
      d.settings.billingCycleStartDay = 5
      d.settings.locale = 'ja'
      d.syncMeta!.settingsFieldUpdatedAt = { billingCycleStartDay: T1, locale: T1 }
    })
    const merged = mergeAppData(local, remote, NOW)
    expect(merged.settings.billingCycleStartDay).toBe(25)
    expect(merged.settings.locale).toBe('ja')
    expect(merged.syncMeta?.settingsFieldUpdatedAt).toMatchObject({ billingCycleStartDay: T2, locale: T1 })
    expect(mergeAppData(remote, local, NOW).settings).toEqual(merged.settings)
  })

  it('記帳紀錄與行程逐筆合併，雙邊新增都保留', () => {
    const local = personal((d) => {
      d.ledgerEntries.l1 = { id: 'l1', date: '2026-11-12', type: 'expense', amount: 80, currency: 'TWD', categoryId: 'coffee', note: '' }
      d.syncMeta!.ledgerEntries.updatedAt.l1 = T1
    })
    const remote = personal((d) => {
      d.ledgerEntries.l2 = { id: 'l2', date: '2026-11-13', type: 'income', amount: 500, currency: 'TWD', categoryId: 'bonus', note: '' }
      d.syncMeta!.ledgerEntries.updatedAt.l2 = T2
    })
    expect(Object.keys(mergeAppData(local, remote, NOW).ledgerEntries).sort()).toEqual(['l1', 'l2'])
  })
})

describe('migrateToV2：舊版匯入', () => {
  const legacy = {
    updatedAt: '2026-10-01T00:00:00.000Z',
    events: [
      { id: 'ev1', title: '看牙醫', date: '2026/10/05', time: '9:30', endTime: '10:30', location: '台北' },
      { id: 'ev2', title: '連假', startDate: '2026-10-09', endDate: '2026-10-11' },
    ],
    expenses: [
      { id: 'x1', amount: 65, category: '咖啡', date: '2026-10-02', note: '拿鐵' },
      { id: 'x2', amount: 3000, category: '股票', date: '2026-10-03' },
      { id: 'x3', amount: 12000, category: '貸款', date: '2026-10-04' },
      { id: 'x4', amount: 50000, category: '薪資', date: '2026-10-05' },
    ],
    todos: [{ id: 't1', title: '買牛奶' }],
    places: [{ id: 'p1', name: '咖啡店' }],
  }

  it('保留行程與記帳，轉換舊版日期時間格式', () => {
    const data = migrateToV2(legacy, NOW)
    expect(Object.keys(data.events).sort()).toEqual(['ev1', 'ev2'])
    expect(data.events.ev1).toMatchObject({ startDate: '2026-10-05', startTime: '09:30', endTime: '10:30', isAllDay: false })
    expect(data.events.ev1.note).toContain('台北')
    expect(data.events.ev2).toMatchObject({ startDate: '2026-10-09', endDate: '2026-10-11', isAllDay: true })
    expect(Object.keys(data.ledgerEntries).sort()).toEqual(['x1', 'x2', 'x3', 'x4'])
  })

  it('「咖啡」轉成內建分類 coffee，「薪資」轉成收入 salary', () => {
    const data = migrateToV2(legacy, NOW)
    expect(data.ledgerEntries.x1).toMatchObject({ categoryId: 'coffee', type: 'expense', note: '拿鐵' })
    expect(data.ledgerEntries.x4).toMatchObject({ categoryId: 'salary', type: 'income' })
  })

  it('自訂分類「股票」「貸款」自動註冊到 customCategories', () => {
    const data = migrateToV2(legacy, NOW)
    const labels = Object.values(data.customCategories).map((c) => c.label)
    expect(labels.sort()).toEqual(['股票', '貸款'].sort())
    for (const c of Object.values(data.customCategories)) expect(c.isCustom).toBe(true)
    const stock = Object.values(data.customCategories).find((c) => c.label === '股票')!
    expect(data.ledgerEntries.x2.categoryId).toBe(stock.id)
    expect(data.syncMeta?.customCategories.updatedAt[stock.id]).toBeDefined()
  })

  it('忽略舊版的 todos 與 places', () => {
    const data = migrateToV2(legacy, NOW) as unknown as Record<string, unknown>
    expect(data.todos).toBeUndefined()
    expect(data.places).toBeUndefined()
    expect(JSON.stringify(data)).not.toContain('買牛奶')
  })

  it('已經是 v2 的資料直接通過驗證；格式錯誤時丟出錯誤', () => {
    const v2 = emptyPersonalData(T0)
    expect(migrateToV2(v2, NOW)).toEqual(v2)
    expect(() => migrateToV2(null, NOW)).toThrow()
  })
})
