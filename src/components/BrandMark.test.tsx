import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AcaciaBranch, BootSplash, BrandLogo } from './BrandMark'

describe('BrandLogo', () => {
  it('顯示相思樹枝條與 ACACIA 字樣，沒有舊版的圓角底色方塊', () => {
    const { container } = render(<BrandLogo name="ACACIA" />)
    expect(screen.getByText('ACACIA')).toHaveStyle({ color: '#2c4a3f' })
    const svg = container.querySelector('svg[data-art="acacia"]')!
    expect(svg).toBeInTheDocument()
    expect(svg.querySelector('rect')).toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('AcaciaBranch / BootSplash', () => {
  it('載入畫面有可讀的狀態文字，枝條會擺動', () => {
    render(<BootSplash label="載入中…" />)
    const status = screen.getByRole('status', { name: '載入中…' })
    expect(status.querySelector('svg')).toHaveClass('motion-safe:animate-sway')
  })

  it('不在備份時枝條不動', () => {
    const { container } = render(<AcaciaBranch />)
    expect(container.querySelector('svg')).not.toHaveClass('motion-safe:animate-sway')
  })
})
