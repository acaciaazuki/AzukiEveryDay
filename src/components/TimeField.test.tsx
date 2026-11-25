import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { TimeField } from './TimeField'

function Demo({ initial = '09:00', optional = false }: { initial?: string; optional?: boolean }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <TimeField label="開始" value={v} onChange={setV} optional={optional} />
      <output data-testid="value">{v}</output>
    </>
  )
}

const value = () => screen.getByTestId('value').textContent
const hour = () => screen.getByLabelText('開始 小時') as HTMLInputElement
const minute = () => screen.getByLabelText('開始 分鐘') as HTMLInputElement

describe('TimeField', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('逐字打兩位數小時、自動跳到分鐘後，畫面保留剛打的數字', () => {
    render(<Demo initial="09:00" />)
    hour().focus()
    fireEvent.change(hour(), { target: { value: '0' } })
    fireEvent.change(hour(), { target: { value: '06' } })
    expect(document.activeElement).toBe(minute())
    expect(hour().value).toBe('06')
    expect(value()).toBe('06:00')
  })

  it('24 小時制：顯示 21 與 30，沒有 AM／PM 或上午／下午切換', () => {
    render(<Demo initial="21:30" />)
    expect(hour().value).toBe('21')
    expect(minute().value).toBe('30')
    expect(screen.queryByRole('button', { name: /^(AM|PM|午前|午後)$/ })).toBeNull()
    expect(document.body.textContent).not.toMatch(/AM|PM|上午|下午|午前|午後/)
  })

  it('逐字打 1、9 自動跳到分鐘，再打 30 → 19:30', () => {
    render(<Demo initial="09:00" />)
    hour().focus()
    fireEvent.change(hour(), { target: { value: '1' } })
    fireEvent.change(hour(), { target: { value: '19' } })
    expect(document.activeElement).toBe(minute())
    fireEvent.change(minute(), { target: { value: '30' } })
    expect(value()).toBe('19:30')
    expect(hour().value).toBe('19')
  })

  it('0 點與 12 點照字面：00 → 00:00、12 → 12:00、23 → 23:00', () => {
    render(<Demo initial="08:00" />)
    fireEvent.change(hour(), { target: { value: '0' } })
    expect(value()).toBe('00:00')
    fireEvent.blur(hour())
    expect(hour().value).toBe('00')
    fireEvent.change(hour(), { target: { value: '12' } })
    expect(value()).toBe('12:00')
    fireEvent.change(hour(), { target: { value: '23' } })
    expect(value()).toBe('23:00')
  })

  it('超出範圍顯示提示，離開格子後還原', () => {
    render(<Demo initial="10:15" />)
    fireEvent.change(hour(), { target: { value: '24' } })
    expect(screen.getByRole('alert')).toHaveTextContent('小時請輸入 00–23')
    expect(value()).toBe('10:15')
    fireEvent.blur(hour())
    expect(hour().value).toBe('10')
    expect(screen.queryByRole('alert')).toBeNull()

    fireEvent.change(minute(), { target: { value: '75' } })
    expect(screen.getByRole('alert')).toHaveTextContent('分鐘請輸入 00–59')
    fireEvent.blur(minute())
    expect(minute().value).toBe('15')
    expect(value()).toBe('10:15')
  })

  it('只接受數字，單一位數補零', () => {
    render(<Demo initial="10:00" />)
    fireEvent.change(minute(), { target: { value: '5a' } })
    expect(minute().value).toBe('5')
    fireEvent.blur(minute())
    expect(minute().value).toBe('05')
    expect(value()).toBe('10:05')
  })

  it('保留點選方式：時鐘按鈕打開面板點小時、分鐘', () => {
    render(<Demo initial="08:00" />)
    fireEvent.click(screen.getByRole('button', { name: '點選開始' }))
    const panel = screen.getByRole('dialog', { name: '點選開始' })
    fireEvent.click(within(panel).getByRole('button', { name: '03' }))
    fireEvent.click(within(panel).getByRole('button', { name: '45' }))
    expect(value()).toBe('03:45')
    fireEvent.click(within(panel).getByRole('button', { name: '完成' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each(['ja', 'en'])('%s 也是 24 小時制，點選面板列出 00–23', async (lng) => {
    await i18n.changeLanguage(lng)
    render(<Demo initial="21:00" />)
    expect((screen.getByPlaceholderText('HH') as HTMLInputElement).value).toBe('21')
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    const panel = screen.getByRole('dialog')
    const labels = within(panel).getAllByRole('button').map((b) => b.textContent)
    for (const h of ['00', '12', '13', '23']) expect(labels).toContain(h)
    expect(within(panel).getAllByRole('button', { pressed: true }).map((b) => b.textContent)).toEqual(['21', '00'])
    expect(document.body.textContent).not.toMatch(/AM|PM|午前|午後/)
    await i18n.changeLanguage('zh-TW')
  })

  it('↑↓ 可以微調，23 點再往上回到 00 點', () => {
    render(<Demo initial="23:59" />)
    fireEvent.keyDown(hour(), { key: 'ArrowUp' })
    expect(value()).toBe('00:59')
    expect(hour().value).toBe('00')
    fireEvent.keyDown(minute(), { key: 'ArrowUp' })
    expect(value()).toBe('00:00')
  })

  it('選填的欄位可以清空', () => {
    render(<Demo initial="" optional />)
    expect(hour().value).toBe('')
    fireEvent.change(hour(), { target: { value: '7' } })
    expect(value()).toBe('07:00')
    fireEvent.click(screen.getByRole('button', { name: '清除開始' }))
    expect(value()).toBe('')
    expect(hour().value).toBe('')
  })
})
