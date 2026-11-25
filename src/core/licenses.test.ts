import { describe, expect, it } from 'vitest'
// @ts-expect-error 產生腳本是純 JS（.mjs），沒有型別宣告
import { classify, collect, isNetworkCopyleft } from '../../scripts/generate-licenses.mjs'
import packages from '../licenses/packages.json'
import { filterPackages, groupByLicense, summarize, type LicensePackage } from './licenses'

const PKGS = packages as LicensePackage[]
const key = (p: Pick<LicensePackage, 'name' | 'version' | 'license' | 'scope'>) => `${p.name}@${p.version} ${p.license} ${p.scope}`

describe('授權分類', () => {
  it('依 SPDX 運算式分類', () => {
    expect(classify('MIT')).toBe('permissive')
    expect(classify('Apache-2.0')).toBe('permissive')
    expect(classify('(MIT OR GPL-3.0-or-later)')).toBe('permissive')
    expect(classify('MIT AND GPL-2.0-only')).toBe('strong')
    expect(classify('MPL-2.0')).toBe('weak')
    expect(classify('LGPL-3.0')).toBe('weak')
    expect(classify('AGPL-3.0-only')).toBe('strong')
    expect(classify('SEE LICENSE IN LICENSE.md')).toBe('unknown')
    expect(classify(undefined)).toBe('unknown')
    expect(isNetworkCopyleft('AGPL-3.0-or-later')).toBe(true)
    expect(isNetworkCopyleft('GPL-3.0')).toBe(false)
  })
})

describe('授權資料檔', () => {
  it('跟 package-lock.json 一致（新增或升級套件後請執行 npm run licenses）', () => {
    const fresh = (collect() as { packages: LicensePackage[] }).packages.map(key)
    expect(PKGS.map(key)).toEqual(fresh)
  })

  it('隨網站發布的套件沒有 GPL / AGPL 等強著作權授權', () => {
    expect(PKGS.filter((p) => p.scope === 'runtime' && p.category === 'strong').map(key)).toEqual([])
  })

  it('每個隨網站發布的套件都有授權全文或標準條文', () => {
    expect(PKGS.filter((p) => p.scope === 'runtime' && !p.textId).map(key)).toEqual([])
  })
})

describe('篩選與分組', () => {
  const list: LicensePackage[] = [
    { name: 'react', version: '19.0.0', license: 'MIT', category: 'permissive', scope: 'runtime', copyright: 'Copyright (c) Meta' },
    { name: 'zod', version: '4.0.0', license: 'MIT', category: 'permissive', scope: 'runtime' },
    { name: 'idb-keyval', version: '6.0.0', license: 'Apache-2.0', category: 'permissive', scope: 'runtime' },
    { name: 'lightningcss', version: '1.0.0', license: 'MPL-2.0', category: 'weak', scope: 'dev' },
  ]

  it('可依名稱、授權、版權人搜尋並篩選範圍', () => {
    expect(filterPackages(list, 'meta', 'all').map((p) => p.name)).toEqual(['react'])
    expect(filterPackages(list, 'apache', 'all').map((p) => p.name)).toEqual(['idb-keyval'])
    expect(filterPackages(list, '', 'dev').map((p) => p.name)).toEqual(['lightningcss'])
    expect(filterPackages(list, ' ZOD ', 'runtime').map((p) => p.name)).toEqual(['zod'])
  })

  it('需要注意的授權排前面，其餘依數量排序', () => {
    expect(groupByLicense(list).map((g) => `${g.license}:${g.packages.length}`)).toEqual(['MPL-2.0:1', 'MIT:2', 'Apache-2.0:1'])
  })

  it('統計', () => {
    const s = summarize(list)
    expect([s.total, s.runtime, s.dev, s.strong.length, s.weak.length]).toEqual([4, 3, 1, 0, 1])
  })
})
