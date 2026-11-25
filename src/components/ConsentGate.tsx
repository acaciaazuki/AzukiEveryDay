import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { CONSENT_DOCS, CURRENT_VERSIONS, type ConsentDoc } from '../core/consent'
import { LANGUAGES } from '../i18n'
import { useConsentStore } from '../store/useConsentStore'
import { BrandMark } from './BrandMark'
import { Button } from './Button'
import { LicensesContent } from './LicensesDialog'
import { PrivacyPolicy } from './PrivacyPolicy'

/**
 * 使用條款同意面板：第一次使用、或隱私權政策／第三方授權清單改版時顯示。
 * 佔滿整個畫面、沒有關閉按鈕，Esc 或點背景都不會關；必須按「同意並開始使用」才會進入 App。
 * 由 Layout 延遲載入（政策全文與授權清單跟著這個 chunk 下載）。
 */
export default function ConsentGate() {
  const { t, i18n } = useTranslation()
  const pending = useConsentStore((s) => s.pending)
  // 有舊紀錄＝之前同意過舊版，這次是改版後重新同意
  const updated = useConsentStore((s) => s.record !== null)
  const accept = useConsentStore((s) => s.accept)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // 改版時先打開有更新的文件；/privacy 網址一定先看隱私權政策
  const [tab, setTab] = useState<ConsentDoc>(updated && !pending.includes('privacy') && pathname !== '/privacy' ? 'licenses' : 'privacy')
  const [declined, setDeclined] = useState(false)
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const show = (doc: ConsentDoc) => {
    setTab(doc)
    setDeclined(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const agree = async () => {
    setBusy(true)
    await accept()
    // 從 /privacy 進來的人同意後回首頁，不用再看一次政策面板
    if (pathname === '/privacy') navigate('/', { replace: true })
  }

  const docNames = pending.map((d) => t(`consent.tab.${d}`)).join(t('consent.docSep'))

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="consent-title" aria-describedby="consent-intro" className="fixed inset-0 z-50 flex justify-center bg-oat min-[681px]:items-center min-[681px]:p-6">
      <div className="flex h-dvh w-full max-w-[760px] flex-col bg-paper min-[681px]:h-auto min-[681px]:max-h-[calc(100dvh-48px)] min-[681px]:rounded-(--radius-card) min-[681px]:shadow-card">
        <header className="grid gap-2 border-b border-line px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-3 min-[681px]:px-6 min-[681px]:pt-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-2 font-extrabold tracking-tight">
              <BrandMark className="size-8" />
              {t('app.name')}
            </span>
            <div role="radiogroup" aria-label={t('consent.language')} className="ml-auto flex flex-wrap justify-end gap-1">
              {LANGUAGES.map((l) => {
                const on = i18n.resolvedLanguage === l.code
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => void i18n.changeLanguage(l.code)}
                    className={`min-h-8 rounded-full border px-2.5 text-[length:calc(11px*var(--fs))] font-bold whitespace-nowrap transition-colors ${on ? 'border-sage bg-sage-light text-sage-dark' : 'border-line bg-paper text-muted hover:bg-oat'}`}
                  >
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>
          <h2 id="consent-title" className="text-lg font-bold">
            {t(updated ? 'consent.title.updated' : 'consent.title.first')}
          </h2>
          <p id="consent-intro" className="text-xs leading-relaxed text-muted">
            {updated ? t('consent.intro.updated', { docs: docNames }) : t('consent.intro.first')}
          </p>
          <div role="tablist" aria-label={t('consent.tabs')} className="mt-1 flex gap-1.5">
            {CONSENT_DOCS.map((d) => {
              const on = tab === d && !declined
              return (
                <button
                  key={d}
                  id={`consent-tab-${d}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="consent-panel"
                  onClick={() => show(d)}
                  className={`flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors ${on ? 'border-sage bg-sage-light text-sage-dark' : 'border-line bg-paper text-muted hover:bg-oat'}`}
                >
                  {t(`consent.tab.${d}`)}
                  {updated && pending.includes(d) && <span className="rounded-full bg-[#ffe6d1] px-1.5 text-[length:calc(10px*var(--fs))] font-bold text-[#b4532a]">{t('consent.updatedBadge')}</span>}
                </button>
              )
            })}
          </div>
        </header>

        <div
          ref={scrollRef}
          id="consent-panel"
          role="tabpanel"
          aria-labelledby={`consent-tab-${tab}`}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 outline-none"
        >
          {declined ? (
            <div role="alert" className="mx-auto grid max-w-md gap-3 py-6 text-sm leading-relaxed">
              <h3 className="text-base font-bold text-[#b4532a]">{t('consent.declined.title')}</h3>
              <p>{t('consent.declined.body')}</p>
              <p className="text-muted">{t('consent.declined.leave')}</p>
              <div>
                <Button variant="ghost" className="min-h-11" onClick={() => show(tab)}>
                  {t('consent.declined.back')}
                </Button>
              </div>
            </div>
          ) : tab === 'privacy' ? (
            <PrivacyPolicy />
          ) : (
            <LicensesContent />
          )}
        </div>

        <footer className="grid gap-2 border-t border-line px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] min-[681px]:px-6 min-[681px]:pb-4">
          <p className="text-[length:calc(11px*var(--fs))] leading-relaxed text-muted">
            {t('consent.versions', { privacy: CURRENT_VERSIONS.privacy, licenses: CURRENT_VERSIONS.licenses })} {t('consent.note')}
          </p>
          <div className="flex flex-col-reverse gap-2 min-[520px]:flex-row min-[520px]:justify-end">
            <Button variant="ghost" className="min-h-11 text-sm" onClick={() => setDeclined(true)} disabled={busy}>
              {t('consent.decline')}
            </Button>
            <Button className="min-h-11 text-sm" onClick={() => void agree()} disabled={busy}>
              {t('consent.agree')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
