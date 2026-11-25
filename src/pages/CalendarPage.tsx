import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../components/AcaciaIcons'
import { BatchEventsDialog } from '../components/BatchEventsDialog'
import { Button } from '../components/Button'
import { EventDialog, type EventTarget } from '../components/EventDialog'
import { EventIconArt } from '../components/EventIcon'
import { PageHead } from '../components/PageHead'
import { joinSpace } from '../components/joinSpace'
import { CreateSpaceDialog, SpaceSettingsDialog } from '../components/SpaceDialogs'
import { TrashDrawer } from '../components/TrashDrawer'
import { addDays, toLocalISO } from '../core/date'
import { dayLabel, monthCells, monthLabel, shiftMonth, timelineSpan, weekdayNames } from '../core/calendar'
import { buildCalendarItems, itemsOnDate, type CalendarItem } from '../core/calendarItems'
import { paletteOf } from '../core/colors'
import { EVENT_ICON_KEYS, eventIconOf, type EventIconKey } from '../core/eventIcons'
import type { CalendarEvent } from '../core/schema'
import { formatTimeRange } from '../core/time'
import { HOLIDAY_STYLE, useHolidayLabel, useHolidaysByDate, WORKDAY_STYLE } from '../hooks/useHolidays'
import { useLocalPref } from '../hooks/useLocalPref'
import { useNow } from '../hooks/useNow'
import { isNativeApp } from '../adapters/kv'
import { usePersonalStore } from '../store/usePersonalStore'
import { useSpacesStore } from '../store/useSpacesStore'
import { useSyncStore } from '../store/useSyncStore'

type Editing = { target: EventTarget; event: CalendarEvent | null; date: string }

const iconOf = (item: CalendarItem): EventIconKey => {
  if (item.kind === 'busy') return 'default'
  const icon = item.event.icon
  return icon && (EVENT_ICON_KEYS as readonly string[]).includes(icon) ? (icon as EventIconKey) : eventIconOf({ title: item.title })
}

/**
 * 行事曆頁（首頁）：月檢視／日時間軸，疊加顯示「我的行事曆」與多個共享空間。
 * 共享空間的忙碌時段：其他成員只顯示「忙碌中」，自己的在本機還原原始標題。
 */
