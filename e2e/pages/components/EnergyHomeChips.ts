import type { Locator, Page } from '@playwright/test'

export class EnergyHomeChips {
  readonly root: Locator
  readonly summaryButton: Locator
  readonly summaryPanel: Locator
  readonly warningButton: Locator
  readonly warningPanel: Locator

  constructor(page: Page) {
    this.root = page.getByRole('region', {
      name: 'Interactive home energy and weather visualisation',
      exact: true,
    })
    this.summaryButton = this.root.getByRole('button', { name: /^Usage & Costs/ })
    this.warningButton = this.root.getByRole('button', { name: /^Power Bill Shock Warning/ })
    // The popovers have no role; their triggers identify them with aria-controls.
    this.summaryPanel = this.root.locator('#energy-home-summary-detail')
    this.warningPanel = this.root.locator('#energy-home-alert-detail')
  }

  async openSummary(): Promise<void> {
    if ((await this.summaryButton.getAttribute('aria-expanded')) !== 'true') {
      await this.summaryButton.click()
    }
    await this.summaryPanel.waitFor({ state: 'visible' })
  }

  async closeSummary(): Promise<void> {
    if ((await this.summaryButton.getAttribute('aria-expanded')) === 'true') {
      await this.summaryButton.click()
    }
    await this.summaryPanel.waitFor({ state: 'hidden' })
  }

  async openWarning(): Promise<void> {
    if ((await this.warningButton.getAttribute('aria-expanded')) !== 'true') {
      await this.warningButton.click()
    }
    await this.warningPanel.waitFor({ state: 'visible' })
  }
}
