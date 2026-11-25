import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { LicensesLink } from './LicensesLink'

describe('第三方授權清單', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('點小連結打開面板，可搜尋、篩選並檢視授權全文', async () => {
    render(<LicensesLink />)
    fireEvent.click(screen.getByRole('button', { name: '第三方授權清單' }))
    const dialog = await screen.findByRole('dialog', { name: '第三方授權清單' })
    expect(within(dialog).getByText(/沒有使用 GPL \/ AGPL/)).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'MIT' })).toBeInTheDocument()

    fireEvent.change(within(dialog).getByRole('searchbox', { name: '搜尋套件、授權或作者' }), { target: { value: 'idb-keyval' } })
    expect(within(dialog).queryByRole('region', { name: 'MIT' })).not.toBeInTheDocument()
    const apache = within(dialog).getByRole('region', { name: 'Apache-2.0' })
    expect(within(apache).getByText('idb-keyval')).toBeInTheDocument()
    expect(within(apache).getByText(/Jake Archibald/)).toBeInTheDocument()

    fireEvent.click(within(apache).getByRole('button', { name: '檢視授權全文' }))
    expect(await within(apache).findByText(/Apache License/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('radio', { name: /開發工具/ }))
    expect(within(dialog).getByText('找不到符合的套件')).toBeInTheDocument()
  })
})
