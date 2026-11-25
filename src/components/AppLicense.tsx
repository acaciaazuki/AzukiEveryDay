import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** 本 App 的授權（SPDX），要跟 package.json 的 license 一致 */
export const APP_LICENSE = 'AGPL-3.0-or-later'
/** 原始碼網址：AGPL 第 13 條要讓透過網路使用的人拿得到原始碼 */
export const SOURCE_URL = 'https://github.com/acaciaazuki/AzukiEveryDay'

// 授權全文（repo 根目錄的 LICENSE）等第一次按「檢視授權全文」才載入
let textPromise: Promise<string> | undefined
const loadText = () => (textPromise ??= import('../../LICENSE?raw').then((m) => m.default))

/** 授權清單最上方：ACACIA Everyday 本身的版權與授權說明 */
export function AppLicense() {
  const { t } = useTranslation()
  const [showText, setShowText] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!showText || text !== null) return
    let alive = true
    loadText().then(
      (s) => alive && setText(s),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [showText, text])

  return (
    <section aria-label={t('licenses.app.heading')} className="mb-5 rounded-(--radius-control) border border-line bg-oat/60 px-3 py-3 text-xs leading-relaxed">
      <h3 className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-bold">
        {t('licenses.app.heading')}
        <span className="rounded-full bg-sage-light px-2 py-0.5 text-[length:calc(10px*var(--fs))] font-bold text-sage-dark">{APP_LICENSE}</span>
      </h3>
      <p>{t('licenses.app.notice')}</p>
      <p className="mt-1.5 text-muted">{t('licenses.app.plain')}</p>
      <p className="mt-1.5 text-muted">{t('licenses.app.warranty')}</p>
      <p className="mt-2 flex flex-wrap gap-3 text-[length:calc(11px*var(--fs))] font-semibold">
        <button type="button" aria-expanded={showText} onClick={() => setShowText((v) => !v)} className="text-sage-dark hover:underline">
          {showText ? t('licenses.hideText') : t('licenses.viewText')}
        </button>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer noopener" className="text-muted hover:text-sage-dark hover:underline">
          {t('licenses.app.source')}
        </a>
      </p>
      {showText && (
        <pre className="mt-2 max-h-72 overflow-auto rounded-(--radius-control) border border-line bg-paper p-3 font-mono text-[length:calc(11px*var(--fs))] leading-relaxed whitespace-pre-wrap text-ink">
          {failed ? t('licenses.loadFail') : (text ?? t('licenses.loading'))}
        </pre>
      )}
    </section>
  )
}
