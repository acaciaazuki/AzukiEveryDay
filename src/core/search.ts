import type { CalendarEvent, LedgerEntry, SharedEvent } from './schema'

/**
 * ⌘K 全域搜尋：個人行程、共享空間行程與記帳紀錄。
 * 不分大小寫、全形半形，空白分隔的每個關鍵字都要命中（AND）。
 */
export type SearchHit =
  | { kind: 'event'; id: string; title: string; date: string; event: CalendarEvent }
  | { kind: 'shared'; id: string; title: string; date: string; spaceId: string; spaceName: string; event: SharedEvent }
  | { kind: 'ledger'; id: string; title: string; date: string; entry: LedgerEntry }

const normalize = (s: string) => s.normalize('NFKC').toLowerCase()

export function matchesQuery(fields: readonly (string | undefined)[], query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return false
  const hay = normalize(fields.filter(Boolean).join(' '))
  return words.every((w) => hay.includes(w))
}

export function searchAll(params: {
  query: string
  events: Record<string, CalendarEvent>
  spaces: readonly { spaceId: string; name: string; events: Record<string, SharedEvent> }[]
  ledgerEntries: Record<string, LedgerEntry>
  /** 記帳分類代碼 → 顯示名稱（內建分類要翻譯） */
  categoryLabel: (categoryId: string) => string
  limit?: number
}): SearchHit[] {
  const { query, events, spaces, ledgerEntries, categoryLabel, limit = 30 } = params
  const hits: SearchHit[] = []
  for (const e of Object.values(events)) {
    if (e.trashedAt === null && matchesQuery([e.title, e.note], query)) hits.push({ kind: 'event', id: e.id, title: e.title, date: e.startDate, event: e })
  }
  for (const s of spaces) {
    for (const e of Object.values(s.events)) {
      if (e.trashedAt === null && matchesQuery([e.title, e.note, s.name], query))
        hits.push({ kind: 'shared', id: `${s.spaceId}:${e.id}`, title: e.title, date: e.startDate, spaceId: s.spaceId, spaceName: s.name, event: e })
    }
  }
  for (const l of Object.values(ledgerEntries)) {
    const label = categoryLabel(l.categoryId)
    if (matchesQuery([l.note, label, String(l.amount)], query)) hits.push({ kind: 'ledger', id: l.id, title: l.note || label, date: l.date, entry: l })
  }
  // 新的日期在前
  return hits.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1)).slice(0, limit)
}
