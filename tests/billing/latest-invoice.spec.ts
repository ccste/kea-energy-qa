import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { BILLING_ACCOUNTS, JULIA_INVOICE } from '../../data/billing-cases'
import { formatDollars } from '../../utils/format'
import { expectHistoryRow, latestInvoice, moneyCents, totalOutstanding } from './billing-expectations'

test.describe('Billing', () => {
  test.describe('View the latest invoice', () => {
    test.describe('Positive Testing', () => {
      for (const selectedAccount of BILLING_ACCOUNTS) {
        test.describe(() => {
          test.use({ account: selectedAccount })

          test(`Invoice card matches the API — ${selectedAccount.displayName}`, {
            tag: selectedAccount.alias === 'ana' ? '@smoke' : [],
          }, async ({ account, api, page, dashboard, sidebar, billing, topBar }, testInfo) => {
            if (['rangi', 'mereana', 'generated'].includes(account.alias)) {
              testInfo.annotations.push({ type: 'defect', description: '#11 Amount outstanding must include balances from older invoices.' })
            }
            const expected = await api.billing(account.customerId)
            const invoice = latestInvoice(expected, account.customerId)
            const outstanding = totalOutstanding(expected)
            await dashboard.goto()
            await sidebar.navigateTo('Billing')
            await expect(page).toHaveURL(/\/billing$/)
            await expect(billing.heading).toBeVisible()
            await expect(billing.subtitle).toHaveText('Your account balance and available billing records.')
            await expect(billing.card).toBeVisible()
            await expect.soft(billing.cardHeading).toHaveText(expected.current_plan!)
            await expect.soft(billing.cardPeriod).toHaveText(invoice.period!)
            await expect.soft(billing.cardStatus).toHaveText(invoice.status)
            await expect.soft(billing.detail('Due date')).toHaveText(invoice.due ?? 'Not on file')
            await expect.soft(billing.detail('Record')).toHaveText(invoice.id)
            await expect.soft(billing.detail('Customer')).toHaveText(expected.customer.name!)
            await expect.soft(billing.detail('Account')).toHaveText(account.customerId)
            await expect.soft(billing.detail('Address')).toHaveText(expected.customer.address!)
            await topBar.openProfileMenu()
            await expect.soft(topBar.profileCustomerId).toHaveText(`CID: ${account.customerId}`)
            await topBar.profileButton.click()
            await expect.soft(billing.totalsRows).toHaveCount(invoice.charge_lines.length + 1)
            for (const line of invoice.charge_lines) {
              await expect.soft(billing.charge(line.label)).toHaveText(formatDollars(line.amount))
            }
            await expect.soft(billing.charge('Total')).toHaveText(formatDollars(invoice.amount))
            await expect.soft(billing.cardNote).toHaveText('Estimates are separate from issued invoices. Payment status is shown only when account records confirm it.')
            await expect.soft(billing.rows.first()).toContainText(invoice.id)
            await expectHistoryRow(billing, invoice)
            await testInfo.attach('Invoice card and account balance', {
              body: JSON.stringify({ expected, expectedOutstanding: outstanding, actualOutstanding: await billing.detail('Amount outstanding').innerText() }, null, 2),
              contentType: 'application/json',
            })
            await expect(billing.detail('Amount outstanding'), 'The account balance includes every invoice\'s remaining amount')
              .toHaveText(outstanding)
          })

          test(`Charges excluding GST + GST = Total — ${selectedAccount.displayName}`, async ({ dashboard, sidebar, billing }, testInfo) => {
            await dashboard.goto()
            await sidebar.navigateTo('Billing')
            await expect(billing.card).toBeVisible()
            const charges = (await billing.charge('Charges excluding GST').innerText()).trim()
            const gst = (await billing.charge('GST').innerText()).trim()
            const total = (await billing.charge('Total').innerText()).trim()
            await testInfo.attach('Displayed invoice arithmetic', {
              body: JSON.stringify({ charges, gst, total }), contentType: 'application/json',
            })
            expect(moneyCents(charges) + moneyCents(gst), 'Displayed charges plus displayed GST equal the displayed Total to the cent')
              .toBe(moneyCents(total))
          })
        })
      }
    })

    test.describe('Data scenarios', () => {
      test.describe(() => {
        test.use({ account: accountByAlias('july') })
        test('Account with no invoices', async ({ api, account, dashboard, sidebar, billing }) => {
          expect((await api.billing(account.customerId)).invoices).toEqual([])
          await dashboard.goto()
          await sidebar.navigateTo('Billing')
          await expect(billing.empty.getByRole('heading', { name: 'Nothing here yet', exact: true })).toBeVisible()
          await expect(billing.empty).toContainText('No billing records are available.')
          await expect(billing.card).toBeHidden()
          await expect(billing.historyHeading).toBeVisible()
          await expect(billing.headerRow).toHaveText('Record Period / due date Amount Status Actions', { useInnerText: true })
          await expect(billing.table.getByRole('row')).toHaveCount(1)
          await expect(billing.rows).toHaveCount(0)
        })
      })

      test.describe(() => {
        test.use({ account: accountByAlias('julia') })
        test("Julia Fox's August 2024 invoice is shown", async ({ dashboard, sidebar, billing }, testInfo) => {
          testInfo.annotations.push({ type: 'defect', description: '#9 Julia\'s documented August invoice must be visible even when the API omits it.' })
          await dashboard.goto()
          await sidebar.navigateTo('Billing')
          await expect(billing.historyHeading).toBeVisible()
          await testInfo.attach('Documented Julia invoice and visible billing history', {
            body: JSON.stringify({ expected: JULIA_INVOICE, actualHistory: await billing.table.innerText(), emptyMessage: await billing.empty.allTextContents() }, null, 2),
            contentType: 'application/json',
          })
          await expect(billing.card, 'The independently documented August invoice is present').toBeVisible()
          await expect.soft(billing.detail('Record')).toHaveText(JULIA_INVOICE.id)
          await expect.soft(billing.cardPeriod).toHaveText(JULIA_INVOICE.period)
          await expect.soft(billing.charge('Total')).toHaveText(JULIA_INVOICE.total)
          await expect.soft(billing.detail('Customer')).toHaveText(JULIA_INVOICE.customer)
          await expect.soft(billing.detail('Address')).toHaveText(JULIA_INVOICE.address)
          await expect(billing.row(JULIA_INVOICE.id)).toBeVisible()
        })
      })

      for (const alias of ['rangi', 'generated'] as const) {
        const selectedAccount = accountByAlias(alias)
        test.describe(() => {
          test.use({ account: selectedAccount })
          test(`Several unpaid invoices: Amount outstanding — ${selectedAccount.displayName}`, async ({ account, api, dashboard, sidebar, billing }, testInfo) => {
            testInfo.annotations.push({ type: 'defect', description: '#11 Amount outstanding must sum all unpaid balances, including partially paid invoices.' })
            const expected = await api.billing(account.customerId)
            latestInvoice(expected, account.customerId)
            const outstanding = totalOutstanding(expected)
            const unpaid = expected.invoices.filter(invoice => invoice.amount_due! > 0)
            expect(unpaid.length, 'The scenario has several invoices with money owed').toBeGreaterThan(1)
            await dashboard.goto()
            await sidebar.navigateTo('Billing')
            await expect(billing.rows).toHaveCount(expected.invoices.length)
            for (const invoice of unpaid) await expect.soft(billing.rowStatus(invoice.id)).toHaveText('Due')
            await testInfo.attach('All unpaid invoice balances', {
              body: JSON.stringify({ invoices: unpaid.map(({ id, amount, amount_due }) => ({ id, amount, amount_due })), expectedOutstanding: outstanding, actualOutstanding: await billing.detail('Amount outstanding').innerText() }, null, 2),
              contentType: 'application/json',
            })
            await expect(billing.detail('Amount outstanding')).toHaveText(outstanding)
          })
        })
      }
    })

    test.describe('Negative Testing', () => {
      test.use({ account: accountByAlias('ana') })
      test('Billing service unavailable', async ({ account, api, page, dashboard, sidebar, billing }) => {
        const expected = await api.billing(account.customerId)
        const invoice = latestInvoice(expected, account.customerId)
        const path = `/api/households/${account.customerId}/billing`
        const matches = (url: URL) => url.pathname === path
        await page.route(matches, route => route.request().method() === 'GET'
          ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Billing service is temporarily unavailable.' }) })
          : route.fallback())
        await dashboard.goto()
        const failedResponse = page.waitForResponse(response => new URL(response.url()).pathname === path && response.status() === 500)
        await sidebar.navigateTo('Billing')
        await failedResponse
        await expect(billing.error.getByRole('heading', { name: 'Something went wrong', exact: true })).toBeVisible()
        await expect.soft(billing.error).toContainText('Billing service is temporarily unavailable.')
        await expect.soft(billing.card).toBeHidden()
        await expect.soft(billing.table).toBeHidden()
        await expect(billing.retry).toBeVisible()
        await page.unroute(matches)
        await billing.retryLoad()
        await expect(billing.error).toBeHidden()
        await expect(billing.detail('Record')).toHaveText(invoice.id)
        await expect(billing.rows).toHaveCount(expected.invoices.length)
        await expectHistoryRow(billing, invoice)
      })
    })
  })
})
