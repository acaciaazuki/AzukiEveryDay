import {
  type CalendarEvent,
  CalendarEventSchema,
  type LedgerCategory,
  LedgerCategorySchema,
  type LedgerEntry,
  LedgerEntrySchema,
  type PersonalAppData,
  PersonalAppDataSchema,
} from './schema'

/**
 * 匯入與舊版轉換：把舊版 ACACIA 匯出的 JSON（陣列或物件格式皆可）轉成 schemaVersion 2。
 * - 只保留行程與記帳；舊版的待辦（todos）、最愛地點（places）等已移除的功能一律忽略
 * - 舊版中文分類轉成內建分類代碼（例如「咖啡」→ coffee），不認得的分類自動註冊成自訂分類
 * - 已經是 v2 的資料直接通過 Zod 驗證
 */

// 舊版資料的欄位不固定，用寬鬆的物件型別讀取
type LooseRecord = Record<string, any>

const LEGACY_CATEGORY_MAP: Record<string, { id: string; type: 'expense' | 'income' }> = {
  食: { id: 'food', type: 'expense' },
  餐飲: { id: 'food', type: 'expense' },
  飲食: { id: 'food', type: 'expense' },
  咖啡: { id: 'coffee', type: 'expense' },
  飲料: { id: 'coffee', type: 'expense' },
  交通: { id: 'transport', type: 'expense' },
  日常: { id: 'daily', type: 'expense' },
  日用: { id: 'daily', type: 'expense' },
  購物: { id: 'shopping', type: 'expense' },
  服飾: { id: 'shopping', type: 'expense' },
  娛樂: { id: 'entertainment', type: 'expense' },
  醫療: { id: 'medical', type: 'expense' },
  居住: { id: 'housing', type: 'expense' },
  房租: { id: 'housing', type: 'expense' },
  薪資: { id: 'salary', type: 'income' },
  薪水: { id: 'salary', type: 'income' },
  獎金: { id: 'bonus', type: 'income' },
  其他: { id: 'other', type: 'expense' },
}

const BUILTIN_CATEGORY_IDS = new Set(Object.values(LEGACY_CATEGORY_MAP).map((v) => v.id))

