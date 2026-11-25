import { useToastStore } from '../store/useToastStore'
import { Toast } from './Toast'

/** 顯示 useToastStore 的提示（放在 Layout，任何頁面、任何對話框關閉後都看得到） */
export function GlobalToast() {
  const toast = useToastStore((s) => s.toast)
  const clear = useToastStore((s) => s.clear)
  if (!toast) return null
  return <Toast key={toast.id} message={toast.message} onDone={clear} action={toast.action} duration={toast.duration ?? (toast.action ? 8000 : 2600)} />
}
