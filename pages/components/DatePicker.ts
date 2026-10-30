import type { Locator, Page } from '@playwright/test'

export class DatePicker {
  readonly field: Locator
  readonly toggle: Locator
  readonly dialog: Locator

  constructor(page: Page, label = 'Date') {
    this.field = page.getByLabel(label, { exact: true })
    this.toggle = page.getByRole('button', { name: `Choose ${label.toLowerCase()} from a calendar`, exact: true })
    this.dialog = page.getByRole('dialog', { name: `Choose ${label.toLowerCase()}`, exact: true })
  }

  async open(): Promise<void> {
    if (await this.toggle.getAttribute('aria-expanded') !== 'true') await this.toggle.click()
  }

  async clear(): Promise<void> {
    await this.open()
    await this.dialog.getByRole('button', { name: 'Clear', exact: true }).click()
  }

  async today(): Promise<void> {
    await this.open()
    await this.dialog.getByRole('button', { name: 'Today', exact: true }).click()
  }
}
