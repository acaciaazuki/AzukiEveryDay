import 'fake-indexeddb/auto'
import { get, set } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_VERSIONS } from '../core/consent'
import { CONSENT_KEY, useConsentStore, whenConsented } from './useConsentStore'

describe('同意紀錄', () => {
  beforeEach(async () => {
    await useConsentStore.getState().reset()
    useConsentStore.setState({ status: 'loading' })
  })

  it('沒有紀錄（新使用者或改版前的舊使用者）：需要同意', async () => {
    await useConsentStore.getState().load()
    expect(useConsentStore.getState()).toMatchObject({ status: 'required', record: null, pending: ['privacy', 'licenses'] })
  })

  it('同意後存進 IndexedDB，重新開啟不再詢問', async () => {
    await useConsentStore.getState().accept()
    expect(useConsentStore.getState().status).toBe('accepted')
    expect(await get(CONSENT_KEY)).toMatchObject({ ...CURRENT_VERSIONS, acceptedAt: expect.any(Number) })
    useConsentStore.setState({ status: 'loading', record: null })
    await useConsentStore.getState().load()
    expect(useConsentStore.getState().status).toBe('accepted')
  })

  it('同意的是舊版：需要重新同意，並記得哪份文件改版', async () => {
    await set(CONSENT_KEY, { ...CURRENT_VERSIONS, privacy: '2000-01-01', acceptedAt: 1 })
    await useConsentStore.getState().load()
    expect(useConsentStore.getState()).toMatchObject({ status: 'required', pending: ['privacy'] })
    expect(useConsentStore.getState().record).not.toBeNull()
  })

  it('whenConsented：同意之後才執行，而且只執行一次', async () => {
    await useConsentStore.getState().load()
    const fn = vi.fn()
    whenConsented(fn)
    expect(fn).not.toHaveBeenCalled()
    await useConsentStore.getState().accept()
    await useConsentStore.getState().accept()
    expect(fn).toHaveBeenCalledTimes(1)
    // 已同意時馬上執行
    const later = vi.fn()
    whenConsented(later)
    expect(later).toHaveBeenCalledTimes(1)
  })
})
