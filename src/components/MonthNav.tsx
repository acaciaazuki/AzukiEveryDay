import { useTranslation } from 'react-i18next'
import { monthLabel } from '../core/calendar'

export function MonthNav({ year, month, onShift, onToday }: { year: number; month: number; onShift: (d: number) => void; onToday?: () => void }) {
  const { t, i18n } = useTranslation()
  const btn = 'grid size-8 place-items-center rounded-full border border-line bg-paper text-base hover:bg-sage-light'
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-extrabold" aria-live="polite">
        {monthLabel(year, month, i18n.resolvedLanguage)}
      </h2>
      <div className="flex items-center gap-1.5">
        <button type="button" className={btn} aria-label={t('calendar.prev')} onClick={() => onShift(-1)}>
          ‹
        </button>
        {onToday && (
          <button type="button" className="h-8 rounded-full border border-line bg-paper px-3 text-[length:calc(11px*var(--fs))] font-bold hover:bg-sage-light" onClick={onToday}>
            {t('calendar.today')}
          </button>
        )}
        <button type="button" className={btn} aria-label={t('calendar.next')} onClick={() => onShift(1)}>
          ›
        </button>
      </div>
    </div>
  )
}
