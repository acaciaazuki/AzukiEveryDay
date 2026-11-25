import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_ICON_CHOICES, CURRENCIES } from '../core/defaults'
import { paletteOf } from '../core/colors'
import type { IconName } from '../core/icons'
import type { LedgerEntry } from '../core/schema'
import { useCategories } from '../hooks/useCategories'
import { usePersonalStore } from '../store/usePersonalStore'
import { showToast } from '../store/useToastStore'
import { Icon } from './AcaciaIcons'
import { Button } from './Button'
import { ColorSwatches } from './ColorSwatches'
import { Dialog } from './Dialog'
import { Field } from './Field'

const selectClass = 'w-full rounded-(--radius-control) border border-line bg-oat px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-sage'

/** 新增／編輯一筆收支（只存在個人資料，不會同步到共享空間） */
export function LedgerEntryDialog({ entry, date, onClose }: { entry: LedgerEntry | null; date: string; onClose: () => void }) {
  const { t } = useTranslation()
  const defaultCurrency = usePersonalStore((s) => s.data.settings.defaultCurrency)
  const { list } = useCategories()
  const [type, setType] = useState<'expense' | 'income'>(entry?.type ?? 'expense')
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [currency, setCurrency] = useState(entry?.currency ?? defaultCurrency)
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? 'food')
  const [day, setDay] = useState(entry?.date ?? date)
  const [note, setNote] = useState(entry?.note ?? '')

  const options = list.filter((c) => c.type === type)
  const effectiveCategory = options.some((c) => c.id === categoryId) ? categoryId : (options[0]?.id ?? 'other')
  const value = Number(amount)
  const valid = amount.trim() !== '' && Number.isFinite(value) && value >= 0

  const save = () => {
    if (!valid) return
    usePersonalStore.getState().upsertLedgerEntry({ id: entry?.id, type, amount: Math.round(value * 100) / 100, currency, categoryId: effectiveCategory, date: day, note: note.trim() })
    showToast({ message: t('ledger.saved') })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={entry ? t('ledger.edit') : t('ledger.add')}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div role="radiogroup" aria-label={t('ledger.type')} className="grid grid-cols-2 gap-1 rounded-(--radius-control) border border-line bg-oat p-1">
          {(['expense', 'income'] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)} className={`rounded-[8px] py-2 text-sm font-bold ${type === k ? 'bg-paper text-sage-dark shadow-soft' : 'text-muted'}`}>
              {t(`ledger.${k}`)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={t('ledger.amount')} type="number" inputMode="decimal" min={0} step="0.01" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {t('ledger.currency')}
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
              {[...new Set([...CURRENCIES, currency])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-xs font-semibold text-muted">{t('ledger.category')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {options.map((c) => {
              const p = paletteOf(c.color)
              const on = c.id === effectiveCategory
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold ${on ? 'border-sage ring-2 ring-sage/25' : 'border-transparent'}`}
                  style={{ background: p.bg, color: p.fg }}
                >
                  <Icon name={c.icon} size={18} />
                  {c.label}
                </button>
              )
            })}
          </div>
        </fieldset>
        <Field label={t('ledger.date')} type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
        <Field label={t('ledger.note')} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {entry && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                usePersonalStore.getState().deleteLedgerEntry(entry.id)
                showToast({ message: t('ledger.deleted'), action: { label: t('common.undo'), onClick: () => usePersonalStore.getState().upsertLedgerEntry(entry) } })
                onClose()
              }}
            >
              {t('common.delete')}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!valid}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/** 自訂分類管理：新增（例如「股票」、「貸款」）、改圖示與卡片顏色、刪除 */
export function CategoryManagerDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { list } = useCategories()
  const custom = list.filter((c) => c.isCustom)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = custom.find((c) => c.id === editingId)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [icon, setIcon] = useState<IconName>('stocks')
  const [color, setColor] = useState('sand')

  const startEdit = (id: string | null) => {
    const c = custom.find((x) => x.id === id)
    setEditingId(id)
    setLabel(c?.label ?? '')
    setType(c?.type ?? 'expense')
    setIcon(c?.icon ?? 'stocks')
    setColor(c?.color ?? 'sand')
  }

  const taken = list.some((c) => c.label === label.trim() && c.type === type && c.id !== editingId)
  const save = () => {
    if (!label.trim() || taken) return
    usePersonalStore.getState().upsertCustomCategory({ id: editing?.id, label, type, icon, color })
    startEdit(null)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('ledger.categories')}>
      <div className="grid gap-4">
        <ul className="grid gap-1.5">
          {custom.length === 0 && <li className="text-xs text-muted">{t('ledger.noCustom')}</li>}
          {custom.map((c) => {
            const p = paletteOf(c.color)
            return (
              <li key={c.id} className="flex items-center gap-2 rounded-(--radius-control) px-2.5 py-1.5" style={{ background: p.bg, color: p.fg }}>
                <Icon name={c.icon} size={22} />
                <span className="flex-1 text-sm font-bold">{c.label}</span>
                <span className="text-[length:calc(10px*var(--fs))]">{t(`ledger.${c.type}`)}</span>
                <button type="button" className="text-xs font-bold underline" onClick={() => startEdit(c.id)}>
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  className="text-xs font-bold underline"
                  onClick={() => {
                    if (window.confirm(t('ledger.deleteCategoryConfirm', { label: c.label }))) usePersonalStore.getState().deleteCustomCategory(c.id)
                  }}
                >
                  {t('common.delete')}
                </button>
              </li>
            )
          })}
        </ul>
        <section className="grid gap-3 rounded-(--radius-control) border border-line p-3">
          <h3 className="text-sm font-bold">{editing ? t('ledger.editCategory') : t('ledger.addCategory')}</h3>
          <Field label={t('ledger.categoryName')} value={label} maxLength={50} placeholder={t('ledger.categoryPlaceholder')} onChange={(e) => setLabel(e.target.value)} />
          {taken && <p className="text-xs text-[#c2583d]">{t('ledger.categoryTaken')}</p>}
          <label className="grid gap-1.5 text-xs font-semibold text-muted">
            {t('ledger.type')}
            <select value={type} onChange={(e) => setType(e.target.value as 'expense' | 'income')} className={selectClass}>
              <option value="expense">{t('ledger.expense')}</option>
              <option value="income">{t('ledger.income')}</option>
            </select>
          </label>
          <div className="grid gap-1.5 text-xs font-semibold text-muted">
            <span>{t('ledger.icon')}</span>
            <div role="radiogroup" aria-label={t('ledger.icon')} className="flex flex-wrap gap-1.5">
              {CATEGORY_ICON_CHOICES.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={icon === n} aria-label={n} onClick={() => setIcon(n)} className={`grid size-9 place-items-center rounded-full border ${icon === n ? 'border-sage bg-sage-light' : 'border-line'}`}>
                  <Icon name={n} size={22} />
                </button>
              ))}
            </div>
          </div>
          <ColorSwatches label={t('ledger.cardColor')} value={color} onChange={setColor} />
          <div className="flex justify-end gap-2">
            {editing && (
              <Button variant="ghost" onClick={() => startEdit(null)}>
                {t('common.cancel')}
              </Button>
            )}
            <Button onClick={save} disabled={!label.trim() || taken}>
              {editing ? t('common.save') : t('common.add')}
            </Button>
          </div>
        </section>
      </div>
    </Dialog>
  )
}
