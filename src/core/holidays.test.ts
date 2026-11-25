import { describe, expect, it } from 'vitest'
import { daysForYears, guessCountry, HOLIDAY_COUNTRIES, holidayName, indexHolidays, loadHolidayFile, yearSpan, type HolidayFile } from './holidays'

const file: HolidayFile = {
  country: 'TW',
  source: 'official',
  years: [2025, 2026],
  days: [
    { date: '2025-01-01', name: '開國紀念日' },
    { date: '2025-02-08', name: '補行上班', work: true },
    { date: '2026-01-01', name: '開國紀念日' },
    { date: '2026-02-17', name: '春節' },
  ],
}

describe('推測預設國家（只看時區與語言，不用位置）', () => {
  it('時區優先', () => {
    expect(guessCountry('Asia/Taipei', ['en-US'])).toBe('TW')
    expect(guessCountry('Asia/Tokyo', ['zh-TW'])).toBe('JP')
    expect(guessCountry('America/Toronto', ['en'])).toBe('CA')
    expect(guessCountry('America/Los_Angeles', ['en'])).toBe('US')
    expect(guessCountry('Australia/Sydney', ['en'])).toBe('AU')
    expect(guessCountry('Europe/London', ['en'])).toBe('GB')
  })

  it('時區對不上時看語言的地區碼，再看語言本身，最後用預設值', () => {
    expect(guessCountry('Europe/Paris', ['zh-HK', 'en'])).toBe('HK')
    expect(guessCountry('UTC', ['ko'])).toBe('KR')
    expect(guessCountry(undefined, ['ja'])).toBe('JP')
    expect(guessCountry('Europe/Berlin', ['de-DE'])).toBe('TW')
    expect(guessCountry('Europe/Berlin', ['de-DE'], 'US')).toBe('US')
  })
})

describe('依年份整理與建立索引', () => {
  it('只收資料範圍內的年份，範圍外的略過', () => {
    const byYear = daysForYears(file, yearSpan(2024, 2026))
    expect([...byYear.keys()]).toEqual([2025, 2026])
    expect(byYear.get(2026)).toHaveLength(2)
  })

  it('年份範圍頭尾顛倒也可以', () => {
    expect(yearSpan(2026, 2024)).toEqual([2024, 2025, 2026])
  })

  it('資料檔裡同一天出現兩次也只留一筆', () => {
    const dup = { ...file, days: [...file.days, { date: '2026-01-01', name: '元旦' }] }
    expect(daysForYears(dup, [2026]).get(2026)!.filter((d) => d.date === '2026-01-01')).toHaveLength(1)
  })

  it('不同國家同一天各自一筆', () => {
    const jp: HolidayFile = { country: 'JP', source: 'rules', years: [2026, 2026], days: [{ date: '2026-01-01', name: '元日', en: 'New Year’s Day' }] }
    expect(indexHolidays([jp, file]).get('2026-01-01')!.map((h) => h.country)).toEqual(['JP', 'TW'])
  })

  it('補班日標記為 work', () => {
    expect(indexHolidays([file]).get('2025-02-08')![0].work).toBe(true)
  })

  it('英文介面優先用英文名稱', () => {
    expect(holidayName({ name: '元日', en: 'New Year’s Day' }, 'en')).toBe('New Year’s Day')
    expect(holidayName({ name: '元日', en: 'New Year’s Day' }, 'ja')).toBe('元日')
    expect(holidayName({ name: '春節' }, 'en')).toBe('春節')
  })

  it('法文、德文介面有英文名稱時用英文名稱，韓文介面用當地名稱', () => {
    const h = { name: '元日', en: 'New Year’s Day' }
    expect(holidayName(h, 'fr')).toBe('New Year’s Day')
    expect(holidayName(h, 'de')).toBe('New Year’s Day')
    expect(holidayName({ name: '설날' }, 'ko')).toBe('설날')
    expect(holidayName({ name: '春節' }, 'fr')).toBe('春節')
  })
})

describe('內建假日資料', () => {
  it.each(HOLIDAY_COUNTRIES)('%s：年份範圍正確、日期在範圍內、同一天不重複', async (c) => {
    const f = await loadHolidayFile(c)
    expect(f.country).toBe(c)
    expect(f.years[0]).toBeLessThanOrEqual(2026)
    expect(f.years[1]).toBeGreaterThanOrEqual(2026)
    const dates = f.days.map((d) => `${d.date}${d.work ? 'w' : ''}`)
    expect(new Set(dates).size).toBe(dates.length)
    for (const d of f.days) {
      const y = Number(d.date.slice(0, 4))
      expect(y).toBeGreaterThanOrEqual(f.years[0])
      expect(y).toBeLessThanOrEqual(f.years[1])
      expect(d.name.trim()).not.toBe('')
    }
  })

  it('台灣 2026 依人事行政總處公告：春節連假、教師節、光復節與行憲紀念日', async () => {
    const f = await loadHolidayFile('TW')
    const map = new Map(f.days.map((d) => [d.date, d.name]))
    expect(f.source).toBe('official')
    for (const d of ['2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20']) expect(map.has(d)).toBe(true)
    expect(map.get('2026-09-28')).toContain('教師節')
    expect(map.get('2026-10-25')).toContain('光復')
    expect(map.get('2026-12-25')).toBe('行憲紀念日')
    // 2025 年 2 月 8 日（六）補行上班
    expect(f.days.find((d) => d.date === '2025-02-08')?.work).toBe(true)
  })

  it('中國含调休上班日', async () => {
    const f = await loadHolidayFile('CN')
    expect(f.days.find((d) => d.date === '2026-02-14')?.work).toBe(true)
    expect(f.days.find((d) => d.date === '2026-10-01')?.work).toBeFalsy()
  })

  it('日本 2026 的祝日（含振替休日與国民の休日），不含銀行休業日', async () => {
    const f = await loadHolidayFile('JP')
    const y = f.days.filter((d) => d.date.startsWith('2026-')).map((d) => d.date.slice(5))
    expect(y).toEqual(['01-01', '01-12', '02-11', '02-23', '03-20', '04-29', '05-03', '05-04', '05-05', '05-06', '07-20', '08-11', '09-21', '09-22', '09-23', '10-12', '11-03', '11-23'])
  })

  it('韓國 2026 依官方月曆要項：설날、추석 各三天', async () => {
    const f = await loadHolidayFile('KR')
    const y = new Set(f.days.map((d) => d.date))
    for (const d of ['2026-02-16', '2026-02-17', '2026-02-18', '2026-09-24', '2026-09-25', '2026-09-26']) expect(y.has(d)).toBe(true)
  })
})
