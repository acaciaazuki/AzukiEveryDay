import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BUILTIN_CATEGORIES, CATEGORY_ICON_CHOICES } from '../core/defaults'
import { EVENT_ICON_KEYS } from '../core/eventIcons'
import { ICON_NAMES } from '../core/icons'
import { Icon, IconBadge } from './AcaciaIcons'

describe('AcaciaIcons', () => {
  it('每個名稱都畫得出來，且遵守統一規格（24 viewBox、1.75 圓頭線條）', () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />)
      const svg = container.querySelector('svg')!
      expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24')
      expect(svg.getAttribute('stroke-width'), name).toBe('1.75')
      expect(svg.getAttribute('stroke-linecap'), name).toBe('round')
      expect(svg.getAttribute('stroke-linejoin'), name).toBe('round')
      expect(svg.children.length, name).toBeGreaterThan(0)
      unmount()
    }
  })

  it('行程圖示、內建記帳分類、自訂分類可選的圖示都有對應的圖', () => {
    const names = new Set<string>(ICON_NAMES)
    for (const k of EVENT_ICON_KEYS) expect(names.has(k), k).toBe(true)
    for (const c of BUILTIN_CATEGORIES) expect(names.has(c.icon), c.icon).toBe(true)
    for (const n of CATEGORY_ICON_CHOICES) expect(names.has(n), n).toBe(true)
  })

  it('尺寸用 em，徽章用 calc(36px × --fs)，會跟字體大小縮放', () => {
    const { container } = render(<IconBadge name="wake" bg="#fff3c4" />)
    expect(container.querySelector('[data-icon="wake"]')?.className).toContain('size-[calc(36px*var(--fs))]')
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('size-[')
  })

  // core/migrate.ts 轉換舊版資料時把地點寫成備註裡的「📍 地點」文字（不是畫面圖示），不在檢查範圍
  it('原始碼沒有殘留 emoji 當圖示', async () => {
    const files = import.meta.glob(['../**/*.tsx', '../core/*.ts', '!../**/*.test.*', '!../i18n/**', '!../core/migrate.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const pictograph = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}]/u
    const bad = Object.entries(files).flatMap(([f, src]) => src.split('\n').filter((l) => pictograph.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)).map((l) => `${f}: ${l.trim()}`))
    expect(bad).toEqual([])
  })
})
