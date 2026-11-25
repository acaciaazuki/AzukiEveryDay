import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { groupByLicense, filterPackages, summarize, type LicenseCategory, type LicensePackage, type ScopeFilter } from '../core/licenses'
import packagesData from '../licenses/packages.json'
import { Icon } from './AcaciaIcons'
import { AppLicense } from './AppLicense'
import { Button } from './Button'
import { Dialog } from './Dialog'

// 這個元件由 LicensesLink 延遲載入，套件清單跟著這個 chunk 一起下載；
// 授權全文比較大，等第一次按「檢視授權全文」才另外載入。
const PACKAGES = packagesData as LicensePackage[]

let textsPromise: Promise<Record<string, string>> | undefined
const loadTexts = () => (textsPromise ??= import('../licenses/texts.json').then((m) => m.default as Record<string, string>))

const BADGE: Record<LicenseCategory, string> = {
  permissive: 'bg-sage-light text-sage-dark',
  weak: 'bg-[#fff4d6] text-[#8a6a14]',
  strong: 'bg-[#ffe6d1] text-[#b4532a]',
  unknown: 'bg-[#f1f4f2] text-[#6f7d77]',
}

const names = (list: LicensePackage[]) => list.map((p) => `${p.name}@${p.version}`).join('、')

export default function LicensesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('licenses.title')} wide>
      <LicensesContent />
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t('licenses.close')}
        </Button>
      </div>
    </Dialog>
  )
}

/**
 * 授權清單內容（不含面板外框），同意面板也用這個。
 * 搜尋列用 sticky -top-6 -mx-6，外層捲動容器需要 p-6。
 */
