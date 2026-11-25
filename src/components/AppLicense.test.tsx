import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import pkg from '../../package.json'
import licenseText from '../../LICENSE?raw'
import notice from '../../NOTICE?raw'
import { APP_LICENSE, AppLicense, SOURCE_URL } from './AppLicense'

describe('本 App 的授權', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('package.json、LICENSE 與畫面上的授權一致', () => {
    expect(pkg.license).toBe(APP_LICENSE)
    expect(pkg.repository.url).toContain(SOURCE_URL.replace('https://', ''))
    expect(licenseText).toMatch(/^\s*GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3/)
    expect(notice).toContain('Copyright © 2026 acaciaazuki')
  })

  it('顯示版權、原始碼連結，並可檢視 AGPL 全文', async () => {
    render(<AppLicense />)
    const section = screen.getByRole('region', { name: 'ACACIA Everyday 本身的授權' })
    expect(section).toHaveTextContent('acaciaazuki')
    expect(screen.getByRole('link', { name: '原始碼' })).toHaveAttribute('href', SOURCE_URL)
    fireEvent.click(screen.getByRole('button', { name: '檢視授權全文' }))
    expect(await screen.findByText(/GNU AFFERO GENERAL PUBLIC LICENSE/)).toBeInTheDocument()
  })
})
