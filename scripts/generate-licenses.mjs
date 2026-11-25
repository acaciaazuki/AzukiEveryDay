#!/usr/bin/env node
/**
 * 產生「開源套件授權清單」資料檔（都放在 src/licenses/）：
 * - packages.json：套件清單（名稱、版本、授權、版權聲明），打開授權清單時才載入
 * - texts.json：授權全文（去重複），按下「檢視授權全文」時才載入
 *
 * 用法：npm install 之後執行 `npm run licenses`
 * （新增、移除或升級套件後都要重跑一次，並把產生的 JSON 一起 commit；
 *  `npm test` 裡有測試會檢查資料檔是否跟 package-lock.json 一致。）
 *
 * 做法：
 * 1. 以 package-lock.json 為準，列出所有安裝的套件（含間接依賴）
 * 2. 到 node_modules 讀每個套件的 package.json（license、repository、author）
 *    與授權全文檔（LICENSE / LICENCE / COPYING，Apache 套件另附 NOTICE）
 * 3. 依授權類型分成：寬鬆、弱著作權（檔案層級）、強著作權（GPL / AGPL）、未知
 * 4. 授權全文去重複後另存一個檔，降低打開清單時要下載的體積
 *
 * 只給特定作業系統／CPU 的原生執行檔套件（例如 lightningcss-darwin-arm64）不列入：
 * 它們跟主套件同授權，而且每台電腦安裝的不同，列入會讓資料檔因電腦而異。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const OUT_DIR = join(ROOT, 'src/licenses')

/** 寬鬆授權：保留版權與授權聲明即可，不要求公開自己的原始碼 */
const PERMISSIVE = /^(MIT|MIT-0|ISC|0BSD|BSD-[1234]-Clause.*|Apache-2\.0|BlueOak-1\.0\.0|Unlicense|CC0-1\.0|CC-BY-[34]\.0|Zlib|WTFPL|Python-2\.0|BSL-1\.0|PSF-2\.0|OGDL-Taiwan-1\.0)$/i
/** 弱著作權：只有修改「該套件本身的檔案」時，才要公開那些檔案 */
const WEAK = /^(MPL-[12]\.[01]|LGPL-.*|EPL-[12]\.0|CDDL-1\.[01]|EUPL-.*|CC-BY-SA-.*)$/i
/** 強著作權：散布時整個作品要用同授權公開原始碼；AGPL / SSPL 連「透過網路提供服務」也算 */
const STRONG = /^(A?GPL-.*|SSPL-.*|OSL-.*|CPAL-.*)$/i
const NETWORK = /^(AGPL-.*|SSPL-.*)$/i

const RANK = { permissive: 0, weak: 1, strong: 2, unknown: 3 }

function classifyOne(id) {
  const s = id.replace(/[()]/g, '').trim().replace(/\+$/, '')
  if (PERMISSIVE.test(s)) return 'permissive'
  if (WEAK.test(s)) return 'weak'
  if (STRONG.test(s)) return 'strong'
  return 'unknown'
}

/**
 * 依 SPDX 運算式分類。
 * - "A OR B"：可以擇一，取最寬鬆的選項
 * - "A AND B"：要同時遵守，取最嚴格的
 */
export function classify(expr) {
  if (!expr) return 'unknown'
  const alternatives = String(expr).split(/\s+OR\s+/i)
  let best = 'unknown'
  for (const alt of alternatives) {
    const parts = alt.split(/\s+AND\s+/i).map(classifyOne)
    const worst = parts.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'permissive')
    if (RANK[worst] < RANK[best]) best = worst
  }
  return best
}

export function isNetworkCopyleft(expr) {
  return String(expr ?? '')
    .split(/\s+(?:OR|AND)\s+/i)
    .some((p) => NETWORK.test(p.replace(/[()]/g, '').trim()))
}

function normalizeLicense(pkg, lockEntry) {
  let lic = pkg?.license ?? lockEntry.license
  if (!lic && Array.isArray(pkg?.licenses)) lic = pkg.licenses.map((l) => l.type ?? l).join(' OR ')
  if (lic && typeof lic === 'object') lic = lic.type
  return lic ? String(lic) : 'UNKNOWN'
}

function normalizeRepo(repo) {
  let url = typeof repo === 'string' ? repo : repo?.url
  if (!url) return undefined
  url = url.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://').replace(/^ssh:\/\/git@/, 'https://')
  const short = url.match(/^(github|gitlab|bitbucket):(.+)$/)
  if (short) return `https://${short[1]}.${short[1] === 'bitbucket' ? 'org' : 'com'}/${short[2]}`
  if (/^[\w.-]+\/[\w.-]+$/.test(url)) return `https://github.com/${url}`
  return url.startsWith('http') ? url : undefined
}

