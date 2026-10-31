import type { Locator, Page, Response } from '@playwright/test'
import { PasswordResetDialog } from './components/PasswordResetDialog'
import { Dialog } from './components/Dialog'

type AlertChannelName = 'Email' | 'Text message' | 'A call from Sparky'
type AlertChannel = {
  name: AlertChannelName
  switch: Locator
  row: Locator
  thresholds: Locator
  value: Locator
  note: Locator
}

export class SettingsPage {
  readonly heading: Locator
  readonly passwordSecurity: Locator
  readonly resetPassword: PasswordResetDialog
  readonly billShockAlerts: Locator
  readonly emailAlerts: Locator
  readonly emailThresholds: Locator
  readonly minimumOvershoot: Locator
  readonly saveAlertSettingsButton: Locator
  readonly subtitle: Locator
  readonly appearanceDescription: Locator
  readonly lightTheme: Locator
  readonly darkTheme: Locator
  readonly alertFieldset: Locator
  readonly alertChannels: AlertChannel[]
  readonly quietHoursStart: Locator
  readonly quietHoursEnd: Locator
  readonly billReminders: Locator
  readonly alertError: Locator
  readonly privacyButton: Locator
  readonly privacy: Dialog

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Settings', exact: true })
    this.passwordSecurity = page.getByRole('button', { name: /^Password and security\b/ })
    this.resetPassword = new PasswordResetDialog(page, 'Reset password')
    this.billShockAlerts = page.getByRole('switch', { name: 'Bill-shock alerts', exact: true })
    this.emailAlerts = page.getByRole('switch', { name: 'Email alerts', exact: true })
    this.emailThresholds = page.getByRole('radiogroup', { name: 'Email threshold, percent above normal', exact: true })
    this.minimumOvershoot = page.getByRole('spinbutton', { name: 'Minimum overshoot in dollars', exact: true })
    this.saveAlertSettingsButton = page.getByRole('button', { name: /^(?:Save alert settings|Saving…)$/ })
    this.subtitle = page.getByText('Manage your account preferences and privacy.', { exact: true })
    this.appearanceDescription = page.getByText('Choose how Kea Energy looks for this visit. Each new sign-in starts in light mode.', { exact: true })
    this.lightTheme = page.getByRole('button', { name: 'Light', exact: true })
    this.darkTheme = page.getByRole('button', { name: 'Dark', exact: true })
    this.alertFieldset = page.getByRole('group', { name: 'Bill-shock alert settings', exact: true })
    this.alertChannels = (['Email', 'Text message', 'A call from Sparky'] as const).map((name) => {
      const thresholds = page.getByRole('radiogroup', { name: `${name} threshold, percent above normal`, exact: true })
      // Channel containers and their explanatory copy have no accessible grouping role.
      const row = page.locator('.threshold-row').filter({ has: thresholds })
      return {
        name, row, thresholds,
        switch: row.getByRole('switch', { name: `${name} alerts`, exact: true }),
        value: row.locator('.threshold-value'),
        note: row.locator('.threshold-note'),
      }
    })
    this.quietHoursStart = page.getByRole('combobox', { name: 'Quiet hours start', exact: true })
    this.quietHoursEnd = page.getByRole('combobox', { name: 'Quiet hours end', exact: true })
    this.billReminders = page.getByRole('switch', { name: /^Bill reminders\b/ })
    this.alertError = page.getByRole('alert').filter({ hasText: 'Could not load your alert settings:' })
    this.privacyButton = page.getByRole('button', { name: /^Privacy and data\b/ })
    this.privacy = new Dialog(page, 'Privacy information')
  }

  async openPasswordSecurity(): Promise<void> {
    await this.passwordSecurity.click()
    await this.resetPassword.root.waitFor({ state: 'visible' })
  }

  async selectEmailThreshold(percent: number): Promise<void> {
    await this.selectThreshold('Email', percent)
  }

  channel(name: AlertChannelName): AlertChannel {
    return this.alertChannels.find((channel) => channel.name === name)!
  }

  async selectThreshold(name: AlertChannelName, percent: number): Promise<void> {
    const radio = this.page.getByRole('radio', { name: new RegExp(`^${percent} percent above normal(?:,|$)`) })
    // The visible percentage covers the styled input; click its associated label like a customer.
    await this.channel(name).thresholds.locator('label').filter({ has: radio }).click()
  }

  async waitForPreferences(): Promise<void> {
    await this.emailThresholds.waitFor({ state: 'visible' })
    // The reminder and alert editor load separate copies of the same server record.
    await this.billReminders.and(this.page.locator(':enabled')).waitFor({ state: 'visible' })
  }

  async reloadPreferences(): Promise<void> {
    await this.page.reload()
    await this.waitForPreferences()
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
