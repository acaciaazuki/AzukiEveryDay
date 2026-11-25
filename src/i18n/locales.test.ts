import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '.'
import de from './locales/de.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import zhTW from './locales/zh-TW.json'

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()

const leaves = (o: object, p = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? leaves(v, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]))

const vars = (s: string) => [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort()

const OTHERS = { ja, en, ko, fr, de }

describe('翻譯檔', () => {
  it('所有語言的 key 與繁體中文完全一致', () => {
    for (const [code, doc] of Object.entries(OTHERS)) expect(keys(doc), code).toEqual(keys(zhTW))
  })

  it('所有語言的插值變數（{{...}}）與繁體中文一致', () => {
    const base = new Map(leaves(zhTW))
    for (const [code, doc] of Object.entries(OTHERS)) {
      for (const [k, v] of leaves(doc)) expect(vars(v), `${code}:${k}`).toEqual(vars(base.get(k) ?? ''))
    }
  })

  it('韓文、法文、德文沒有殘留沒翻譯的中文', () => {
    for (const [code, doc] of Object.entries({ ko, fr, de })) {
      const left = leaves(doc).filter(([, v]) => /[一-鿿぀-ヿ]/.test(v.replace(/繁體中文|日本語/g, '')))
      expect(left, code).toEqual([])
    }
  })

  it('語言切換選單列出六種語言，名稱用各自的母語', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['zh-TW', 'ja', 'en', 'ko', 'fr', 'de'])
    expect(LANGUAGES.map((l) => l.label)).toEqual(['繁體中文', '日本語', 'English', '한국어', 'Français', 'Deutsch'])
  })
})
