import { del, get, set } from 'idb-keyval'
import { CONSENT_KEY } from './consentKey'
import { isNativeApp } from './kv'
import type { PrefsApi } from './kv/migrate'

/**
 * 使用條款同意紀錄的儲存（只存在這台裝置：不跟 Drive 同步、不放進備份）。
 * - 網頁版：IndexedDB 預設 store 的 acacia-consent（跟原本相同）
 * - iOS App：Preferences（UserDefaults）；第一次讀取時若 Preferences 沒有、WebView IndexedDB 有，就搬過來
 */
let prefsOverride: PrefsApi | null = null
/** 測試用：指定 iOS 版的 Preferences 實作 */
export const setConsentPrefsForTests = (p: PrefsApi | null) => {
  prefsOverride = p
}
const prefs = async (): Promise<PrefsApi> => prefsOverride ?? (await import('./kv/nativeRuntime')).nativePrefs

export async function loadConsent(): Promise<unknown> {
  if (!isNativeApp()) return get(CONSENT_KEY)
  const p = await prefs()
  const { value } = await p.get({ key: CONSENT_KEY })
  if (value !== null) return JSON.parse(value)
  // 從 WebView 的 IndexedDB 搬過來（早期測試版）
  const legacy = await get(CONSENT_KEY).catch(() => undefined)
  if (legacy === undefined) return null
  await p.set({ key: CONSENT_KEY, value: JSON.stringify(legacy) })
  await del(CONSENT_KEY).catch(() => {})
  return legacy
}

export async function saveConsent(record: unknown): Promise<void> {
  if (!isNativeApp()) return set(CONSENT_KEY, record)
  await (await prefs()).set({ key: CONSENT_KEY, value: JSON.stringify(record) })
}

export async function clearConsent(): Promise<void> {
  if (!isNativeApp()) return del(CONSENT_KEY)
  await (await prefs()).remove({ key: CONSENT_KEY })
  await del(CONSENT_KEY).catch(() => {})
}
