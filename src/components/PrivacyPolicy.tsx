import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getPrivacyPolicy, getSupportEmail } from '../pages/privacy/policy'

const EMAIL = getSupportEmail()
const LINK = new RegExp(`(https://[^\\s）)、，。]+|${EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g')

/** 把段落裡的網址與支援信箱變成連結 */
function rich(text: string): ReactNode[] {
  return text.split(LINK).map((part, i) => {
    if (part === EMAIL)
      return (
        <a key={i} href={`mailto:${EMAIL}`} className="font-bold text-sage-dark underline underline-offset-2">
          {EMAIL}
        </a>
      )
    if (part.startsWith('https://'))
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="break-all text-sage-dark underline underline-offset-2">
          {part}
        </a>
      )
    return <Fragment key={i}>{part}</Fragment>
  })
}

/** 隱私權政策全文：依目前語言顯示繁中、日文或英文（韓、法、德顯示英文版並附說明；放在 PrivacyDialog 裡） */
export function PrivacyPolicy() {
  const { t, i18n } = useTranslation()
  const doc = getPrivacyPolicy(i18n.resolvedLanguage ?? 'zh-TW', EMAIL)

  return (
    <div className="grid gap-4 text-sm">
      <p className="leading-relaxed text-muted">{doc.subtitle}</p>
      <p className="-mt-2 text-xs text-muted">
        {doc.updatedLabel}
        {doc.locale === 'en' ? ': ' : '：'}
        <time dateTime={doc.updatedDate}>{doc.updatedDate}</time>
      </p>
      {doc.fallbackNotice && <p className="rounded-(--radius-control) bg-sage-light/60 px-3 py-2 text-xs leading-relaxed">{doc.fallbackNotice}</p>}

      <nav aria-label={t('privacy.toc')} className="rounded-(--radius-control) border border-line bg-oat/60 px-4 py-3">
        <h3 className="mb-2 font-bold">{t('privacy.toc')}</h3>
        <ol className="grid gap-1 text-xs min-[520px]:grid-cols-2">
          {doc.sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  // 在面板裡捲動，不改網址
                  e.preventDefault()
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="text-sage-dark hover:underline"
              >
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {doc.sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="grid scroll-mt-2 gap-3 border-t border-line pt-4">
          <h3 id={`${s.id}-h`} className="text-base font-bold">
            {s.heading}
          </h3>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {rich(p)}
            </p>
          ))}
          {s.bullets && (
            <ul className="grid list-disc gap-1.5 pl-5 leading-relaxed marker:text-sage">
              {s.bullets.map((b, i) => (
                <li key={i}>{rich(b)}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
