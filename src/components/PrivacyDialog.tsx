import { useTranslation } from 'react-i18next'
import { policyFor } from '../pages/privacy/policy'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { PrivacyPolicy } from './PrivacyPolicy'

// 由 PrivacyLink 與 /privacy 路由延遲載入，政策全文跟著這個 chunk 一起下載
export default function PrivacyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, i18n } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={policyFor(i18n.resolvedLanguage).title} wide>
      <PrivacyPolicy />
      <div className="mt-5 flex justify-end border-t border-line pt-3">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t('privacy.close')}
        </Button>
      </div>
    </Dialog>
  )
}
