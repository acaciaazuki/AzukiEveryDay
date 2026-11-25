#!/usr/bin/env node
/**
 * 產生行事曆「匯入國定假日」用的靜態假日資料（src/holidays/data/<國家>.json）。
 *
 * 用法：`npm run holidays`（需要網路，會從 GitHub 下載台灣與中國的官方公告資料），
 * 再把產生的 JSON 一起 commit。網站執行時只讀這些打包好的檔案，不會連線到任何假日服務。
 *
 * 資料來源（各國都只收「放假日」，台灣與中國另收「補班／调休上班」）：
 * - 台灣 TW：行政院人事行政總處「中華民國政府行政機關辦公日曆表」
 *   （政府資料開放平台 https://data.gov.tw/dataset/14718，政府資料開放授權條款第 1 版），
 *   經 ruyut/TaiwanCalendar 轉成 UTF-8 JSON。只收官方已公告的年度，含補假、調整放假與補行上班。
 * - 中國 CN：國務院辦公廳放假安排公告，經 NateScarlet/holiday-cn（MIT）整理。只收已公告年度，含调休上班。
 * - 韓國 KR：韓國宇宙航空廳（우주항공청）月曆要項，經 @hyunbinseo/holidays-kr（MIT）整理。只收已公告年度。
 * - 日本、美國、香港、新加坡、英國（英格蘭與威爾斯）、加拿大、澳洲：
 *   date-holidays（程式 ISC、假日資料 CC BY-SA 4.0）依各國法定規則推算，只收 type 為 public 的假日
 *   （英國另收 bank holiday）。推算結果可能與政府臨時公告不同（例如選舉日、伊斯蘭曆節日的實際日期），
 *   畫面上會標示「依規則推算」。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Holidays from 'date-holidays'
import * as kr from '@hyunbinseo/holidays-kr/all'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'src/holidays/data')

/** 官方公告資料收錄的最早年份 */
const OFFICIAL_FROM = 2020
/** 依規則推算的年份範圍 */
const RULE_YEARS = [2020, 2030]

/** 依規則推算的國家：date-holidays 的代碼（含地區）與要收的假日類型 */
const RULE_COUNTRIES = {
  JP: { code: 'JP', types: ['public'], langs: ['jp', 'en'] },
  US: { code: 'US', types: ['public'], langs: ['en-us'] },
  HK: { code: 'HK', types: ['public'], langs: ['zh', 'en'] },
  SG: { code: 'SG', types: ['public'], langs: ['en'] },
  GB: { code: 'GB-ENG', types: ['public', 'bank'], langs: ['en'] },
  CA: { code: 'CA', types: ['public'], langs: ['en'] },
  AU: { code: 'AU', types: ['public'], langs: ['en'] },
}

const raw = (path) => `https://raw.githubusercontent.com/${path}`

async function getJson(url) {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.json()
}

/** 同一天有兩個名稱（例如元宵節與觀光節）時合併成一筆，避免同國家同日期重複 */
function mergeDays(list) {
  const map = new Map()
  for (const d of list) {
    const key = `${d.date}|${d.work ? 'w' : 'o'}`
    const prev = map.get(key)
    if (!prev) map.set(key, { ...d })
    else {
      if (!prev.name.split('／').includes(d.name)) prev.name += `／${d.name}`
      if (d.en && prev.en && !prev.en.split(' / ').includes(d.en)) prev.en += ` / ${d.en}`
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

async function taiwan(lastYear) {
  const days = []
  const years = []
  for (let y = OFFICIAL_FROM; y <= lastYear; y++) {
    const data = await getJson(raw(`ruyut/TaiwanCalendar/master/data/${y}.json`))
    if (!data) continue
    years.push(y)
    for (const x of data) {
      const date = `${x.date.slice(0, 4)}-${x.date.slice(4, 6)}-${x.date.slice(6, 8)}`
      const weekend = x.week === '六' || x.week === '日'
      // 有名稱的放假日（含補假、調整放假）；週末要上班的是補行上班
      if (x.isHoliday && x.description) days.push({ date, name: x.description })
      else if (!x.isHoliday && weekend) days.push({ date, name: x.description || '補行上班', work: true })
    }
  }
  return { years, days }
}

async function china(lastYear) {
  const days = []
  const years = []
  for (let y = OFFICIAL_FROM; y <= lastYear; y++) {
    const data = await getJson(raw(`NateScarlet/holiday-cn/master/${y}.json`))
    if (!data?.days?.length) continue
    years.push(y)
    for (const x of data.days) days.push(x.isOffDay ? { date: x.date, name: x.name } : { date: x.date, name: `${x.name}（调休上班）`, work: true })
  }
  return { years, days }
}

function korea() {
  const days = []
  const years = []
  for (const [key, table] of Object.entries(kr)) {
    const y = Number(key.slice(1))
    if (y < OFFICIAL_FROM) continue
    years.push(y)
    for (const [date, names] of Object.entries(table)) days.push({ date, name: names.join('／') })
  }
  return { years: years.sort(), days }
}

function byRules({ code, types, langs }) {
  const [country, state] = code.split('-')
  const local = new Holidays(country, state ?? '', { languages: [langs[0]] })
  const en = new Holidays(country, state ?? '', { languages: ['en'] })
  const days = []
  const years = []
  for (let y = RULE_YEARS[0]; y <= RULE_YEARS[1]; y++) {
    years.push(y)
    const enByKey = new Map(en.getHolidays(y).map((h) => [`${h.date}|${h.rule}`, h.name]))
    for (const h of local.getHolidays(y)) {
      if (!types.includes(h.type)) continue
      const enName = enByKey.get(`${h.date}|${h.rule}`)
      days.push({ date: h.date.slice(0, 10), name: h.name, ...(enName && enName !== h.name ? { en: enName } : {}) })
    }
  }
  return { years, days }
}

function range(years) {
  // 官方資料只收連續的年份，中間缺年（不太可能）時以最早到第一個缺口為止，避免畫面上跳號
  const sorted = [...years].sort()
  const out = [sorted[0]]
  for (const y of sorted.slice(1)) if (y === out.at(-1) + 1) out.push(y)
  return [out[0], out.at(-1)]
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const lastOfficial = new Date().getFullYear() + 2
  const sets = {
    TW: { source: 'official', ...(await taiwan(lastOfficial)) },
    CN: { source: 'official', ...(await china(lastOfficial)) },
    KR: { source: 'official', ...korea() },
  }
  for (const [c, cfg] of Object.entries(RULE_COUNTRIES)) sets[c] = { source: 'rules', ...byRules(cfg) }

  for (const [country, s] of Object.entries(sets)) {
    const [from, to] = range(s.years)
    const days = mergeDays(s.days.filter((d) => Number(d.date.slice(0, 4)) >= from && Number(d.date.slice(0, 4)) <= to))
    const json = JSON.stringify({ country, source: s.source, years: [from, to], days }) + '\n'
    writeFileSync(join(OUT_DIR, `${country}.json`), json)
    console.log(`${country}：${from}–${to}，${days.length} 筆（${(json.length / 1024).toFixed(1)} KB）`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
