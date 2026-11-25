import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { monthCells, shiftMonth, weekdayNames } from '../core/calendar'
import { usePersonalStore } from '../store/usePersonalStore'
import { useSpacesStore } from '../store/useSpacesStore'
import { showToast } from '../store/useToastStore'
import { AllDayToggle } from './AllDayToggle'
import { Button } from './Button'
import { ColorSwatches } from './ColorSwatches'
import { Dialog } from './Dialog'
import type { EventTarget } from './EventDialog'
import { Field } from './Field'
import { MonthNav } from './MonthNav'
import { TimeField } from './TimeField'

/** 批次建立：同一個行程一次加到多個日期（例如每週的課、排班） */
export function BatchEventsDialog({ target, initialDate, onClose }: { target: EventTarget; initialDate: string; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const weekStartsOn = usePersonalStore((s) => s.data.settings.weekStartsOn)
  const user = usePersonalStore((s) => s.currentUser)
  const [ym, setYm] = useState(() => ({ year: Number(initialDate.slice(0, 4)), month: Number(initialDate.slice(5, 7)) - 1 }))
  const [dates, setDates] = useState<string[]>([initialDate])
  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('')
  const [color, setColor] = useState('sage')

  const toggle = (d: string) => setDates((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()))

  const save = () => {
    const clean = title.trim()
    if (!clean || dates.length === 0) return
    const inputs = dates.map((d) => ({
      title: clean,
      startDate: d,
      endDate: d,
      isAllDay: allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay || !endTime ? undefined : endTime,
      color,
      note: '',
    }))
    if (target.kind === 'personal') usePersonalStore.getState().batchCreateEvents(inputs)
    else if (user) for (const i of inputs) useSpacesStore.getState().upsertSharedEvent(target.spaceId, i, { uid: user.uid, name: user.displayName })
    showToast({ message: t('batch.done', { count: inputs.length }) })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('batch.title')}>
      <div className="grid gap-3">
        <Field label={t('event.title')} value={title} maxLength={200} autoFocus onChange={(e) => setTitle(e.target.value)} />
        <MonthNav year={ym.year} month={ym.month} onShift={(d) => setYm(shiftMonth(ym.year, ym.month, d))} />
        <div role="group" aria-label={t('batch.pickDates')} className="grid grid-cols-7 gap-1 text-center text-xs">
          {weekdayNames(i18n.resolvedLanguage, weekStartsOn).map((w, i) => (
            <span key={i} className="py-1 font-bold text-muted">
              {w}
            </span>
          ))}
          {monthCells(ym.year, ym.month, weekStartsOn).map((d, i) =>
            d ? (
              <button
                key={d}
                type="button"
                aria-pressed={dates.includes(d)}
                onClick={() => toggle(d)}
                className={`rounded-full py-1.5 font-semibold ${dates.includes(d) ? 'bg-sage text-white' : 'hover:bg-sage-light'}`}
              >
                {Number(d.slice(8))}
              </button>
            ) : (
              <span key={`e${i}`} />
            ),
          )}
        </div>
        <p className="text-xs text-muted">{t('batch.selected', { count: dates.length })}</p>
        <AllDayToggle checked={allDay} onChange={setAllDay} />
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <TimeField label={t('event.startTime')} value={startTime} onChange={setStartTime} />
            <TimeField label={t('event.endTime')} value={endTime} onChange={setEndTime} optional />
          </div>
        )}
        <ColorSwatches label={t('event.color')} value={color} onChange={setColor} />
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} disabled={!title.trim() || dates.length === 0}>
            {t('batch.create', { count: dates.length })}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
