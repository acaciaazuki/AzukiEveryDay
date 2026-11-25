import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { backupFileName, downloadJson } from '../adapters/downloadJson'
import { getSupportEmail } from '../pages/privacy/policy'
import { usePersonalStore } from '../store/usePersonalStore'

/** 支援信箱（可用 VITE_SUPPORT_EMAIL 覆寫） */
const SUPPORT_EMAIL = getSupportEmail()

const btn = 'rounded-(--radius-control) px-4 py-2.5 text-[length:calc(14px*var(--fs))] font-bold'

/**
 * 畫面發生非預期錯誤時的保底畫面（取代整頁空白）。
 * - 說明資料都還在這台裝置上，提供「下載資料備份」（跟設定頁匯出同一種格式，可以再匯入）
 * - 重新載入、回到行事曆
 * - 錯誤訊息收在「詳細資訊」裡，回報問題時可以附上
 * 不依賴路由與版面，資料或翻譯讀取失敗時也盡量顯示得出來。
 */
export function ErrorScreen({ error }: { error: unknown }) {
  const { t } = useTranslation()
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const backup = () => {
    try {
      downloadJson(usePersonalStore.getState().data, backupFileName())
    } catch (e) {
      console.error('下載資料備份失敗', e)
    }
  }
  return (
    <main role="alert" data-error-screen className="grid min-h-dvh place-items-center bg-oat px-5 py-10 text-ink">
      <div className="w-full max-w-md rounded-[20px] border border-line bg-paper p-7 shadow-card">
        <h1 className="text-[length:calc(18px*var(--fs))] font-bold">{t('errorScreen.title')}</h1>
        <p className="mt-3 text-[length:calc(14px*var(--fs))] leading-relaxed text-[#55645d]">{t('errorScreen.text')}</p>
        <div className="mt-6 grid gap-2.5">
          <button type="button" onClick={backup} className={`${btn} bg-sage text-white hover:bg-sage-dark`}>
            {t('errorScreen.backup')}
          </button>
          <button type="button" onClick={() => window.location.reload()} className={`${btn} border border-line bg-paper hover:bg-sage-light`}>
            {t('errorScreen.reload')}
          </button>
          <button type="button" onClick={() => window.location.assign('/')} className={`${btn} text-sage-dark hover:bg-sage-light`}>
            {t('errorScreen.home')}
          </button>
        </div>
        <details className="mt-6 text-xs text-muted">
          <summary className="cursor-pointer">{t('errorScreen.details')}</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-oat p-3 whitespace-pre-wrap">{message}</pre>
        </details>
        <p className="mt-4 text-xs text-muted">
          {t('errorScreen.contact')}{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sage-dark underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </main>
  )
}

/** 路由的錯誤頁：網址不存在時顯示「找不到這個頁面」；其他頁面在載入或繪製時出錯，顯示保底畫面 */
export function RouteErrorScreen() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundScreen />
  console.error('畫面發生錯誤', error)
  return <ErrorScreen error={error} />
}

/** 網址打錯或頁面已經不存在 */
function NotFoundScreen() {
  const { t } = useTranslation()
  return (
    <main data-not-found className="grid min-h-dvh place-items-center bg-oat px-5 py-10 text-ink">
      <div className="w-full max-w-md rounded-[20px] border border-line bg-paper p-7 text-center shadow-card">
        <h1 className="text-[length:calc(18px*var(--fs))] font-bold">{t('errorScreen.notFoundTitle')}</h1>
        <p className="mt-3 text-[length:calc(14px*var(--fs))] leading-relaxed text-[#55645d]">{t('errorScreen.notFoundText')}</p>
        <a href="/" className={`${btn} mt-6 inline-block bg-sage text-white hover:bg-sage-dark`}>
          {t('errorScreen.home')}
        </a>
      </div>
    </main>
  )
}

/** 最外層的錯誤邊界：路由以外的地方出錯時也不會整頁空白 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null }
  static getDerivedStateFromError(error: unknown) {
    return { error }
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('畫面發生錯誤', error, info.componentStack)
  }
  render() {
    return this.state.error ? <ErrorScreen error={this.state.error} /> : this.props.children
  }
}
