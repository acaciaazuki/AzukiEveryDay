import { useState } from 'react'

/**
 * 只存在這台裝置的小偏好（例如是否顯示個人行事曆、月檢視／日檢視）。
 * key 一律以 acacia 開頭，「刪除所有資料」會一併清掉；讀寫失敗（無痕模式）時只在記憶體生效。
 */
export function useLocalPref<T extends string | boolean>(key: `acacia${string}`, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return initial
      return (typeof initial === 'boolean' ? raw === 'true' : raw) as T
    } catch {
      return initial
    }
  })
  const set = (v: T) => {
    setValue(v)
    try {
      localStorage.setItem(key, String(v))
    } catch {
      /* 忽略 */
    }
  }
  return [value, set]
}
