import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'md' | 'page'
const styles: Record<Variant, string> = {
  primary: 'bg-sage text-white shadow-[0_4px_12px_#527b6726] hover:bg-sage-dark',
  ghost: 'bg-paper text-ink border border-line hover:bg-sage-light',
  danger: 'bg-paper text-[#c2583d] border border-line hover:bg-[#fff4f1]',
}

/**
 * 頁面右上角操作按鈕的尺寸與字級（以行事曆「＋ 新增事件」為基準）。
 * 字級跟著「設定 → 字體大小」的 --fs 縮放；nowrap 避免窄螢幕把按鈕文字折成兩行。
 * 也給外觀像按鈕的 Link 使用（例如今天頁的「看行事曆」）。
 */
export const PAGE_ACTION_SIZE = 'px-5 py-3 text-[length:calc(14px*var(--fs))] whitespace-nowrap'

// 主按鈕補一條透明外框，讓它跟有外框的次要按鈕（國定假日、批次新增等）高度完全一致
const PRIMARY_PAGE_BORDER = 'border border-transparent'

const sizes: Record<Size, string> = {
  md: 'px-4 py-2.5 text-xs',
  page: PAGE_ACTION_SIZE,
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={`rounded-(--radius-control) font-bold transition-colors disabled:opacity-50 ${sizes[size]} ${size === 'page' && variant === 'primary' ? PRIMARY_PAGE_BORDER : ''} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
