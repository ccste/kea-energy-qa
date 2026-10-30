import type { Download, TestInfo } from '@playwright/test'
import type { BillingInvoice, HouseholdBilling } from '../../api/types'
import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { formatDollars } from '../../utils/format'
import { readDownloadedPdf } from '../../utils/pdf'
import type { ToastStack } from '../../pages/components/ToastStack'
import { expectHistoryRow, latestInvoice } from './billing-expectations'

async function expectInvoiceDownload(
  download: Download, toasts: ToastStack, expected: HouseholdBilling, invoice: BillingInvoice, testInfo: TestInfo,
): Promise<void> {
  try {
    expect(download.suggestedFilename()).toBe(`kea-invoice-${invoice.id}.pdf`)
    await expect(toasts.message('Account document downloaded')).toBeVisible()
    const pages = await readDownloadedPdf(download)
    await testInfo.attach('Downloaded invoice text and positions', {
      body: JSON.stringify({ filename: download.suggestedFilename(), invoice, pages }, null, 2),
      contentType: 'application/json',
    })
    expect(pages, 'The invoice is a readable single-page document').toHaveLength(1)
    const pdf = pages[0]
    const text = pdf.runs.map(run => run.text).join(' ').replace(/\s+/g, ' ')
    const fields = [
      'KEA ENERGY INVOICE',
      `Plan: ${expected.current_plan}`,
      `Customer: ${expected.customer.name}`,
      `Customer ID: ${expected.customer.id}`,
      `Address: ${expected.customer.address}`,
      `Invoice: ${invoice.id}`,
      `Billing period: ${invoice.period!.replace(/–/g, '-')}`,
      `Due date: ${invoice.due}`,
      `Status: ${invoice.status}`,
      `Total: ${formatDollars(invoice.amount)}`,
    ]
    for (const field of fields) expect.soft(text, `Downloaded PDF contains ${field}`).toContain(field)
    for (const line of invoice.charge_lines) {
      expect.soft(pdf.lines, `The PDF associates ${line.label} with its own amount`)
        .toContain(`${line.label} ${formatDollars(line.amount)}`)
    }

    // Associate the headline with the amount directly below it in the top-right region.
    // A matching balance elsewhere in the document cannot satisfy this check.
    const labels = pdf.runs.filter(run => /^AMOUNT(?:(?:DUE|PAID))?$/.test(run.text.replace(/\s/g, ''))
      && run.x > pdf.width / 2 && run.y > pdf.height * 0.75)
    expect(labels, 'The PDF has one payment-status headline').toHaveLength(1)
    const label = labels[0]
    const paid = invoice.status === 'Paid'
    // Letter spacing can split a label into several text runs; reunite only its own baseline.
    const headlineLabel = pdf.runs.filter(run => run.x >= label.x && Math.abs(run.y - label.y) < 2)
      .sort((a, b) => a.x - b.x).map(run => run.text).join('').replace(/\s/g, '')
    expect.soft(headlineLabel).toBe(paid ? 'AMOUNTPAID' : 'AMOUNTDUE')
    expect(label.x, 'The payment-status label is on the right').toBeGreaterThan(pdf.width / 2)
    expect(label.y, 'The payment-status label is in the header').toBeGreaterThan(pdf.height * 0.75)
    const headlineAmounts = pdf.runs.filter(run => /^\$\d+\.\d{2}$/.test(run.text)
      && run.x > pdf.width / 2 && run.y < label.y && run.y > pdf.height * 0.75)
    expect(headlineAmounts, 'Exactly one amount belongs to the payment-status headline').toHaveLength(1)
    expect(headlineAmounts[0].text, paid ? 'AMOUNT PAID equals the invoice total' : 'AMOUNT DUE equals the unpaid balance')
      .toBe(formatDollars(paid ? invoice.amount : invoice.amount_due))
  } finally {
    // Also clean up when an earlier filename or toast assertion fails.
    await download.delete()
  }
}

test.describe('Billing', () => {
  test.describe('Download an invoice', () => {
    test.describe(() => {
      test.use({ account: accountByAlias('ana') })
      for (const entry of ['history row', 'View dialog'] as const) {
        test(`Download from the ${entry}`, async ({ account, api, dashboard, sidebar, billing, toasts }, testInfo) => {
          const expected = await api.billing(account.customerId)
          const invoice = latestInvoice(expected, account.customerId)
          expect(invoice.id).toBe('DEMO-INV-232001')
          await dashboard.goto()
          await sidebar.navigateTo('Billing')
          await expectHistoryRow(billing, invoice)
          if (entry === 'View dialog') await billing.openInvoice(invoice.id)
          const download = entry === 'history row'
            ? await billing.downloadFromRow(invoice.id)
            : await billing.downloadFromDialog(invoice.id)
          await expectInvoiceDownload(download, toasts, expected, invoice, testInfo)
        })
      }
    })

    test.describe(() => {
      test.use({ account: accountByAlias('generated') })
      test('Partially paid invoice', async ({ account, api, dashboard, sidebar, billing, toasts }, testInfo) => {
        testInfo.annotations.push({ type: 'defect', description: '#10 A partially paid PDF must show the remaining balance under AMOUNT DUE and retain the full invoice Total.' })
        const expected = await api.billing(account.customerId)
        const invoice = expected.invoices.find(candidate => candidate.id === 'INV231931124')
        expect(invoice, 'The documented partially paid invoice exists').toBeDefined()
        expect(invoice!.amount).toBe(386.84)
        expect(invoice!.amount_due).toBe(231.37)
        expect(invoice!.status).toBe('Due')
        await dashboard.goto()
        await sidebar.navigateTo('Billing')
        await expectHistoryRow(billing, invoice!)
        await expectInvoiceDownload(await billing.downloadFromRow(invoice!.id), toasts, expected, invoice!, testInfo)
      })

      test('Paid invoice', async ({ account, api, dashboard, sidebar, billing, toasts }, testInfo) => {
        const expected = await api.billing(account.customerId)
        const invoice = expected.invoices.find(candidate => candidate.id === 'INV568320337')
        expect(invoice, 'The documented paid invoice exists').toBeDefined()
        expect(invoice!.status).toBe('Paid')
        expect(invoice!.amount).toBe(166.44)
        expect(invoice!.amount_due).toBe(0)
        expect(invoice!.period).toBe('2026-03-02 – 2026-04-01')
        expect(invoice!.due).toBe('2026-04-23')
        expect(invoice!.charge_lines.map(({ label, amount }) => ({ label, amount }))).toEqual([
          { label: 'Charges excluding GST', amount: 144.73 }, { label: 'GST', amount: 21.71 },
        ])
        await dashboard.goto()
        await sidebar.navigateTo('Billing')
        await expectHistoryRow(billing, invoice!)
        await expectInvoiceDownload(await billing.downloadFromRow(invoice!.id), toasts, expected, invoice!, testInfo)
      })
    })
  })
})
