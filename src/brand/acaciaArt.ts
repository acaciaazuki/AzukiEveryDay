/**
 * 台灣相思樹（Acacia confusa）枝條插畫：黃色絨球花、橄欖綠細長葉（假葉）、棕色細枝。
 *
 * 全站圖示都從這裡畫出來，一份幾何資料兩種用法：
 * - React 元件（components/AcaciaMark.tsx）直接 inline 成 SVG：側邊欄 Logo、載入畫面、備份區塊。
 * - scripts/generate-icons.mjs 轉成 public/ 底下的 favicon.svg / .ico 與 PWA、iOS 用 PNG。
 * 改了這裡的形狀之後執行 `npm run icons` 重新產生圖檔，測試會檢查 public/ 的 SVG 有沒有跟著更新。
 *
 * 只用純色、不用 gradient／filter：同一頁放好幾個 inline SVG 時不會有 id 衝突，縮到 16px 也不會糊。
 */

export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number; dash?: string; part: Part }
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number; part: Part }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; fill: string; part: Part }

/** 每個形狀屬於哪個部位：測試用來數花、確認透明版沒有底色 */
export type Part = 'background' | 'stem' | 'leaf' | 'flower' | 'detail'

export interface Art {
  viewBox: [number, number, number, number]
  shapes: Shape[]
}

export const COLORS = {
  /** 絨球花：底色、亮面、外圈絨毛、陰影小點 */
  flower: '#efbc1c',
  flowerLight: '#f9d84b',
  flowerFluff: '#f6cd35',
  flowerShade: '#d9a313',
  leaf: '#6e9a52',
  leafDark: '#5a8442',
  leafVein: '#a9c78d',
  stem: '#8a6a44',
  /** 品牌文字（側邊欄 ACACIA） */
  brandText: '#2c4a3f',
} as const

const n = (v: number) => Math.round(v * 100) / 100

/**
 * 一顆絨球花。detail 越高越像毛球：
 * 0＝單一實心圓（16px favicon 用，避免縮小後變一團雜點）
 * 1＝加亮面（32px～）
 * 2＝再加一圈絨毛與陰影小點（大圖示、Logo）
 */
function puff(cx: number, cy: number, r: number, detail: 0 | 1 | 2): Shape[] {
  if (detail === 0) return [{ kind: 'circle', cx, cy, r, fill: COLORS.flower, part: 'flower' }]
  const out: Shape[] = [{ kind: 'circle', cx, cy, r: n(detail >= 2 ? r * 0.9 : r), fill: COLORS.flower, part: 'flower' }]
  // 由中心放射出去的短花絲：一根根細線疊成毛茸茸的球邊
  const count = Math.max(20, Math.round(r * 4.2))
  const rays = (from: number, to: number, phase: number) => {
    let d = ''
    for (let i = 0; i < count; i++) {
      const a = ((i + phase) / count) * Math.PI * 2
      // 每根長度略有差異，邊緣才不會像齒輪
      const len = to + (((i * 7) % 5) - 2) * 0.03 * r
      d += `M${n(cx + Math.cos(a) * from * r)} ${n(cy + Math.sin(a) * from * r)}L${n(cx + Math.cos(a) * len)} ${n(cy + Math.sin(a) * len)}`
    }
    return d
  }
  if (detail >= 2) {
    out.push({ kind: 'path', d: rays(0.55, r * 1.0, 0), stroke: COLORS.flower, strokeWidth: n(r * 0.1), part: 'detail' })
    out.push({ kind: 'path', d: rays(0.4, r * 0.86, 0.5), stroke: COLORS.flowerFluff, strokeWidth: n(r * 0.11), part: 'detail' })
  }
  // 左上亮面：一樣用短花絲畫，邊緣才是柔的
  out.push({ kind: 'circle', cx: n(cx - r * 0.2), cy: n(cy - r * 0.22), r: n(r * 0.42), fill: COLORS.flowerLight, part: 'detail' })
  if (detail >= 2) {
    const lx = cx - r * 0.2
    const ly = cy - r * 0.22
    let d = ''
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const len = r * (0.56 + ((i * 5) % 3) * 0.04)
      d += `M${n(lx + Math.cos(a) * r * 0.25)} ${n(ly + Math.sin(a) * r * 0.25)}L${n(lx + Math.cos(a) * len)} ${n(ly + Math.sin(a) * len)}`
    }
    out.push({ kind: 'path', d, stroke: COLORS.flowerLight, strokeWidth: n(r * 0.1), part: 'detail' })
    for (const [dx, dy] of [
      [0.45, 0.4],
      [-0.05, 0.6],
      [0.6, -0.02],
    ]) {
      out.push({ kind: 'circle', cx: n(cx + dx * r), cy: n(cy + dy * r), r: n(r * 0.07), fill: COLORS.flowerShade, part: 'detail' })
    }
  }
  return out
}

