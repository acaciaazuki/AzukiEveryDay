import { clear, createStore, del, get, keys, set, type UseStore } from 'idb-keyval'
import { IDB_LOCATION, type KeyValueStore, type KvNamespace } from './types'

const stores = new Map<KvNamespace, UseStore | undefined>()

/** 這個命名空間對應的 IndexedDB store；state 用 idb-keyval 的預設 store（回傳 undefined） */
export function idbStoreOf(ns: KvNamespace): UseStore | undefined {
  if (!stores.has(ns)) {
    const loc = IDB_LOCATION[ns]
    stores.set(ns, loc ? createStore(loc[0], loc[1]) : undefined)
  }
  return stores.get(ns)
}

/** 網頁版：IndexedDB（跟原本的行為完全相同） */
export function createWebKv(ns: KvNamespace): KeyValueStore {
  const store = () => idbStoreOf(ns)
  return {
    get: (key) => get(key, store()),
    set: (key, value) => set(key, value, store()),
    del: (key) => del(key, store()),
    clear: () => clear(store()),
    keys: async () => (await keys(store())).map(String),
  }
}