function authorName(a) {
  if (!a) return undefined
  if (typeof a === 'string') return a.replace(/\s*[<(].*$/, '').trim() || undefined
  return a.name
}

const LICENSE_FILE = /^(licen[cs]e|copying)([-._].*)?$/i
const NOTICE_FILE = /^notice(\.(md|txt))?$/i

function readTexts(dir) {
  if (!existsSync(dir)) return { license: undefined, notice: undefined }
  const files = readdirSync(dir).sort()
  const lic = files.find((f) => LICENSE_FILE.test(f))
  const notice = files.find((f) => NOTICE_FILE.test(f))
  const read = (f) => (f ? readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n').trim() : undefined)
  return { license: read(lic), notice: read(notice) }
}

/** 從授權全文抓出版權聲明行（例如 "Copyright (c) Meta Platforms, Inc."） */
function extractCopyright(text) {
  if (!text) return undefined
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^(copyright\b|©|\(c\)\s*\d{4})/i.test(l) && !/copyright (notice|holders?|owner|license)\b/i.test(l) && l.length < 200)
  return lines.length ? [...new Set(lines)].slice(0, 3).join('\n') : undefined
}

/** 套件沒附授權檔時，MIT / ISC 依標準條文補上（版權人取自 package.json 的 author） */
const TEMPLATES = {
  MIT: (c) => `MIT License\n\n${c}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.`,
  ISC: (c) => `ISC License\n\n${c}\n\nPermission to use, copy, modify, and/or distribute this software for any\npurpose with or without fee is hereby granted, provided that the above\ncopyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES\nWITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF\nMERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR\nANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES\nWHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN\nACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF\nOR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
}

/**
 * 不是 npm 套件、但打包進網站的第三方資料（例如國定假日資料，見 scripts/generate-holidays.mjs）。
 * 產生資料用的套件本身是開發工具（scope: dev），但產生出來的資料會隨網站發布，所以另外列為 runtime。
 * text 是授權全文檔（相對於專案根目錄）。
 */
export const DATA_SOURCES = [
  {
    name: 'holiday-data: date-holidays (JP, US, HK, SG, GB, CA, AU)',
    versionFrom: 'node_modules/date-holidays/package.json',
    license: 'CC-BY-SA-4.0',
    copyright: 'Copyright (c) 2015-present, commenthol; holiday data CC BY-SA 4.0 (Wikipedia contributors)',
    repository: 'https://github.com/commenthol/date-holidays',
    text: 'node_modules/date-holidays/LICENSE',
  },
  {
    name: 'holiday-data: holidays-kr (KR)',
    versionFrom: 'node_modules/@hyunbinseo/holidays-kr/package.json',
    license: 'MIT',
    copyright: 'Copyright (c) 2023 Hyunbin Seo',
    repository: 'https://github.com/hyunbinseo/holidays-kr',
    text: 'node_modules/@hyunbinseo/holidays-kr/LICENSE',
  },
  {
    name: 'holiday-data: holiday-cn (CN)',
    version: 'data',
    license: 'MIT',
    copyright: 'Copyright (c) 2019 NateScarlet',
    repository: 'https://github.com/NateScarlet/holiday-cn',
    text: 'scripts/data-licenses/holiday-cn.txt',
  },
  {
    name: 'holiday-data: Taiwan DGPA office calendar (TW)',
    version: 'data',
    license: 'OGDL-Taiwan-1.0',
    copyright: '行政院人事行政總處（Directorate-General of Personnel Administration, Executive Yuan）',
    repository: 'https://data.gov.tw/dataset/14718',
    text: 'scripts/data-licenses/tw-gov-open-data.txt',
  },
]

export function collect(root = ROOT) {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  const seen = new Map()
  const texts = {}
  let skippedPlatform = 0

  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path || entry.link) continue
    if (entry.os || entry.cpu) {
      skippedPlatform++
      continue
    }
    const name = entry.name ?? path.replace(/^.*node_modules\//, '')
    const dir = join(root, path)
    const pkgFile = join(dir, 'package.json')
    const pkg = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile, 'utf8')) : undefined
    const version = entry.version ?? pkg?.version ?? '?'
    const key = `${name}@${version}`
    // 同一個套件同時被正式程式與開發工具用到時，以「隨網站發布」為準
    const scope = entry.dev || entry.devOptional ? 'dev' : 'runtime'
    if (seen.has(key)) {
      if (scope === 'runtime') seen.get(key).scope = 'runtime'
      continue
    }

    const license = normalizeLicense(pkg, entry)
    const { license: licText, notice } = readTexts(dir)
    const author = authorName(pkg?.author)
    const copyright = extractCopyright(licText) ?? (author ? `Copyright (c) ${author}` : undefined)
    // 沒附授權檔：MIT / ISC 用標準條文補上，並標記為「依標準條文產生」
    const generated = !licText && TEMPLATES[license] ? TEMPLATES[license](copyright ?? `Copyright (c) ${name} contributors`) : undefined
    const full = [licText ?? generated, notice && `---- NOTICE ----\n\n${notice}`].filter(Boolean).join('\n\n')
    let textId
    if (full) {
      textId = createHash('sha1').update(full).digest('hex').slice(0, 10)
      texts[textId] = full
    }

    seen.set(key, {
      name,
      version,
      license,
      category: classify(license),
      network: isNetworkCopyleft(license) || undefined,
      scope,
      copyright,
      repository: normalizeRepo(pkg?.repository) ?? (pkg?.homepage?.startsWith('http') ? pkg.homepage : undefined),
      textId,
      textGenerated: generated ? true : undefined,
    })
  }

  for (const d of DATA_SOURCES) {
    const version = d.version ?? JSON.parse(readFileSync(join(root, d.versionFrom), 'utf8')).version
    const full = readFileSync(join(root, d.text), 'utf8').replace(/\r\n/g, '\n').trim()
    const textId = createHash('sha1').update(full).digest('hex').slice(0, 10)
    texts[textId] = full
    seen.set(`${d.name}@${version}`, {
      name: d.name,
      version,
      license: d.license,
      category: classify(d.license),
      scope: 'runtime',
      copyright: d.copyright,
      repository: d.repository,
      textId,
    })
  }

  const packages = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
  // 只保留還有被引用到的全文，並依 id 排序，讓輸出結果穩定、diff 好讀
  const used = new Set(packages.map((p) => p.textId).filter(Boolean))
  const sortedTexts = Object.fromEntries(Object.keys(texts).filter((k) => used.has(k)).sort().map((k) => [k, texts[k]]))
  return { packages, texts: sortedTexts, skippedPlatform }
}

function main() {
  const { packages, texts, skippedPlatform } = collect()
  // 重新產生前，先記下隨網站發布的套件原本有哪些授權類型（用來提醒是否要請使用者重新同意）
  const prevPath = join(OUT_DIR, 'packages.json')
  const runtimeLicenses = (list) => new Set(list.filter((p) => p.scope === 'runtime').map((p) => p.license))
  const before = existsSync(prevPath) ? runtimeLicenses(JSON.parse(readFileSync(prevPath, 'utf8'))) : null
  mkdirSync(OUT_DIR, { recursive: true })
  const write = (file, data) => {
    const json = JSON.stringify(data, null, 1) + '\n'
    writeFileSync(join(OUT_DIR, file), json)
    console.log(`已寫入 src/licenses/${file}（${(json.length / 1024).toFixed(1)} KB）`)
  }
  write('packages.json', packages)
  write('texts.json', texts)

  const count = (f) => packages.filter(f).length
  const byLicense = {}
  for (const p of packages) byLicense[p.license] = (byLicense[p.license] ?? 0) + 1
  console.log(`共 ${packages.length} 個套件：隨網站發布 ${count((p) => p.scope === 'runtime')}、開發工具 ${count((p) => p.scope === 'dev')}；略過平台原生執行檔 ${skippedPlatform} 個`)
  console.log('授權類型：' + Object.entries(byLicense).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('、'))

  const flag = (cat, label) => {
    const list = packages.filter((p) => p.category === cat)
    if (list.length) console.warn(`\n⚠ ${label}：\n` + list.map((p) => `  - ${p.name}@${p.version}（${p.license}，${p.scope === 'runtime' ? '隨網站發布' : '開發工具'}）${p.network ? ' ← 網路服務也須公開原始碼' : ''}`).join('\n'))
  }
  flag('strong', '強著作權授權（GPL / AGPL 等），使用前請確認是否必須公開原始碼')
  flag('unknown', '無法辨識的授權，請手動查看')
  flag('weak', '弱著作權授權（MPL / LGPL 等），只有修改該套件本身時才需公開修改的部分')
  const generated = packages.filter((p) => p.textGenerated)
  if (generated.length) console.log(`\n套件未附授權檔、已依標準條文補上：${generated.map((p) => p.name).join('、')}`)
  const missing = packages.filter((p) => !p.textId)
  if (missing.length) console.warn(`\n找不到授權全文的套件（清單中會顯示授權名稱與連結）：${[...new Set(missing.map((p) => p.name))].join('、')}`)

  // 隨網站發布的套件出現新的授權類型：提醒評估是否要請使用者重新同意（要的話改 LICENSES_VERSION）
  const added = before ? [...runtimeLicenses(packages)].filter((l) => !before.has(l)) : []
  if (added.length) {
    console.warn(
      `\n⚠ 隨網站發布的套件出現新的授權類型：${added.join('、')}\n` +
        '  若這個變動需要使用者重新確認，把 src/core/consent.ts 的 LICENSES_VERSION 改成今天日期；只是版本升級則不用改。',
    )
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
