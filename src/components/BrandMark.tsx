import { useTranslation } from 'react-i18next'
import { branchArt, COLORS, sprigArt, type Art } from '../brand/acaciaArt'

/**
 * 品牌圖示：台灣相思樹枝條（無底色）。形狀定義在 src/brand/acaciaArt.ts，
 * public/ 的 favicon 與 App 圖示也是從那裡產生的（npm run icons），改形狀時兩邊會一起變。
 */
export function ArtSvg({ art, className, title }: { art: Art; className?: string; title?: string }) {
  return (
    <svg viewBox={art.viewBox.join(' ')} className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} data-art="acacia">
      {art.shapes.map((s, i) => {
        if (s.kind === 'rect') return <rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} />
        const paint = {
          fill: s.fill ?? 'none',
          stroke: s.stroke,
          strokeWidth: s.strokeWidth,
          strokeLinecap: s.stroke ? ('round' as const) : undefined,
        }
        if (s.kind === 'circle') return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} strokeDasharray={s.dash} {...paint} />
        return <path key={i} d={s.d} {...paint} />
      })}
    </svg>
  )
}

const SPRIG = sprigArt(2)
const BRANCH = branchArt(2)

/** 經典小枝條（5 顆絨球花），透明背景 */
export function BrandMark({ className = 'size-10' }: { className?: string }) {
  return <ArtSvg art={SPRIG} className={className} />
}

/** 左上角 Logo：枝條＋ACACIA 字樣（#2c4a3f） */
export function BrandLogo({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {/* 枝條的花集中在右上，往左微調一點，讓圖與字的視覺間距自然 */}
      <BrandMark className="-ml-1 size-10 shrink-0" />
      <span className="text-[1.3rem] leading-none font-extrabold tracking-[0.04em]" style={{ color: COLORS.brandText }}>
        {name}
      </span>
    </span>
  )
}

/** 載入與備份用的長枝條（7 顆小黃花）。active 時輕輕擺動（使用者關閉動畫時不動） */
export function AcaciaBranch({ className = 'w-40', active = false, title }: { className?: string; active?: boolean; title?: string }) {
  return <ArtSvg art={BRANCH} title={title} className={`${className} ${active ? 'motion-safe:animate-sway' : ''}`} />
}

/**
 * 系統載入畫面：JS 還沒跑起來時 index.html 先顯示同一張圖（#boot-splash），React 接手後畫面不會跳動。
 */
export function BootSplash({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid min-h-dvh place-items-center bg-oat">
      <AcaciaBranch className="w-40" active />
    </div>
  )
}

/** 直接開啟某一頁的網址時，該頁程式下載完成前顯示的載入畫面（跟 index.html 的載入畫面同一張圖） */
export function PageLoading() {
  const { t } = useTranslation()
  return <BootSplash label={t('app.loading')} />
}
