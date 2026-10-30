import { ACCOUNTS } from '../../data/accounts'
import { USAGE_DEFAULT_DATES } from '../../data/usage-cases'
import { expect, test } from '../../fixtures/test'

test.describe('Usage', () => {
  test.describe('View usage on the Usage page', () => {
    test.describe('Figures match the API (all 15 accounts)', () => {
      for (const selectedAccount of ACCOUNTS) {
        test.describe(() => {
          test.use({ account: selectedAccount })

          test(`Same latest-day cost as the Dashboard — ${selectedAccount.displayName}`, async ({
            account, page, dashboard, sidebar, usage,
          }, testInfo) => {
            await dashboard.goto()
            await dashboard.openUsageSummary()
            await expect(dashboard.latestDayCost).toHaveText(/^\d+\.\d{2} NZD$/)
            const dashboardText = (await dashboard.latestDayCost.innerText()).trim()
            const dashboardCost = Number(dashboardText.replace(/ NZD$/, ''))
            expect(Number.isFinite(dashboardCost), 'The Dashboard shows a numeric latest-day cost').toBe(true)

            await sidebar.navigateTo('Usage')
            await expect(page).toHaveURL(/\/usage$/)
            await expect(usage.heading).toBeVisible()
            await usage.waitUntilReady()
            await expect(usage.date).toHaveValue(USAGE_DEFAULT_DATES[selectedAccount.alias])
            await expect(usage.range('Daily')).toHaveAttribute('aria-pressed', 'true')
            await expect(usage.metric('$')).toHaveAttribute('aria-pressed', 'true')
            await expect(usage.selectedValue).toHaveText(/^\$\d+\.\d{2}$/)
            const usageText = (await usage.selectedValue.innerText()).trim()
            const usageCost = Number(usageText.slice(1))
            expect(Number.isFinite(usageCost), 'Usage shows a numeric selected-period cost').toBe(true)

            await testInfo.attach('Latest-day cost comparison', {
              body: JSON.stringify({
                customerId: account.customerId,
                dashboard: { displayedValue: dashboardText, costNzd: dashboardCost },
                usage: {
                  date: await usage.date.inputValue(),
                  displayedValue: usageText,
                  costNzd: usageCost,
                },
              }, null, 2),
              contentType: 'application/json',
            })
            expect(usageCost, 'Both pages show exactly the same latest-day amount, including cents')
              .toBe(dashboardCost)
          })
        })
      }
    })
  })
})
