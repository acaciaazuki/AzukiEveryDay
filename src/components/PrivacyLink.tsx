import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

// 政策全文只有點開時才下載，不影響首頁載入
const PrivacyDialog = lazy(() => import('./PrivacyDialog'))

/**
 * 低調的「隱私權政策」小文字連結，樣式與開啟方式跟第三方授權清單一致：點了跳出面板，不換頁。
 * 仍保留 href="/privacy"，右鍵複製連結或另開分頁時拿到的是可公開分享的網址。
 */
export function PrivacyLink({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <a
        href="/privacy"
        aria-haspopup="dialog"
        onClick={(e) => {
          // 一般點擊開面板；Ctrl／⌘／中鍵點擊照瀏覽器預設另開分頁
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          setOpen(true)
        }}
        className={`text-[length:calc(10px*var(--fs))] text-[#a4afaa] underline-offset-2 transition-colors hover:text-sage-dark hover:underline ${className}`}
      >
        {t('privacy.link')}
      </a>
      {open && (
        <Suspense fallback={null}>
          <PrivacyDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  )
}
