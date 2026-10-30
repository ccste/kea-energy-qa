import type { BillingInvoice, HouseholdBilling } from '../../api/types'
import type { BillingPage } from '../../pages/BillingPage'
import { formatDollars } from '../../utils/format'
import { expect } from '../../fixtures/test'

export function moneyCents(text: string): number {
  expect(text, 'Money is displayed as dollars with exactly two decimal places').toMatch(/^\$-?\d+\.\d{2}$/)
  return Math.round(Number(text.slice(1)) * 100)
}

export function totalOutstanding(billing: HouseholdBilling): string {
  const cents = billing.invoices.reduce((sum, invoice) => {
    expect(typeof invoice.amount_due, `${invoice.id} has a numeric remaining balance`).toBe('number')
    expect(Number.isFinite(invoice.amount_due), `${invoice.id} has a finite remaining balance`).toBe(true)
    return sum + Math.round(invoice.amount_due! * 100)
  }, 0)
  return formatDollars(cents / 100)
}

export function latestInvoice(billing: HouseholdBilling, customerId: string): BillingInvoice {
  expect(billing.customer.id, 'The oracle belongs to the selected account').toBe(customerId)
  expect(billing.invoices.length, 'This design row requires at least one issued invoice').toBeGreaterThan(0)
  return billing.invoices[0]
}

export async function expectHistoryRow(page: BillingPage, invoice: BillingInvoice): Promise<void> {
  await expect.soft(page.rowRecord(invoice.id)).toHaveText(invoice.id)
  await expect.soft(page.rowPeriodAndDue(invoice.id)).toHaveText(`${invoice.period ?? ''} ${invoice.due ?? 'Due date not on file'}`, { useInnerText: true })
  const displayedLines = (await page.rowPeriodAndDue(invoice.id).innerText()).split('\n').map(line => line.trim())
  expect.soft(displayedLines, 'The period is on the first line and the due date on the second')
    .toEqual([invoice.period ?? '', invoice.due ?? 'Due date not on file'])
  await expect.soft(page.rowAmount(invoice.id)).toHaveText(formatDollars(invoice.amount))
  await expect.soft(page.rowStatus(invoice.id)).toHaveText(invoice.status)
}
