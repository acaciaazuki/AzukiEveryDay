/**
 * 時間顯示：全站一律 24 小時制 "HH:mm"（例如 "09:05"、"21:00"），不使用 AM／PM、上午／下午、午前／午後。
 * 資料本來就存 24 小時制，畫面也照原樣顯示，只補零。
 */

/** "HH:mm" → 小時、分鐘；格式不對就回傳 null */
export function parseHHMM(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h <= 23 && min <= 59 ? { h, m: min } : null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "9:05" → "09:05"、"21:00" → "21:00"；空字串或格式不對就原樣回傳 */
export function formatTime(hhmm: string): string {
  const p = parseHHMM(hhmm)
  return p ? `${pad(p.h)}:${pad(p.m)}` : hhmm
}

/** 起訖時間：「09:00–17:30」，只有其中一個時就只顯示那個；兩個都沒有（整天）回傳空字串 */
export function formatTimeRange(start: string, end: string): string {
  return [start, end].filter(Boolean).map(formatTime).join('–')
}

/** 行程沒有開始與結束時間就是「整天」 */
export const isAllDay = (e: { start: string; end: string }) => !e.start && !e.end

/** 小時輸入格的內容 → 0–23，超出範圍或非數字回傳 null */
export function parseHourInput(text: string): number | null {
  if (!/^\d{1,2}$/.test(text)) return null
  const n = Number(text)
  return n <= 23 ? n : null
}

/** 分鐘輸入格的內容 → 0–59，超出範圍或非數字回傳 null */
export function parseMinuteInput(text: string): number | null {
  if (!/^\d{1,2}$/.test(text)) return null
  const n = Number(text)
  return n <= 59 ? n : null
}

/** 小時、分鐘 → "HH:mm" */
export const toHHMM = (h: number, m: number) => `${pad(h)}:${pad(m)}`

/** Intl 顯示時間時一律用 24 小時制（0–23 點） */
export const TIME_24: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

/** 時間戳記顯示成「11月22日 週日 21:30」（備份清單等用） */
export function formatStamp(ts: number, lng?: string): string {
  const d = new Date(ts)
  const date = new Intl.DateTimeFormat(lng, { month: 'short', day: 'numeric', weekday: 'short' }).format(d)
  return `${date} ${toHHMM(d.getHours(), d.getMinutes())}`
}
