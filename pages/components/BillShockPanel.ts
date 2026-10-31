import type { Locator, Page } from '@playwright/test'
import { EnergyHomeChips } from './EnergyHomeChips'

export class BillShockPanel {
  readonly chip: Locator
  readonly root: Locator
  readonly heading: Locator
  readonly summary: Locator
  readonly basis: Locator
  readonly daysLeft: Locator
  readonly closedCycle: Locator
  readonly contentAfterClosedCycle: Locator
  readonly dailyUse: Locator
  readonly statusDot: Locator
  readonly viewUsage: Locator
  readonly askSparky: Locator
  private readonly chips: EnergyHomeChips

  constructor(private readonly page: Page) {
    this.chips = new EnergyHomeChips(page)
    this.chip = this.chips.warningButton
    this.root = this.chips.warningPanel
    this.heading = this.root.getByRole('heading', { level: 3 })
    // Paragraphs, the basis note and decorative status dot have no accessible names.
    this.summary = this.root.locator('.bill-shock-detail > p').first()
    this.basis = this.root.locator('.bill-shock-basis')
    this.daysLeft = this.root.locator('p').filter({ hasText: /\d+ days? left in this cycle/ })
    this.closedCycle = this.root.locator('p').filter({ hasText: /^This cycle has closed/ })
    this.contentAfterClosedCycle = this.closedCycle.locator('xpath=following-sibling::*')
    this.dailyUse = this.root.locator('p').filter({ hasText: /^Daily use is up / })
    this.statusDot = this.heading.locator('.bill-status-dot')
    this.viewUsage = this.root.getByRole('button', { name: 'View Usage', exact: true })
    this.askSparky = this.root.getByRole('button', { name: 'Ask Sparky AI', exact: true })
  }

  async goto(customerId: string, action = async (): Promise<void> => {
    await this.page.goto('/dashboard')
  }): Promise<void> {
    const paths = [`/api/households/${encodeURIComponent(customerId)}`, `/api/households/${encodeURIComponent(customerId)}/bill-shock`]
    const pending = paths.map((pathname) => this.page.waitForResponse((response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === pathname,
    ).then((response) => response.finished()))
    await Promise.all([action(), ...pending])
    await this.chip.waitFor({ state: 'visible' })
  }

  async open(): Promise<void> {
    await this.chips.openWarning()
    // The chip is also grey during loading; wait for the final panel content.
    await this.heading.filter({ hasNotText: 'Checking your usage…' }).waitFor({ state: 'visible' })
  }
}
