import type { StateStorage } from 'zustand/middleware'
import { kv } from './kv'

/**
 * 個人主資料（acacia-personal-v2）與共享空間（acacia-spaces）的儲存轉接層，給 zustand persist 使用。
 * 網頁版存在 IndexedDB；iOS App（Capacitor）存在 App 的 Library/acacia/state/ JSON 檔（見 adapters/kv）。
 * store 與畫面不需要知道底層是哪一種。
 */
const state = kv('state')

export const webStorage: StateStorage = {
  getItem: async (name) => (await state.get<string>(name)) ?? null,
  setItem: (name, value) => state.set(name, value),
  removeItem: (name) => state.del(name),
}

/** 刪除所有資料時清空主資料與共享空間（網頁版也會清掉同一個 store 裡的同意紀錄，呼叫端隨後會重設同意狀態） */
export const clearStateStorage = () => state.clear()