export function CalendarPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage
  const today = toLocalISO(useNow())
  const events = usePersonalStore((s) => s.data.events)
  const joined = usePersonalStore((s) => s.data.joinedSpaces)
  const weekStartsOn = usePersonalStore((s) => s.data.settings.weekStartsOn)
  const user = usePersonalStore((s) => s.currentUser)
  const spaces = useSpacesStore((s) => s.spaces)
  const revoked = useSyncStore((s) => s.revokedSpaceIds)
  const signedIn = useSyncStore((s) => s.token !== null && s.status !== 'account_mismatch')
  const holidays = useHolidaysByDate()
  const holidayLabel = useHolidayLabel()

  const [personalVisible, setPersonalVisible] = useLocalPref<boolean>('acacia_cal_personal_visible', true)
  const [view, setView] = useLocalPref<'month' | 'day'>('acacia_cal_view', 'month')
  const [selected, setSelected] = useState(today)
  const [ym, setYm] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }))
  const [editing, setEditing] = useState<Editing | null>(null)
  const [batch, setBatch] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [creatingSpace, setCreatingSpace] = useState(false)
  const [spaceSettings, setSpaceSettings] = useState<string | null>(null)

  const items = useMemo(() => buildCalendarItems({ personalEvents: events, personalVisible, spaces, joinedSpaces: joined, currentUid: user?.uid ?? null }), [events, personalVisible, spaces, joined, user])
  const trashCount = useMemo(
    () => Object.values(events).filter((e) => e.trashedAt).length + Object.values(spaces).reduce((n, s) => n + Object.values(s.events).filter((e) => e.trashedAt).length, 0),
    [events, spaces],
  )

  const select = (d: string) => {
    setSelected(d)
    setYm({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) - 1 })
  }
  const open = (item: CalendarItem) => {
    if (item.kind === 'personal') setEditing({ target: { kind: 'personal' }, event: item.event, date: item.event.startDate })
    else if (item.kind === 'shared') setEditing({ target: { kind: 'space', spaceId: item.spaceId }, event: item.event, date: item.event.startDate })
  }
  const label = (item: CalendarItem) => (item.kind === 'busy' ? (item.title ?? t('calendar.busy', { name: item.ownerName })) : item.title)
  const addTarget: EventTarget = { kind: 'personal' }

  const shift = (delta: number) => {
    if (view === 'day') return select(addDays(selected, delta))
    setYm(shiftMonth(ym.year, ym.month, delta))
  }

  return (
    <div className="grid gap-4">
      <PageHead
        title={t('calendar.title')}
        actions={
          <>
            <div role="radiogroup" aria-label={t('calendar.view')} className="flex rounded-(--radius-control) border border-line bg-paper p-0.5">
              {(['month', 'day'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                  className={`rounded-[8px] px-3 py-2 text-xs font-bold ${view === v ? 'bg-sage-light text-sage-dark' : 'text-muted'}`}
                >
                  {t(`calendar.${v}View`)}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="page" onClick={() => setTrashOpen(true)}>
              {t('trash.button')}
              {trashCount > 0 && <span className="ml-1.5 rounded-full bg-oat px-1.5 text-[length:calc(10px*var(--fs))]">{trashCount}</span>}
            </Button>
            <Button variant="ghost" size="page" onClick={() => setBatch(true)}>
              {t('batch.button')}
            </Button>
            <Button size="page" onClick={() => setEditing({ target: addTarget, event: null, date: selected })}>
              {t('event.addButton')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 min-[1001px]:grid-cols-[230px_1fr]">
        {/* 行事曆來源：個人＋共享空間，可各自顯示／隱藏 */}
        <aside aria-label={t('calendar.sources')} className="grid content-start gap-2 rounded-(--radius-card) border border-line bg-paper p-3">
          <h2 className="px-1 text-xs font-bold text-muted">{t('calendar.sources')}</h2>
          <label className="flex items-center gap-2 rounded-(--radius-control) px-2 py-1.5 text-sm font-semibold hover:bg-oat">
            <input type="checkbox" className="accent-[#527b67]" checked={personalVisible} onChange={(e) => setPersonalVisible(e.target.checked)} />
            <span className="size-2.5 rounded-full" style={{ background: paletteOf('sage').dot }} />
            {t('calendar.personal')}
          </label>
          {Object.values(joined).map((ref) => {
            const space = spaces[ref.spaceId]
            const gone = revoked.includes(ref.spaceId)
            return (
              <div key={ref.spaceId} className="flex items-center gap-1 rounded-(--radius-control) px-2 py-1.5 hover:bg-oat">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" className="accent-[#527b67]" checked={ref.visible} onChange={(e) => usePersonalStore.getState().updateJoinedSpace(ref.spaceId, { visible: e.target.checked })} />
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: paletteOf(ref.color, 'forest').dot }} />
                  <span className={`truncate ${gone ? 'text-muted line-through' : ''}`}>{ref.localAlias || space?.name || t('spaces.loading')}</span>
                  {ref.projectBusySlots && <Icon name="clock" className="shrink-0 text-muted" title={t('spaces.busyOn')} />}
                </label>
                <button type="button" aria-label={t('spaces.settingsOf', { name: ref.localAlias || space?.name || '' })} onClick={() => setSpaceSettings(ref.spaceId)} className="grid size-7 place-items-center rounded-full text-muted hover:bg-sage-light">
                  <Icon name="settings" />
                </button>
              </div>
            )
          })}
          {isNativeApp() ? (
            <p className="px-1 text-[length:calc(11px*var(--fs))] leading-relaxed text-muted">{t('spaces.nativeNote')}</p>
          ) : signedIn ? (
            <div className="mt-1 grid gap-1.5">
              <Button variant="ghost" onClick={() => setCreatingSpace(true)}>
                {t('spaces.create')}
              </Button>
              <Button variant="ghost" onClick={() => void joinSpace(t)}>
                {t('spaces.join')}
              </Button>
            </div>
          ) : (
            <p className="px-1 text-[length:calc(11px*var(--fs))] leading-relaxed text-muted">{t('spaces.signInFirst')}</p>
          )}
        </aside>

        <section className="grid content-start gap-3 rounded-(--radius-card) border border-line bg-paper p-3 min-[681px]:p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold" aria-live="polite">
              {view === 'month' ? monthLabel(ym.year, ym.month, lng) : dayLabel(selected, lng)}
            </h2>
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label={t('calendar.prev')} onClick={() => shift(-1)} className="grid size-8 place-items-center rounded-full border border-line hover:bg-sage-light">
                ‹
              </button>
              <button type="button" onClick={() => select(today)} className="h-8 rounded-full border border-line px-3 text-[length:calc(11px*var(--fs))] font-bold hover:bg-sage-light">
                {t('calendar.today')}
              </button>
              <button type="button" aria-label={t('calendar.next')} onClick={() => shift(1)} className="grid size-8 place-items-center rounded-full border border-line hover:bg-sage-light">
                ›
              </button>
            </div>
          </div>

          {view === 'month' ? (
            <>
              <div role="grid" aria-label={monthLabel(ym.year, ym.month, lng)} className="grid grid-cols-7 gap-px overflow-hidden rounded-(--radius-control) border border-line bg-line">
                {weekdayNames(lng, weekStartsOn).map((w, i) => (
                  <div key={i} role="columnheader" className="bg-oat py-1.5 text-center text-[length:calc(11px*var(--fs))] font-bold text-muted">
                    {w}
                  </div>
                ))}
                {monthCells(ym.year, ym.month, weekStartsOn).map((d, i) => {
                  if (!d) return <div key={`e${i}`} className="min-h-20 bg-paper/60" />
                  const dayItems = itemsOnDate(items, d)
                  const hol = holidays.get(d)?.[0]
                  return (
                    <div
                      key={d}
                      role="gridcell"
                      aria-selected={d === selected}
                      onClick={() => setSelected(d)}
                      onDoubleClick={() => setEditing({ target: addTarget, event: null, date: d })}
                      className={`min-h-20 cursor-pointer bg-paper p-1 align-top min-[681px]:min-h-24 ${d === selected ? 'outline-2 -outline-offset-2 outline-sage' : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`grid size-6 place-items-center rounded-full text-[length:calc(11px*var(--fs))] font-bold ${d === today ? 'bg-sage text-white' : hol && !hol.work ? 'text-[#c4562c]' : ''}`}>{Number(d.slice(8))}</span>
                        {hol && (
                          <span className="truncate rounded px-1 text-[length:calc(9px*var(--fs))] font-semibold" style={hol.work ? { background: WORKDAY_STYLE.bg, color: WORKDAY_STYLE.fg } : { background: HOLIDAY_STYLE.bg, color: HOLIDAY_STYLE.fg }}>
                            {holidayLabel(hol)}
                          </span>
                        )}
                      </div>
                      <ul className="mt-0.5 grid gap-0.5">
                        {dayItems.slice(0, 3).map((it) => (
                          <li key={it.key}>
                            <Chip item={it} label={label(it)} onOpen={open} />
                          </li>
                        ))}
                        {dayItems.length > 3 && <li className="px-1 text-[length:calc(10px*var(--fs))] font-semibold text-muted">{t('calendar.more', { count: dayItems.length - 3 })}</li>}
                      </ul>
                    </div>
                  )
                })}
              </div>
              <DayAgenda date={selected} items={itemsOnDate(items, selected)} label={label} onOpen={open} onAdd={() => setEditing({ target: addTarget, event: null, date: selected })} iconOf={iconOf} holidays={(holidays.get(selected) ?? []).map(holidayLabel)} />
            </>
          ) : (
            <DayTimeline date={selected} items={itemsOnDate(items, selected)} label={label} onOpen={open} iconOf={iconOf} holidays={(holidays.get(selected) ?? []).map(holidayLabel)} />
          )}
        </section>
      </div>

      {editing && <EventDialog target={editing.target} event={editing.event} date={editing.date} onClose={() => setEditing(null)} />}
      {batch && <BatchEventsDialog target={addTarget} initialDate={selected} onClose={() => setBatch(false)} />}
      <TrashDrawer open={trashOpen} onOpenChange={setTrashOpen} />
      {creatingSpace && <CreateSpaceDialog onClose={() => setCreatingSpace(false)} />}
      {spaceSettings && <SpaceSettingsDialog spaceId={spaceSettings} onClose={() => setSpaceSettings(null)} />}
    </div>
  )
}

function chipStyle(item: CalendarItem) {
  const p = paletteOf(item.color, item.kind === 'personal' ? 'sage' : 'forest')
  if (item.kind === 'busy') return { background: 'repeating-linear-gradient(135deg,#f4f3ee 0 6px,#ebe8e1 6px 8px)', color: '#55655d', borderLeft: `3px solid ${p.dot}` }
  return { background: p.bg, color: p.fg, borderLeft: `3px solid ${p.dot}` }
}

function Chip({ item, label, onOpen }: { item: CalendarItem; label: string; onOpen: (i: CalendarItem) => void }) {
  return (
    <button
      type="button"
      data-kind={item.kind}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(item)
      }}
      className="block w-full truncate rounded-[5px] px-1 py-0.5 text-left text-[length:calc(10px*var(--fs))] font-semibold"
      style={chipStyle(item)}
      title={label}
    >
      {!item.event.isAllDay && item.event.startTime && <span className="mr-1 opacity-70">{item.event.startTime}</span>}
      {label}
    </button>
  )
}

function ItemRow({ item, label, onOpen, iconOf }: { item: CalendarItem; label: string; onOpen: (i: CalendarItem) => void; iconOf: (i: CalendarItem) => EventIconKey }) {
  const { t } = useTranslation()
  const time = item.event.isAllDay ? t('event.allDay') : formatTimeRange(item.event.startTime ?? '', item.event.endTime ?? '')
  const where = item.kind === 'personal' ? t('calendar.personal') : item.spaceName
  return (
    <button type="button" disabled={item.kind === 'busy'} onClick={() => onOpen(item)} className="flex w-full items-center gap-3 rounded-(--radius-control) px-3 py-2 text-left disabled:cursor-default" style={chipStyle(item)}>
      {item.kind !== 'busy' && <EventIconArt icon={iconOf(item)} size={22} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{label}</span>
        <span className="block text-[length:calc(11px*var(--fs))] opacity-80">
          {time} · {where}
          {item.kind === 'shared' && item.event.lastEditedByName ? ` · ${t('calendar.editedBy', { name: item.event.lastEditedByName })}` : ''}
          {item.event.startDate !== item.event.endDate ? ` · ${item.event.startDate} – ${item.event.endDate}` : ''}
        </span>
      </span>
    </button>
  )
}

function DayAgenda({ date, items, label, onOpen, onAdd, iconOf, holidays }: { date: string; items: CalendarItem[]; label: (i: CalendarItem) => string; onOpen: (i: CalendarItem) => void; onAdd: () => void; iconOf: (i: CalendarItem) => EventIconKey; holidays: string[] }) {
  const { t, i18n } = useTranslation()
  return (
    <section aria-label={dayLabel(date, i18n.resolvedLanguage)} className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">
          {dayLabel(date, i18n.resolvedLanguage)}
          {holidays.length > 0 && <span className="ml-2 text-xs font-semibold text-[#b2552f]">{holidays.join('・')}</span>}
        </h3>
        <button type="button" onClick={onAdd} className="text-xs font-bold text-sage-dark hover:underline">
          {t('event.addOnDay')}
        </button>
      </div>
      {items.length === 0 ? <p className="py-3 text-center text-xs text-muted">{t('calendar.noEvents')}</p> : items.map((it) => <ItemRow key={it.key} item={it} label={label(it)} onOpen={onOpen} iconOf={iconOf} />)}
    </section>
  )
}

const HOUR_PX = 44

function DayTimeline({ date, items, label, onOpen, iconOf, holidays }: { date: string; items: CalendarItem[]; label: (i: CalendarItem) => string; onOpen: (i: CalendarItem) => void; iconOf: (i: CalendarItem) => EventIconKey; holidays: string[] }) {
  const { t } = useTranslation()
  const allDay = items.filter((i) => timelineSpan(i.event, date) === null)
  const timed = items.map((i) => ({ item: i, span: timelineSpan(i.event, date) })).filter((x): x is { item: CalendarItem; span: { start: number; end: number } } => x.span !== null)
  // 重疊的行程並排：依開始時間分欄
  const cols: number[] = []
  const placed = timed.map(({ item, span }) => {
    let col = cols.findIndex((end) => end <= span.start)
    if (col === -1) col = cols.push(0) - 1
    cols[col] = span.end
    return { item, span, col }
  })
  const width = 100 / Math.max(1, cols.length)
  return (
    <div className="grid gap-2">
      {(allDay.length > 0 || holidays.length > 0) && (
        <div className="grid gap-1">
          {holidays.map((h) => (
            <p key={h} className="rounded-(--radius-control) px-3 py-1.5 text-xs font-bold" style={{ background: HOLIDAY_STYLE.bg, color: HOLIDAY_STYLE.fg }}>
              {h}
            </p>
          ))}
          {allDay.map((it) => (
            <ItemRow key={it.key} item={it} label={label(it)} onOpen={onOpen} iconOf={iconOf} />
          ))}
        </div>
      )}
      <div className="relative ml-12 border-l border-line" style={{ height: HOUR_PX * 24 }} aria-label={t('calendar.timeline')}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: h * HOUR_PX }}>
            <span className="absolute -top-2 -left-12 w-10 text-right text-[length:calc(10px*var(--fs))] text-muted">{`${String(h).padStart(2, '0')}:00`}</span>
          </div>
        ))}
        {placed.map(({ item, span, col }) => (
          <button
            key={item.key}
            type="button"
            data-kind={item.kind}
            disabled={item.kind === 'busy'}
            onClick={() => onOpen(item)}
            className="absolute overflow-hidden rounded-[6px] px-1.5 py-0.5 text-left text-[length:calc(11px*var(--fs))] font-semibold disabled:cursor-default"
            style={{ ...chipStyle(item), top: (span.start / 60) * HOUR_PX, height: Math.max(18, ((span.end - span.start) / 60) * HOUR_PX - 2), left: `calc(${col * width}% + 4px)`, width: `calc(${width}% - 8px)` }}
          >
            {label(item)}
            <span className="block opacity-70">{formatTimeRange(item.event.startTime ?? '', item.event.endTime ?? '')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
