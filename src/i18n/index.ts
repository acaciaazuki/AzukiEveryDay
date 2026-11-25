import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import type { BackendModule, ResourceKey } from 'i18next'
import zhTW from './locales/zh-TW.json'

/**
 * 翻譯檔按需下載：繁體中文（預設與備援語言）直接打包；其他語言要用到時才下載各自的檔案，
 * 不用一開始就把六種語言全部載進來。需要跨語言比對的少數文字放在 ./cross.ts。
 */
const lazyLocales = import.meta.glob(['./locales/*.json', '!./locales/zh-TW.json'], { import: 'default' }) as Record<string, () => Promise<ResourceKey>>
const lazyBackend: BackendModule = {
  type: 'backend',
  init: () => {},
  read: (lng, _ns, done) => {
    const load = lazyLocales[`./locales/${lng}.json`]
    if (!load) return done(null, {})
    load().then(
      (data) => done(null, data),
      (err: Error) => done(err, null),
    )
  },
}

export const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
] as const

/** 翻譯準備好（偵測到的語言已下載完成）；main.tsx 等它完成才開始畫畫面，避免先閃一下繁體中文 */
export const i18nReady = i18n
  .use(LanguageDetector)
  .use(lazyBackend)
  .use(initReactI18next)
  .init({
    resources: { 'zh-TW': { translation: zhTW } },
    // 只有繁體中文是打包進來的，其他語言交給 lazyBackend
    partialBundledLanguages: true,
    fallbackLng: 'zh-TW',
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'acacia_lang' },
  })

i18n.on('languageChanged', (lng) => document.documentElement.setAttribute('lang', lng))

export default i18n
