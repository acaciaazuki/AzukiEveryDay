import { describe, expect, it } from 'vitest'
import { UPDATED_DATE } from '../pages/privacy/policy'
import { CURRENT_VERSIONS, makeRecord, parseRecord, pendingDocs, PRIVACY_VERSION } from './consent'

describe('使用條款同意', () => {
  it('隱私權政策改版（UPDATED_DATE）時要一起改 PRIVACY_VERSION，使用者才會被要求重新同意', () => {
    expect(PRIVACY_VERSION).toBe(UPDATED_DATE)
  })

  it('第一次使用：兩份文件都要同意', () => {
    expect(pendingDocs(null)).toEqual(['privacy', 'licenses'])
  })

  it('已同意目前版本：不用再問', () => {
    expect(pendingDocs(makeRecord(1))).toEqual([])
  })

  it('只有改版的文件需要重新同意', () => {
    const old = makeRecord(1, { privacy: '2026-01-01', licenses: CURRENT_VERSIONS.licenses })
    expect(pendingDocs(old)).toEqual(['privacy'])
    expect(pendingDocs(makeRecord(1), { ...CURRENT_VERSIONS, licenses: '2099-01-01' })).toEqual(['licenses'])
  })

  it('格式不對的紀錄當作沒同意過', () => {
    expect(parseRecord(undefined)).toBeNull()
    expect(parseRecord({ privacy: 1 })).toBeNull()
    expect(parseRecord('yes')).toBeNull()
    expect(parseRecord({ privacy: 'a', licenses: 'b', acceptedAt: 5 })).toEqual({ privacy: 'a', licenses: 'b', acceptedAt: 5 })
  })
})
