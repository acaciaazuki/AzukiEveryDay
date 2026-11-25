/** 各頁面的程式（點進去才下載）；閒置時也會先下載好，之後切換頁面不用等（見 prefetchPages） */
export const pages = {
  ledger: () => import('../pages/LedgerPage').then((m) => m.LedgerPage),
  settings: () => import('../pages/SettingsPage').then((m) => m.SettingsPage),
}

let prefetched = false
/**
 * 瀏覽器閒置時依序先下載各頁面的程式（不執行、不顯示），之後點進去就不用等下載。
 * 網路很慢（省流量模式、2G）時不預先下載。
 */
export function prefetchPages() {
  if (prefetched) return
  prefetched = true
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return
  const idle = (fn: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 5000 }) : setTimeout(fn, 1500))
  const queue = Object.values(pages)
  const next = () => {
    const load = queue.shift()
    if (!load) return
    void load()
      .catch(() => {})
      .finally(() => idle(next))
  }
  idle(next)
}
