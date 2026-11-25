import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { CONSENT_KEY } from '../consentKey'
import { migrateFromIndexedDb } from './migrate'
import { createNativeKv, type FsApi } from './nativeKv'
import type { KeyValueStore, KvNamespace } from './types'
import { createWebKv } from './webKv'

/**
 * 只在 iOS App 裡動態載入（網頁版不會打包進來）：把 Capacitor 外掛接到 createNativeKv。
 * nativeKv 用字串表示資料夾與編碼，這裡對應到外掛的列舉值。
 */
const fs: FsApi = {
  writeFile: (o) => Filesystem.writeFile({ ...o, directory: Directory.Library, encoding: Encoding.UTF8 }),
  readFile: (o) => Filesystem.readFile({ ...o, directory: Directory.Library, encoding: Encoding.UTF8 }),
  deleteFile: (o) => Filesystem.deleteFile({ ...o, directory: Directory.Library }),
  rename: (o) => Filesystem.rename({ ...o, directory: Directory.Library, toDirectory: Directory.Library }),
  readdir: (o) => Filesystem.readdir({ ...o, directory: Directory.Library }),
  rmdir: (o) => Filesystem.rmdir({ ...o, directory: Directory.Library }),
}

export const nativePrefs = Preferences

export async function openNativeKv(ns: KvNamespace): Promise<KeyValueStore> {
  const store = createNativeKv(ns, fs)
  // 同意紀錄在 state 的 IndexedDB 裡，但由 consentStorage 搬到 Preferences，這裡略過
  await migrateFromIndexedDb(ns, store, createWebKv(ns), Preferences, [CONSENT_KEY])
  return store
}