export function LicensesContent() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('all')
  const sum = summarize(PACKAGES)
  const groups = groupByLicense(filterPackages(PACKAGES, query, scope))

  return (
    <>
      <AppLicense />

      <h3 className="mb-1.5 text-sm font-bold">{t('licenses.app.thirdParty')}</h3>
      <p className="mb-3 text-xs leading-relaxed text-muted">{t('licenses.intro')}</p>

      <div className="mb-4 grid gap-2 text-xs leading-relaxed">
        {sum.strong.length === 0 ? (
          <p className="flex items-start gap-2 rounded-(--radius-control) bg-sage-light px-3 py-2.5 text-sage-dark">
            <Icon name="check" className="mt-px size-[1.4em] shrink-0" />
            <span>{t('licenses.noStrong')}</span>
          </p>
        ) : (
          <p role="alert" className="rounded-(--radius-control) bg-[#ffe6d1] px-3 py-2.5 font-semibold text-[#b4532a]">
            {t('licenses.strongWarn', { count: sum.strong.length, names: names(sum.strong) })}
            {sum.strong.some((p) => p.network) && <span className="mt-1 block font-normal">{t('licenses.networkWarn')}</span>}
          </p>
        )}
        {sum.weak.length > 0 && <p className="rounded-(--radius-control) bg-[#fff8e4] px-3 py-2.5 text-[#7a5e12]">{t('licenses.weakNote', { names: names(sum.weak) })}</p>}
        {sum.unknown.length > 0 && (
          <p className="rounded-(--radius-control) bg-[#f1f4f2] px-3 py-2.5 text-[#5a6d63]">{t('licenses.unknownWarn', { count: sum.unknown.length, names: names(sum.unknown) })}</p>
        )}
        <p className="text-muted">{t('licenses.summary', { total: sum.total, runtime: sum.runtime, dev: sum.dev })}</p>
      </div>

      {/* 搜尋與篩選：捲動時固定在上方 */}
      <div className="sticky -top-6 z-10 -mx-6 mb-3 grid gap-2 border-b border-line bg-paper px-6 pt-1 pb-3">
        <label className="flex items-center gap-2 rounded-(--radius-control) border border-line bg-oat px-3 focus-within:border-sage">
          <Icon name="search" className="text-sage" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('licenses.search')}
            aria-label={t('licenses.search')}
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </label>
        <div role="radiogroup" aria-label={t('licenses.scopeLabel')} className="flex flex-wrap gap-1.5">
          {(['all', 'runtime', 'dev'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={scope === s}
              onClick={() => setScope(s)}
              className={`rounded-full border px-3 py-1 text-[length:calc(11px*var(--fs))] font-bold transition-colors ${scope === s ? 'border-sage bg-sage-light text-sage-dark' : 'border-line bg-paper text-muted hover:bg-oat'}`}
            >
              {t(`licenses.scope.${s}`)}
              <span className="ml-1 font-normal opacity-70">{s === 'all' ? sum.total : sum[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted">{t('licenses.empty')}</p>
      ) : (
        <div className="grid gap-4">
          {groups.map((g) => (
            <section key={g.license} aria-label={g.license}>
              <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-bold">
                {g.license}
                <span className={`rounded-full px-2 py-0.5 text-[length:calc(10px*var(--fs))] font-bold ${BADGE[g.category]}`}>{t(`licenses.category.${g.category}`)}</span>
                <span className="text-[length:calc(11px*var(--fs))] font-normal text-muted">{t('licenses.count', { count: g.packages.length })}</span>
              </h3>
              <ul className="grid gap-1.5">
                {g.packages.map((p) => (
                  <PackageRow key={`${p.name}@${p.version}`} pkg={p} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-5 border-t border-line pt-3 text-[length:calc(11px*var(--fs))] leading-relaxed text-muted">{t('licenses.update')}</p>
    </>
  )
}

function PackageRow({ pkg }: { pkg: LicensePackage }) {
  const { t } = useTranslation()
  const [showText, setShowText] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!showText || text !== null || !pkg.textId) return
    let alive = true
    loadTexts().then(
      (all) => alive && setText(all[pkg.textId!] ?? ''),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [showText, text, pkg.textId])

  return (
    <li className="rounded-(--radius-control) border border-line bg-oat/60 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-semibold break-all">{pkg.name}</span>
        <span className="text-[length:calc(11px*var(--fs))] text-muted">v{pkg.version}</span>
        {pkg.scope === 'dev' && <span className="rounded-full bg-[#f1f4f2] px-1.5 text-[length:calc(10px*var(--fs))] font-semibold text-[#8c9993]">{t('licenses.scope.dev')}</span>}
        {pkg.network && <span className="rounded-full bg-[#ffe6d1] px-1.5 text-[length:calc(10px*var(--fs))] font-bold text-[#b4532a]">AGPL</span>}
        <span className="ml-auto flex gap-3 text-[length:calc(11px*var(--fs))] font-semibold">
          {pkg.textId && (
            <button type="button" aria-expanded={showText} onClick={() => setShowText((v) => !v)} className="text-sage-dark hover:underline">
              {showText ? t('licenses.hideText') : t('licenses.viewText')}
            </button>
          )}
          {pkg.repository && (
            <a href={pkg.repository} target="_blank" rel="noreferrer noopener" className="text-muted hover:text-sage-dark hover:underline">
              {t('licenses.repo')}
            </a>
          )}
        </span>
      </div>
      {pkg.copyright && <p className="mt-0.5 line-clamp-2 text-[length:calc(11px*var(--fs))] whitespace-pre-line text-muted">{pkg.copyright}</p>}
      {!pkg.textId && <p className="mt-0.5 text-[length:calc(11px*var(--fs))] text-muted">{t('licenses.noText')}</p>}
      {showText && (
        <div className="mt-2">
          {pkg.textGenerated && <p className="mb-1 text-[length:calc(11px*var(--fs))] text-muted">{t('licenses.textGenerated', { license: pkg.license })}</p>}
          <pre className="max-h-72 overflow-auto rounded-(--radius-control) border border-line bg-paper p-3 font-mono text-[length:calc(11px*var(--fs))] leading-relaxed whitespace-pre-wrap text-ink">
            {failed ? t('licenses.loadFail') : (text ?? t('licenses.loading'))}
          </pre>
        </div>
      )}
    </li>
  )
}
