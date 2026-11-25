import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { isNativeApp } from './adapters/kv'
import { router } from './app/router'
import { AppErrorBoundary } from './components/ErrorScreen'
import { i18nReady } from './i18n'
import './index.css'
import { startAutoBackup } from './store/useBackupStore'
import { useConsentStore, whenConsented } from './store/useConsentStore'

// 讀取使用條款同意紀錄；同意之前不碰 Google 登入、雲端同步與自動備份
void useConsentStore.getState().load()
whenConsented(() => {
  // 自動備份：開啟網站時與資料變動後，距上次超過 12 小時就在背景建立快照
  startAutoBackup()
})

// 網頁版：請瀏覽器把本站資料標記為「持續保存」（iOS App 的資料存在 App 自己的檔案裡，不需要）
if (!isNativeApp()) void navigator.storage?.persist?.().catch(() => {})

// 等目前語言的翻譯下載完成再畫畫面（繁體中文已打包，不用等）
void i18nReady.finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </StrictMode>,
  ),
)
