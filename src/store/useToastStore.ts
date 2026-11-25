import { create } from 'zustand'

/** 全站共用的提示（例如刪除行程後的「復原」）；畫面由 Layout 的 GlobalToast 顯示，同一時間只有一則 */
export interface ToastInput {
  message: string
  /** 提示旁的按鈕（例如「復原」）；按下後提示關閉 */
  action?: { label: string; onClick: () => void }
  /** 顯示多久（毫秒）；有按鈕時預設 8 秒，否則 2.6 秒 */
  duration?: number
}

interface ToastState {
  toast: (ToastInput & { id: number }) | null
  show: (input: ToastInput) => void
  clear: () => void
}

let seq = 0
export const useToastStore = create<ToastState>()((set) => ({
  toast: null,
  show: (input) => set({ toast: { ...input, id: ++seq } }),
  clear: () => set({ toast: null }),
}))

export const showToast = (input: ToastInput) => useToastStore.getState().show(input)
