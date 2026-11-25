import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { parseHHMM, parseHourInput, parseMinuteInput, toHHMM } from '../core/time'
import { Icon } from './AcaciaIcons'

const pad = (n: number) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/**
 * 時間輸入（24 小時制）：小時（00–23）、分鐘（00–59）兩個可以直接打數字的格子，旁邊的時鐘按鈕可以點選常用時間。
 * 取代原生 <input type="time">（繁中瀏覽器會顯示「上午／下午」、英文顯示 AM／PM，iOS 只能滾輪選）。
 * value／onChange 一律是 "HH:mm"；optional 的欄位可以清空成 ""。
 */
export function TimeField({ label, value, onChange, optional = false }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean }) {
  const { t } = useTranslation()
  const uid = useId()
  const labelId = `${uid}-label`
  const errorId = `${uid}-error`
  const pickerId = `${uid}-picker`

  const init = parseHHMM(value)
  const [hh, setHh] = useState(init ? pad(init.h) : '')
  const [mm, setMm] = useState(init ? pad(init.m) : '')
  const [invalid, setInvalid] = useState<'hour' | 'minute' | null>(null)
  const [open, setOpen] = useState(false)
  const emitted = useRef(value)
  const root = useRef<HTMLDivElement>(null)
  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)

  /** 依 value 重設格子內容（外部改值、或輸入不合法要還原時） */
  const resetFrom = (v: string) => {
    const p = parseHHMM(v)
    setHh(p ? pad(p.h) : '')
    setMm(p ? pad(p.m) : '')
    setInvalid(null)
  }

  // 外部改了 value（例如切換要編輯的行程）才同步，自己送出去的值不要覆蓋使用者正在打的字
  useEffect(() => {
    if (value === emitted.current) return
    emitted.current = value
    resetFrom(value)
  }, [value])

  const emit = (v: string) => {
    emitted.current = v
    onChange(v)
  }
  const emitParts = (h: number, m: number) => emit(toHHMM(h, m))

  // 點選元件外面就收起點選面板
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onHour = (raw: string) => {
    const text = raw.replace(/\D/g, '').slice(0, 2)
    setHh(text)
    if (!text) {
      setInvalid(null)
      if (optional && !mm) emit('')
      return
    }
    const h = parseHourInput(text)
    if (h == null) return setInvalid('hour')
    setInvalid(null)
    emitParts(h, parseMinuteInput(mm) ?? 0)
    if (!mm) setMm('00')
    // 打滿兩位數就跳到分鐘
    if (text.length === 2) {
      minuteRef.current?.focus()
      minuteRef.current?.select()
    }
  }

  const onMinute = (raw: string) => {
    const text = raw.replace(/\D/g, '').slice(0, 2)
    setMm(text)
    if (!text) return setInvalid(null)
    const m = parseMinuteInput(text)
    if (m == null) return setInvalid('minute')
    setInvalid(null)
    const h = parseHourInput(hh)
    if (h != null) emitParts(h, m)
  }

  /** 離開格子時：不合法或沒填完就還原成目前的值，合法的補零（9 → 09） */
  const onBlurField = () => {
    // 打滿兩位數自動跳到分鐘時，blur 在重新渲染前就觸發，state 還是舊的；直接讀輸入格的內容
    const hText = hourRef.current?.value ?? hh
    const mText = minuteRef.current?.value ?? mm
    const h = parseHourInput(hText)
    const m = parseMinuteInput(mText)
    if (optional && !hText && !mText) {
      setInvalid(null)
      if (value) emit('')
      return
    }
    if (h == null || m == null) return resetFrom(value)
    setHh(pad(h))
    setMm(pad(m))
  }

  /** ↑↓ 微調：小時 0–23、分鐘 0–59 循環 */
  const onArrow = (part: 'hour' | 'minute') => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && part === 'minute' && !mm) {
      e.preventDefault()
      hourRef.current?.focus()
      return
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const d = e.key === 'ArrowUp' ? 1 : -1
    const [h, m] = (value || '12:00').split(':').map(Number)
    const next = part === 'hour' ? `${pad((h + d + 24) % 24)}:${pad(m)}` : `${pad(h)}:${pad((m + d + 60) % 60)}`
    resetFrom(next)
    emit(next)
  }

  const pickHour = (h: number) => {
    const m = parseMinuteInput(mm) ?? 0
    setHh(pad(h))
    setMm(pad(m))
    setInvalid(null)
    emitParts(h, m)
  }
  const pickMinute = (m: number) => {
    const h = parseHourInput(hh) ?? 12
    setHh(pad(h))
    setMm(pad(m))
    setInvalid(null)
    emitParts(h, m)
  }

  const clear = () => {
    setHh('')
    setMm('')
    setInvalid(null)
    emit('')
  }

  const cur = parseHHMM(value)
  const digit = 'w-[2.2em] min-w-0 rounded-md bg-transparent px-0.5 py-0.5 text-center text-sm font-normal text-ink tabular-nums outline-none placeholder:text-[#b8c2bd] focus:bg-sage-light'

  return (
    <div ref={root} role="group" aria-labelledby={labelId} className="relative grid min-w-0 gap-1.5 text-xs font-semibold text-muted">
      <span id={labelId}>{label}</span>
      <div
        className={`flex min-w-0 items-center gap-1 rounded-(--radius-control) border bg-oat px-2 py-1.5 focus-within:border-sage ${invalid ? 'border-[#e0a493]' : 'border-line'}`}
      >
        <input
          ref={hourRef}
          aria-label={`${label} ${t('time.hour')}`}
          aria-invalid={invalid === 'hour' || undefined}
          aria-describedby={invalid ? errorId : undefined}
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH"
          maxLength={2}
          value={hh}
          onChange={(e) => onHour(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={onBlurField}
          onKeyDown={onArrow('hour')}
          className={digit}
        />
        <span aria-hidden className="text-sm text-ink">
          :
        </span>
        <input
          ref={minuteRef}
          aria-label={`${label} ${t('time.minute')}`}
          aria-invalid={invalid === 'minute' || undefined}
          aria-describedby={invalid ? errorId : undefined}
          inputMode="numeric"
          autoComplete="off"
          placeholder="mm"
          maxLength={2}
          value={mm}
          onChange={(e) => onMinute(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={onBlurField}
          onKeyDown={onArrow('minute')}
          className={digit}
        />
        <span className="ml-auto flex shrink-0 items-center">
          {optional && value && (
            <button type="button" onClick={clear} aria-label={t('time.clear', { label })} title={t('time.clear', { label })} className="grid size-7 place-items-center rounded-full text-muted hover:bg-sage-light">
              <Icon name="close" className="size-[1.3em]" />
            </button>
          )}
          <button
            type="button"
            aria-label={t('time.pick', { label })}
            title={t('time.pick', { label })}
            aria-expanded={open}
            aria-controls={open ? pickerId : undefined}
            onClick={() => setOpen((o) => !o)}
            className={`grid size-7 place-items-center rounded-full text-sage-dark hover:bg-sage-light ${open ? 'bg-sage-light' : ''}`}
          >
            <Icon name="clock" className="size-[1.5em]" />
          </button>
        </span>
      </div>
      {invalid && (
        <p id={errorId} role="alert" className="text-[length:calc(11px*var(--fs))] font-normal text-[#c2583d]">
          {t(invalid === 'hour' ? 'time.hourInvalid' : 'time.minuteInvalid')}
        </p>
      )}
      {open && (
        <div
          id={pickerId}
          role="dialog"
          aria-label={t('time.pick', { label })}
          onKeyDown={(e) => {
            // 面板裡的 Esc 只收面板，不要連對話框一起關掉
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
            }
          }}
          className="absolute inset-x-0 top-full z-20 mt-1 grid gap-2.5 rounded-(--radius-control) border border-line bg-paper p-3 shadow-card"
        >
          <span>{t('time.hour')}</span>
          <div className="grid grid-cols-6 gap-1">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={cur?.h === h}
                onClick={() => pickHour(h)}
                className={`rounded-lg py-1.5 text-[length:calc(13px*var(--fs))] font-semibold tabular-nums ${cur?.h === h ? 'bg-sage text-white' : 'bg-oat text-ink hover:bg-sage-light'}`}
              >
                {pad(h)}
              </button>
            ))}
          </div>
          <span>{t('time.minute')}</span>
          <div className="grid grid-cols-6 gap-1">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={cur?.m === m}
                onClick={() => pickMinute(m)}
                className={`rounded-lg py-1.5 text-[length:calc(13px*var(--fs))] font-semibold tabular-nums ${cur?.m === m ? 'bg-sage text-white' : 'bg-oat text-ink hover:bg-sage-light'}`}
              >
                {pad(m)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(false)} className="justify-self-end rounded-full bg-sage px-4 py-1.5 text-[length:calc(13px*var(--fs))] font-bold text-white">
            {t('time.done')}
          </button>
        </div>
      )}
    </div>
  )
}
