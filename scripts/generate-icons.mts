/**
 * 從 src/brand/acaciaArt.ts 產生網站圖示：
 *   public/favicon.svg、favicon.ico（16/32/48）
 *   public/icon-192.png、icon-512.png（透明，purpose any）
 *   public/icon-maskable-192.png、icon-maskable-512.png（淺色底，purpose maskable）
 *   public/apple-touch-icon.png（180，白底）
 *   index.html 的載入畫面（#boot-splash）
 *   index.html 與 public/manifest.webmanifest 的 ?v=（圖示快取版本，由向量內容算出，不用手動加一）
 *
 * 執行：npm run icons（PNG 用 Playwright 的 Chromium 轉檔，需要先裝好 Playwright：npx playwright install chromium）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { appleTouchArt, faviconArt, iconVersion, maskableArt, splashSvg, sprigArt, toSvg, type Art } from '../src/brand/acaciaArt.ts'

const root = new URL('..', import.meta.url)
const out = (p: string) => new URL(p, root)

async function loadChromium() {
  try {
    return (await import('playwright')).chromium
  } catch {
    // 沒有裝在專案裡時，試試全域安裝的 Playwright
    const { execSync } = await import('node:child_process')
    const globalRoot = execSync('npm root -g').toString().trim()
    return createRequire(globalRoot + '/')('playwright').chromium
  }
}

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()

async function png(art: Art, size: number): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${toSvg(art, { width: size, height: size })}</body></html>`)
  return page.locator('svg').screenshot({ omitBackground: true })
}

/** 把 PNG 包成 .ico（Vista 之後的格式可以直接內嵌 PNG） */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

writeFileSync(out('public/favicon.svg'), toSvg(faviconArt(32)) + '\n')
writeFileSync(
  out('public/favicon.ico'),
  ico([
    { size: 16, data: await png(faviconArt(16), 16) },
    { size: 32, data: await png(faviconArt(32), 32) },
    { size: 48, data: await png(faviconArt(32), 48) },
  ]),
)
for (const size of [192, 512]) {
  writeFileSync(out(`public/icon-${size}.png`), await png(sprigArt(2), size))
  writeFileSync(out(`public/icon-maskable-${size}.png`), await png(maskableArt(), size))
}
writeFileSync(out('public/apple-touch-icon.png'), await png(appleTouchArt(), 180))
await browser.close()

// index.html 的載入畫面
const htmlPath = out('index.html')
const html = readFileSync(htmlPath, 'utf8')
const next = html.replace(/(<!-- boot-splash:start -->)[\s\S]*?(<!-- boot-splash:end -->)/, `$1${splashSvg()}$2`)
if (next === html && !html.includes(splashSvg())) throw new Error('index.html 找不到 boot-splash 標記')

// 圖示快取版本：index.html 與 manifest 裡所有 ?v= 換成由向量內容算出的版本
const version = iconVersion()
const withVersion = (text: string) => text.replace(/\?v=[0-9a-z]+/g, `?v=${version}`)
writeFileSync(htmlPath, withVersion(next))
const manifestPath = out('public/manifest.webmanifest')
writeFileSync(manifestPath, withVersion(readFileSync(manifestPath, 'utf8')))
console.log(`圖示已更新（快取版本 ?v=${version}）`)
