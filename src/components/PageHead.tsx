import type { ReactNode } from 'react'

/** 全站頁面主標題字級：跟「今天」頁的問候一樣小（13px），跟著設定裡的字體大小縮放 */
export const PAGE_TITLE_SIZE = 'text-[length:calc(13px*var(--fs))]'

/**
 * 頁面標頭：主標題、標題右側的附加區（aside，例如搜尋框）、右側操作。
 * - 頁面不再顯示標語小字；eyebrow 只給有功能的列使用（例如「今天」頁的日期切換），沒傳就完全不輸出、不留空白
 * - 主標題全站統一用 PAGE_TITLE_SIZE；標題變小後跟右側按鈕垂直置中
 * - aside：1001px 以上排在標題右邊、同一行垂直置中，寬度最多 360px（空間不夠時可縮到 240px）；
 *   1000px 以下移到第二行、佔滿整行，第一行維持「標題 …… 操作按鈕」
 * - 有 aside 時標頭排在手機右上角浮動搜尋鈕的下方，避免第二行被浮動鈕擠窄
 * - asideFill：aside 內容較多（例如購物頁的本期記帳與預算卡）時使用。1280px 以上撐滿標題與按鈕之間（flex-1、可縮小，
 *   不會擠壓右側按鈕）；1279px 以下移到第二行、佔滿整行
 */
const ASIDE_SEARCH = 'order-last w-full min-[1001px]:order-none min-[1001px]:w-auto min-[1001px]:max-w-[360px] min-[1001px]:min-w-[240px] min-[1001px]:flex-1'
const ASIDE_FILL = 'order-last w-full min-w-0 min-[1280px]:order-none min-[1280px]:w-auto min-[1280px]:flex-1'

export function PageHead({
  eyebrow,
  title,
  aside,
  asideFill = false,
  actions,
  eyebrowClassName = 'text-[length:calc(11px*var(--fs))]',
}: {
  eyebrow?: ReactNode
  title: string
  aside?: ReactNode
  asideFill?: boolean
  actions?: ReactNode
  eyebrowClassName?: string
}) {
  return (
    // 有 aside 時排在手機右上角浮動搜尋鈕的下方（clear-right），第二行的搜尋框才會跟下面的卡片一樣寬
    <div data-page-head className={`mt-4 mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 ${aside ? 'clear-right' : ''}`}>
      <div className="shrink-0">
        {eyebrow && <div className={`mb-1.5 tracking-wide text-muted ${eyebrowClassName}`}>{eyebrow}</div>}
        <h1 className={`font-extrabold tracking-tight ${PAGE_TITLE_SIZE}`}>{title}</h1>
      </div>
      {aside && (
        <div data-page-head-aside className={asideFill ? ASIDE_FILL : ASIDE_SEARCH}>
          {aside}
        </div>
      )}
      {actions && <div className={`flex flex-wrap gap-2 ${aside ? 'ml-auto' : ''}`}>{actions}</div>}
    </div>
  )
}
