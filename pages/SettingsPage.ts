import type { Locator, Page, Response } from '@playwright/test'
import { PasswordResetDialog } from './components/PasswordResetDialog'

export class SettingsPage {
  readonly heading: Locator
  readonly passwordSecurity: Locator
  readonly resetPassword: PasswordResetDialog
  readonly billShockAlerts: Locator
  readonly emailAlerts: Locator
  readonly emailThresholds: Locator
  readonly minimumOvershoot: Locator
  readonly saveAlertSettingsButton: Locator

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Settings', exact: true })
    this.passwordSecurity = page.getByRole('button', { name: /^Password and security\b/ })
    this.resetPassword = new PasswordResetDialog(page, 'Reset password')
    this.billShockAlerts = page.getByRole('switch', { name: 'Bill-shock alerts', exact: true })
    this.emailAlerts = page.getByRole('switch', { name: 'Email alerts', exact: true })
    this.emailThresholds = page.getByRole('radiogroup', { name: 'Email threshold, percent above normal', exact: true })
    this.minimumOvershoot = page.getByRole('spinbutton', { name: 'Minimum overshoot in dollars', exact: true })
    this.saveAlertSettingsButton = page.getByRole('button', { name: 'Save alert settings', exact: true })
  }

  async openPasswordSecurity(): Promise<void> {
    await this.passwordSecurity.click()
    await this.resetPassword.root.waitFor({ state: 'visible' })
  }

  async selectEmailThreshold(percent: number): Promise<void> {
    const radio = this.page.getByRole('radio', { name: new RegExp(`^${percent} percent above normal(?:,|$)`) })
    // The visible percentage covers the styled input; click its associated label like a customer.
    await this.emailThresholds.locator('label').filter({ has: radio }).click()
  }

  async setMinimumOvershoot(dollars: number): Promise<void> {
    await this.minimumOvershoot.fill(String(dollars))
  }

  async saveAlertSettings(customerId: string): Promise<Response> {
    const response = this.page.waitForResponse((candidate) =>
      candidate.request().method() === 'PUT'
      && new URL(candidate.url()).pathname === `/api/households/${encodeURIComponent(customerId)}/alert-preferences`)
    await this.saveAlertSettingsButton.click()
    return response
  }
}
