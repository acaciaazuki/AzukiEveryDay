import { describe, expect, it } from 'vitest'
import { addDays, dateRange } from './date'

describe('addDays', () => {
  it('跨月與跨年', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('dateRange 產生連續日期', () => {
    expect(dateRange('2026-11-29', 3)).toEqual(['2026-11-29', '2026-11-30', '2026-12-01'])
  })
})
