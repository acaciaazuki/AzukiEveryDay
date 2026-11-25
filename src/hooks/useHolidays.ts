import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { holidayName, indexHolidays, isHolidayCountry, loadHolidayFile, type HolidayEntry, type HolidayFile } from '../core/holidays'
import { usePersonalStore } from '../store/usePersonalStore'

/** 國定假日的暖杏色系；補班日用淡灰藍 */
export const HOLIDAY_STYLE = { bg: '#fff4ec', fg: '#b2552f' }
export const WORKDAY_STYLE = { bg: '#f1f4f8', fg: '#4f6178' }

/** 依設定的國家／地區（settings.holidayRegion）載入打包的假日資料，回傳依日期建好的索引；設定為 none 時不顯示 */
export function useHolidaysByDate(): Map<string, HolidayEntry[]> {
  const region = usePersonalStore((s) => s.data.settings.holidayRegion)
  // 記下載入的是哪個國家，切換國家時舊資料直接視為無效，不必在 effect 裡同步清空
  const [loaded, setLoaded] = useState<{ region: string; file: HolidayFile } | null>(null)
  const file = loaded && loaded.region === region && isHolidayCountry(region) ? loaded.file : null
  useEffect(() => {
    let alive = true
    if (!isHolidayCountry(region)) return
    loadHolidayFile(region).then(
      (f) => alive && setLoaded({ region, file: f }),
      (e: unknown) => console.error('假日資料載入失敗', e),
    )
    return () => {
      alive = false
    }
  }, [region])
  return useMemo(() => indexHolidays(file ? [file] : []), [file])
}

/** 假日名稱依介面語言 */
export function useHolidayLabel() {
  const { i18n } = useTranslation()
  return (h: HolidayEntry) => holidayName(h, i18n.resolvedLanguage)
}
