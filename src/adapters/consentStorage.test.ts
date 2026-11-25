import 'fake-indexeddb/auto'
import { get, set } from 'idb-keyval'
import { afterEach, describe, expect, it } from 'vitest'
import { fakePrefs } from '../test/fakeCapacitor'
import { CONSENT_KEY } from './consentKey'
import { clearConsent, loadConsent, saveConsent, setConsentPrefsForTests } from './consentStorage'
import { setNativeForTests } from './kv'

describe('同意紀錄的儲存', () => {
  afterEach(() => {
    setNativeForTests(null)
    setConsentPrefsForTests(null)
  })

  it('網頁版：跟原本一樣存在 IndexedDB', async () => {
    await saveConsent({ privacy: 'a', licenses: 'b', acceptedAt: 1 })
    expect(await get(CONSENT_KEY)).toEqual({ privacy: 'a', licenses: 'b', acceptedAt: 1 })
    expect(await loadConsent()).toEqual({ privacy: 'a', licenses: 'b', acceptedAt: 1 })
    await clearConsent()
    expect(await get(CONSENT_KEY)).toBeUndefined()
  })

  it('iOS App：存在 Preferences，不寫進 WebView 的 IndexedDB', async () => {
    const prefs = fakePrefs()
    setNativeForTests(true)
    setConsentPrefsForTests(prefs.api)
    await clearConsent()
    await saveConsent({ privacy: 'a', licenses: 'b', acceptedAt: 2 })
    expect(JSON.parse(prefs.values.get(CONSENT_KEY)!)).toEqual({ privacy: 'a', licenses: 'b', acceptedAt: 2 })
    expect(await get(CONSENT_KEY)).toBeUndefined()
    expect(await loadConsent()).toEqual({ privacy: 'a', licenses: 'b', acceptedAt: 2 })
    await clearConsent()
    expect(prefs.values.has(CONSENT_KEY)).toBe(false)
    expect(await loadConsent()).toBeNull()
  })

  it('iOS App 第一次讀取：從 WebView 的 IndexedDB 搬到 Preferences，搬完刪掉舊的', async () => {
    await set(CONSENT_KEY, { privacy: 'old', licenses: 'old', acceptedAt: 3 })
    const prefs = fakePrefs()
    setNativeForTests(true)
    setConsentPrefsForTests(prefs.api)
    expect(await loadConsent()).toEqual({ privacy: 'old', licenses: 'old', acceptedAt: 3 })
    expect(prefs.values.has(CONSENT_KEY)).toBe(true)
    expect(await get(CONSENT_KEY)).toBeUndefined()
  })
})
