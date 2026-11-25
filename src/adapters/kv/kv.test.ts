import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeFs, fakePrefs } from '../../test/fakeCapacitor'
import { kv, setNativeForTests } from './index'
import { migrateFromIndexedDb, migratedFlag } from './migrate'
import { createNativeKv, fileNameOf, NATIVE_ROOT } from './nativeKv'
import type { KeyValueStore } from './types'
import { createWebKv } from './webKv'

/** 網頁版與 iOS 版都要通過的同一套規則 */
function contract(name: string, make: () => KeyValueStore) {
  describe(`${name}：基本讀寫`, () => {
    let store: KeyValueStore
    beforeEach(async () => {
      store = make()
      await store.clear()
    })

    it('寫入後讀得回來（字串、物件、陣列、中文）', async () => {
      await store.set('acacia-personal-v2', '{"state":{"x":1},"version":2}')
      await store.set('snapshot:abc', { title: '週日家庭聚餐', n: [1, 2] })
      expect(await store.get('acacia-personal-v2')).toBe('{"state":{"x":1},"version":2}')
      expect(await store.get('snapshot:abc')).toEqual({ title: '週日家庭聚餐', n: [1, 2] })
    })

    it('沒有的 key 回傳 undefined；覆寫取最新的值', async () => {
      expect(await store.get('nope')).toBeUndefined()
      await store.set('index', { v: 1 })
      await store.set('index', { v: 2 })
      expect(await store.get('index')).toEqual({ v: 2 })
    })

    it('刪除、列出 key、清空', async () => {
      await store.set('a', 1)
      await store.set('b', 2)
      expect((await store.keys()).sort()).toEqual(['a', 'b'])
      await store.del('a')
      expect(await store.get('a')).toBeUndefined()
      await store.del('不存在也不會出錯')
      await store.clear()
      expect(await store.keys()).toEqual([])
    })
  })
}

contract('網頁版（IndexedDB）', () => createWebKv('backups'))
contract('iOS 版（JSON 檔）', () => createNativeKv('backups', fakeFs().api))

describe('iOS 版：檔案位置與寫入安全', () => {
  it('每個 key 一個檔案，放在 Library/acacia/<命名空間>/，特殊字元會編碼', async () => {
    const fs = fakeFs()
    const store = createNativeKv('backups', fs.api)
    await store.set('snapshot:1/2', { ok: true })
    expect([...fs.files.keys()]).toEqual([`${NATIVE_ROOT}/backups/${fileNameOf('snapshot:1/2')}`])
    expect(fileNameOf('snapshot:1/2')).toBe('snapshot%3A1%2F2.json')
    expect(await store.keys()).toEqual(['snapshot:1/2'])
  })

  it('命名空間互不影響：清空快照不會動到主資料', async () => {
    const fs = fakeFs()
    const state = createNativeKv('state', fs.api)
    const backups = createNativeKv('backups', fs.api)
    await state.set('acacia-personal-v2', 'main')
    await backups.set('index', { snapshots: [] })
    await backups.clear()
    expect(await state.get('acacia-personal-v2')).toBe('main')
    expect(await backups.keys()).toEqual([])
  })

  it('先寫暫存檔再改名：完成後不留暫存檔；iOS 改名遇到舊檔失敗時會先刪舊檔再改名', async () => {
    const fs = fakeFs({ renameOverwrites: false })
    const store = createNativeKv('state', fs.api)
    await store.set('acacia-personal-v2', 'v1')
    await store.set('acacia-personal-v2', 'v2')
    expect(await store.get('acacia-personal-v2')).toBe('v2')
    expect([...fs.files.keys()].some((k) => k.endsWith('.tmp'))).toBe(false)
  })

  it('寫暫存檔時當機：正式檔還是舊版本', async () => {
    const fs = fakeFs()
    const store = createNativeKv('state', fs.api)
    await store.set('acacia-personal-v2', 'v1')
    fs.failNext('writeFile')
    await expect(store.set('acacia-personal-v2', 'v2')).rejects.toThrow()
    expect(await store.get('acacia-personal-v2')).toBe('v1')
  })

  it('刪掉舊檔後、改名前當機：讀取時從暫存檔救回', async () => {
    const fs = fakeFs({ renameOverwrites: false })
    const store = createNativeKv('state', fs.api)
    await store.set('acacia-personal-v2', 'v1')
    fs.failNext('rename', 2) // 第一次改名失敗 → 刪舊檔 → 第二次改名也失敗（模擬當機）
    await expect(store.set('acacia-personal-v2', 'v2')).rejects.toThrow()
    expect(await store.get('acacia-personal-v2')).toBe('v2')
    expect(await store.keys()).toEqual(['acacia-personal-v2'])
  })

  it('正式檔內容壞掉：另存成 .corrupt 備查、不直接刪除，回傳 undefined', async () => {
    const fs = fakeFs()
    const store = createNativeKv('state', fs.api, () => 123)
    const path = `${NATIVE_ROOT}/state/${fileNameOf('acacia-personal-v2')}`
    fs.files.set(path, '{壞掉的 JSON')
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await store.get('acacia-personal-v2')).toBeUndefined()
    expect(fs.files.get(`${path}.corrupt-123`)).toBe('{壞掉的 JSON')
    expect(fs.files.has(path)).toBe(false)
    err.mockRestore()
  })
})

