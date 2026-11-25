import { describe, expect, it } from 'vitest'
import { appleTouchArt, branchArt, countFlowers, faviconArt, iconVersion, maskableArt, splashSvg, sprigArt, toSvg, type Art } from './acaciaArt'

// 文字檔讀原始內容；圖檔讀成 base64 data URL 再解碼，檢查檔頭
const texts = import.meta.glob(['../../public/*.{svg,webmanifest}', '../../index.html'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const binaries = import.meta.glob('../../public/*.{png,ico}', { query: '?inline', import: 'default', eager: true }) as Record<string, string>
const text = (p: string) => {
  const v = texts[`../../${p}`]
  if (v === undefined) throw new Error(`找不到 ${p}`)
  return v
}
const bytes = (p: string) => {
  const url = binaries[`../../${p}`]
  if (url === undefined) throw new Error(`找不到 ${p}`)
  return Uint8Array.from(atob(url.split(',')[1]), (c) => c.charCodeAt(0))
}
const exists = (p: string) => `../../${p}` in texts || `../../${p}` in binaries
const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8)

/** PNG 檔頭的寬高 */
function pngSize(buf: Uint8Array) {
  expect(String.fromCharCode(buf[1], buf[2], buf[3])).toBe('PNG')
  return { width: u32(buf, 16), height: u32(buf, 20) }
}

/** PNG 第 25 個位元組是 color type：6＝RGBA（有透明通道） */
const pngHasAlpha = (buf: Uint8Array) => buf[25] === 6

/** 每個形狀離中心最遠的距離（圓：圓心距＋半徑＋線寬；路徑：所有座標點＋線寬，控制點包住曲線所以是保守估計） */
function maxRadius(art: Art) {
  const [x, y, w, h] = art.viewBox
  const cx = x + w / 2
  const cy = y + h / 2
  let max = 0
  for (const s of art.shapes) {
    if (s.part === 'background') continue
    const pad = (s.kind !== 'rect' && s.strokeWidth ? s.strokeWidth / 2 : 0)
    if (s.kind === 'circle') max = Math.max(max, Math.hypot(s.cx - cx, s.cy - cy) + s.r + pad)
    if (s.kind === 'path') {
      const nums = s.d.match(/-?[\d.]+/g)!.map(Number)
      for (let i = 0; i < nums.length; i += 2) max = Math.max(max, Math.hypot(nums[i] - cx, nums[i + 1] - cy) + pad)
    }
  }
  return max / w
}

describe('相思樹圖示的形狀', () => {
  it('花的數量符合規格：favicon 4 顆、經典小枝條 5 顆、載入與備份長枝條 7 顆', () => {
    expect(countFlowers(faviconArt(16))).toBe(4)
    expect(countFlowers(faviconArt(32))).toBe(4)
    expect(countFlowers(sprigArt())).toBe(5)
    expect(countFlowers(branchArt())).toBe(7)
  })

  it('透明版沒有任何底色形狀', () => {
    for (const art of [faviconArt(16), faviconArt(32), sprigArt(), branchArt()]) {
      expect(art.shapes.some((s) => s.part === 'background' || s.kind === 'rect')).toBe(false)
    }
  })

  it('apple-touch-icon 是純白不透明底；maskable 是淺色底', () => {
    expect(appleTouchArt().shapes[0]).toMatchObject({ kind: 'rect', fill: '#ffffff', width: 100, height: 100 })
    expect(maskableArt().shapes[0]).toMatchObject({ kind: 'rect', part: 'background', width: 100, height: 100 })
  })

  it('maskable 的主體整個在安全區內（中間直徑 80% 的圓）', () => {
    expect(maxRadius(maskableArt())).toBeLessThanOrEqual(0.4)
  })

  it('16px favicon 的花球是單純實心圓，不加會糊掉的細節', () => {
    expect(faviconArt(16).shapes.filter((s) => s.part === 'detail')).toHaveLength(0)
  })

  it('所有圖都不在畫布外', () => {
    for (const art of [faviconArt(32), sprigArt(), appleTouchArt(), maskableArt()]) expect(maxRadius(art)).toBeLessThanOrEqual(Math.SQRT1_2)
  })
})

describe('public/ 圖檔與設定', () => {
  it('favicon.svg 和程式裡的形狀一致（改了 acaciaArt.ts 要執行 npm run icons）', () => {
    expect(text('public/favicon.svg').trim()).toBe(toSvg(faviconArt(32)))
  })

  it('index.html 的載入畫面和程式裡的長枝條一致', () => {
    expect(text('index.html')).toContain(splashSvg())
  })

  it('PNG 尺寸正確：PWA 與 maskable 192/512、apple-touch-icon 180', () => {
    expect(pngSize(bytes('public/icon-192.png'))).toEqual({ width: 192, height: 192 })
    expect(pngSize(bytes('public/icon-512.png'))).toEqual({ width: 512, height: 512 })
    expect(pngSize(bytes('public/icon-maskable-192.png'))).toEqual({ width: 192, height: 192 })
    expect(pngSize(bytes('public/icon-maskable-512.png'))).toEqual({ width: 512, height: 512 })
    expect(pngSize(bytes('public/apple-touch-icon.png'))).toEqual({ width: 180, height: 180 })
  })

  it('PWA 一般圖示有透明通道', () => {
    expect(pngHasAlpha(bytes('public/icon-192.png'))).toBe(true)
    expect(pngHasAlpha(bytes('public/icon-512.png'))).toBe(true)
  })

  it('favicon.ico 內含 16、32、48 三種尺寸', () => {
    const ico = bytes('public/favicon.ico')
    expect(u16le(ico, 2)).toBe(1)
    const count = u16le(ico, 4)
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16])
    expect(sizes).toEqual([16, 32, 48])
  })

  it('manifest：any 與 maskable 分開宣告，不用 "any maskable"，路徑都存在', () => {
    const manifest = JSON.parse(text('public/manifest.webmanifest')) as { icons: { src: string; sizes: string; purpose: string }[] }
    for (const icon of manifest.icons) {
      expect(['any', 'maskable']).toContain(icon.purpose)
      expect(exists(`public${icon.src.split('?')[0]}`)).toBe(true)
    }
    const by = (purpose: string) => manifest.icons.filter((i) => i.purpose === purpose).map((i) => i.sizes)
    expect(by('any')).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(by('maskable')).toEqual(['192x192', '512x512'])
  })

  it('index.html 的圖示連結都指到存在的檔案，並帶相同快取版本', () => {
    const html = text('index.html')
    const hrefs = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="([^"]+)"/g)].map((m) => m[1])
    expect(hrefs).toHaveLength(4)
    const versions = new Set(hrefs.map((h) => new URL(h, 'https://x').searchParams.get('v')))
    expect(versions.size).toBe(1)
    const manifest = text('public/manifest.webmanifest')
    expect(manifest).toContain(`?v=${[...versions][0]}`)
    for (const h of hrefs) expect(exists(`public${h.split('?')[0]}`)).toBe(true)
  })

  it('圖示快取版本：index.html 與 manifest 的 ?v= 全部等於由向量內容算出的版本（改了形狀卻忘了跑 npm run icons 會失敗）', () => {
    const versions = [texts['../../index.html'], texts['../../public/manifest.webmanifest']].flatMap((t) => [...t.matchAll(/\?v=([0-9a-z]+)/g)].map((m) => m[1]))
    expect(versions.length).toBeGreaterThanOrEqual(9)
    expect(new Set(versions)).toEqual(new Set([iconVersion()]))
    expect(iconVersion()).toMatch(/^[0-9a-f]{8}$/)
  })
})
