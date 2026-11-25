import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './AcaciaIcons'
import { CONTACT_EMAIL, EFFECTIVE_DATE, policyFor, UPDATED_DATE, type PolicyBlock } from '../pages/privacy/policy'

const LINK = /(https:\/\/[^\s）)、，。]+|\{email\})/g

/** 把段落裡的網址與 {email} 變成連結 */
function rich(text: string): ReactNode[] {
  return text.split(LINK).map((part, i) => {
    if (part === '{email}')
      return (
        <a key={i} href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-sage-dark underline underline-offset-2">
          {CONTACT_EMAIL}
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

function Block({ block }: { block: PolicyBlock }) {
  if (typeof block === 'string') return <p className="leading-relaxed">{rich(block)}</p>
  if ('sub' in block) return <h4 className="mt-2 font-bold text-sage-dark">{block.sub}</h4>
  return (
    <ul className="grid list-disc gap-1.5 pl-5 leading-relaxed marker:text-sage">
      {block.list.map((item, i) => (
        <li key={i}>{rich(item)}</li>
      ))}
    </ul>
  )
}

/** 隱私權政策全文：依目前語言顯示繁中、日文或英文（放在 PrivacyDialog 裡） */
export function PrivacyPolicy() {
  const { i18n } = useTranslation()
  const doc = policyFor(i18n.resolvedLanguage)

  return (
    <div className="grid gap-4 text-sm">
      <p className="text-xs text-muted">{doc.eyebrow}</p>
      <p className="-mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          {doc.dates.effective}<time dateTime={EFFECTIVE_DATE}>{EFFECTIVE_DATE}</time>
        </span>
        <span>
          {doc.dates.updated}<time dateTime={UPDATED_DATE}>{UPDATED_DATE}</time>
        </span>
      </p>

      <section aria-labelledby="privacy-summary-h">
        <h3 id="privacy-summary-h" className="mb-2 font-bold">{doc.summaryTitle}</h3>
        <ul className="grid gap-2">
          {doc.summary.map((s, i) => (
            <li key={i} className="flex gap-2 rounded-(--radius-control) bg-sage-light/60 px-3 py-2 leading-relaxed">
              <Icon name="check" className="mt-0.5 shrink-0 text-sage" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label={doc.toc} className="rounded-(--radius-control) border border-line bg-oat/60 px-4 py-3">
        <h3 className="mb-2 font-bold">{doc.toc}</h3>
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
          {s.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </section>
      ))}
    </div>
  )
}
