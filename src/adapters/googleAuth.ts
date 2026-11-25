/**
 * Google 登入轉接層（網頁版：Google Identity Services token client）。
 * iOS（Capacitor）不允許在 WebView 內做 Google OAuth，之後會換成原生登入外掛，
 * 只要提供同樣的 signIn / signOut / restore 介面即可。
 */
/** OAuth 用戶端 ID（沒設定 VITE_GOOGLE_CLIENT_ID 時使用內建的 ID） */
export const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '204399136099-jruoq7f7671gb2q56kvhflpkq69ertve.apps.googleusercontent.com'
/**
 * 只使用 drive.file：只能存取本 App 建立、或使用者透過 Google Picker 選取的檔案。
 * 不使用 drive.appdata／appDataFolder（共享空間要跨帳號共用檔案，appDataFolder 無法分享，混用會出現 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT）。
 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const SCOPES = `${DRIVE_SCOPE} https://www.googleapis.com/auth/userinfo.profile`
const TOKEN_KEY = 'acacia_next_g_token'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  /** 使用者實際勾選同意的權限（以空白分隔）；Google 細部權限畫面允許只勾部分 */
  scope?: string
  error?: string
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void
}
interface GoogleAccounts {
  oauth2: {
    initTokenClient: (cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }) => TokenClient
    revoke: (token: string, done: () => void) => void
  }
}
declare global {
  interface Window {
    google?: { accounts: GoogleAccounts }
  }
}

let gisPromise: Promise<GoogleAccounts> | null = null
function loadGis(): Promise<GoogleAccounts> {
  gisPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve(window.google.accounts)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => (window.google?.accounts ? resolve(window.google.accounts) : reject(new Error('GIS 載入失敗')))
    s.onerror = () => {
      gisPromise = null
      reject(new Error('GIS 載入失敗'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

export interface StoredToken {
  token: string
  expiresAt: number
}

export function restoreToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as StoredToken
    return t.expiresAt > Date.now() + 60_000 ? t : null
  } catch {
    return null
  }
}

/** 登入成功，但使用者沒勾選 Google 雲端硬碟（drive.file）權限 */
export class MissingDriveScopeError extends Error {
  constructor() {
    super('drive.file 權限未授權')
    this.name = 'MissingDriveScopeError'
  }
}

/** 清掉這個分頁暫存的 token（權限不足時不再沿用，免得重新整理後又拿舊 token 去 403） */
export function clearStoredToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 跳出 Google 登入。consent=true 時強制顯示權限勾選畫面（prompt: 'consent'），
 * 讓先前漏勾 Google 雲端硬碟權限的使用者可以直接補勾，不必到 Google 帳號後台解除連結。
 */
export async function signIn({ consent = false }: { consent?: boolean } = {}): Promise<StoredToken> {
  const accounts = await loadGis()
  return new Promise((resolve, reject) => {
    const client = accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error ?? 'no token'))
        // 有回傳 scope 卻不含 drive.file：使用者漏勾權限方塊，之後呼叫 Drive 一定會 403
        if (r.scope !== undefined && !r.scope.split(' ').includes(DRIVE_SCOPE)) return reject(new MissingDriveScopeError())
        const t = { token: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 }
        try {
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t))
        } catch {
          /* 無痕模式等情況可忽略 */
        }
        resolve(t)
      },
      error_callback: (e) => reject(new Error(e.type)),
    })
    client.requestAccessToken({ prompt: consent ? 'consent' : '' })
  })
}

export async function signOut(token: string | null) {
  clearStoredToken()
  if (!token) return
  const accounts = await loadGis().catch(() => null)
  accounts?.oauth2.revoke(token, () => {})
}

export interface GoogleProfile {
  /** Google 帳號的固定識別碼（共享空間記錄建立者、防止切換帳號時資料混在一起） */
  sub?: string
  name?: string
  picture?: string
}

export async function fetchProfile(token: string): Promise<GoogleProfile | null> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } })
  return res.ok ? ((await res.json()) as GoogleProfile) : null
}
