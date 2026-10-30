import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { BILLING_ACCOUNTS } from '../../data/billing-cases'
import { expectHistoryRow, latestInvoice } from './billing-expectations'

test.describe('Billing', () => {
  test.describe('Billing history', () => {
    test.describe('Positive Testing', () => {
      for (const selectedAccount of BILLING_ACCOUNTS) {
        test.describe(() => {
          test.use({ account: selectedAccount })
          test(`Rows match the API — ${selectedAccount.displayName}`, async ({ account, api, dashboard, sidebar, billing }, testInfo) => {
            const expected = await api.billing(account.customerId)
            latestInvoice(expected, account.customerId)
            await dashboard.goto()
            await sidebar.navigateTo('Billing')
            await expect(billing.historyHeading).toBeVisible()
            await expect(billing.rows).toHaveCount(expected.invoices.length)
            const starts: string[] = []
            for (const [index, invoice] of expected.invoices.entries()) {
              await test.step(`History row ${index + 1}: ${invoice.id}`, async () => {
                await expect(billing.rows.nth(index)).toContainText(invoice.id)
                await expectHistoryRow(billing, invoice)
                const displayed = await billing.rowPeriodAndDue(invoice.id).innerText()
                const start = displayed.match(/^(\d{4}-\d{2}-\d{2})\s+[–-]\s+\d{4}-\d{2}-\d{2}/)?.[1]
                expect(start, 'The visible period begins with a complete ISO date').toBeDefined()
                starts.push(start!)
              })
            }
            await testInfo.attach('Visible invoice ordering', { body: JSON.stringify({ account: account.customerId, periodStarts: starts }), contentType: 'application/json' })
            // ISO dates sort chronologically. These values come from the screen, not API ordering.
            for (let index = 1; index < starts.length; index++) {
              expect.soft(starts[index - 1] > starts[index], 'Visible history periods are strictly newest first').toBe(true)
            }
          })
        })
      }

      test.describe(() => {
        test.use({ account: accountByAlias('generated') })
        test('Actions offered per status', async ({ account, api, dashboard, sidebar, billing }) => {
          const expected = await api.billing(account.customerId)
          expect(expected.invoices.some(invoice => invoice.status === 'Paid')).toBe(true)
          expect(expected.invoices.some(invoice => invoice.status === 'Due')).toBe(true)
          await dashboard.goto()
          await sidebar.navigateTo('Billing')
          await expect(billing.rows).toHaveCount(expected.invoices.length)
          for (const invoice of expected.invoices) {
            await test.step(`${invoice.id}: ${invoice.status}`, async () => {
              await expect.soft(billing.rowStatus(invoice.id)).toHaveText(invoice.status)
              await expect.soft(billing.view(invoice.id)).toBeVisible()
              await expect.soft(billing.download(invoice.id)).toBeVisible()
              if (invoice.status === 'Due') await expect.soft(billing.pay(invoice.id)).toBeVisible()
              else await expect.soft(billing.pay(invoice.id)).toHaveCount(0)
            })
          }
        })
      })
    })
  })
})
