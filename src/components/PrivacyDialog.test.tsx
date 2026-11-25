import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { PrivacyPage } from '../pages/PrivacyPage'
import { DEFAULT_SUPPORT_EMAIL, getPrivacyPolicy } from '../pages/privacy/policy'
import PrivacyDialog from './PrivacyDialog'
import { PrivacyLink } from './PrivacyLink'

describe('隱私權政策', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('點小連結跳出面板（不換頁），顯示日期、各章節、Email 與外部連結，可關閉', async () => {
    render(<PrivacyLink />)
    const link = screen.getByRole('link', { name: '隱私權政策' })
    // 保留公開網址，右鍵複製或另開分頁時可用
    expect(link).toHaveAttribute('href', '/privacy')
    // 一般點擊被攔下改開面板：fireEvent 回傳 false 代表 preventDefault（不會換頁）
    expect(fireEvent.click(link)).toBe(false)

    const dialog = await screen.findByRole('dialog', { name: '隱私權政策' })
    // 最後更新日期沿用 PRIVACY_VERSION
    expect(within(dialog).getByText('2026-11-25')).toBeInTheDocument()
    for (const h of ['1. 核心原則與無伺服器架構', '3. 共享行事曆空間與「忙碌時段」隱私邊界', '4. 「不收集資料」聲明與第三方服務說明', '7. 聯絡我們']) {
      expect(within(dialog).getByRole('heading', { level: 3, name: h })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('link', { name: DEFAULT_SUPPORT_EMAIL })).toHaveAttribute('href', `mailto:${DEFAULT_SUPPORT_EMAIL}`)
    const toc = within(dialog).getByRole('navigation', { name: '目錄' })
    expect(within(toc).getAllByRole('link')).toHaveLength(getPrivacyPolicy('zh-TW').sections.length)

    fireEvent.click(within(dialog).getByRole('button', { name: '關閉' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Ctrl／⌘ 點擊照瀏覽器預設另開分頁，不開面板', () => {
    render(<PrivacyLink />)
    expect(fireEvent.click(screen.getByRole('link', { name: '隱私權政策' }), { ctrlKey: true })).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('韓文介面顯示英文版並附上說明', async () => {
    await i18n.changeLanguage('ko')
    render(<PrivacyDialog open onOpenChange={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Privacy Policy' })
    expect(within(dialog).getByText(/officially provided in Traditional Chinese, Japanese, and English/)).toBeInTheDocument()
  })

  it('依介面語言切換成英文', async () => {
    await i18n.changeLanguage('en')
    render(<PrivacyDialog open onOpenChange={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Privacy Policy' })
    expect(within(dialog).getAllByText(/Data Not Collected/).length).toBeGreaterThan(0)
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('直接開 /privacy 網址會自動跳出政策面板，關閉後回到首頁', async () => {
    const router = createMemoryRouter(
      [
        { path: '/', element: <p>首頁</p> },
        { path: '/privacy', element: <PrivacyPage /> },
      ],
      { initialEntries: ['/privacy'] },
    )
    render(<RouterProvider router={router} />)
    const dialog = await screen.findByRole('dialog', { name: '隱私權政策' })
    fireEvent.click(within(dialog).getByRole('button', { name: '關閉' }))
    expect(await screen.findByText('首頁')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
