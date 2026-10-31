import type { Locator, Page } from '@playwright/test'
import { EnergyHomeChips } from './components/EnergyHomeChips'
import { BillShockPanel } from './components/BillShockPanel'

export class DashboardPage {
  readonly heading: Locator
  readonly greeting: Locator
  readonly energyHome: EnergyHomeChips
  readonly billShock: BillShockPanel
  readonly usageSummary: Locator
  readonly usageSoFar: Locator
  readonly latestDayCost: Locator
  readonly costSoFar: Locator
  readonly projectedThisCycle: Locator
  readonly usageTiles: Locator

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Dashboard', exact: true })
    this.greeting = page.getByText(/^Welcome, /)
    this.energyHome = new EnergyHomeChips(page)
    this.billShock = new BillShockPanel(page)
    this.usageSummary = this.energyHome.summaryPanel
    this.usageTiles = this.usageSummary.getByRole('article')
    this.usageSoFar = this.summaryValue(/^Usage so far/)
    this.latestDayCost = this.summaryValue(/^Latest day/)
    this.costSoFar = this.summaryValue(/^Cost so far/)
    this.projectedThisCycle = this.summaryValue(/^Projected this cycle/)
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard')
    await this.heading.waitFor({ state: 'visible' })
  }

  async openUsageSummary(): Promise<void> {
    await this.energyHome.openSummary()
  }

  private summaryValue(label: RegExp): Locator {
    // Each tile has visible text and a strong value, without an accessible label.
    return this.usageSummary.locator('article').filter({ hasText: label }).locator('strong')
  }
}
