import { z } from 'zod'

/**
 * 使用條款同意：第一次使用、或「隱私權政策／第三方授權清單」改版時，要使用者讀過並同意才能使用。
 *
 * 文件改版時要調整的常數：
 * - 隱私權政策改版：把 PRIVACY_VERSION 改成當天日期。政策頁的「最後更新」（src/pages/privacy/policy.ts 的 UPDATED_DATE）直接沿用它，不用改兩處。
 *   兩者不一致時 npm test 會失敗，避免改了政策卻忘了請使用者重新同意。
 * - 第三方授權清單：套件升級時清單會自動更新，但不會每次都要求重新同意。
 *   有需要使用者重新確認的變動（例如新增授權條件較特別的套件）時，把 LICENSES_VERSION 改成當天日期。
 */
export const PRIVACY_VERSION = '2026-11-25'
export const LICENSES_VERSION = '2026-11-22'

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

export function makeRecord(now: number, current: Record<ConsentDoc, string> = CURRENT_VERSIONS): ConsentRecord {
  return { privacy: current.privacy, licenses: current.licenses, acceptedAt: now }
}
