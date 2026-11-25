import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PAGE_TITLE_SIZE, PageHead } from './PageHead'

describe('PageHead', () => {
  it('主標題用全站統一的 13px（跟著字體設定縮放），沒傳 eyebrow 就不輸出任何小字', () => {
    const { container } = render(<PageHead title="標題" />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(PAGE_TITLE_SIZE).toBe('text-[length:calc(13px*var(--fs))]')
    expect(h1).toHaveClass(PAGE_TITLE_SIZE)
    expect(h1).not.toHaveClass('text-2xl')
    // 標題區塊裡只有標題本身，沒有留下空的小字列
    expect(h1.parentElement!.children).toHaveLength(1)
    expect(container.querySelector('.text-muted')).toBeNull()
  })

  it('有功能的列（例如今天頁的日期切換）照常顯示在標題上方', () => {
    render(<PageHead eyebrow={<button type="button">‹</button>} title="晚安" eyebrowClassName="text-[length:calc(14px*var(--fs))]" />)
    expect(screen.getByRole('button', { name: '‹' }).parentElement).toHaveClass('text-[length:calc(14px*var(--fs))]')
    expect(screen.getByRole('heading', { level: 1, name: '晚安' })).toHaveClass(PAGE_TITLE_SIZE)
  })

  it('aside 放在標題與操作按鈕之間：寬螢幕同一行、最寬 360px；窄螢幕移到第二行佔滿整行', () => {
    render(<PageHead title="最愛地點" aside={<input aria-label="搜尋" />} actions={<button type="button">＋ 新增</button>} />)
    const head = screen.getByRole('heading', { level: 1 }).closest('[data-page-head]')!
    expect(head).toHaveClass('flex', 'flex-wrap', 'items-center', 'justify-between', 'clear-right')
    const [title, aside, actions] = [...head.children] as HTMLElement[]
    expect(title).toContainElement(screen.getByRole('heading', { level: 1 }))
    expect(aside).toHaveAttribute('data-page-head-aside')
    expect(aside).toContainElement(screen.getByRole('textbox', { name: '搜尋' }))
    expect(aside).toHaveClass('order-last', 'w-full', 'min-[1001px]:order-none', 'min-[1001px]:max-w-[360px]', 'min-[1001px]:flex-1')
    // 按鈕一律靠最右邊
    expect(actions).toHaveClass('ml-auto')
    expect(actions).toContainElement(screen.getByRole('button', { name: '＋ 新增' }))
  })

  it('沒傳 aside 就不輸出空的容器', () => {
    const { container } = render(<PageHead title="標題" actions={<button type="button">按鈕</button>} />)
    expect(container.querySelector('[data-page-head-aside]')).toBeNull()
    expect(container.querySelector('[data-page-head]')).not.toHaveClass('clear-right')
  })
})