/**
 * 細長葉：從 base 長到 tip，bend 讓葉子往一側彎（正值往行進方向的左手邊），width 是最寬處的寬度。
 * 回傳葉片與中肋兩個形狀。
 */
function leaf(base: [number, number], tip: [number, number], width: number, bend: number, vein = true, fill: string = COLORS.leaf): Shape[] {
  const [x1, y1] = base
  const [x2, y2] = tip
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  // 行進方向的法向量（左手邊）
  const nx = dy / len
  const ny = -dx / len
  const at = (t: number, off: number): [number, number] => [x1 + dx * t + nx * off, y1 + dy * t + ny * off]
  const curve = bend * len
  // 兩側控制點：中段鼓起 width/2，整體再往 bend 方向偏
  const a1 = at(0.3, curve + width * 0.95)
  const a2 = at(0.75, curve + width * 0.55)
  const b2 = at(0.75, curve - width * 0.45)
  const b1 = at(0.3, curve - width * 0.85)
  const p = (pt: [number, number]) => `${n(pt[0])} ${n(pt[1])}`
  const d = `M${p(base)} C${p(a1)} ${p(a2)} ${p(tip)} C${p(b2)} ${p(b1)} ${p(base)}Z`
  const out: Shape[] = [{ kind: 'path', d, fill, part: 'leaf' }]
  if (vein) {
    const m1 = at(0.35, curve * 1.05)
    const m2 = at(0.75, curve * 0.85)
    out.push({ kind: 'path', d: `M${p(at(0.06, curve * 0.2))} C${p(m1)} ${p(m2)} ${p(at(0.92, curve * 0.2))}`, stroke: COLORS.leafVein, strokeWidth: n(Math.max(0.5, width * 0.09)), part: 'detail' })
  }
  return out
}

function stem(d: string, width: number): Shape {
  return { kind: 'path', d, stroke: COLORS.stem, strokeWidth: width, part: 'stem' }
}

/**
 * 經典小枝條（PWA、iOS、Logo 用）：一根細枝往右上舒展，5 顆絨球花、2 顆花苞、兩片細長葉往右伸。
 * 畫在 0 0 100 100 的方格裡，內容約佔 x 14–94、y 8–95。
 */
function sprigShapes(detail: 1 | 2): Shape[] {
  return [
    // 主枝與通往每顆花的小枝
    stem('M31 95 C35 82 42 70 49 58 C55 48 60 38 64 27', 2.4),
    stem('M53 51 C52 44 52 36 52 28', 1.7),
    stem('M47 61 C42 54 38 47 32 40', 1.7),
    stem('M61 33 C65 30 69 28 74 25', 1.5),
    stem('M56 46 C62 46 68 47 75 48', 1.6),
    stem('M44 66 C41 63 39 61 37 59', 1.5),
    stem('M63 29 C63 22 62 18 61 14', 1.1),
    stem('M33 40 C28 42 24 46 20 50', 1.1),
    // 兩片細長葉：從枝條中下段往右伸
    ...leaf([43.5, 69], [93, 61], 7.5, 0.06, detail >= 2, COLORS.leaf),
    ...leaf([41, 74], [84, 84], 6, -0.04, detail >= 2, COLORS.leafDark),
    // 花苞
    ...puff(61, 12, 3.6, detail),
    ...puff(19, 51, 3.2, detail),
    // 5 顆絨球花（由後往前畫，前面的蓋住後面的）
    ...puff(74, 25, 10.5, detail),
    ...puff(31, 38, 10.5, detail),
    ...puff(52, 25, 12, detail),
    ...puff(76, 48, 10, detail),
    ...puff(37, 58, 8.8, detail),
  ]
}

