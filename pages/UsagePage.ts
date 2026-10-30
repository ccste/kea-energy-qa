import type { Locator, Page, Response } from '@playwright/test'
import { DatePicker } from './components/DatePicker'
import { rangeDates, type UsageRange } from '../utils/dates'

export type UsageUnit = '$' | 'kWh'

export class UsagePage {
  readonly heading: Locator
  readonly subtitle: Locator
  readonly card: Locator
  readonly datePicker: DatePicker
  readonly date: Locator
  readonly chart: Locator
  readonly points: Locator
  readonly tooltip: Locator
  readonly xAxisLabels: Locator
  readonly yAxisLabels: Locator
  readonly selectedPeriod: Locator
  readonly selectedValue: Locator
  readonly selectedDetail: Locator
  readonly sourceNote: Locator
  readonly error: Locator
  readonly empty: Locator
  readonly loading: Locator
  readonly retry: Locator

  constructor(private readonly page: Page, private readonly customerId: string) {
    this.heading = page.getByRole('heading', { name: 'Usage', exact: true })
    this.subtitle = page.getByText('Explore your dated electricity readings.', { exact: true })
    // This section has no accessible name; exclude the separate appliance breakdown card.
    this.card = page.locator('section.usage-card')
    this.datePicker = new DatePicker(page)
    this.date = this.datePicker.field
    this.chart = this.card.getByRole('img', { name: /^(Daily|Weekly|Monthly) electricity usage$/ })
    this.points = this.chart.getByRole('button')
    this.tooltip = this.chart.locator('.chart-tooltip text')
    // Axis text has no individual role or accessible label.
    this.xAxisLabels = this.chart.locator('.x-axis-label')
    this.yAxisLabels = this.chart.locator('.y-axis-label')
    this.selectedPeriod = this.card.getByRole('article').filter({ hasText: 'Selected period' })
    this.selectedValue = this.selectedPeriod.locator('strong')
    this.selectedDetail = this.selectedPeriod.locator('small')
    this.sourceNote = this.card.locator(':scope > p')
    this.error = this.card.getByRole('alert')
    this.empty = this.card.getByRole('status').filter({ has: page.getByRole('heading', { name: 'Choose a date', exact: true }) })
    this.loading = this.card.getByRole('status').filter({ has: page.getByRole('heading', { name: 'Loading usage', exact: true }) })
    this.retry = this.error.getByRole('button', { name: 'Retry', exact: true })
  }

  metric(unit: UsageUnit): Locator {
    return this.card.getByRole('group', { name: 'Graph metric', exact: true }).getByRole('button', { name: unit, exact: true })
  }

  range(range: UsageRange): Locator {
    return this.card.getByRole('group', { name: 'Usage time range', exact: true }).getByRole('button', { name: range, exact: true })
  }

  async waitUntilReady(): Promise<void> {
    await this.chart.or(this.error).or(this.empty).waitFor({ state: 'visible' })
    await this.loading.waitFor({ state: 'hidden' })
  }

  async chooseUnit(unit: UsageUnit): Promise<void> {
    await this.metric(unit).click()
  }

  async chooseRange(range: UsageRange): Promise<void> {
    if (await this.range(range).getAttribute('aria-pressed') === 'true') return
    const date = await this.date.inputValue()
    if (date) await this.changeAndRead(date, range, () => this.range(range).click())
    else await this.range(range).click()
  }

  async setDate(day: string): Promise<Response | undefined> {
    if (await this.date.inputValue() === day) return
    return this.changeAndRead(day, await this.currentRange(), () => this.date.fill(day))
  }

  async clearDate(): Promise<void> {
    await this.datePicker.clear()
    await this.empty.waitFor({ state: 'visible' })
  }

  async chooseToday(): Promise<Response> {
    // Read the browser's calendar date in its configured New Zealand timezone.
    const today = await this.page.evaluate(() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    })
    return this.changeAndRead(today, await this.currentRange(), () => this.datePicker.today())
  }

  async retryLoad(): Promise<void> {
    await this.changeAndRead(await this.date.inputValue(), await this.currentRange(), () => this.retry.click())
  }

  private async currentRange(): Promise<UsageRange> {
    for (const range of ['Daily', 'Weekly', 'Monthly'] as const) {
      if (await this.range(range).getAttribute('aria-pressed') === 'true') return range
    }
    throw new Error('Usage has no selected time range.')
  }

  private async changeAndRead(day: string, range: UsageRange, action: () => Promise<void>): Promise<Response> {
    const dates = rangeDates(day, range)
    const responsePromise = this.page.waitForResponse((response) => {
      const url = new URL(response.url())
      return response.request().method() === 'GET' &&
        url.pathname === `/api/households/${this.customerId}/usage-series` &&
        url.searchParams.get('start') === dates.start && url.searchParams.get('end') === dates.end
    })
    await action()
    const response = await responsePromise
    await response.finished()
    await this.waitUntilReady()
    return response
  }
}
