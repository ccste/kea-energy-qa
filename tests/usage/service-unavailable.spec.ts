import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { expectUsageChart, readUsage } from './usage-expectations'

const account = accountByAlias('july')
test.use({ account })

test.describe('Usage', () => {
  test.describe('View usage on the Usage page', () => {
    test.describe('Negative Testing', () => {
      test('Usage service unavailable', async ({ page, dashboard, sidebar, usage, usageApi }) => {
        const expected = await readUsage(usageApi, account.customerId, '2026-07-31', 'Daily')
        const path = `/api/households/${account.customerId}/usage-series`
        const matches = (url: URL) => url.pathname === path
        await page.route(matches, route => route.request().method() === 'GET'
          ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Usage service is temporarily unavailable.' }) })
          : route.fallback())
        await dashboard.goto()
        const failedResponse = page.waitForResponse(response => new URL(response.url()).pathname === path && response.status() === 500)
        await sidebar.navigateTo('Usage')
        await failedResponse
        await expect(usage.error.getByRole('heading', { name: 'Something went wrong', exact: true })).toBeVisible()
        await expect.soft(usage.error).toContainText('Usage service is temporarily unavailable.')
        await expect.soft(usage.chart).toBeHidden()
        await expect(usage.retry).toBeVisible()
        await page.unroute(matches)
        await usage.retryLoad()
        await expectUsageChart(usage, expected, '$')
      })
    })
  })
})
