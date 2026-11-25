import { z } from 'zod'

/**
 * 使用條款同意：第一次使用、或「隱私權政策／第三方授權清單」改版時，要使用者讀過並同意才能使用。
 */

/**
 * 隱私權政策版本（YYYY-MM-DD）
 * 修改儲存、同步、共享機制或資料保留天數時請更新此日期：
 * 1. 隱私權政策頁面的「最後更新日期（UPDATED_DATE）」會直接沿用此值
 * 2. ConsentGate 比對本機紀錄版本不同時，會自動要求使用者重新同意
 */
export const PRIVACY_VERSION = '2026-11-25'

/**
 * 第三方開源授權清單同意版本（YYYY-MM-DD）
 * 一般套件升級不需修改；僅在隨網站發布的套件出現「全新授權類型」且評估需重新告知時更新
 */
export const LICENSES_VERSION = '2026-11-25'

export type ConsentDoc = 'privacy' | 'licenses'
export const CONSENT_DOCS = ['privacy', 'licenses'] as const satisfies readonly ConsentDoc[]

export const CURRENT_VERSIONS: Record<ConsentDoc, string> = { privacy: PRIVACY_VERSION, licenses: LICENSES_VERSION }

/** 存在本機 IndexedDB 的同意紀錄（不跟 Drive 同步、不放進備份：同意是這台裝置上的使用者做的） */
export const consentRecordSchema = z.object({
  privacy: z.string(),
  licenses: z.string(),
  /** 同意的時間（epoch ms） */
  acceptedAt: z.number(),
})
export type ConsentRecord = z.infer<typeof consentRecordSchema>

/** 讀出來的資料不合格式（例如被手動改壞）就當作沒有同意過 */
export function parseRecord(raw: unknown): ConsentRecord | null {
  const r = consentRecordSchema.safeParse(raw)
  return r.success ? r.data : null
}

/** 哪些文件需要（重新）同意：沒有紀錄或版本不同 */
export function pendingDocs(record: ConsentRecord | null, current: Record<ConsentDoc, string> = CURRENT_VERSIONS): ConsentDoc[] {
  return CONSENT_DOCS.filter((d) => record?.[d] !== current[d])
}

/** 本機紀錄是否已同意目前兩份文件的版本（沒有紀錄時為 false） */
export function isConsentCurrent(record: ConsentRecord | null | undefined, current: Record<ConsentDoc, string> = CURRENT_VERSIONS): boolean {
  return pendingDocs(record ?? null, current).length === 0
}

export function makeRecord(now: number, current: Record<ConsentDoc, string> = CURRENT_VERSIONS): ConsentRecord {
  return { privacy: current.privacy, licenses: current.licenses, acceptedAt: now }
}
