import type { LedgerCategory, LedgerEntry } from './schema'

/**
 * 記帳結算週期：預設每月 10 號到下個月 9 號為一期（結算日可設 1～31 號）。
 * 結算日超過當月天數時自動夾到月底（例如 31 號遇到 2 月）。
 * 金額一律以「分」整數加總，避免 0.1 + 0.2 這類浮點誤差。
 */

export interface BillingCycleRange {
  cycleKey: string
  anchorYear: number
  anchorMonth: number
  startDate: string
  endDate: string
  nextCycleStartDate: string
  totalDays: number
}

export interface CategorySummaryItem {
  categoryId: string
  label: string
  icon?: string
  color?: string
  isCustom: boolean
  type: 'expense' | 'income'
  totalAmount: number
  count: number
  percentage: number
}

export interface CycleLedgerSummary {
  cycle: BillingCycleRange
  currency: string
  totalExpense: number
  totalIncome: number
  netBalance: number
  entryCount: number
  expenseByCategory: CategorySummaryItem[]
  incomeByCategory: CategorySummaryItem[]
  entries: LedgerEntry[]
}

function clampCycleDay(day: number): number {
  if (!Number.isFinite(day)) return 10
  return Math.min(31, Math.max(1, Math.trunc(day)))
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function formatYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseYmd(dateStr: string): { year: number; month: number; day: number } {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw new Error(`Invalid date string "${dateStr}", expected YYYY-MM-DD.`)
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function shiftYearMonth(year: number, month: number, offsetMonths: number): { year: number; month: number } {
  const zeroBased = year * 12 + (month - 1) + offsetMonths
  const nextYear = Math.floor(zeroBased / 12)
  const nextMonth = (((zeroBased % 12) + 12) % 12) + 1
  return { year: nextYear, month: nextMonth }
}

function addDaysYmd(dateStr: string, deltaDays: number): string {
  const { year, month, day } = parseYmd(dateStr)
  const utc = new Date(Date.UTC(year, month - 1, day + deltaDays))
  return formatYmd(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate())
}

function diffInclusiveDays(startDate: string, endDate: string): number {
  const s = parseYmd(startDate)
  const e = parseYmd(endDate)
  const msA = Date.UTC(s.year, s.month - 1, s.day)
  const msB = Date.UTC(e.year, e.month - 1, e.day)
  return Math.round((msB - msA) / 86_400_000) + 1
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function buildCycleByAnchor(anchorYear: number, anchorMonth: number, cycleStartDay: number = 10): BillingCycleRange {
  const safeDay = clampCycleDay(cycleStartDay)
  const actualStartDay = Math.min(safeDay, getDaysInMonth(anchorYear, anchorMonth))
  const startDate = formatYmd(anchorYear, anchorMonth, actualStartDay)

  const nextYm = shiftYearMonth(anchorYear, anchorMonth, 1)
  const actualNextStartDay = Math.min(safeDay, getDaysInMonth(nextYm.year, nextYm.month))
  const nextCycleStartDate = formatYmd(nextYm.year, nextYm.month, actualNextStartDay)
  const endDate = addDaysYmd(nextCycleStartDate, -1)

  return {
    cycleKey: `${String(anchorYear).padStart(4, '0')}-${String(anchorMonth).padStart(2, '0')}`,
    anchorYear,
    anchorMonth,
    startDate,
    endDate,
    nextCycleStartDate,
    totalDays: diffInclusiveDays(startDate, endDate),
  }
}

export function getBillingCycleForDate(referenceDateStr: string, cycleStartDay: number = 10): BillingCycleRange {
  const { year, month, day } = parseYmd(referenceDateStr)
  const safeDay = clampCycleDay(cycleStartDay)
  const thisMonthStartDay = Math.min(safeDay, getDaysInMonth(year, month))

  if (day >= thisMonthStartDay) {
    return buildCycleByAnchor(year, month, safeDay)
  }
  const prevYm = shiftYearMonth(year, month, -1)
  return buildCycleByAnchor(prevYm.year, prevYm.month, safeDay)
}

export function shiftBillingCycle(currentCycle: BillingCycleRange, offsetCycles: number, cycleStartDay: number = 10): BillingCycleRange {
  const targetYm = shiftYearMonth(currentCycle.anchorYear, currentCycle.anchorMonth, offsetCycles)
  return buildCycleByAnchor(targetYm.year, targetYm.month, cycleStartDay)
}

export function isDateInBillingCycle(dateStr: string, cycle: BillingCycleRange): boolean {
  return dateStr >= cycle.startDate && dateStr <= cycle.endDate
}

export function summarizeLedgerForCycle(params: {
  entriesRecord: Record<string, LedgerEntry>
  customCategories: Record<string, LedgerCategory>
  cycle: BillingCycleRange
  currency?: string
}): CycleLedgerSummary {
  const { entriesRecord, customCategories, cycle, currency = 'TWD' } = params

  const targetCurrency = currency.toUpperCase()
  const matchedEntries: LedgerEntry[] = []
  let totalExpenseCents = 0
  let totalIncomeCents = 0

  const expenseBuckets = new Map<string, { cents: number; count: number }>()
  const incomeBuckets = new Map<string, { cents: number; count: number }>()

  for (const entry of Object.values(entriesRecord)) {
    if (entry.currency.toUpperCase() !== targetCurrency) continue
    if (!isDateInBillingCycle(entry.date, cycle)) continue

    matchedEntries.push(entry)
    const amountCents = Math.round(entry.amount * 100)

    if (entry.type === 'expense') {
      totalExpenseCents += amountCents
      const prev = expenseBuckets.get(entry.categoryId) ?? { cents: 0, count: 0 }
      expenseBuckets.set(entry.categoryId, {
        cents: prev.cents + amountCents,
        count: prev.count + 1,
      })
    } else {
      totalIncomeCents += amountCents
      const prev = incomeBuckets.get(entry.categoryId) ?? { cents: 0, count: 0 }
      incomeBuckets.set(entry.categoryId, {
        cents: prev.cents + amountCents,
        count: prev.count + 1,
      })
    }
  }

  matchedEntries.sort((a, b) => (a.date !== b.date ? (a.date > b.date ? -1 : 1) : a.id.localeCompare(b.id)))

  const buildRankedCategories = (buckets: Map<string, { cents: number; count: number }>, type: 'expense' | 'income', grandTotalCents: number): CategorySummaryItem[] => {
    const list: CategorySummaryItem[] = []
    for (const [categoryId, stat] of buckets.entries()) {
      const customMeta = customCategories[categoryId]
      const totalAmount = roundMoney(stat.cents / 100)
      const percentage = grandTotalCents > 0 ? Math.round(((stat.cents / grandTotalCents) * 100 + Number.EPSILON) * 10) / 10 : 0

      list.push({
        categoryId,
        label: customMeta ? customMeta.label : categoryId,
        icon: customMeta?.icon,
        color: customMeta?.color,
        isCustom: Boolean(customMeta),
        type,
        totalAmount,
        count: stat.count,
        percentage,
      })
    }
    return list.sort((a, b) => (b.totalAmount !== a.totalAmount ? b.totalAmount - a.totalAmount : a.categoryId.localeCompare(b.categoryId)))
  }

  return {
    cycle,
    currency: targetCurrency,
    totalExpense: roundMoney(totalExpenseCents / 100),
    totalIncome: roundMoney(totalIncomeCents / 100),
    netBalance: roundMoney((totalIncomeCents - totalExpenseCents) / 100),
    entryCount: matchedEntries.length,
    expenseByCategory: buildRankedCategories(expenseBuckets, 'expense', totalExpenseCents),
    incomeByCategory: buildRankedCategories(incomeBuckets, 'income', totalIncomeCents),
    entries: matchedEntries,
  }
}
