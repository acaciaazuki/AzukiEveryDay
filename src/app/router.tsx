import type React from 'react'
import { createBrowserRouter } from 'react-router'
import { PageLoading } from '../components/BrandMark'
import { RouteErrorScreen } from '../components/ErrorScreen'
import { CalendarPage } from '../pages/CalendarPage'
import { Layout } from './Layout'
import { pages } from './prefetch'

const page = (load: () => Promise<React.ComponentType>) => async () => ({ Component: await load() })

/**
 * 只有三個主頁面：行事曆（首頁，直接打包）、記帳本、設定（點進去才下載）。
 * /privacy 是可直接分享的隱私權政策網址，開啟時跳出政策面板。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    HydrateFallback: PageLoading,
    ErrorBoundary: RouteErrorScreen,
    children: [
      { index: true, Component: CalendarPage },
      { path: 'ledger', lazy: page(pages.ledger) },
      { path: 'settings', lazy: page(pages.settings) },
      { path: 'privacy', lazy: async () => ({ Component: (await import('../pages/PrivacyPage')).PrivacyPage }) },
    ],
  },
])
