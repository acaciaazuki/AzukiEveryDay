import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { IconSelect, type IconOption } from './IconSelect'

const options: IconOption<'a' | 'b' | 'c'>[] = [
  { value: 'a', label: '餐廳', icon: 'meal' },
  { value: 'b', label: '咖啡', icon: 'cafe' },
  { value: 'c', label: '公園', icon: 'park' },
]

function Demo({ onValue }: { onValue?: (v: string) => void }) {
  const [v, setV] = useState<'a' | 'b' | 'c'>('a')
  return (
    <IconSelect
      label="分類"
      value={v}
      options={options}
      onChange={(x) => {
        setV(x)
        onValue?.(x)
      }}
    />
  )
}

describe('IconSelect', () => {
  it('收起時顯示已選項目的圖示與名稱；展開後每個選項都有圖示', () => {
    render(<Demo />)
    const box = screen.getByRole('combobox', { name: '分類' })
    expect(box).toHaveTextContent('餐廳')
    expect(box.querySelector('[data-icon-name="meal"]')).not.toBeNull()
    fireEvent.click(box)
    const list = screen.getByRole('listbox')
    const opts = within(list).getAllByRole('option')
    expect(opts).toHaveLength(3)
    expect(opts[1]!.querySelector('[data-icon-name="cafe"]')).not.toBeNull()
    expect(opts[2]!.querySelector('[data-icon-name="park"]')).not.toBeNull()
    expect(opts[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('點選項目會更新並收起，按 Esc 只收選單', () => {
    const seen: string[] = []
    render(<Demo onValue={(v) => seen.push(v)} />)
    const box = screen.getByRole('combobox', { name: '分類' })
    fireEvent.click(box)
    fireEvent.click(screen.getByRole('option', { name: /公園/ }))
    expect(seen).toEqual(['c'])
    expect(box).toHaveTextContent('公園')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    fireEvent.click(box)
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('鍵盤可操作：↓ 移動、Enter 選取', () => {
    const seen: string[] = []
    render(<Demo onValue={(v) => seen.push(v)} />)
    const box = screen.getByRole('combobox', { name: '分類' })
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(seen).toEqual(['b'])
    expect(box).toHaveTextContent('咖啡')
  })
})
