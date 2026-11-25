import { describe, expect, it } from 'vitest'
import { buildCycleByAnchor, getBillingCycleForDate, isDateInBillingCycle, shiftBillingCycle, summarizeLedgerForCycle } from './ledgerCycle'
import type { LedgerCategory, LedgerEntry } from './schema'

const entry = (id: string, date: string, amount: number, categoryId: string, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id,
  date,
  type: 'expense',
  amount,
  currency: 'TWD',
  categoryId,
  note: '',
  ...extra,
})

describe('記帳結算週期', () => {
  it('10 號切點：11/09 屬於 2026-10 期，11/10 屬於 2026-11 期，沒有重疊也沒有漏算', () => {
    const oct = getBillingCycleForDate('2026-11-09')
    const nov = getBillingCycleForDate('2026-11-10')
    expect(oct).toMatchObject({ cycleKey: '2026-10', startDate: '2026-10-10', endDate: '2026-11-09', totalDays: 31 })
    expect(nov).toMatchObject({ cycleKey: '2026-11', startDate: '2026-11-10', endDate: '2026-12-09', totalDays: 30 })
    expect(oct.nextCycleStartDate).toBe(nov.startDate)
    expect(isDateInBillingCycle('2026-11-09', nov)).toBe(false)
    expect(isDateInBillingCycle('2026-11-10', oct)).toBe(false)
  })

  it('跨年週期 2026-12-10 ~ 2027-01-09，可以往前往後切換', () => {
    const dec = getBillingCycleForDate('2027-01-05')
    expect(dec).toMatchObject({ cycleKey: '2026-12', startDate: '2026-12-10', endDate: '2027-01-09' })
    expect(shiftBillingCycle(dec, 1)).toMatchObject({ cycleKey: '2027-01', startDate: '2027-01-10', endDate: '2027-02-09' })
    expect(shiftBillingCycle(dec, -1)).toMatchObject({ cycleKey: '2026-11', startDate: '2026-11-10', endDate: '2026-12-09' })
    expect(shiftBillingCycle(dec, -12)).toMatchObject({ cycleKey: '2025-12' })
  })

  it('結算日設為 1 號時就是自然月', () => {
    expect(getBillingCycleForDate('2026-02-15', 1)).toMatchObject({ startDate: '2026-02-01', endDate: '2026-02-28', totalDays: 28 })
    expect(getBillingCycleForDate('2026-12-31', 1)).toMatchObject({ startDate: '2026-12-01', endDate: '2026-12-31' })
  })

  it('結算日設為 31 號遇到 2 月自動夾到月底：平年 28 天、2028 閏年 29 天', () => {
    const jan2027 = buildCycleByAnchor(2027, 1, 31)
    expect(jan2027).toMatchObject({ startDate: '2027-01-31', endDate: '2027-02-27', nextCycleStartDate: '2027-02-28' })
    expect(buildCycleByAnchor(2027, 2, 31)).toMatchObject({ startDate: '2027-02-28', endDate: '2027-03-30' })
    expect(buildCycleByAnchor(2028, 2, 31)).toMatchObject({ startDate: '2028-02-29', endDate: '2028-03-30' })
    expect(getBillingCycleForDate('2028-02-29', 31)).toMatchObject({ cycleKey: '2028-02' })
    expect(getBillingCycleForDate('2028-02-28', 31)).toMatchObject({ cycleKey: '2028-01', endDate: '2028-02-28' })
  })
})

describe('summarizeLedgerForCycle：分類加總', () => {
  const custom: Record<string, LedgerCategory> = {
    stock: { id: 'stock', label: '股票', type: 'expense', isCustom: true },
    loan: { id: 'loan', label: '貸款', type: 'expense', isCustom: true },
  }
  const cycle = getBillingCycleForDate('2026-11-15')

  it('依分類即時加總並算出佔比（含自訂分類「股票」「貸款」）', () => {
    const entries = {
      a: entry('a', '2026-11-10', 3000, 'stock'),
      b: entry('b', '2026-11-20', 6000, 'loan'),
      c: entry('c', '2026-12-09', 1000, 'food'),
      d: entry('d', '2026-11-09', 9999, 'food'),
      e: entry('e', '2026-11-11', 50000, 'salary', { type: 'income' }),
    }
    const s = summarizeLedgerForCycle({ entriesRecord: entries, customCategories: custom, cycle })
    expect(s.totalExpense).toBe(10000)
    expect(s.totalIncome).toBe(50000)
    expect(s.netBalance).toBe(40000)
    expect(s.entryCount).toBe(4)
    expect(s.expenseByCategory.map((x) => [x.label, x.totalAmount, x.percentage, x.isCustom])).toEqual([
      ['貸款', 6000, 60, true],
      ['股票', 3000, 30, true],
      ['food', 1000, 10, false],
    ])
    expect(s.incomeByCategory[0]).toMatchObject({ categoryId: 'salary', percentage: 100 })
  })

  it('不同幣別分開計算', () => {
    const entries = { a: entry('a', '2026-11-12', 100, 'food'), b: entry('b', '2026-11-12', 20, 'food', { currency: 'JPY' }) }
    expect(summarizeLedgerForCycle({ entriesRecord: entries, customCategories: {}, cycle }).totalExpense).toBe(100)
    const jpy = summarizeLedgerForCycle({ entriesRecord: entries, customCategories: {}, cycle, currency: 'jpy' })
    expect(jpy).toMatchObject({ currency: 'JPY', totalExpense: 20, entryCount: 1 })
  })

  it('以分為單位加總，0.1 + 0.2 剛好等於 0.3', () => {
    const entries = { a: entry('a', '2026-11-12', 0.1, 'coffee'), b: entry('b', '2026-11-13', 0.2, 'coffee') }
    const s = summarizeLedgerForCycle({ entriesRecord: entries, customCategories: {}, cycle })
    expect(s.totalExpense).toBe(0.3)
    expect(s.expenseByCategory[0].totalAmount).toBe(0.3)
    expect(s.netBalance).toBe(-0.3)
  })
})
