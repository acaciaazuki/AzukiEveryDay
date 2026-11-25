import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

// 授權清單（含套件資料）只有點開時才下載，不影響首頁載入
const LicensesDialog = lazy(() => import('./LicensesDialog'))

/** 低調的「第三方授權清單」小文字連結，點開授權清單面板 */
export function LicensesLink({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-[length:calc(10px*var(--fs))] text-[#a4afaa] underline-offset-2 transition-colors hover:text-sage-dark hover:underline ${className}`}
      >
        {t('licenses.link')}
      </button>
      {open && (
        <Suspense fallback={null}>
          <LicensesDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  )
}
