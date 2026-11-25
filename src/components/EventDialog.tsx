import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EVENT_ICON_KEYS, eventIconOf, type EventIconKey } from '../core/eventIcons'
import type { CalendarEvent } from '../core/schema'
import { usePersonalStore } from '../store/usePersonalStore'
import { useSpacesStore } from '../store/useSpacesStore'
import { useSyncStore } from '../store/useSyncStore'
import { showToast } from '../store/useToastStore'
import { AllDayToggle } from './AllDayToggle'
import { Button } from './Button'
import { ColorSwatches } from './ColorSwatches'
import { Dialog } from './Dialog'
import { Field } from './Field'
import { IconSelect } from './IconSelect'
import { TextArea } from './TextArea'
import { TimeField } from './TimeField'

/** 行程要存到哪裡：個人行事曆，或某個共享空間 */
export type EventTarget = { kind: 'personal' } | { kind: 'space'; spaceId: string }

const targetKey = (t: EventTarget) => (t.kind === 'personal' ? 'personal' : `space:${t.spaceId}`)

/**
 * 新增／編輯行程。支援單日、跨日與跨午夜（結束時間早於開始時間＝隔天結束）。
 * 編輯既有行程時不能換到別的行事曆（避免共享行程被搬回個人或反過來）。
 */
export function EventDialog({ target: initialTarget, event, date, onClose }: { target: EventTarget; event: CalendarEvent | null; date: string; onClose: () => void }) {
  const { t } = useTranslation()
  const joined = usePersonalStore((s) => s.data.joinedSpaces)
  const spaces = useSpacesStore((s) => s.spaces)
  const revoked = useSyncStore((s) => s.revokedSpaceIds)
  const user = usePersonalStore((s) => s.currentUser)
  const [target, setTarget] = useState<EventTarget>(initialTarget)
  const [title, setTitle] = useState(event?.title ?? '')
  const [startDate, setStartDate] = useState(event?.startDate ?? date)
  const [endDate, setEndDate] = useState(event?.endDate ?? date)
  const [allDay, setAllDay] = useState(event?.isAllDay ?? false)
  const [startTime, setStartTime] = useState(event?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(event?.endTime ?? '')
  const [color, setColor] = useState(event?.color ?? 'sage')
  const [icon, setIcon] = useState<EventIconKey | 'auto'>(event?.icon && (EVENT_ICON_KEYS as readonly string[]).includes(event.icon) ? (event.icon as EventIconKey) : 'auto')
  const [note, setNote] = useState(event?.note ?? '')

  const spaceOptions = Object.values(joined).filter((r) => spaces[r.spaceId] && !revoked.includes(r.spaceId))
  const overnight = !allDay && startDate === endDate && Boolean(endTime) && endTime < startTime

  const save = () => {
    const clean = title.trim()
    if (!clean) return
    const input = {
      id: event?.id,
      title: clean,
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      isAllDay: allDay,
      startTime: allDay ? undefined : startTime || undefined,
      endTime: allDay ? undefined : endTime || undefined,
      color,
      icon: icon === 'auto' ? undefined : icon,
      note,
    }
    if (target.kind === 'personal') usePersonalStore.getState().upsertEvent(input)
    else {
      if (!user) return
      useSpacesStore.getState().upsertSharedEvent(target.spaceId, input, { uid: user.uid, name: user.displayName })
    }
    showToast({ message: t('event.saved') })
    onClose()
  }

  const trash = () => {
    if (!event) return
    if (target.kind === 'personal') usePersonalStore.getState().trashEvent(event.id)
    else useSpacesStore.getState().trashSharedEvent(target.spaceId, event.id)
    const restore = () => (target.kind === 'personal' ? usePersonalStore.getState().restoreEvent(event.id) : useSpacesStore.getState().restoreSharedEvent(target.spaceId, event.id))
    showToast({ message: t('event.trashed'), action: { label: t('common.undo'), onClick: restore } })
    onClose()
  }

  const iconOptions = [
    { value: 'auto' as const, label: t('event.iconAuto'), icon: eventIconOf({ title }) },
    ...EVENT_ICON_KEYS.filter((k) => k !== 'default').map((k) => ({ value: k, label: t(`icons.${k}`), icon: k })),
  ]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={event ? t('event.edit') : t('event.add')}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <label className="grid gap-1.5 text-xs font-semibold text-muted">
          {t('event.calendar')}
          <select
            value={targetKey(target)}
            disabled={Boolean(event)}
            onChange={(e) => setTarget(e.target.value === 'personal' ? { kind: 'personal' } : { kind: 'space', spaceId: e.target.value.slice(6) })}
            className="w-full rounded-(--radius-control) border border-line bg-oat px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-sage disabled:opacity-70"
          >
            <option value="personal">{t('calendar.personal')}</option>
            {spaceOptions.map((r) => (
              <option key={r.spaceId} value={`space:${r.spaceId}`} disabled={!user}>
                {r.localAlias || spaces[r.spaceId]!.name}
              </option>
            ))}
          </select>
        </label>
        <Field label={t('event.title')} value={title} maxLength={200} required autoFocus onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t('event.startDate')}
            type="date"
            value={startDate}
            required
            onChange={(e) => {
              setStartDate(e.target.value)
              if (endDate < e.target.value) setEndDate(e.target.value)
            }}
          />
          <Field label={t('event.endDate')} type="date" value={endDate} min={startDate} required onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <AllDayToggle checked={allDay} onChange={setAllDay} />
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <TimeField label={t('event.startTime')} value={startTime} onChange={setStartTime} />
            <TimeField label={t('event.endTime')} value={endTime} onChange={setEndTime} optional />
          </div>
        )}
        {overnight && <p className="text-xs text-sage-dark">{t('event.overnight')}</p>}
        <ColorSwatches label={t('event.color')} value={color} onChange={setColor} />
        <IconSelect label={t('event.icon')} value={icon} options={iconOptions} onChange={setIcon} />
        <TextArea label={t('event.note')} value={note} maxLength={2000} rows={3} onChange={(e) => setNote(e.target.value)} />
        {target.kind === 'space' && <p className="text-xs leading-relaxed text-muted">{t('event.sharedHint')}</p>}
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {event && (
            <Button variant="danger" className="mr-auto" onClick={trash}>
              {t('event.moveToTrash')}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!title.trim()}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
