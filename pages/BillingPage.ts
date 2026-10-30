import type { Download, Locator, Page } from '@playwright/test'
import { Dialog } from './components/Dialog'

const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export class BillingPage {
  readonly heading: Locator
  readonly subtitle: Locator
  readonly card: Locator
  readonly cardHeading: Locator
  readonly cardPeriod: Locator
  readonly cardStatus: Locator
  readonly cardNote: Locator
  readonly totalsRows: Locator
  readonly historyHeading: Locator
  readonly table: Locator
  readonly headerRow: Locator
  readonly rows: Locator
  readonly error: Locator
  readonly retry: Locator
  readonly empty: Locator

  constructor(private readonly page: Page, private readonly customerId: string) {
    this.heading = page.getByRole('heading', { name: 'Billing', exact: true })
    this.subtitle = page.getByText('Your account balance and available billing records.', { exact: true })
    this.card = page.getByRole('article').filter({ has: page.getByText('Amount outstanding', { exact: true }) })
    this.cardHeading = this.card.getByRole('heading', { level: 2 })
    // The invoice period, status and charge rows have no individual accessible labels.
    this.cardPeriod = this.card.locator('header p')
    this.cardStatus = this.card.locator('.status-badge')
    this.cardNote = this.card.locator('.invoice-note')
    this.totalsRows = this.card.locator('.invoice-totals > span')
    this.historyHeading = page.getByRole('heading', { name: 'Billing history', exact: true })
    this.table = page.getByRole('table')
    // The header is a row with plain spans rather than columnheader cells.
    this.headerRow = this.table.locator('.invoice-table-head')
    this.rows = this.table.locator('[role="row"]:not(.invoice-table-head)')
    const content = page.locator('.page-content')
    this.error = content.getByRole('alert')
    this.retry = this.error.getByRole('button', { name: 'Retry', exact: true })
    this.empty = content.getByRole('status').filter({ hasText: 'No billing records are available.' })
  }

  detail(label: string): Locator {
    return this.card.locator('dt').filter({ hasText: new RegExp(`^${escapePattern(label)}$`) })
      .locator('xpath=following-sibling::dd[1]')
  }

  charge(label: string): Locator {
    // The amount directly follows its text label inside the same unlabelled row.
    return this.totalsRows.filter({ hasText: new RegExp(`^${escapePattern(label)}(?=\\s*\\$|\\s*Not available)`) }).locator('strong')
  }

  row(id: string): Locator {
    return this.rows.filter({ has: this.page.locator('strong').filter({ hasText: new RegExp(`^${escapePattern(id)}$`) }) })
  }

  rowRecord(id: string): Locator {
    return this.row(id).locator(':scope > strong')
  }

  rowPeriodAndDue(id: string): Locator {
    // Data cells are plain spans; the period and due date share the first span.
    return this.row(id).locator(':scope > span').nth(0)
  }

  rowAmount(id: string): Locator {
    return this.row(id).locator(':scope > span').nth(1)
  }

  rowStatus(id: string): Locator {
    return this.row(id).locator(':scope > span').nth(2)
  }

  view(id: string): Locator {
    return this.table.getByRole('button', { name: `View ${id}`, exact: true })
  }

  download(id: string): Locator {
    return this.table.getByRole('button', { name: `Download ${id}`, exact: true })
  }

  pay(id: string): Locator {
    return this.table.getByRole('button', { name: `Pay ${id}`, exact: true })
  }

  invoiceDialog(id: string): Dialog {
    return new Dialog(this.page, id)
  }

  async openInvoice(id: string): Promise<void> {
    await this.view(id).click()
    await this.invoiceDialog(id).root.waitFor({ state: 'visible' })
  }

  async downloadFromRow(id: string): Promise<Download> {
    const downloaded = this.page.waitForEvent('download')
    await this.download(id).click()
    return downloaded
  }

  async downloadFromDialog(id: string): Promise<Download> {
    const downloaded = this.page.waitForEvent('download')
    await this.invoiceDialog(id).button('Download account document').click()
    return downloaded
  }

  async retryLoad(): Promise<void> {
    const responsePromise = this.page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/households/${encodeURIComponent(this.customerId)}/billing`,
    )
    await this.retry.click()
    await (await responsePromise).finished()
    await this.card.or(this.error).or(this.empty).waitFor({ state: 'visible' })
  }
}
