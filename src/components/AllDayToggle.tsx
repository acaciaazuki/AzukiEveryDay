import { useTranslation } from 'react-i18next'

/** 「整天」開關：打開時行程不存開始／結束時間（兩個都是空字串） */
export function AllDayToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-8 items-center gap-2 justify-self-start rounded-full border px-3 text-xs font-bold transition ${checked ? 'border-sage bg-sage-light text-sage-dark' : 'border-line bg-oat text-muted hover:bg-sage-light'}`}
    >
      <span aria-hidden className={`relative h-4 w-7 rounded-full transition ${checked ? 'bg-sage' : 'bg-[#cfd8d3]'}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-white shadow-soft transition-all ${checked ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      {t('event.allDay')}
    </button>
  )
}
