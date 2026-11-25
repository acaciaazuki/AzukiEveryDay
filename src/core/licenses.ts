/**
 * 第三方套件授權清單的型別與篩選、分組。
 * 資料由 `npm run licenses`（scripts/generate-licenses.mjs）產生在 src/licenses/。
 */

/** permissive 寬鬆｜weak 弱著作權（MPL、LGPL）｜strong 強著作權（GPL、AGPL）｜unknown 無法辨識 */
export type LicenseCategory = 'permissive' | 'weak' | 'strong' | 'unknown'
/** runtime：打包進網站、使用者會下載到的套件｜dev：只在開發、建置、測試時使用 */
export type LicenseScope = 'runtime' | 'dev'

export interface LicensePackage {
  name: string
  version: string
  license: string
  category: LicenseCategory
  scope: LicenseScope
  /** AGPL / SSPL：透過網路提供服務也要公開原始碼 */
  network?: boolean
  copyright?: string
  repository?: string
  textId?: string
  /** 套件沒附授權檔，全文依標準條文產生 */
  textGenerated?: boolean
}

export const CATEGORY_ORDER: LicenseCategory[] = ['strong', 'weak', 'unknown', 'permissive']

export type ScopeFilter = 'all' | LicenseScope

export function filterPackages(list: LicensePackage[], query: string, scope: ScopeFilter): LicensePackage[] {
  const q = query.trim().toLowerCase()
  return list.filter(
    (p) =>
      (scope === 'all' || p.scope === scope) &&
      (!q || p.name.toLowerCase().includes(q) || p.license.toLowerCase().includes(q) || (p.copyright ?? '').toLowerCase().includes(q)),
  )
}

export interface LicenseGroup {
  license: string
  category: LicenseCategory
  packages: LicensePackage[]
}

/** 依授權類型分組：需要注意的（強／弱著作權、未知）排前面，其餘依套件數多到少 */
export function groupByLicense(list: LicensePackage[]): LicenseGroup[] {
  const map = new Map<string, LicenseGroup>()
  for (const p of list) {
    const g = map.get(p.license) ?? { license: p.license, category: p.category, packages: [] }
    g.packages.push(p)
    map.set(p.license, g)
  }
  // 組內：隨網站發布的套件排前面
  for (const g of map.values()) g.packages.sort((a, b) => (a.scope === b.scope ? 0 : a.scope === 'runtime' ? -1 : 1))
  return [...map.values()].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      b.packages.length - a.packages.length ||
      a.license.localeCompare(b.license),
  )
}

export function summarize(list: LicensePackage[]) {
  return {
    total: list.length,
    runtime: list.filter((p) => p.scope === 'runtime').length,
    dev: list.filter((p) => p.scope === 'dev').length,
    strong: list.filter((p) => p.category === 'strong'),
    weak: list.filter((p) => p.category === 'weak'),
    unknown: list.filter((p) => p.category === 'unknown'),
  }
}
