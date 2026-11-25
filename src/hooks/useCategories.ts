import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BUILTIN_CATEGORIES, BUILTIN_CATEGORY_MAP } from '../core/defaults'
import type { IconName } from '../core/icons'
import { ICON_NAMES } from '../core/icons'
import { usePersonalStore } from '../store/usePersonalStore'

export interface CategoryInfo {
  id: string
  label: string
  type: 'expense' | 'income'
  icon: IconName
  color: string
  isCustom: boolean
}

const asIcon = (v: string | undefined): IconName => ((ICON_NAMES as readonly string[]).includes(v ?? '') ? (v as IconName) : 'tag')

/** 內建分類（名稱依語言翻譯）＋自訂分類，以及依代碼查詢的函式 */
export function useCategories() {
  const { t } = useTranslation()
  const custom = usePersonalStore((s) => s.data.customCategories)
  return useMemo(() => {
    const list: CategoryInfo[] = [
      ...BUILTIN_CATEGORIES.map((c) => ({ id: c.id, label: t(`ledger.cat.${c.id}`), type: c.type, icon: c.icon, color: c.color, isCustom: false })),
      ...Object.values(custom)
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((c) => ({ id: c.id, label: c.label, type: c.type, icon: asIcon(c.icon), color: c.color ?? 'sand', isCustom: true })),
    ]
    const byId = new Map(list.map((c) => [c.id, c]))
    const info = (id: string): CategoryInfo => byId.get(id) ?? { id, label: BUILTIN_CATEGORY_MAP[id] ? t(`ledger.cat.${id}`) : id, type: 'expense', icon: 'tag', color: 'slate', isCustom: false }
    return { list, info }
  }, [custom, t])
}
