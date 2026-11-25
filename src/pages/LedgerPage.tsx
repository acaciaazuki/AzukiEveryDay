import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../components/AcaciaIcons'
import { Button } from '../components/Button'
import { CategoryManagerDialog, LedgerEntryDialog } from '../components/LedgerDialogs'
import { PageHead } from '../components/PageHead'
import { paletteOf } from '../core/colors'
import { toLocalISO } from '../core/date'
import { formatCurrency } from '../core/format'
import { getBillingCycleForDate, shiftBillingCycle, summarizeLedgerForCycle, type CategorySummaryItem } from '../core/ledgerCycle'
import type { LedgerEntry } from '../core/schema'
import { useCategories } from '../hooks/useCategories'
import { useNow } from '../hooks/useNow'
import { usePersonalStore } from '../store/usePersonalStore'

/**
 * 個人記帳本：依結算日（預設每月 10 號）切成一期一期，即時顯示收支、分類排行與佔比。
 * 記帳只存在個人資料，不會出現在共享空間。
 */
export function LedgerPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage ?? 'zh-TW'
  const today = toLocalISO(useNow())
  const entries = usePersonalStore((s) => s.data.ledgerEntries)
  const customCategories = usePersonalStore((s) => s.data.customCategories)
  const cycleDay = usePersonalStore((s) => s.data.settings.billingCycleStartDay)
  const defaultCurrency = usePersonalStore((s) => s.data.settings.defaultCurrency)
  const { info } = useCategories()
  const [offset, setOffset] = useState(0)
  const [currency, setCurrency] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ entry: LedgerEntry | null } | null>(null)
  const [managing, setManaging] = useState(false)

  const cycle = useMemo(() => shiftBillingCycle(getBillingCycleForDate(today, cycleDay), offset, cycleDay), [today, cycleDay, offset])
  const currencies = useMemo(() => [...new Set([defaultCurrency, ...Object.values(entries).map((e) => e.currency)])], [entries, defaultCurrency])
  const activeCurrency = currency && currencies.includes(currency) ? currency : defaultCurrency
  const summary = useMemo(() => summarizeLedgerForCycle({ entriesRecord: entries, customCategories, cycle, currency: activeCurrency }), [entries, customCategories, cycle, activeCurrency])
  const money = (n: number) => formatCurrency(n, activeCurrency, lng)

  return (
    <div className="grid gap-4">
      <PageHead
        title={t('ledger.title')}
        actions={
          <>
            <Button variant="ghost" size="page" onClick={() => setManaging(true)}>
              {t('ledger.categories')}
            </Button>
            <Button size="page" onClick={() => setEditing({ entry: null })}>
              {t('ledger.addButton')}
            </Button>
          </>
        }
      />

      <section className="grid gap-3 rounded-(--radius-card) border border-line bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold" aria-live="polite">
              {t('ledger.cycleRange', { start: cycle.startDate, end: cycle.endDate })}
            </h2>
            <p className="text-xs text-muted">{t('ledger.cycleHelp', { day: cycleDay, days: cycle.totalDays })}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label={t('ledger.prevCycle')} onClick={() => setOffset(offset - 1)} className="grid size-8 place-items-center rounded-full border border-line hover:bg-sage-light">
              ‹
            </button>
            <button type="button" onClick={() => setOffset(0)} className="h-8 rounded-full border border-line px-3 text-[length:calc(11px*var(--fs))] font-bold hover:bg-sage-light">
              {t('ledger.thisCycle')}
            </button>
            <button type="button" aria-label={t('ledger.nextCycle')} onClick={() => setOffset(offset + 1)} className="grid size-8 place-items-center rounded-full border border-line hover:bg-sage-light">
              ›
            </button>
            {currencies.length > 1 && (
              <select aria-label={t('ledger.currency')} value={activeCurrency} onChange={(e) => setCurrency(e.target.value)} className="h-8 rounded-full border border-line bg-paper px-2 text-xs font-bold">
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {[
            { k: 'totalExpense', v: summary.totalExpense, cls: 'text-[#a24b33]' },
            { k: 'totalIncome', v: summary.totalIncome, cls: 'text-sage-dark' },
            { k: 'net', v: summary.netBalance, cls: summary.netBalance < 0 ? 'text-[#a24b33]' : 'text-ink' },
          ].map((x) => (
            <div key={x.k} className="rounded-(--radius-control) bg-oat px-3 py-2.5">
              <dt className="text-[length:calc(11px*var(--fs))] font-semibold text-muted">{t(`ledger.${x.k}`)}</dt>
              <dd className={`text-base font-extrabold min-[681px]:text-xl ${x.cls}`}>{money(x.v)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 min-[1001px]:grid-cols-2">
        <Ranking title={t('ledger.expenseRanking')} items={summary.expenseByCategory} info={info} money={money} />
        <Ranking title={t('ledger.incomeRanking')} items={summary.incomeByCategory} info={info} money={money} />
      </div>

      <section className="grid gap-2 rounded-(--radius-card) border border-line bg-paper p-4">
        <h2 className="text-sm font-bold">{t('ledger.entries', { count: summary.entryCount })}</h2>
        {summary.entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t('ledger.empty')}</p>
        ) : (
          <ul className="grid gap-1.5">
            {summary.entries.map((e) => {
              const c = info(e.categoryId)
              const p = paletteOf(c.color)
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => setEditing({ entry: e })} className="flex w-full items-center gap-3 rounded-(--radius-control) px-3 py-2 text-left hover:bg-oat">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: p.bg, color: p.fg }}>
                      <Icon name={c.icon} size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{e.note || c.label}</span>
                      <span className="block text-[length:calc(11px*var(--fs))] text-muted">
                        {e.date} · {c.label}
                      </span>
                    </span>
                    <span className={`text-sm font-extrabold ${e.type === 'expense' ? 'text-[#a24b33]' : 'text-sage-dark'}`}>
                      {e.type === 'expense' ? '−' : '+'}
                      {money(e.amount)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {editing && <LedgerEntryDialog entry={editing.entry} date={cycle.startDate <= today && today <= cycle.endDate ? today : cycle.startDate} onClose={() => setEditing(null)} />}
      {managing && <CategoryManagerDialog onClose={() => setManaging(false)} />}
    </div>
  )
}

function Ranking({ title, items, info, money }: { title: string; items: CategorySummaryItem[]; info: ReturnType<typeof useCategories>['info']; money: (n: number) => string }) {
  const { t } = useTranslation()
  return (
    <section aria-label={title} className="grid content-start gap-2 rounded-(--radius-card) border border-line bg-paper p-4">
      <h2 className="text-sm font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted">{t('ledger.noData')}</p>
      ) : (
        <ol className="grid gap-2">
          {items.map((it) => {
            const c = info(it.categoryId)
            const p = paletteOf(c.color)
            return (
              <li key={it.categoryId} className="grid gap-1 rounded-(--radius-control) px-2.5 py-2" style={{ background: p.bg, color: p.fg }}>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Icon name={c.icon} size={20} />
                  <span className="flex-1 truncate">{c.label}</span>
                  <span>{money(it.totalAmount)}</span>
                  <span className="w-12 text-right text-xs">{it.percentage}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/70" role="presentation">
                  <div className="h-full rounded-full" style={{ width: `${it.percentage}%`, background: p.dot }} />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
