import { useEffect, useState } from 'react'

/** 目前時間，每分鐘更新一次（讓問候語、今天的日期跨午夜也會更新） */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
