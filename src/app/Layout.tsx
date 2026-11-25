import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useNavigation } from 'react-router'
import { Icon } from '../components/AcaciaIcons'
import { BootSplash, BrandLogo } from '../components/BrandMark'
import { CommandPalette } from '../components/CommandPalette'
import { GlobalToast } from '../components/GlobalToast'
import { LicensesLink } from '../components/LicensesLink'
import { PrivacyLink } from '../components/PrivacyLink'
import { SyncPanel } from '../components/SettingsPanels'
import type { IconName } from '../core/icons'
import { useCloudSyncCoordinator } from '../hooks/useCloudSyncCoordinator'
import { useConsentStore } from '../store/useConsentStore'
import { prefetchPages } from './prefetch'

// 同意面板含政策全文與授權清單，只有需要詢問時才下載
const ConsentGate = lazy(() => import('../components/ConsentGate'))

/** 精簡版導覽：只有行事曆、記帳本與設定 */
export const NAV = [
  { to: '/', ico: 'calendar', key: 'calendar', end: true },
  { to: '/ledger', ico: 'receipt', key: 'ledger' },
  { to: '/settings', ico: 'settings', key: 'settings' },
] as const satisfies readonly { to: string; ico: IconName; key: string; end?: boolean }[]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex w-full items-center gap-3 rounded-(--radius-control) px-3 py-2.5 text-[length:calc(14px*var(--fs))] font-semibold transition-colors ${
    isActive ? 'bg-sage-light text-sage-dark' : 'text-[#78837e] hover:bg-[#f4f3ee] hover:text-[#55655d]'
  }`

/**
 * 第一次使用或政策改版時，先顯示同意面板；同意之前不顯示 App，也不發出任何雲端請求。
 */
export function Layout() {
  const status = useConsentStore((s) => s.status)
  const { t } = useTranslation()
  if (status === 'accepted') return <AppShell />
  const splash = <BootSplash label={t('app.loading')} />
  if (status === 'loading') return splash
  return (
    <div className="min-h-dvh bg-oat">
      <Suspense fallback={splash}>
        <ConsentGate />
      </Suspense>
    </div>
  )
}

function AppShell() {
  const { t } = useTranslation()
  const [searchOpen, setSearchOpen] = useState(false)
  useCloudSyncCoordinator()
  useEffect(() => prefetchPages(), [])
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <div className="min-h-dvh">
      <PageLoadingBar />
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-line bg-paper px-4 py-6 min-[681px]:flex">
        <BrandLogo name={t('app.name')} className="px-2.5 pb-6" />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mb-4 flex items-center gap-2 rounded-(--radius-control) border border-line bg-oat px-3 py-2 text-left text-xs text-muted hover:border-sage"
        >
          <Icon name="search" className="text-sage" />
          <span className="flex-1">{t('search.button')}</span>
          <kbd className="rounded border border-line bg-paper px-1.5 text-[length:calc(10px*var(--fs))]">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <nav aria-label={t('nav.main')} className="grid gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={'end' in n} className={linkClass}>
              <Icon name={n.ico} className="size-[1.9em]" />
              {t(`nav.${n.key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-3">
          <div className="rounded-(--radius-card) border border-line p-3">
            <SyncPanel compact />
          </div>
          <div className="flex flex-wrap gap-x-3 px-3">
            <PrivacyLink />
            <LicensesLink />
          </div>
        </div>
      </aside>

      <main className="mx-auto max-w-[1600px] px-3.5 pt-4 pb-[calc(88px+env(safe-area-inset-bottom))] min-[681px]:ml-60 min-[681px]:px-6 min-[681px]:pb-16 min-[1001px]:px-9">
        <button
          type="button"
          aria-label={t('search.button')}
          onClick={() => setSearchOpen(true)}
          className="float-right mt-1 grid size-9 place-items-center rounded-full border border-line bg-paper text-sage shadow-soft min-[681px]:hidden"
        >
          <Icon name="search" className="size-[1.7em]" />
        </button>
        <Outlet />
      </main>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <GlobalToast />

      <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-paper px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_#29483a08] min-[681px]:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={'end' in n}
            className={({ isActive }) => `grid justify-items-center gap-0.5 px-1 text-[length:calc(10px*var(--fs))] font-semibold ${isActive ? 'text-sage-dark' : 'text-[#9aa6a0]'}`}
          >
            <Icon name={n.ico} className="size-[2.4em]" />
            {t(`nav.${n.key}`)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/** 切換頁面時，新頁面的程式還在下載就在畫面最上方顯示進度條（0.15 秒內載完不顯示） */
function PageLoadingBar() {
  const { t } = useTranslation()
  const loading = useNavigation().state === 'loading'
  if (!loading) return null
  return (
    <div role="progressbar" aria-label={t('app.loading')} data-page-loading className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden opacity-0 animate-[page-loading-in_0s_150ms_forwards]">
      <div className="h-full w-1/3 rounded-full bg-sage animate-[page-loading_1.1s_ease-in-out_infinite]" />
    </div>
  )
}
