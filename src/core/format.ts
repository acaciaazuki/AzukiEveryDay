import { CURRENCIES, DEFAULT_CURRENCY } from './defaults'

/** 沒有小數位的幣別 */
const WHOLE = new Set(['TWD', 'JPY', 'KRW'])

/** 三碼大寫英文字母視為 ISO 幣別代碼，其他都是使用者自訂的幣別符號 */
export const isCurrencyCode = (c: string) => /^[A-Z]{3}$/.test(c)

/** 自訂幣別符號的金額：單一字元貼著數字（฿120），較長的符號空一格（RM 12、點 300） */
function formatCustom(n: number, sym: string, lng: string): string {
  const num = new Intl.NumberFormat(lng, { maximumFractionDigits: 2 }).format(n)
  return [...sym].length === 1 ? `${sym}${num}` : `${sym} ${num}`
}

/** 依幣別顯示金額。整數不顯示 .00；自訂符號照使用者輸入的顯示；不認得的幣別代碼退回「USD 12」格式 */
export function formatCurrency(n: number, currency: string, lng: string): string {
  if (!isCurrencyCode(currency)) return formatCustom(n, currency, lng)
  try {
    const text = new Intl.NumberFormat(lng, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: WHOLE.has(currency) ? 0 : 2 }).format(n)
    // 繁中語系的新台幣只顯示「$」，跟美金放在一起會分不清，補成 NT$
    return currency === 'TWD' && text.startsWith('$') ? `NT${text}` : text
  } catch {
    return `${currency} ${n}`
  }
}

/** 記帳等沒有個別幣別的金額：以設定頁的「預設貨幣」顯示（只換符號，不換算匯率） */
export const formatMoney = (n: number, lng: string, currency: string = DEFAULT_CURRENCY) => formatCurrency(n, currency, lng)

/** 幣別符號（NT$、US$、¥、€…），給輸入框旁的幣別標籤用；取不到就回傳幣別代碼 */
export function currencySymbol(currency: string, lng: string): string {
  if (!isCurrencyCode(currency)) return currency
  try {
    const sym = new Intl.NumberFormat(lng, { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency
    return currency === 'TWD' && sym === '$' ? 'NT$' : sym
  } catch {
    return currency
  }
}

/** 幣別的在地名稱（新台幣、US Dollar、日本円…），瀏覽器不支援時回傳代碼 */
export function currencyName(currency: string, lng: string): string {
  if (!isCurrencyCode(currency)) return currency
  try {
    return new Intl.DisplayNames(lng, { type: 'currency' }).of(currency) ?? currency
  } catch {
    return currency
  }
}

/** 下拉選單裡「自訂幣別符號」的值；不會跟任何幣別代碼或符號撞到 */
export const CUSTOM_CURRENCY = '__custom__'

/** 選單選項：常用幣別 + 曾經用過的其他幣別（例如自訂的 ฿、同步進來的 THB）+ 自訂 */
export function currencyOptions(used: Iterable<string>): string[] {
  const extra = [...new Set(used)].filter((c) => c && !(CURRENCIES as readonly string[]).includes(c)).sort()
  return [...CURRENCIES, ...extra]
}
