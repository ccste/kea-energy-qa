import type { Locator, Page } from '@playwright/test'
import { PasswordResetDialog } from './components/PasswordResetDialog'

export class SettingsPage {
  readonly heading: Locator
  readonly passwordSecurity: Locator
  readonly resetPassword: PasswordResetDialog

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Settings', exact: true })
    this.passwordSecurity = page.getByRole('button', { name: /^Password and security\b/ })
    this.resetPassword = new PasswordResetDialog(page, 'Reset password')
  }

  async openPasswordSecurity(): Promise<void> {
    await this.passwordSecurity.click()
    await this.resetPassword.root.waitFor({ state: 'visible' })
  }
}
