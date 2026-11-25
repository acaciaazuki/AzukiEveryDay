import { useEffect, useRef } from 'react'
import { isNativeApp } from '../adapters/kv'
import { useConsentStore } from '../store/useConsentStore'
import { usePersonalStore } from '../store/usePersonalStore'
import { useSpacesStore } from '../store/useSpacesStore'
import { useSyncStore } from '../store/useSyncStore'

/** 本機修改後等 1.5 秒沒有新的修改再上傳 */
export const UPLOAD_DEBOUNCE_MS = 1500
/** 回到前景時，距上次拉取超過 15 秒才再拉一次 */
export const VISIBILITY_COOLDOWN_MS = 15_000

/**
 * 雲端同步協調器（掛在 App 外框，整個 App 只有一個）：
 * - 守衛：尚未通過同意門檻（ConsentGate）、或在尚未串接原生登入的 iOS App 裡，不發出任何網路請求
 * - 跨帳號防污染：記住目前綁定的帳號（boundUidRef），切換帳號且本機還有舊帳號資料時暫停自動同步（status = account_mismatch），
 *   由使用者呼叫 confirmSwitchAccountAndResetLocal() 確認
 * - 防抖自動上傳：個人資料或共享空間有修改，1.5 秒後同步；同步途中又有修改，結束後自動補跑一輪（queuedResyncRef）
 * - 回到前景（visibilitychange，15 秒冷卻）與恢復連線（online）時自動拉取雲端更新
 * - 單一共享空間 403／404 只記進 revokedSpaceIds，不中斷個人資料與其他空間的同步（見 store/useSyncStore）
 */
export function useCloudSyncCoordinator() {
  const consented = useConsentStore((s) => s.status === 'accepted')
  const status = useSyncStore((s) => s.status)
  const signedIn = useSyncStore((s) => s.token !== null)
  const boundUidRef = useRef<string | null>(null)
  const queuedResyncRef = useRef(false)
  const runningRef = useRef(false)
  const lastPullRef = useRef(0)
  const enabled = consented && !isNativeApp()

  // 同意之後才嘗試沿用這個分頁的 Google 登入
  useEffect(() => {
    if (enabled) void useSyncStore.getState().resume()
  }, [enabled])

  useEffect(() => {
    boundUidRef.current = usePersonalStore.getState().currentUser?.uid ?? null
    return usePersonalStore.subscribe((s) => {
      boundUidRef.current = s.currentUser?.uid ?? null
    })
  }, [])

  const active = enabled && signedIn && status !== 'account_mismatch' && status !== 'needsPermission'

  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setTimeout> | undefined

    const run = async () => {
      // 帳號不一致時不自動同步（避免把舊帳號的資料寫進新帳號）
      const profileUid = useSyncStore.getState().profile?.sub
      if (boundUidRef.current && profileUid && boundUidRef.current !== profileUid) return
      if (runningRef.current) {
        queuedResyncRef.current = true
        return
      }
      runningRef.current = true
      try {
        do {
          queuedResyncRef.current = false
          lastPullRef.current = Date.now()
          await useSyncStore.getState().syncNow()
        } while (queuedResyncRef.current)
      } finally {
        runningRef.current = false
      }
    }

    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void run(), UPLOAD_DEBOUNCE_MS)
    }

    const unsubPersonal = usePersonalStore.subscribe((s, prev) => {
      if (s.isDirty && s.data !== prev.data) schedule()
    })
    const unsubSpaces = useSpacesStore.subscribe((s, prev) => {
      if (s.dirtySpaceIds.length > 0 && s.spaces !== prev.spaces) schedule()
    })
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastPullRef.current < VISIBILITY_COOLDOWN_MS) return
      void run()
    }
    const onOnline = () => void run()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    // 開始時如果本機已有尚未上傳的修改，馬上排一次
    if (usePersonalStore.getState().isDirty || useSpacesStore.getState().dirtySpaceIds.length > 0) schedule()

    return () => {
      clearTimeout(timer)
      unsubPersonal()
      unsubSpaces()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [active])

  return {
    status,
    enabled,
    confirmSwitchAccountAndResetLocal: () => useSyncStore.getState().confirmSwitchAccountAndResetLocal(),
  }
}
