import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { PrivacyPage } from '../pages/PrivacyPage'
import { CONTACT_EMAIL, POLICIES, policyFor } from '../pages/privacy/policy'
import PrivacyDialog from './PrivacyDialog'
import { PrivacyLink } from './PrivacyLink'

const shape = (lng: keyof typeof POLICIES) =>
  POLICIES[lng].sections.map((s) => [s.id, s.blocks.map((b) => (typeof b === 'string' ? 'p' : 'sub' in b ? 'h' : `ul${b.list.length}`))])

describe('隱私權政策', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('三種語言的章節與段落結構一致', () => {
    expect(shape('ja')).toEqual(shape('zh-TW'))
    expect(shape('en')).toEqual(shape('zh-TW'))
    expect(POLICIES.ja.summary).toHaveLength(POLICIES['zh-TW'].summary.length)
    expect(POLICIES.en.summary).toHaveLength(POLICIES['zh-TW'].summary.length)
  })

  it('韓文、法文、德文介面顯示英文版政策，其他未知語言維持繁體中文', () => {
    for (const lng of ['ko', 'fr', 'de']) expect(policyFor(lng)).toBe(POLICIES.en)
    expect(policyFor('ja')).toBe(POLICIES.ja)
    expect(policyFor(undefined)).toBe(POLICIES['zh-TW'])
  })

  it('點小連結跳出面板（不換頁），顯示日期、各章節、Email 與外部連結，可關閉', async () => {
    render(<PrivacyLink />)
    const link = screen.getByRole('link', { name: '隱私權政策' })
    // 保留公開網址，右鍵複製或另開分頁時可用
    expect(link).toHaveAttribute('href', '/privacy')
    // 一般點擊被攔下改開面板：fireEvent 回傳 false 代表 preventDefault（不會換頁）
    expect(fireEvent.click(link)).toBe(false)

    const dialog = await screen.findByRole('dialog', { name: '隱私權政策' })
    // 生效日期與最後更新日期
    expect(within(dialog).getAllByText('2026-11-25')).toHaveLength(2)
    // App Store 隱私標示與最近刪除的保留期
    expect(within(dialog).getByText('App 隱私標示：不收集資料')).toBeInTheDocument()
    expect(within(dialog).getByText(/最近刪除：刪除的行程會先放在「最近刪除」30 天/)).toBeInTheDocument()
    for (const h of ['2. 我們處理哪些資料', '3. 資料儲存位置與傳輸安全', '4. 第三方服務', '6. 你的權利與資料控制', '9. 聯絡我們']) {
      expect(within(dialog).getByRole('heading', { level: 3, name: h })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`)
    const limited = within(dialog).getByRole('link', { name: 'https://developers.google.com/terms/api-services-user-data-policy' })
    expect(limited).toHaveAttribute('target', '_blank')
    // 網址後面的全形括號不會被吃進連結
    expect(within(dialog).getByRole('link', { name: 'https://myaccount.google.com/connections' })).toBeInTheDocument()
    const toc = within(dialog).getByRole('navigation', { name: '目錄' })
    expect(within(toc).getAllByRole('link')).toHaveLength(POLICIES['zh-TW'].sections.length)

    fireEvent.click(within(dialog).getByRole('button', { name: '關閉' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Ctrl／⌘ 點擊照瀏覽器預設另開分頁，不開面板', () => {
    render(<PrivacyLink />)
    expect(fireEvent.click(screen.getByRole('link', { name: '隱私權政策' }), { ctrlKey: true })).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('依介面語言切換成英文', async () => {
    await i18n.changeLanguage('en')
    render(<PrivacyDialog open onOpenChange={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Privacy Policy' })
    expect(within(dialog).getByText(/Limited Use requirements/)).toBeInTheDocument()
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

  it('據實描述：未要求 Email、不另外加密、使用 IndexedDB、drive.file 權限、記帳不進共享空間', () => {
    const all = JSON.stringify(POLICIES['zh-TW'])
    expect(all).toContain('不會要求你的 Email')
    expect(all).toContain('不會對資料另外做端對端加密')
    expect(all).toContain('IndexedDB')
    expect(all).not.toContain('加密上傳')
    expect(all).toContain('drive.file')
    expect(all).not.toContain('drive.appdata')
    expect(all).toContain('記帳紀錄與自訂分類只存在你的個人資料')
    expect(all).toContain('不包含行程標題')
    // 已移除定位與地點搜尋，不可再出現相關描述
    expect(all).not.toContain('workers.dev')
    expect(all).toContain('不使用定位')
  })
})
