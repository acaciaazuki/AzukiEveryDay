import type { BusySlot, CalendarEvent, SharedEvent, SharedSpaceData } from './schema'

/**
 * 匯出標準 iCalendar（RFC 5545）.ics：
 * - 全天行程的 DTEND 為「結束日的隔天」（exclusive）
 * - 跨午夜（結束時間早於開始時間）自動進位到隔天；沒有結束時間補 1 小時
 * - 每行以 UTF-8 計算最多 75 octets 摺行，不會切斷中文或 Emoji
 * - 共享空間預設不匯出忙碌時段；匯出時只顯示「某某（忙碌中）」，只有自己的時段可選擇顯示原始標題
 */

export interface ExportPersonalIcsOptions {
  calendarName?: string
  timeZone?: string
  nowIso?: string
}

export interface ExportSharedSpaceIcsOptions extends ExportPersonalIcsOptions {
  includeBusySlots?: boolean
  formatBusySummary?: (ownerDisplayName: string) => string
  revealOwnBusyTitles?: boolean
  currentUserUid?: string
  ownBusyTitleMap?: Record<string, string>
}

interface NormalizedVEventInput {
  uid: string
  summary: string
  description: string
  startDate: string
  endDate: string
  isAllDay: boolean
  startTime?: string
  endTime?: string
  classification?: 'PUBLIC' | 'PRIVATE'
  transp?: 'OPAQUE' | 'TRANSPARENT'
}

const CRLF = '\r\n'
const MAX_LINE_OCTETS = 75
const utf8Encoder = new TextEncoder()

export function escapeIcsText(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

export function foldIcsLine(line: string): string {
  if (utf8Encoder.encode(line).length <= MAX_LINE_OCTETS) {
    return line
  }
  const lines: string[] = []
  let currentChunk = ''
  let currentBytes = 0
  let maxBytesForCurrentLine = MAX_LINE_OCTETS

  for (const codePointChar of line) {
    const charBytes = utf8Encoder.encode(codePointChar).length
    if (currentBytes + charBytes > maxBytesForCurrentLine && currentChunk.length > 0) {
      lines.push(currentChunk)
      currentChunk = codePointChar
      currentBytes = charBytes
      maxBytesForCurrentLine = MAX_LINE_OCTETS - 1
    } else {
      currentChunk += codePointChar
      currentBytes += charBytes
    }
  }
  if (currentChunk.length > 0) {
    lines.push(currentChunk)
  }
  return lines.map((part, idx) => (idx === 0 ? part : ` ${part}`)).join(CRLF)
}

function addDaysYmd(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays))
  const yy = String(utc.getUTCFullYear()).padStart(4, '0')
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(utc.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function toCompactDate(dateStr: string): string {
  return dateStr.replace(/-/g, '')
}

function toCompactDateTime(dateStr: string, timeStr: string): string {
  const [hh, mm] = timeStr.split(':')
  return `${toCompactDate(dateStr)}T${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`
}

export function toIcsUtcTimestamp(isoStr: string): string {
  const ms = Date.parse(isoStr)
  const d = Number.isNaN(ms) ? new Date() : new Date(ms)
  const yy = String(d.getUTCFullYear()).padStart(4, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${yy}${mm}${dd}T${hh}${mi}${ss}Z`
}

function addOneHour(dateStr: string, timeStr: string): { endDate: string; endTime: string } {
  const [hh, mm] = timeStr.split(':').map(Number)
  const totalMinutes = hh * 60 + mm + 60
  const dayOverflow = Math.floor(totalMinutes / 1440)
  const nextMinutes = totalMinutes % 1440
  const nextHh = String(Math.floor(nextMinutes / 60)).padStart(2, '0')
  const nextMm = String(nextMinutes % 60).padStart(2, '0')
  return {
    endDate: dayOverflow > 0 ? addDaysYmd(dateStr, dayOverflow) : dateStr,
    endTime: `${nextHh}:${nextMm}`,
  }
}

function sanitizeUid(rawUid: string): string {
  const safe = rawUid.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${safe}@azukieveryday.pages.dev`
}

function buildVEventLines(item: NormalizedVEventInput, dtstamp: string, timeZone?: string): string[] {
  const lines: string[] = ['BEGIN:VEVENT', `UID:${sanitizeUid(item.uid)}`, `DTSTAMP:${dtstamp}`]

  const effectiveAllDay = item.isAllDay || !item.startTime

  if (effectiveAllDay) {
    const safeEndDate = item.endDate >= item.startDate ? item.endDate : item.startDate
    const exclusiveEndDate = addDaysYmd(safeEndDate, 1)
    lines.push(`DTSTART;VALUE=DATE:${toCompactDate(item.startDate)}`)
    lines.push(`DTEND;VALUE=DATE:${toCompactDate(exclusiveEndDate)}`)
  } else {
    const startTime = item.startTime!
    let resolvedEndDate = item.endDate >= item.startDate ? item.endDate : item.startDate
    let resolvedEndTime: string

    if (!item.endTime) {
      const plusOne = addOneHour(item.startDate, startTime)
      resolvedEndDate = resolvedEndDate > plusOne.endDate ? resolvedEndDate : plusOne.endDate
      resolvedEndTime = plusOne.endTime
    } else {
      resolvedEndTime = item.endTime
      if (resolvedEndDate === item.startDate && resolvedEndTime < startTime) {
        resolvedEndDate = addDaysYmd(resolvedEndDate, 1)
      } else if (resolvedEndDate === item.startDate && resolvedEndTime === startTime) {
        const plusOne = addOneHour(item.startDate, startTime)
        resolvedEndDate = plusOne.endDate
        resolvedEndTime = plusOne.endTime
      }
    }

    const tzParam = timeZone ? `;TZID=${timeZone}` : ''
    lines.push(`DTSTART${tzParam}:${toCompactDateTime(item.startDate, startTime)}`)
    lines.push(`DTEND${tzParam}:${toCompactDateTime(resolvedEndDate, resolvedEndTime)}`)
  }

  lines.push(`SUMMARY:${escapeIcsText(item.summary)}`)
  if (item.description.trim().length > 0) {
    lines.push(`DESCRIPTION:${escapeIcsText(item.description.trim())}`)
  }
  if (item.classification) {
    lines.push(`CLASS:${item.classification}`)
  }
  if (item.transp) {
    lines.push(`TRANSP:${item.transp}`)
  }
  lines.push('END:VEVENT')
  return lines
}

function serializeVCalendar(calendarName: string, items: NormalizedVEventInput[], options: { timeZone?: string; nowIso?: string }): string {
  const dtstamp = toIcsUtcTimestamp(options.nowIso ?? new Date().toISOString())
  const sorted = [...items].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate)
    const tA = a.startTime ?? '00:00'
    const tB = b.startTime ?? '00:00'
    if (tA !== tB) return tA.localeCompare(tB)
    return a.uid.localeCompare(b.uid)
  })

  const rawLines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ACACIA Everyday//Calendar v2//TW', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escapeIcsText(calendarName)}`]

  if (options.timeZone) {
    rawLines.push(`X-WR-TIMEZONE:${escapeIcsText(options.timeZone)}`)
  }
  for (const item of sorted) {
    rawLines.push(...buildVEventLines(item, dtstamp, options.timeZone))
  }
  rawLines.push('END:VCALENDAR')

  return rawLines.map(foldIcsLine).join(CRLF) + CRLF
}