describe('iOS 第一次啟動：從 WebView 的 IndexedDB 搬資料', () => {
  it('搬過去、刪掉舊資料、只做一次；檔案裡已有的不覆蓋；同意紀錄略過', async () => {
    const legacy = createWebKv('state')
    await legacy.clear()
    await legacy.set('acacia-personal-v2', 'IndexedDB 的主資料')
    await legacy.set('acacia-spaces', '舊的共享空間')
    await legacy.set('acacia-consent', { privacy: 'x' })
    const fs = fakeFs()
    const prefs = fakePrefs()
    const target = createNativeKv('state', fs.api)
    await target.set('acacia-spaces', '檔案裡比較新的')

    expect(await migrateFromIndexedDb('state', target, legacy, prefs.api, ['acacia-consent'])).toBe(1)
    expect(await target.get('acacia-personal-v2')).toBe('IndexedDB 的主資料')
    expect(await target.get('acacia-spaces')).toBe('檔案裡比較新的')
    expect(await target.get('acacia-consent')).toBeUndefined()
    expect((await legacy.keys()).sort()).toEqual(['acacia-consent'])
    expect(prefs.values.has(migratedFlag('state'))).toBe(true)

    // 刪除所有資料後檔案被清空，也不會再從 IndexedDB 搬回來
    await legacy.set('acacia-personal-v2', '不該復活')
    await target.clear()
    expect(await migrateFromIndexedDb('state', target, legacy, prefs.api)).toBe(0)
    expect(await target.get('acacia-personal-v2')).toBeUndefined()
  })

  it('搬移失敗：不設完成標記，下次再試', async () => {
    const legacy = createWebKv('backups')
    await legacy.clear()
    await legacy.set('index', { v: 1 })
    const fs = fakeFs()
    const prefs = fakePrefs()
    fs.failNext('writeFile')
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await migrateFromIndexedDb('backups', createNativeKv('backups', fs.api), legacy, prefs.api)).toBe(0)
    expect(prefs.values.has(migratedFlag('backups'))).toBe(false)
    expect(await migrateFromIndexedDb('backups', createNativeKv('backups', fs.api), legacy, prefs.api)).toBe(1)
    err.mockRestore()
  })
})

describe('平台切換', () => {
  afterEach(() => setNativeForTests(null))

  it('網頁版預設用 IndexedDB', async () => {
    const store = kv('backups')
    await store.set('k', 1)
    expect(await createWebKv('backups').get('k')).toBe(1)
  })

  it('App 裡改用原生儲存，網頁版的 IndexedDB 不會被寫入', async () => {
    const fs = fakeFs()
    const opener = vi.fn(async (ns: Parameters<typeof createNativeKv>[0]) => createNativeKv(ns, fs.api))
    setNativeForTests(true, opener)
    await createWebKv('backups').clear()
    const store = kv('backups')
    await store.set('index', { native: true })
    expect(await store.get('index')).toEqual({ native: true })
    expect(await createWebKv('backups').get('index')).toBeUndefined()
    await store.get('index')
    expect(opener).toHaveBeenCalledTimes(1)
  })
})
