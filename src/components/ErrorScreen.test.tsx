import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { router } from '../app/router'
import { emptyPersonalData } from '../core/defaults'
import { usePersonalStore } from '../store/usePersonalStore'
import { AppErrorBoundary, RouteErrorScreen } from './ErrorScreen'

function Boom(): never {
  throw new Error('繪製失敗的測試錯誤')
}

describe('畫面發生錯誤時的保底畫面', () => {
  let created: Blob[] = []
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
    const data = emptyPersonalData()
    usePersonalStore.setState({ data: { ...data, events: { e1: { id: 'e1', title: '寫報告', startDate: '2026-11-25', endDate: '2026-11-25', isAllDay: true, color: 'sage', note: '', trashedAt: null } } } })
    created = []
    vi.spyOn(console, 'error').mockImplementation(() => {})
    URL.createObjectURL = vi.fn((b: Blob) => {
      created.push(b)
      return 'blob:test'
    })
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it('正式的路由設定有錯誤頁（不會整頁空白）', () => {
    const root = router.routes[0] as { ErrorBoundary?: unknown; errorElement?: { type?: unknown } }
    expect(root.ErrorBoundary ?? root.errorElement?.type).toBe(RouteErrorScreen)
  })

  it('頁面出錯：顯示說明、下載備份、重新載入、回到行事曆，錯誤訊息收在詳細資訊裡', () => {
    const r = createMemoryRouter([{ path: '/', Component: Boom, ErrorBoundary: RouteErrorScreen }])
    render(<RouterProvider router={r} />)
    const screenEl = screen.getByRole('alert')
    expect(screenEl).toHaveTextContent('畫面發生問題')
    expect(screenEl).toHaveTextContent('你的資料都還保存在這台裝置上')
    for (const name of ['下載資料備份', '重新載入', '回到行事曆']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByText('錯誤詳細資訊（回報問題時可以附上）').closest('details')).toHaveTextContent('繪製失敗的測試錯誤')
    expect(screen.getByRole('link', { name: 'acacia.qiqi@gmail.com' })).toHaveAttribute('href', 'mailto:acacia.qiqi@gmail.com')
  })

  it('下載資料備份：跟設定頁匯出同一種格式（可以再匯入），檔名 acacia-日期.json', async () => {
    const r = createMemoryRouter([{ path: '/', Component: Boom, ErrorBoundary: RouteErrorScreen }])
    render(<RouterProvider router={r} />)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: '下載資料備份' }))
    expect(click).toHaveBeenCalled()
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^acacia-\d{4}-\d{2}-\d{2}\.json$/)
    const json = JSON.parse(await created[0]!.text())
    expect(json).toEqual(JSON.parse(JSON.stringify(usePersonalStore.getState().data)))
    expect(json.events.e1.title).toBe('寫報告')
  })

  it('路由以外的地方出錯：最外層的錯誤邊界一樣顯示保底畫面', () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('畫面發生問題')
  })

  it('網址不存在：顯示「找不到這個頁面」與回到行事曆，不當成錯誤', () => {
    const r = createMemoryRouter([{ path: '/', Component: () => null, ErrorBoundary: RouteErrorScreen }], { initialEntries: ['/no-such-page'] })
    render(<RouterProvider router={r} />)
    expect(screen.getByRole('heading', { name: '找不到這個頁面' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '回到行事曆' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
