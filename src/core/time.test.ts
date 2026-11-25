import { describe, expect, it } from 'vitest'
import en from '../i18n/locales/en.json'
import ja from '../i18n/locales/ja.json'
import zhTW from '../i18n/locales/zh-TW.json'
import { formatStamp, formatTime, formatTimeRange, isAllDay, parseHHMM, parseHourInput, parseMinuteInput, TIME_24, toHHMM } from './time'

const TWELVE_HOUR = /AM|PM|上午|下午|午前|午後/i

describe('24 小時制顯示', () => {
  it('補零並保留 24 小時，不帶任何上下午標記', () => {
    expect(formatTime('05:00')).toBe('05:00')
    expect(formatTime('9:05')).toBe('09:05')
    expect(formatTime('12:00')).toBe('12:00')
    expect(formatTime('14:30')).toBe('14:30')
    expect(formatTime('00:00')).toBe('00:00')
    expect(formatTime('23:55')).toBe('23:55')
    expect(formatTime('')).toBe('')
  })

  it('起訖與整天', () => {
    expect(formatTimeRange('09:00', '17:30')).toBe('09:00–17:30')
    expect(formatTimeRange('13:00', '')).toBe('13:00')
    expect(formatTimeRange('', '')).toBe('')
    expect(isAllDay({ start: '', end: '' })).toBe(true)
    expect(isAllDay({ start: '09:00', end: '' })).toBe(false)
  })

  it.each(['zh-TW', 'ja', 'en'])('%s：時間戳記也是 24 小時制', (lng) => {
    const ts = new Date(2026, 10, 22, 21, 5).getTime()
    const s = formatStamp(ts, lng)
    expect(s).toMatch(/21:05$/)
    expect(s).not.toMatch(TWELVE_HOUR)
  })

  it.each(['zh-TW', 'ja', 'en', 'en-US'])('%s：Intl 用 TIME_24 一律輸出 0–23 點', (lng) => {
    const f = new Intl.DateTimeFormat(lng, TIME_24)
    expect(f.format(new Date(2026, 0, 1, 14, 30))).toBe('14:30')
    expect(f.format(new Date(2026, 0, 1, 0, 5))).toBe('00:05')
    expect(f.format(new Date(2026, 0, 1, 21, 0))).not.toMatch(TWELVE_HOUR)
  })
})

describe('直接輸入的驗證', () => {
  it('小時 0–23，24 以上不合法', () => {
    expect(parseHourInput('0')).toBe(0)
    expect(parseHourInput('9')).toBe(9)
    expect(parseHourInput('09')).toBe(9)
    expect(parseHourInput('23')).toBe(23)
    for (const s of ['24', '99', '', 'a', '123']) expect(parseHourInput(s), s).toBeNull()
  })
  it('分鐘 0–59', () => {
    expect(parseMinuteInput('0')).toBe(0)
    expect(parseMinuteInput('59')).toBe(59)
    for (const s of ['60', '75', '', 'x']) expect(parseMinuteInput(s), s).toBeNull()
  })
  it('解析與組合 HH:mm', () => {
    expect(parseHHMM('21:30')).toEqual({ h: 21, m: 30 })
    for (const s of ['', '24:00', '12:60', 'ab:cd', '9']) expect(parseHHMM(s), s).toBeNull()
    expect(toHHMM(7, 5)).toBe('07:05')
  })
})

describe('翻譯檔沒有 12 小時制的字樣', () => {
  const values = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === 'object' ? values(v) : [String(v)]))
  it.each([
    ['zh-TW', zhTW],
    ['ja', ja],
    ['en', en],
  ])('%s', (_lng, dict) => {
    expect(values(dict).filter((v) => /\b[AP]M\b|上午|下午(?!茶)|午前|午後/.test(v))).toEqual([])
  })
})