export function exportPersonalCalendarToIcs(eventsRecord: Record<string, CalendarEvent>, options: ExportPersonalIcsOptions = {}): string {
  const calendarName = options.calendarName?.trim() || 'ACACIA 我的行事曆'
  const vEvents: NormalizedVEventInput[] = []

  for (const evt of Object.values(eventsRecord)) {
    if (evt.trashedAt !== null) continue
    vEvents.push({
      uid: `personal_${evt.id}`,
      summary: evt.title,
      description: evt.note ?? '',
      startDate: evt.startDate,
      endDate: evt.endDate,
      isAllDay: evt.isAllDay,
      startTime: evt.startTime,
      endTime: evt.endTime,
    })
  }
  return serializeVCalendar(calendarName, vEvents, options)
}

export function exportSharedSpaceToIcs(space: SharedSpaceData, options: ExportSharedSpaceIcsOptions = {}): string {
  const calendarName = options.calendarName?.trim() || `ACACIA - ${space.name}`
  const includeBusySlots = options.includeBusySlots ?? false
  const formatBusySummary = options.formatBusySummary ?? ((name: string) => `${name}（忙碌中）`)

  const vEvents: NormalizedVEventInput[] = []

  for (const evt of Object.values(space.events) as SharedEvent[]) {
    if (evt.trashedAt !== null) continue
    const metaFooter = evt.createdByName
      ? `[建立：${evt.createdByName}${evt.lastEditedByName && evt.lastEditedByName !== evt.createdByName ? `／最後編輯：${evt.lastEditedByName}` : ''}]`
      : ''
    const description = [evt.note?.trim(), metaFooter].filter(Boolean).join('\n\n')

    vEvents.push({
      uid: `space_${space.spaceId}_evt_${evt.id}`,
      summary: evt.title,
      description,
      startDate: evt.startDate,
      endDate: evt.endDate,
      isAllDay: evt.isAllDay,
      startTime: evt.startTime,
      endTime: evt.endTime,
      transp: evt.isAllDay ? 'TRANSPARENT' : 'OPAQUE',
    })
  }

  if (includeBusySlots) {
    for (const slot of Object.values(space.busySlots) as BusySlot[]) {
      const canRevealOwn =
        Boolean(options.revealOwnBusyTitles) && Boolean(options.currentUserUid) && slot.ownerUid === options.currentUserUid && Boolean(options.ownBusyTitleMap?.[slot.id])

      const summary = canRevealOwn ? `${slot.ownerDisplayName}：${options.ownBusyTitleMap![slot.id]}` : formatBusySummary(slot.ownerDisplayName)

      vEvents.push({
        uid: `space_${space.spaceId}_busy_${slot.id}`,
        summary,
        description: '',
        startDate: slot.startDate,
        endDate: slot.endDate,
        isAllDay: slot.isAllDay,
        startTime: slot.startTime,
        endTime: slot.endTime,
        classification: 'PRIVATE',
        transp: 'OPAQUE',
      })
    }
  }

  return serializeVCalendar(calendarName, vEvents, options)
}

export function buildSafeIcsFileName(baseLabel: string, exportDateStr: string = new Date().toISOString().slice(0, 10)): string {
  const cleaned = baseLabel
    .trim()
    // oxlint-disable-next-line no-control-regex -- 檔名要去掉控制字元
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 50)
  return `${cleaned || 'acacia_calendar'}_${exportDateStr}.ics`
}
