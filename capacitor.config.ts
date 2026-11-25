import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor（iOS App）設定。
 * - webDir：Vite 建置輸出的 dist/
 * - appId：上架前若要更換 Bundle ID，請在執行 `npx cap add ios` 之前修改
 * 原生專案（ios/）在 Mac 上用 `npx cap add ios` 產生並 commit 進 repo。
 */
const config: CapacitorConfig = {
  appId: 'app.acaciaeveryday',
  appName: 'ACACIA',
  webDir: 'dist',
}

export default config
