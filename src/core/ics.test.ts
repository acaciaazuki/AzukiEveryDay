import { describe, expect, it } from 'vitest'
import { emptySpace } from './defaults'
import { buildSafeIcsFileName, escapeIcsText, exportPersonalCalendarToIcs, exportSharedSpaceToIcs, foldIcsLine } from './ics'
import type { CalendarEvent, SharedSpaceData } from './schema'

const NOW = '2026-11-25T00:00:00.000Z'
const enc = new TextEncoder()

const ev = (id: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: `行程 ${id}`,
  startDate: '2026-11-26',
  endDate: '2026-11-26',
  isAllDay: true,
  color: 'sage',
  note: '',
  trashedAt: null,
  ...extra,
})

/** 依 RFC 5545 展開摺行，並把每個 VEVENT 拆成「屬性名稱 → 值」 */
const unfold = (ics: string) => ics.replace(/\r\n /g, '')
const vevents = (ics: string) =>
  unfold(ics)
    .split('BEGIN:VEVENT\r\n')
    .slice(1)
    .map((block) => block.split('\r\n').filter(Boolean))

const prop = (lines: string[], name: string) => lines.find((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`))

describe('匯出個人行事曆 .ics', () => {
  it('過濾垃圾桶裡的行程', () => {
    const ics = exportPersonalCalendarToIcs({ a: ev('a'), b: ev('b', { trashedAt: NOW, title: '已刪除' }) }, { nowIso: NOW })
    expect(vevents(ics)).toHaveLength(1)
    expect(ics).not.toContain('已刪除')
  })

  it('全天行程的 DTEND 是結束日的隔天（單日、跨月跨日）', () => {
    const ics = exportPersonalCalendarToIcs({ one: ev('one'), span: ev('span', { startDate: '2026-11-29', endDate: '2026-12-02' }) }, { nowIso: NOW })
    const [one, span] = vevents(ics)
    expect(prop(one, 'DTSTART')).toBe('DTSTART;VALUE=DATE:20261126')
    expect(prop(one, 'DTEND')).toBe('DTEND;VALUE=DATE:20261127')
    expect(prop(span, 'DTSTART')).toBe('DTSTART;VALUE=DATE:20261129')
    expect(prop(span, 'DTEND')).toBe('DTEND;VALUE=DATE:20261203')
  })

  it('跳脫特殊字元：反斜線、分號、逗號與換行', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne')
    const ics = exportPersonalCalendarToIcs({ a: ev('a', { title: '開會; 討論, 決議', note: '第一行\n第二行' }) }, { nowIso: NOW })
    const [a] = vevents(ics)
    expect(prop(a, 'SUMMARY')).toBe('SUMMARY:開會\\; 討論\\, 決議')
    expect(prop(a, 'DESCRIPTION')).toBe('DESCRIPTION:第一行\\n第二行')
  })

  it('跨午夜（23:30 ~ 01:30）自動進位到隔天，並帶 TZID', () => {
    const ics = exportPersonalCalendarToIcs({ a: ev('a', { isAllDay: false, startTime: '23:30', endTime: '01:30' }) }, { nowIso: NOW, timeZone: 'Asia/Taipei' })
    const [a] = vevents(ics)
    expect(prop(a, 'DTSTART')).toBe('DTSTART;TZID=Asia/Taipei:20261126T233000')
    expect(prop(a, 'DTEND')).toBe('DTEND;TZID=Asia/Taipei:20261127T013000')
    expect(ics).toContain('X-WR-TIMEZONE:Asia/Taipei')
  })

  it('沒有結束時間時補 1 小時（23:30 會進位到隔天 00:30）', () => {
    const ics = exportPersonalCalendarToIcs({ a: ev('a', { isAllDay: false, startTime: '09:15' }), b: ev('b', { isAllDay: false, startTime: '23:30', startDate: '2026-11-27', endDate: '2026-11-27' }) }, { nowIso: NOW })
    const [a, b] = vevents(ics)
    expect(prop(a, 'DTSTART')).toBe('DTSTART:20261126T091500')
    expect(prop(a, 'DTEND')).toBe('DTEND:20261126T101500')
    expect(prop(b, 'DTEND')).toBe('DTEND:20261128T003000')
  })

  it('UTF-8 75 octets 摺行：中文與 4 位元組 Emoji 不會被切斷，展開後完全還原', () => {
    const title = '🎉繁體中文標題測試'.repeat(8) + '😀🎂'
    const line = `SUMMARY:${title}`
    const folded = foldIcsLine(line)
    const parts = folded.split('\r\n')
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(enc.encode(p).length).toBeLessThanOrEqual(75)
    for (const p of parts.slice(1)) expect(p.startsWith(' ')).toBe(true)
    // 每一段都是合法的 UTF-8（沒有被切開的字元）
    for (const p of parts) expect(new TextDecoder('utf-8', { fatal: true }).decode(enc.encode(p))).toBe(p)
    expect(unfold(folded)).toBe(line)

    const ics = exportPersonalCalendarToIcs({ a: ev('a', { title }) }, { nowIso: NOW })
    for (const l of ics.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75)
    expect(prop(vevents(ics)[0], 'SUMMARY')).toBe(line)
  })

  it('檔名去掉不合法字元', () => {
    expect(buildSafeIcsFileName('家庭/行程: 2026?', '2026-11-25')).toBe('家庭_行程__2026__2026-11-25.ics')
    expect(buildSafeIcsFileName('   ', '2026-11-25')).toBe('acacia_calendar_2026-11-25.ics')
  })
})

describe('匯出共享空間 .ics', () => {
  const space = (): SharedSpaceData => {
    const s = emptySpace({ spaceId: 'sp1', name: '家庭', ownerUid: 'u1', nowIso: NOW })
    s.events.e1 = { ...ev('e1', { title: '家族聚餐' }), createdByUid: 'u1', createdByName: '小明', lastEditedByName: '小華' }
    s.events.e2 = { ...ev('e2', { title: '刪掉的', trashedAt: NOW }), createdByUid: 'u1', createdByName: '小明', lastEditedByName: '小明' }
    s.busySlots.bMine = { id: 'bMine', ownerUid: 'me', ownerDisplayName: '我', startDate: '2026-11-27', endDate: '2026-11-27', isAllDay: false, startTime: '14:00', endTime: '15:00' }
    s.busySlots.bOther = { id: 'bOther', ownerUid: 'friend', ownerDisplayName: '朋友', startDate: '2026-11-28', endDate: '2026-11-28', isAllDay: true }
    return s
  }

  it('預設不匯出忙碌時段，也過濾垃圾桶', () => {
    const ics = exportSharedSpaceToIcs(space(), { nowIso: NOW })
    const items = vevents(ics)
    expect(items).toHaveLength(1)
    expect(prop(items[0], 'SUMMARY')).toBe('SUMMARY:家族聚餐')
    expect(prop(items[0], 'DESCRIPTION')).toContain('小華')
    expect(ics).not.toContain('busy')
    expect(ics).toContain('X-WR-CALNAME:ACACIA - 家庭')
  })

  it('匯出忙碌時段時只顯示「某某（忙碌中）」；自己的原始標題只在明確允許時顯示，別人的永遠不會', () => {
    const titleMap = { bMine: '心理諮商', bOther: '不應出現' }
    const hidden = exportSharedSpaceToIcs(space(), { nowIso: NOW, includeBusySlots: true, currentUserUid: 'me', ownBusyTitleMap: titleMap })
    expect(hidden).toContain('SUMMARY:我（忙碌中）')
    expect(hidden).toContain('SUMMARY:朋友（忙碌中）')
    expect(hidden).not.toContain('心理諮商')
    expect(hidden).toContain('CLASS:PRIVATE')

    const revealed = exportSharedSpaceToIcs(space(), { nowIso: NOW, includeBusySlots: true, revealOwnBusyTitles: true, currentUserUid: 'me', ownBusyTitleMap: titleMap })
    expect(revealed).toContain('SUMMARY:我：心理諮商')
    expect(revealed).toContain('SUMMARY:朋友（忙碌中）')
    expect(revealed).not.toContain('不應出現')
  })
})
