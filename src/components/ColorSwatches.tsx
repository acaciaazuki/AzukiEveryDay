import { useTranslation } from 'react-i18next'
import { PALETTE, PALETTE_KEYS, type PaletteKey } from '../core/colors'

/** 色票選擇（行程、共享空間、記帳分類卡片共用）；值是色票代碼 */
export function ColorSwatches({ value, onChange, label }: { value?: string; onChange: (key: PaletteKey) => void; label: string }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-1.5 text-xs font-semibold text-muted">
      <span>{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {PALETTE_KEYS.map((k) => {
          const on = value === k
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t(`colors.${k}`)}
              title={t(`colors.${k}`)}
              onClick={() => onChange(k)}
              className={`grid size-8 place-items-center rounded-full border ${on ? 'border-sage ring-2 ring-sage/30' : 'border-line'}`}
              style={{ background: PALETTE[k].bg }}
            >
              <span className="size-3.5 rounded-full" style={{ background: PALETTE[k].dot }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
