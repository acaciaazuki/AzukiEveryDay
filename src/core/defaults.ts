import type { IconName } from './icons'
import type { PaletteKey } from './colors'
import { type PersonalAppData, PersonalAppDataSchema, type SharedSpaceData } from './schema'

/** 常用幣別（記帳本的下拉選單） */
export const CURRENCIES = ['TWD', 'JPY', 'USD', 'EUR', 'KRW', 'CNY', 'HKD', 'GBP', 'SGD', 'AUD', 'CAD'] as const
export const DEFAULT_CURRENCY = 'TWD'

/** 產生新的 id（瀏覽器與 Node 都支援 crypto.randomUUID） */
export const newId = () => crypto.randomUUID()

/** 全新的個人主資料（還沒有任何修改） */
export const emptyPersonalData = (nowIso: string = new Date(0).toISOString()): PersonalAppData =>
  PersonalAppDataSchema.parse({
    schemaVersion: 2,
    updatedAt: nowIso,
    syncMeta: {},
  })

export const emptySpace = (params: { spaceId: string; name: string; ownerUid: string; nowIso: string }): SharedSpaceData => ({
  schemaVersion: 2,
  spaceId: params.spaceId,
  name: params.name,
  ownerUid: params.ownerUid,
  updatedAt: params.nowIso,
  events: {},
  busySlots: {},
  syncMeta: { nameUpdatedAt: params.nowIso, events: { updatedAt: {}, tombstones: {} }, busySlots: { updatedAt: {}, tombstones: {} } },
})

/** 共享空間檔名：acacia_space_<spaceId>.json（Google Picker 依這個前綴篩選） */
export const SPACE_FILE_PREFIX = 'acacia_space_'
export const spaceFileName = (spaceId: string) => `${SPACE_FILE_PREFIX}${spaceId}.json`

export interface BuiltinCategory {
  id: string
  type: 'expense' | 'income'
  icon: IconName
  color: PaletteKey
}

/**
 * 內建記帳分類（代碼跟 core/migrate.ts 的舊版對照表一致）；名稱在翻譯檔 ledger.cat.<id>。
 * 使用者另外可以新增自訂分類（例如「股票」、「貸款」）。
 */
export const BUILTIN_CATEGORIES: readonly BuiltinCategory[] = [
  { id: 'food', type: 'expense', icon: 'food', color: 'peach' },
  { id: 'coffee', type: 'expense', icon: 'cafe', color: 'sand' },
  { id: 'transport', type: 'expense', icon: 'transport', color: 'sky' },
  { id: 'daily', type: 'expense', icon: 'box', color: 'sage' },
  { id: 'shopping', type: 'expense', icon: 'shopping', color: 'rose' },
  { id: 'entertainment', type: 'expense', icon: 'leisure', color: 'lavender' },
  { id: 'medical', type: 'expense', icon: 'health', color: 'rose' },
  { id: 'housing', type: 'expense', icon: 'housing', color: 'slate' },
  { id: 'other', type: 'expense', icon: 'tag', color: 'slate' },
  { id: 'salary', type: 'income', icon: 'card', color: 'forest' },
  { id: 'bonus', type: 'income', icon: 'celebrate', color: 'butter' },
]

export const BUILTIN_CATEGORY_MAP: Record<string, BuiltinCategory> = Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.id, c]))

/** 自訂分類可以挑的可愛圖示 */
export const CATEGORY_ICON_CHOICES: readonly IconName[] = ['stocks', 'loan', 'insurance', 'education', 'clothing', 'food', 'cafe', 'drinks', 'dessert', 'transport', 'housing', 'leisure', 'health', 'celebrate', 'book', 'flight', 'shopping', 'card', 'receipt', 'box', 'tag']
