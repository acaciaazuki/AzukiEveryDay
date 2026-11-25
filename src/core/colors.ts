/**
 * 色票（莫蘭迪低飽和色）：行程卡片、共享空間與記帳分類共用。
 * 資料只存色票代碼（例如 'sage'），畫面再對應成實際顏色；不認得的代碼退回 sage。
 * 每組文字色與背景色的對比都維持 4.5 以上（colors.test.ts 會檢查）。
 */
export const PALETTE = {
  sage: { bg: '#e7efe9', fg: '#3f6a56', dot: '#527b67' },
  forest: { bg: '#dfeadf', fg: '#2f5d4a', dot: '#46705c' },
  sky: { bg: '#e4f0f7', fg: '#2f5a78', dot: '#5b8fb3' },
  lavender: { bg: '#ebe6f6', fg: '#5a4690', dot: '#8b78c2' },
  peach: { bg: '#ffe9dc', fg: '#8a4527', dot: '#e39a72' },
  butter: { bg: '#fbf1d3', fg: '#6e5518', dot: '#d4ad45' },
  rose: { bg: '#fbe4e6', fg: '#8a3a45', dot: '#d98190' },
  sand: { bg: '#f0e6d8', fg: '#6d4f30', dot: '#b08a5e' },
  slate: { bg: '#e6eaef', fg: '#3c4c60', dot: '#7488a0' },
} as const

export type PaletteKey = keyof typeof PALETTE
export const PALETTE_KEYS = Object.keys(PALETTE) as PaletteKey[]

export const isPaletteKey = (v: unknown): v is PaletteKey => typeof v === 'string' && v in PALETTE

/** 色票代碼 → 顏色；不認得的代碼用 fallback */
export const paletteOf = (key: string | undefined, fallback: PaletteKey = 'sage') => PALETTE[isPaletteKey(key) ? key : fallback]

/** 相對亮度（WCAG），測試用來檢查對比 */
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
