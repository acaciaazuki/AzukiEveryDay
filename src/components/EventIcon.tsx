import { ICON_BG, type EventIconKey } from '../core/eventIcons'
import { Icon, IconBadge } from './AcaciaIcons'

/** 只有小插畫，沒有底框（選擇器、預覽用）。圖本身在 AcaciaIcons */
export function EventIconArt({ icon, size = 24 }: { icon: EventIconKey; size?: number }) {
  return <Icon name={icon} size={size} className="text-[#4f6b60]" />
}

/** 圓形粉彩底框 + 小插畫，時間軸用 */
export function EventIconBadge({ icon, className = '' }: { icon: EventIconKey; className?: string }) {
  return <IconBadge name={icon} bg={ICON_BG[icon]} className={className} />
}
