import { addDays, toLocalISO } from './date'
import type { CalendarEvent } from './schema'

/**
 * 月曆格子：依「每週起始日」（0＝週日、1＝週一）補齊前面空白，之後是每天的 YYYY-MM-DD。
 * month 為 0～11。
 */
export function monthCells(year: number, month: number, weekStartsOn: 0 | 1 = 1): (string | null)[] {
  const offset = (new Date(year, month, 1).getDay() - weekStartsOn + 7) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => toLocalISO(new Date(year, month, i + 1)))]
}

/** 加減月份，自動跨年 */
export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/** 依語系與每週起始日產生星期名稱 */
export function weekdayNames(lng: string | undefined, weekStartsOn: 0 | 1 = 1) {
  const f = new Intl.DateTimeFormat(lng, { weekday: 'narrow' })
  // 2026-02-01 是星期日
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2026, 1, 1 + ((i + weekStartsOn) % 7))))
}

export const monthLabel = (year: number, month: number, lng: string | undefined) => new Intl.DateTimeFormat(lng, { year: 'numeric', month: 'long' }).format(new Date(year, month, 1))

export const dayLabel = (iso: string, lng: string | undefined) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(lng, { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(y, m - 1, d))
}

/** 行程是否涵蓋這一天（跨日行程每天都算） */
export const coversDate = (e: Pick<CalendarEvent, 'startDate' | 'endDate'>, date: string) => e.startDate <= date && date <= e.endDate

/** 同一天的排序：全天在前，再依開始時間、標題 */
export function compareEvents(a: Pick<CalendarEvent, 'isAllDay' | 'startTime' | 'title' | 'id'>, b: Pick<CalendarEvent, 'isAllDay' | 'startTime' | 'title' | 'id'>) {
  if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1
  const ta = a.startTime ?? ''
  const tb = b.startTime ?? ''
  if (ta !== tb) return ta.localeCompare(tb)
  return a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
}

/**
 * 日時間軸上的區塊位置（分鐘）：
 * - 單日行程：開始～結束；沒有結束時間補 1 小時
 * - 跨午夜（結束時間早於開始時間）或跨日：開始當天畫到 24:00，最後一天從 0:00 畫到結束時間，中間的日子整天
 * 全天行程回傳 null（顯示在時間軸上方）。
 */
export function timelineSpan(e: Pick<CalendarEvent, 'startDate' | 'endDate' | 'isAllDay' | 'startTime' | 'endTime'>, date: string): { start: number; end: number } | null {
  if (e.isAllDay || !e.startTime) return null
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const s = toMin(e.startTime)
  const overnight = e.endTime !== undefined && e.endDate === e.startDate && toMin(e.endTime) < s
  const lastDate = overnight ? addDays(e.startDate, 1) : e.endDate
  if (date < e.startDate || date > lastDate) return null
  const endMin = e.endTime !== undefined ? toMin(e.endTime) : Math.min(s + 60, 1440)
  const start = date === e.startDate ? s : 0
  const end = date === lastDate ? (lastDate === e.startDate ? Math.max(endMin, s + 15) : endMin) : 1440
  return { start, end: Math.max(end, start + 15) }
}

/** 跨午夜行程：結束時間早於開始時間時，實際結束日是隔天 */
export function effectiveEndDate(e: Pick<CalendarEvent, 'startDate' | 'endDate' | 'isAllDay' | 'startTime' | 'endTime'>): string {
  if (!e.isAllDay && e.startTime && e.endTime && e.endDate === e.startDate && e.endTime < e.startTime) return addDays(e.startDate, 1)
  return e.endDate
}
