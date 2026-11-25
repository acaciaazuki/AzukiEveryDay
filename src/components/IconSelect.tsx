import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { IconName } from '../core/icons'
import { Icon } from './AcaciaIcons'

export interface IconOption<V extends string> {
  value: V
  label: string
  icon: IconName
  /** 圖示的粉彩底色 */
  bg?: string
  /** 選項右側的淡色補充文字（例如數量） */
  meta?: string
}

/**
 * 支援 SVG 圖示的自訂下拉選單（原生 <select> 的 option 放不了 SVG）。
 * 觸發按鈕與展開的每個選項都會顯示圖示＋名稱；支援鍵盤（↑↓ Home End Enter Esc）與螢幕閱讀器（combobox + listbox）。
 */
export function IconSelect<V extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  compact = false,
}: {
  label: string
  value: V
  options: readonly IconOption<V>[]
  onChange: (v: V) => void
  /** 標籤只給螢幕閱讀器（例如放在工具列時） */
  hideLabel?: boolean
  /** 小尺寸膠囊樣式，跟搜尋框同高 */
  compact?: boolean
}) {
  const uid = useId()
  const labelId = `${uid}-label`
  const listId = `${uid}-list`
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const [active, setActive] = useState(selectedIndex)
  const root = useRef<HTMLDivElement>(null)
  const current = options[selectedIndex]

  // 點選元件外面就收起
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // 展開後讓目前項目捲到可見範圍
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active, listId])

  const show = () => {
    setActive(selectedIndex)
    setOpen(true)
  }
  const pick = (i: number) => {
    const o = options[i]
    if (o) onChange(o.value)
    setOpen(false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault()
        if (!open) return show()
        setActive((a) => Math.min(last, Math.max(0, a + (e.key === 'ArrowDown' ? 1 : -1))))
        break
      }
      case 'Home':
      case 'End':
        if (open) {
          e.preventDefault()
          setActive(e.key === 'Home' ? 0 : last)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) pick(active)
        else show()
        break
      case 'Escape':
        // 展開時的 Esc 只收選單，不要連對話框一起關掉
        if (open) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  const chip = (o: IconOption<V>, small = false) => (
    <span className={`grid ${small ? 'size-[1.8em]' : 'size-[2.3em]'} shrink-0 place-items-center rounded-full text-[#4f6b60]`} style={{ background: o.bg ?? '#eaf6ef' }}>
      <Icon name={o.icon} className={small ? 'size-[1.25em]' : 'size-[1.5em]'} />
    </span>
  )
  const meta = (o: IconOption<V>) => o.meta !== undefined && <span className="shrink-0 text-xs text-muted">{o.meta}</span>

  return (
    <div ref={root} className="grid gap-1.5 text-xs font-semibold text-muted">
      <span id={labelId} className={hideLabel ? 'sr-only' : undefined}>
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKeyDown}
          className={`flex w-full items-center text-left text-sm font-normal text-ink outline-none focus:border-sage ${compact ? 'gap-2 rounded-full border border-line bg-oat py-1 pr-3 pl-1' : 'gap-2.5 rounded-(--radius-control) border border-line bg-oat px-3 py-2'}`}
        >
          {current && chip(current, compact)}
          <span className="min-w-0 flex-1 truncate">{current?.label}</span>
          {current && meta(current)}
          <span aria-hidden className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
            <svg viewBox="0 0 24 24" className="size-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9.5l6 6 6-6" />
            </svg>
          </span>
        </button>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-y-auto rounded-(--radius-control) border border-line bg-paper p-1.5 shadow-card"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-normal text-ink ${i === active ? 'bg-sage-light' : ''} ${o.value === value ? 'font-semibold' : ''}`}
              >
                {chip(o)}
                <span className="flex-1">{o.label}</span>
                {meta(o)}
                {o.value === value && <Icon name="check" className="text-sage-dark" />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
