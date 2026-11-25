import { Capacitor } from '@capacitor/core'
import type { KeyValueStore, KvNamespace } from './types'
import { createWebKv } from './webKv'

export type { KeyValueStore, KvNamespace } from './types'

let nativeOverride: boolean | null = null
let nativeOpener: ((ns: KvNamespace) => Promise<KeyValueStore>) | null = null

/** 是否在 iOS App（Capacitor 原生殼）裡執行 */
export const isNativeApp = () => nativeOverride ?? Capacitor.isNativePlatform()

/** 測試用：模擬在 App 裡執行，並指定原生儲存的實作 */
export function setNativeForTests(on: boolean | null, opener: ((ns: KvNamespace) => Promise<KeyValueStore>) | null = null) {
  nativeOverride = on
  nativeOpener = opener
  opened.clear()
}

const opened = new Map<KvNamespace, Promise<KeyValueStore>>()

function open(ns: KvNamespace): Promise<KeyValueStore> {
  let p = opened.get(ns)
  if (!p) {
    p = isNativeApp()
      ? nativeOpener
        ? nativeOpener(ns)
        : import('./nativeRuntime').then((m) => m.openNativeKv(ns))
      : Promise.resolve(createWebKv(ns))
    opened.set(ns, p)
  }
  return p
}

/**
 * 取得某個命名空間的儲存。網頁版用 IndexedDB；iOS App 用 Library/acacia/ 底下的 JSON 檔
 * （第一次開啟時自動把 WebView IndexedDB 的舊資料搬過去）。
 */
export function kv(ns: KvNamespace): KeyValueStore {
  return {
    get: async (key) => (await open(ns)).get(key),
    set: async (key, value) => (await open(ns)).set(key, value),
    del: async (key) => (await open(ns)).del(key),
    clear: async () => (await open(ns)).clear(),
    keys: async () => (await open(ns)).keys(),
  }
}