/** 經典小枝條（透明背景） */
export function sprigArt(detail: 1 | 2 = 2): Art {
  return { viewBox: [0, 0, 100, 100], shapes: sprigShapes(detail) }
}

/**
 * Favicon 微縮版：單一分支、4 顆花、一片葉。線條加粗、花球放大，縮到 16px 仍看得出是黃花綠葉。
 * size 16 時花球不加亮面（太小只會變成雜點）。
 */
export function faviconArt(size: 16 | 32 = 32): Art {
  const detail = size === 16 ? 0 : 1
  return {
    viewBox: [0, 0, 100, 100],
    shapes: [
      stem('M24 96 C30 80 38 66 46 52 C50 44 52 38 54 30', 7),
      stem('M44 56 C38 50 33 46 28 42', 5),
      stem('M50 46 C58 46 64 48 72 50', 5),
      ...leaf([36, 74], [96, 66], 16, 0.05, false, COLORS.leaf),
      ...puff(28, 34, 17, detail),
      ...puff(56, 22, 18, detail),
      ...puff(76, 46, 16, detail),
      ...puff(42, 54, 13, detail),
    ],
  }
}

/**
 * 載入與備份用的長枝條：較長、自然延伸，7 顆小黃花、葉子沿枝條上下交錯。
 * 寬版 160×80。
 */
export function branchArt(detail: 1 | 2 = 2): Art {
  const leaves: [number, number, number, number, number, boolean][] = [
    // base x, base y, tip x, tip y, 寬度, 深色
    [22, 69, 30, 40, 7, false],
    [26, 67, 58, 74, 6.5, true],
    [52, 55.5, 62, 26, 7, false],
    [58, 53, 92, 58, 6.5, true],
    [84, 41.3, 96, 13, 6.5, false],
    [90, 38.6, 124, 42, 6, true],
    [112, 28.8, 128, 5, 5.5, false],
    [118, 26.1, 148, 26, 5, true],
  ]
  return {
    viewBox: [0, 0, 160, 80],
    shapes: [
      stem('M6 76 C30 64 52 56 78 44 C104 32 126 24 154 10', 2.6),
      ...leaves.flatMap(([bx, by, tx, ty, w, dark]) => leaf([bx, by], [tx, ty], w, by > ty + 10 ? 0.05 : -0.05, detail >= 2, dark ? COLORS.leafDark : COLORS.leaf)),
      // 通往花的小枝
      stem('M40 60 C40 54 41 50 42 46', 1.3),
      stem('M60 52 C62 58 64 62 66 65', 1.3),
      stem('M72 47 C72 40 73 34 74 30', 1.3),
      stem('M98 35 C100 42 102 46 104 50', 1.2),
      stem('M108 30 C108 25 108 21 108 18', 1.2),
      stem('M132 20 C134 26 136 30 138 33', 1.1),
      stem('M140 16 C141 12 142 10 143 8', 1),
      ...puff(42, 41, 7, detail),
      ...puff(66, 68, 6.5, detail),
      ...puff(74, 25, 7.2, detail),
      ...puff(104, 54, 6.2, detail),
      ...puff(108, 13, 6.2, detail),
      ...puff(138, 37, 5.4, detail),
      ...puff(144, 6, 4.6, detail),
    ],
  }
}

/**
 * 加底色並把圖縮進中間：
 * - apple-touch-icon：iOS 不支援透明，透明處會變黑，所以用純白底。
 * - maskable：Android 會把圖示裁成圓形或各種形狀，只有中間直徑 80% 的圓保證看得到，
 *   主體要縮進安全區；透明的 maskable 在多數啟動器會被補成黑底，所以用淺色底。
 * scale 是主體佔原尺寸的比例，dy 用來微調垂直位置（枝條視覺重心偏下）。
 */
