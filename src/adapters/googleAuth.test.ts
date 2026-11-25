import { afterEach, describe, expect, it } from 'vitest'
import { MissingDriveScopeError, restoreToken, SCOPES, signIn } from './googleAuth'

const DRIVE = 'https://www.googleapis.com/auth/drive.file'
const PROFILE = 'https://www.googleapis.com/auth/userinfo.profile'

/**
 * 模擬 Google Identity Services：requestAccessToken 時以目前設定的 TokenResponse 呼叫 callback，並記下 prompt。
 * googleAuth 會快取第一次載入的 accounts 物件，所以整個檔案共用同一個模擬物件，只替換回應內容。
 */
let response: { access_token?: string; expires_in?: number; scope?: string; error?: string } = {}
const prompts: (string | undefined)[] = []
window.google = {
  accounts: {
    oauth2: {
      initTokenClient: (cfg) => ({
        requestAccessToken: (o) => {
          prompts.push(o?.prompt)
          cfg.callback(response)
        },
      }),
      revoke: (_t, done) => done(),
    },
  },
}
function mockGis(r: typeof response) {
  response = r
  prompts.length = 0
  return prompts
}

describe('Google 登入的權限檢查', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('有勾選 Google 雲端硬碟權限：回傳 token 並暫存', async () => {
    mockGis({ access_token: 'ok', expires_in: 3600, scope: `${PROFILE} ${DRIVE}` })
    await expect(signIn()).resolves.toMatchObject({ token: 'ok' })
    expect(restoreToken()?.token).toBe('ok')
  })

  it('漏勾 drive.file：丟出 MissingDriveScopeError，不暫存 token', async () => {
    mockGis({ access_token: 'no-drive', expires_in: 3600, scope: PROFILE })
    await expect(signIn()).rejects.toBeInstanceOf(MissingDriveScopeError)
    expect(restoreToken()).toBeNull()
  })

  it('一般登入不強制顯示權限畫面；重新授權改用 prompt: consent', async () => {
    const prompts = mockGis({ access_token: 'ok', expires_in: 3600, scope: `${DRIVE} ${PROFILE}` })
    await signIn()
    await signIn({ consent: true })
    expect(prompts).toEqual(['', 'consent'])
  })

  it('只要求 drive.file，不使用 drive.appdata（避免 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT）', () => {
    expect(SCOPES.split(' ')).toContain(DRIVE)
    expect(SCOPES).not.toContain('drive.appdata')
  })
})
