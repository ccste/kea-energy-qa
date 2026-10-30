import type { Locator, Page } from '@playwright/test'
import { Dialog } from './components/Dialog'

const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export class PlansPage {
  readonly heading: Locator
  readonly subtitle: Locator
  readonly pricingStep: Locator
  readonly pricingGroup: Locator
  readonly styleCards: Locator
  readonly termStep: Locator
  readonly termHeading: Locator
  readonly termCards: Locator
  readonly summary: Locator
  readonly summaryHeading: Locator
  readonly summaryStyle: Locator
  readonly summaryTerm: Locator
  readonly requestButton: Locator
  readonly error: Locator
  readonly retry: Locator
  readonly compareDialog: Dialog
  readonly termsDialog: Dialog

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Plans', exact: true })
    this.subtitle = page.getByText(
      'Build your plan in two steps — three pricing styles and three terms make nine combinations.',
      { exact: true },
    )
    this.pricingStep = page.getByRole('region', { name: 'Choose how you pay for power', exact: true })
    this.pricingGroup = this.pricingStep.getByRole('radiogroup', { name: 'Pricing style', exact: true })
    this.styleCards = this.pricingGroup.getByRole('article')
    this.termStep = page.getByRole('region', { name: 'Choose your commitment', exact: true })
    this.termHeading = this.termStep.getByRole('heading', { name: 'Choose your commitment', exact: true })
    // Term labels and the live summary have no individual accessible names.
    this.termCards = this.termStep.locator('label.term-card')
    this.summary = page.locator('section.plan-summary[aria-live="polite"]')
    this.summaryHeading = this.summary.locator('.plan-summary-main > span')
    this.summaryStyle = this.summary.locator('.plan-summary-main > strong')
    this.summaryTerm = this.summary.locator('.plan-summary-main > small')
    this.requestButton = this.summary.getByRole('button', {
      name: /^(?:Request this plan|Sending request…|You're on this plan)$/,
    })
    this.error = page.locator('.page-content').getByRole('alert')
    this.retry = this.error.getByRole('button', { name: 'Retry', exact: true })
    this.compareDialog = new Dialog(page, 'Compare all rates')
    this.termsDialog = new Dialog(page, 'Terms & Conditions')
  }

  styleCard(name: string): Locator {
    return this.styleCards.filter({ has: this.page.getByRole('heading', { name, exact: true }) })
  }

  styleChoice(name: string): Locator {
    // A selected choice is named only "Selected", so identify its containing style first.
    return this.styleCard(name).getByRole('radio')
  }

  termCard(name: string): Locator {
    return this.termCards.filter({ has: this.page.getByText(name, { exact: true }) })
  }

  termChoice(name: string): Locator {
    return this.termCard(name).getByRole('radio')
  }

  summaryValue(label: string): Locator {
    return this.summary.locator('dt').filter({ hasText: new RegExp(`^${escapePattern(label)}$`) })
      .locator('xpath=following-sibling::dd[1]')
  }

  async chooseStyle(name: string): Promise<void> {
    await this.styleChoice(name).click()
  }

  async chooseTerm(name: string): Promise<void> {
    await this.termChoice(name).check()
  }

  async openComparison(): Promise<void> {
    await this.summary.getByRole('button', { name: 'Compare all rates', exact: true }).click()
    await this.compareDialog.root.waitFor({ state: 'visible' })
  }

  async openTerms(): Promise<void> {
    await this.summary.getByRole('button', { name: 'Terms & Conditions', exact: true }).click()
    await this.termsDialog.root.waitFor({ state: 'visible' })
  }
}