export function onBackground(art: Art, fill: string, scale: number, dy = 0): Art {
  const [x, y, w, h] = art.viewBox
  const ox = x + (w * (1 - scale)) / 2
  const oy = y + (h * (1 - scale)) / 2 + dy
  const t = (px: number, py: number): [number, number] => [n(ox + (px - x) * scale), n(oy + (py - y) * scale)]
  const tr = (d: string) => transformPath(d, t)
  return {
    viewBox: art.viewBox,
    shapes: [
      { kind: 'rect', x, y, width: w, height: h, fill, part: 'background' },
      ...art.shapes.map((s): Shape => {
        if (s.kind === 'circle') {
          const [cx, cy] = t(s.cx, s.cy)
          return {
            ...s,
            cx,
            cy,
            r: n(s.r * scale),
            strokeWidth: s.strokeWidth === undefined ? undefined : n(s.strokeWidth * scale),
            dash: s.dash === undefined ? undefined : s.dash.replace(/[\d.]+$/, (v) => String(n(Number(v) * scale))),
          }
        }
        if (s.kind === 'path') return { ...s, d: tr(s.d), strokeWidth: s.strokeWidth === undefined ? undefined : n(s.strokeWidth * scale) }
        return s
      }),
    ],
  }
}

/** 只支援這裡用到的絕對座標指令（M、L、C、Z），每兩個數字是一個點 */
function transformPath(d: string, t: (x: number, y: number) => [number, number]): string {
  return d.replace(/(-?[\d.]+)[ ,](-?[\d.]+)/g, (_, a: string, b: string) => t(Number(a), Number(b)).join(' '))
}

/** 數花（不含花苞）：半徑大於 4 的花球 */
export function countFlowers(art: Art): number {
  return art.shapes.filter((s) => s.part === 'flower' && s.kind === 'circle' && s.r > 4).length
}

/** 轉成完整的 SVG 檔內容（產生 public/ 圖檔用）。size 有給就寫進 width/height */
export function toSvg(art: Art, size?: { width: number; height: number }): string {
  const attrs = size ? ` width="${size.width}" height="${size.height}"` : ''
  const body = art.shapes.map(shapeToSvg).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.viewBox.join(' ')}"${attrs}>${body}</svg>`
}

function shapeToSvg(s: Shape): string {
  if (s.kind === 'rect') return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.fill}"/>`
  const paint = s.fill ? ` fill="${s.fill}"` : ' fill="none"'
  const stroke = s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round"` : ''
  if (s.kind === 'circle') {
    const dash = s.dash ? ` stroke-dasharray="${s.dash}"` : ''
    return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"${paint}${stroke}${dash}/>`
  }
  return `<path d="${s.d}"${paint}${stroke}/>`
}

/** maskable 圖示的底色（和 manifest 的 background_color、網站底色一致） */
export const MASKABLE_BG = '#f7faf8'

/** iOS 主畫面圖示：純白底，枝條放在中間偏上，四周留白跟附圖一致 */
export function appleTouchArt(): Art {
  return onBackground(sprigArt(2), '#ffffff', 0.8, -1)
}

/** Android maskable 圖示：淺色底，枝條整個縮進中間直徑 80% 的安全區 */
export function maskableArt(): Art {
  return onBackground(sprigArt(2), MASKABLE_BG, 0.74, -1)
}

/** index.html 載入畫面用的長枝條 SVG（scripts/generate-icons.mts 會寫進 index.html） */
export function splashSvg(): string {
  return toSvg(branchArt(2)).replace('<svg ', '<svg width="160" height="80" aria-hidden="true" ')
}

/** 所有網站圖示的向量內容（favicon、PWA、iOS 主畫面），iconVersion 用它算出快取版本 */
const iconSources = () => [faviconArt(16), faviconArt(32), sprigArt(2), maskableArt(), appleTouchArt()].map((a) => toSvg(a)).join('\n')

/**
 * 圖示的快取版本：由圖示的向量內容算出 8 碼十六進位雜湊（FNV-1a）。
 * index.html 與 public/manifest.webmanifest 的 ?v= 都用它，形狀一改版本就跟著變，不用手動加一；
 * npm run icons 會自動寫入，npm test 會檢查有沒有忘了重跑。
 */
export function iconVersion(): string {
  const input = iconSources()
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
