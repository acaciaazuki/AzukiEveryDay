import 'fake-indexeddb/auto'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { set } from 'idb-keyval'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { Layout } from '../app/Layout'
import { CURRENT_VERSIONS } from '../core/consent'
import i18n from '../i18n'
import { CONSENT_KEY, useConsentStore } from '../store/useConsentStore'

function renderApp(path = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: Layout,
        children: [
          { index: true, element: <p>今天頁內容</p> },
          { path: 'privacy', element: <p>政策頁內容</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const load = () => act(() => useConsentStore.getState().load())

describe('使用條款同意面板', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
    await useConsentStore.getState().reset()
    useConsentStore.setState({ status: 'loading' })
  })

  it('讀取同意紀錄期間不顯示 App', () => {
    renderApp()
    expect(screen.queryByText('今天頁內容')).not.toBeInTheDocument()
  })

  it('第一次使用：擋住整個 App，可切換閱讀兩份文件，Esc 關不掉', async () => {
    await load()
    renderApp()
    // 這個測試平常約 0.7 秒，整套平行執行時偶爾超過預設的 1 秒等待上限，放寬到 3 秒
    const dialog = await screen.findByRole('dialog', { name: '使用前請先閱讀並同意' }, { timeout: 3000 })
    expect(screen.queryByText('今天頁內容')).not.toBeInTheDocument()
    // 預設先看隱私權政策
    expect(screen.getByRole('tab', { name: '隱私權政策' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('重點摘要')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '第三方授權清單' }))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    // 版本與「只存在本機」的說明
    expect(screen.getByText(new RegExp(`隱私權政策版本 ${CURRENT_VERSIONS.privacy}`))).toHaveTextContent('清除瀏覽器資料')

    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /關閉/ })).not.toBeInTheDocument()
  })

  it('不同意：顯示說明並維持擋住，可以回去閱讀', async () => {
    await load()
    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: '不同意' }))
    expect(screen.getByRole('alert')).toHaveTextContent('需要同意才能使用 ACACIA')
    expect(screen.queryByText('今天頁內容')).not.toBeInTheDocument()
    expect(useConsentStore.getState().status).toBe('required')
    fireEvent.click(screen.getByRole('button', { name: '回去閱讀' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('重點摘要')).toBeInTheDocument()
  })

  it('同意後進入 App，並記錄目前版本', async () => {
    await load()
    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: '同意並開始使用' }))
    expect(await screen.findByText('今天頁內容')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useConsentStore.getState().record).toMatchObject(CURRENT_VERSIONS)
  })

  it('已同意目前版本：直接進入 App', async () => {
    await set(CONSENT_KEY, { ...CURRENT_VERSIONS, acceptedAt: 1 })
    await load()
    renderApp()
    expect(screen.getByText('今天頁內容')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('文件改版：再問一次，並標示哪份文件更新了', async () => {
    await set(CONSENT_KEY, { ...CURRENT_VERSIONS, licenses: '2000-01-01', acceptedAt: 1 })
    await load()
    renderApp()
    await screen.findByRole('dialog', { name: '文件已更新，請重新閱讀並同意' })
    // 先打開有更新的授權清單
    const tab = screen.getByRole('tab', { name: /第三方授權清單/ })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveTextContent('已更新')
    expect(screen.getByRole('tab', { name: '隱私權政策' })).not.toHaveTextContent('已更新')
  })

  it('/privacy 網址：沒同意也能閱讀政策全文，同意後回到首頁', async () => {
    await load()
    const router = renderApp('/privacy')
    await screen.findByRole('dialog')
    expect(screen.getByRole('tab', { name: '隱私權政策' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('重點摘要')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '同意並開始使用' }))
    expect(await screen.findByText('今天頁內容')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('可以在面板裡切換語言', async () => {
    await load()
    renderApp()
    fireEvent.click(await screen.findByRole('radio', { name: 'English' }))
    expect(await screen.findByRole('button', { name: 'Agree and start' })).toBeInTheDocument()
    await i18n.changeLanguage('zh-TW')
  })
})
