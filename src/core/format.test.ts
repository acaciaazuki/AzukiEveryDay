import { describe, expect, it } from 'vitest'
import { currencyName, currencySymbol, formatCurrency, isCurrencyCode } from './format'

describe('自訂幣別符號', () => {
  it('三碼大寫才算 ISO 代碼', () => {
    expect(isCurrencyCode('USD')).toBe(true)
    expect(isCurrencyCode('฿')).toBe(false)
    expect(isCurrencyCode('usd')).toBe(false)
    expect(isCurrencyCode('RM')).toBe(false)
  })
  it('單一字元的符號貼著數字，較長的空一格，千分位照語系', () => {
    expect(formatCurrency(1200, '฿', 'zh-TW')).toBe('฿1,200')
    expect(formatCurrency(12.5, 'RM', 'en')).toBe('RM 12.5')
    expect(formatCurrency(300, '點數', 'zh-TW')).toBe('點數 300')
  })
  it('符號與名稱直接用使用者輸入的', () => {
    expect(currencySymbol('฿', 'zh-TW')).toBe('฿')
    expect(currencyName('RM', 'ja')).toBe('RM')
  })
  it('ISO 幣別維持原本格式', () => {
    expect(formatCurrency(1200, 'TWD', 'zh-TW')).toBe('NT$1,200')
    expect(formatCurrency(15, 'USD', 'zh-TW')).toBe('US$15')
    expect(formatCurrency(3000, 'THB', 'en')).toMatch(/^THB\s3,000$/)
  })
})
