import { describe, expect, it } from 'vitest'
import authSource from './googleAuth.ts?raw'
import driveSource from './googleDriveSync.ts?raw'
import syncStoreSource from '../store/useSyncStore.ts?raw'
import { resolvePickerAppId } from './googleDriveSync'

describe('Google Drive 轉接層', () => {
  it('Picker 的 appId：優先用 VITE_GOOGLE_APP_ID，漏設時從 OAuth 用戶端 ID 擷取專案編號', () => {
    expect(resolvePickerAppId('123', '999-abc.apps.googleusercontent.com')).toBe('123')
    expect(resolvePickerAppId(undefined, '204399136099-jruoq7f7.apps.googleusercontent.com')).toBe('204399136099')
    expect(resolvePickerAppId('  ', '555-x.apps.googleusercontent.com')).toBe('555')
    // 用戶端 ID 格式不對時不亂猜
    expect(resolvePickerAppId(undefined, 'not-a-client-id')).toBeUndefined()
    expect(resolvePickerAppId(undefined, undefined)).toBeUndefined()
  })

  it('同步與備份完全不使用 appDataFolder／drive.appdata', () => {
    for (const src of [driveSource, syncStoreSource]) {
      expect(src).not.toContain('appDataFolder')
      expect(src).not.toContain('drive.appdata')
    }
    // googleAuth 只在註解說明不使用的原因，實際要求的權限由 googleAuth.test 檢查
    expect(authSource).toContain('drive.file')
  })
})
