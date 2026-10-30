import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { blockApiWrites } from '../../utils/browser-requests'
import { formatDollars } from '../../utils/format'
import { latestInvoice, totalOutstanding } from './billing-expectations'

test.use({ account: accountByAlias('ana') })

test.describe('Billing', () => {
  test.describe('View an invoice', () => {
    for (const method of ['Close button', 'Escape', 'Outside click'] as const) {
      test(`View opens the invoice details — ${method}`, async ({ account, api, dashboard, sidebar, billing }) => {
        const expected = await api.billing(account.customerId)
        const invoice = latestInvoice(expected, account.customerId)
        expect(invoice.id).toBe('DEMO-INV-232001')
        await dashboard.goto()
        await sidebar.navigateTo('Billing')
        await billing.openInvoice(invoice.id)
        const dialog = billing.invoiceDialog(invoice.id)
        await expect(dialog.root.getByRole('heading', { name: invoice.id, exact: true })).toBeVisible()
        await expect.soft(dialog.root.getByRole('heading', { name: formatDollars(invoice.amount), exact: true })).toBeVisible()
        await expect.soft(dialog.root.getByText(invoice.period!, { exact: true })).toBeVisible()
        await expect.soft(dialog.root.getByText(`Due: ${invoice.due}`, { exact: true })).toBeVisible()
        await expect.soft(dialog.root.getByText(`Status: ${invoice.status}`, { exact: true })).toBeVisible()
        await expect.soft(dialog.root.getByText(`For bank transfer, use the verified bank details on your retailer’s issued invoice, with ${invoice.id} as your reference. Contact Customer Care if details are missing.`, { exact: true })).toBeVisible()
        await expect(dialog.button('Download account document')).toBeEnabled()
        if (method === 'Close button') await dialog.button('Close').click()
        else if (method === 'Escape') await dialog.pressEscape()
        else await dialog.clickOutside()
        await expect(dialog.root).toBeHidden()
        await expect(billing.row(invoice.id)).toBeVisible()
      })
    }
  })

  test.describe('Pay an invoice', () => {
    test('Pay a due invoice', async ({ account, api, page, dashboard, sidebar, billing, toasts }) => {
      const writes = await blockApiWrites(page)
      try {
        const before = await api.billing(account.customerId)
        const invoice = latestInvoice(before, account.customerId)
        expect(invoice.id).toBe('DEMO-INV-232001')
        expect(invoice.status).toBe('Due')
        const outstanding = totalOutstanding(before)
        await dashboard.goto()
        await sidebar.navigateTo('Billing')
        await expect(billing.detail('Amount outstanding')).toHaveText(outstanding)
        await billing.pay(invoice.id).click()
        await expect(toasts.message('Payments require retailer payment-provider setup. No payment was taken.')).toBeVisible()
        await expect.soft(billing.rowStatus(invoice.id)).toHaveText('Due')
        await expect.soft(billing.detail('Amount outstanding')).toHaveText(outstanding)
        await page.reload()
        await expect(billing.rowStatus(invoice.id)).toHaveText('Due')
        await expect(billing.detail('Amount outstanding')).toHaveText(outstanding)
        expect(await api.billing(account.customerId), 'The prototype payment leaves the real account records unchanged').toEqual(before)
      } finally {
        expect(writes, 'The payment prototype must not attempt a write to the shared environment').toEqual([])
      }
    })
  })
})