function normalizeDate(raw: unknown, fallbackDate: string): string {
  if (typeof raw !== 'string') return fallbackDate
  const trimmed = raw.trim().replace(/\//g, '-')
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!match) return fallbackDate
  const [, y, m, d] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function normalizeTime(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return undefined
  const hh = Number(match[1])
  const mm = Number(match[2])
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function toCustomCategoryId(label: string, type: 'expense' | 'income'): string {
  let hash = 5381
  const input = `${type}:${label}`
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return `custom_${(hash >>> 0).toString(36)}`
}

function extractRecordOrArray(source: unknown): Array<[string | null, LooseRecord]> {
  if (!source) return []
  if (Array.isArray(source)) {
    return source.filter((item) => item && typeof item === 'object').map((item): [string | null, LooseRecord] => [typeof item.id === 'string' ? item.id : null, item])
  }
  if (typeof source === 'object') {
    return Object.entries(source as Record<string, LooseRecord>).filter(([, val]) => val && typeof val === 'object')
  }
  return []
}

export function migrateToV2(rawInput: unknown, nowIso: string = new Date().toISOString()): PersonalAppData {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new Error('Invalid import payload: expected a JSON object.')
  }

  const raw = rawInput as LooseRecord

  if (raw.schemaVersion === 2) {
    return PersonalAppDataSchema.parse({
      ...raw,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso,
    })
  }

  const fallbackDate = nowIso.slice(0, 10)
  const migratedTimestamp = typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt)) ? new Date(raw.updatedAt).toISOString() : nowIso

  const events: Record<string, CalendarEvent> = {}
  const eventsUpdatedAt: Record<string, string> = {}

  const rawEventsSource = raw.events ?? raw.calendarEvents ?? raw.schedules
  let autoIdx = 0

  for (const [keyId, item] of extractRecordOrArray(rawEventsSource)) {
    autoIdx += 1
    const id = keyId || (typeof item.id === 'string' && item.id) || `legacy_evt_${autoIdx}`
    const title = String(item.title ?? item.name ?? item.summary ?? '').trim()
    if (!title) continue

    const startDate = normalizeDate(item.startDate ?? item.date ?? item.start, fallbackDate)
    const endDate = normalizeDate(item.endDate ?? item.end ?? startDate, startDate)
    const startTime = normalizeTime(item.startTime ?? item.time)
    const endTime = normalizeTime(item.endTime)
    const isAllDay = typeof item.isAllDay === 'boolean' ? item.isAllDay : startTime === undefined

    const noteParts = [item.location ? `📍 ${String(item.location).trim()}` : '', item.note ?? item.memo ?? '']
      .map((s) => String(s).trim())
      .filter(Boolean)

    events[id] = CalendarEventSchema.parse({
      id,
      title: title.slice(0, 200),
      startDate,
      endDate: endDate >= startDate ? endDate : startDate,
      isAllDay,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      color: typeof item.color === 'string' && item.color ? item.color : 'sage',
      note: noteParts.join('\n').slice(0, 2000),
      trashedAt: typeof item.trashedAt === 'string' ? item.trashedAt : null,
    })

    eventsUpdatedAt[id] = typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt)) ? new Date(item.updatedAt).toISOString() : migratedTimestamp
  }

  const ledgerEntries: Record<string, LedgerEntry> = {}
  const ledgerUpdatedAt: Record<string, string> = {}
  const customCategories: Record<string, LedgerCategory> = {}
  const categoriesUpdatedAt: Record<string, string> = {}

  for (const [, cat] of extractRecordOrArray(raw.customCategories ?? raw.categories)) {
    const label = String(cat.label ?? cat.name ?? '').trim()
    if (!label || LEGACY_CATEGORY_MAP[label]) continue
    const type: 'expense' | 'income' = cat.type === 'income' ? 'income' : 'expense'
    const catId = typeof cat.id === 'string' && cat.id && !BUILTIN_CATEGORY_IDS.has(cat.id) ? cat.id : toCustomCategoryId(label, type)

    customCategories[catId] = LedgerCategorySchema.parse({
      id: catId,
      label: label.slice(0, 50),
      type,
      icon: typeof cat.icon === 'string' ? cat.icon : undefined,
      isCustom: true,
    })
    categoriesUpdatedAt[catId] = migratedTimestamp
  }

  const rawLedgerSource = raw.ledgerEntries ?? raw.expenses ?? raw.transactions ?? raw.ledger ?? raw.records

  for (const [keyId, item] of extractRecordOrArray(rawLedgerSource)) {
    autoIdx += 1
    const rawAmount = Number(item.amount ?? item.price ?? item.cost)
    if (!Number.isFinite(rawAmount) || rawAmount < 0) continue

    const id = keyId || (typeof item.id === 'string' && item.id) || `legacy_ldg_${autoIdx}`
    const rawCatText = String(item.categoryId ?? item.category ?? '其他').trim() || '其他'
    const explicitType: 'expense' | 'income' | undefined = item.type === 'income' || item.isIncome === true ? 'income' : item.type === 'expense' ? 'expense' : undefined

    let categoryId: string
    let resolvedType: 'expense' | 'income'

    if (BUILTIN_CATEGORY_IDS.has(rawCatText)) {
      categoryId = rawCatText
      resolvedType = explicitType ?? (rawCatText === 'salary' || rawCatText === 'bonus' ? 'income' : 'expense')
    } else if (LEGACY_CATEGORY_MAP[rawCatText]) {
      categoryId = LEGACY_CATEGORY_MAP[rawCatText].id
      resolvedType = explicitType ?? LEGACY_CATEGORY_MAP[rawCatText].type
    } else {
      resolvedType = explicitType ?? 'expense'
      categoryId = toCustomCategoryId(rawCatText, resolvedType)
      if (!customCategories[categoryId]) {
        customCategories[categoryId] = LedgerCategorySchema.parse({
          id: categoryId,
          label: rawCatText.slice(0, 50),
          type: resolvedType,
          isCustom: true,
        })
        categoriesUpdatedAt[categoryId] = migratedTimestamp
      }
    }

    ledgerEntries[id] = LedgerEntrySchema.parse({
      id,
      date: normalizeDate(item.date ?? item.createdAt, fallbackDate),
      type: resolvedType,
      amount: rawAmount,
      currency: typeof item.currency === 'string' && item.currency.length === 3 ? item.currency.toUpperCase() : 'TWD',
      categoryId,
      note: String(item.note ?? item.title ?? item.item ?? '')
        .trim()
        .slice(0, 500),
    })

    ledgerUpdatedAt[id] = typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt)) ? new Date(item.updatedAt).toISOString() : migratedTimestamp
  }

  return PersonalAppDataSchema.parse({
    schemaVersion: 2,
    updatedAt: migratedTimestamp,
    events,
    ledgerEntries,
    customCategories,
    joinedSpaces: {},
    settings: {
      locale: raw.settings?.locale ?? 'zh-TW',
      weekStartsOn: raw.settings?.weekStartsOn === 0 ? 0 : 1,
      defaultCurrency: raw.settings?.defaultCurrency ?? 'TWD',
      holidayRegion: raw.settings?.holidayRegion ?? 'TW',
      billingCycleStartDay: raw.settings?.billingCycleStartDay ?? 10,
    },
    syncMeta: {
      events: { updatedAt: eventsUpdatedAt, tombstones: {} },
      ledgerEntries: { updatedAt: ledgerUpdatedAt, tombstones: {} },
      customCategories: { updatedAt: categoriesUpdatedAt, tombstones: {} },
      joinedSpaces: { updatedAt: {}, tombstones: {} },
      settingsFieldUpdatedAt: {},
    },
  })
}
