/** 以本地時區輸出 YYYY-MM-DD（舊版 toLocalISO 的對應） */
export function toLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 把 YYYY-MM-DD 加減 n 天（以本地時區計算，跨月跨年都正確） */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toLocalISO(new Date(y, m - 1, d + n))
}

/** 從 startISO 起連續 n 天的日期 */
export const dateRange = (startISO: string, n: number) => Array.from({ length: n }, (_, i) => addDays(startISO, i))
