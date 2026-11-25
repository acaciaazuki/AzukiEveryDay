import { z } from 'zod'

/**
 * 共享行事曆 × 個人記帳本的資料結構（純 TypeScript，不依賴 React）。
 *
 * - 個人主資料（acacia_data_v2.json）：個人行程、記帳本、自訂分類、已加入的共享空間與設定
 * - 共享空間（acacia_space_<spaceId>.json）：成員共用的行程與「忙碌時段」投射
 *
 * 記帳本只存在個人主資料，絕不寫入共享空間。
 * 物件型別的預設值使用 prefault（Zod 4）：缺欄位時先套用 {} 再解析，內層欄位的預設值才會生效。
 */

export const IsoDateTimeSchema = z.string().datetime({ offset: true })
export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** 180 天刪除標記保留期（毫秒） */
export const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000
/** 30 天垃圾桶保留期（毫秒） */
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export const CollectionSyncMetaSchema = z.object({
  updatedAt: z.record(z.string(), IsoDateTimeSchema).default({}),
  tombstones: z.record(z.string(), IsoDateTimeSchema).default({}),
})
export type CollectionSyncMeta = z.infer<typeof CollectionSyncMetaSchema>

// ─── 行事曆行程（個人與共享空間共用基底） ───
export const CalendarEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  isAllDay: z.boolean().default(false),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  color: z.string().default('sage'),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
  icon: z.string().optional(),
  note: z.string().max(2000).default(''),
  trashedAt: IsoDateTimeSchema.nullable().default(null),
})
export type CalendarEvent = z.infer<typeof CalendarEventSchema>

// ─── 個人記帳本（嚴格只存在個人主資料，絕不同步至共享空間） ───
export const LedgerTypeSchema = z.enum(['expense', 'income'])

export const LedgerCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(50),
  type: LedgerTypeSchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  isCustom: z.boolean().default(false),
})
export type LedgerCategory = z.infer<typeof LedgerCategorySchema>

export const LedgerEntrySchema = z.object({
  id: z.string().min(1),
  date: DateStringSchema,
  type: LedgerTypeSchema,
  amount: z.number().nonnegative(),
  currency: z.string().length(3).default('TWD'),
  categoryId: z.string().min(1),
  note: z.string().max(500).default(''),
})
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>

// ─── 已加入的共享空間連結設定 ───
export const JoinedSpaceRefSchema = z.object({
  spaceId: z.string().min(1),
  driveFileId: z.string().min(1),
  localAlias: z.string().max(100).optional(),
  color: z.string().default('forest'),
  visible: z.boolean().default(true),
  projectBusySlots: z.boolean().default(false),
})
export type JoinedSpaceRef = z.infer<typeof JoinedSpaceRefSchema>

// ─── 個人設定（含預設每月 10 號結算週期） ───
export const UserSettingsSchema = z.object({
  locale: z.enum(['zh-TW', 'ja', 'en', 'ko', 'fr', 'de']).default('zh-TW'),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1),
  defaultCurrency: z.string().length(3).default('TWD'),
  holidayRegion: z.string().default('TW'),
  billingCycleStartDay: z.number().int().min(1).max(31).default(10),
})
export type UserSettings = z.infer<typeof UserSettingsSchema>

// ─── 個人主資料根結構 (acacia_data_v2.json) ───
export const PersonalAppDataSchema = z.object({
  schemaVersion: z.literal(2),
  updatedAt: IsoDateTimeSchema,
  events: z.record(z.string(), CalendarEventSchema).default({}),
  ledgerEntries: z.record(z.string(), LedgerEntrySchema).default({}),
  customCategories: z.record(z.string(), LedgerCategorySchema).default({}),
  joinedSpaces: z.record(z.string(), JoinedSpaceRefSchema).default({}),
  settings: UserSettingsSchema.prefault({}),
  syncMeta: z
    .object({
      events: CollectionSyncMetaSchema.prefault({}),
      ledgerEntries: CollectionSyncMetaSchema.prefault({}),
      customCategories: CollectionSyncMetaSchema.prefault({}),
      joinedSpaces: CollectionSyncMetaSchema.prefault({}),
      settingsFieldUpdatedAt: z.record(z.string(), IsoDateTimeSchema).default({}),
    })
    .optional(),
})
export type PersonalAppData = z.infer<typeof PersonalAppDataSchema>

// ─── 共享空間結構 (acacia_space_<spaceId>.json) ───
export const SharedEventSchema = CalendarEventSchema.extend({
  createdByUid: z.string().min(1),
  createdByName: z.string().max(80),
  lastEditedByName: z.string().max(80),
})
export type SharedEvent = z.infer<typeof SharedEventSchema>

export const BusySlotSchema = z.object({
  id: z.string().min(1),
  ownerUid: z.string().min(1),
  ownerDisplayName: z.string().max(80),
  startDate: DateStringSchema,
  endDate: DateStringSchema,
  isAllDay: z.boolean(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
})
export type BusySlot = z.infer<typeof BusySlotSchema>

export const SharedSpaceDataSchema = z.object({
  schemaVersion: z.literal(2),
  spaceId: z.string().min(1),
  name: z.string().min(1).max(100),
  ownerUid: z.string().min(1),
  updatedAt: IsoDateTimeSchema,
  events: z.record(z.string(), SharedEventSchema).default({}),
  busySlots: z.record(z.string(), BusySlotSchema).default({}),
  syncMeta: z
    .object({
      nameUpdatedAt: IsoDateTimeSchema.optional(),
      events: CollectionSyncMetaSchema.prefault({}),
      busySlots: CollectionSyncMetaSchema.prefault({}),
    })
    .prefault({}),
})
export type SharedSpaceData = z.infer<typeof SharedSpaceDataSchema>
