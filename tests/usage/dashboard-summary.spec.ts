import { expect, test } from '../../fixtures/test'
import { ACCOUNTS, accountByAlias } from '../../data/accounts'
import { formatKwh, formatNzd } from '../../utils/format'

test.describe('Usage', () => {
  test.describe('View the usage summary on the Dashboard', () => {
    test.describe('Positive Testing', () => {
      for (const selectedAccount of ACCOUNTS) {
        test.describe(() => {
          test.use({ account: selectedAccount })

          test(`The four tiles match the API (all 15 accounts) — ${selectedAccount.displayName}`, {
            tag: selectedAccount.alias === 'july' ? '@smoke' : [],
          }, async ({ account, api, dashboard }) => {
            const [household, shock] = await test.step('Read independent API values', () => Promise.all([
              api.household(account.customerId),
              api.billShock(account.customerId),
            ]))
            expect(household.customer_id).toBe(account.customerId)
            expect(shock.customer_id).toBe(account.customerId)
            const latestKwh = household.daily_kwh.slice(0, shock.days_elapsed).at(-1)
            expect(latestKwh, 'The selected account needs a latest reading').toBeDefined()
            expect(shock.usage_so_far_kwh, 'The selected account needs usage for the blended price').toBeGreaterThan(0)
            const latestCost = latestKwh! * shock.cost_so_far_nzd / shock.usage_so_far_kwh

            await test.step('Open Usage & Costs from the signed-in Dashboard', async () => {
              await dashboard.goto()
              await dashboard.openUsageSummary()
            })
            await test.step('Compare every tile with the API', async () => {
              await expect.soft(dashboard.usageTiles).toHaveText([
                `Usage so far${formatKwh(shock.usage_so_far_kwh)}`,
                `Latest day’s cost${formatNzd(latestCost)}`,
                `Cost so far${formatNzd(shock.cost_so_far_nzd)}`,
                `Projected this cycle${formatNzd(shock.projected_cycle_cost_nzd)}`,
              ])
              await expect.soft(dashboard.usageSoFar).toHaveText(formatKwh(shock.usage_so_far_kwh))
              await expect.soft(dashboard.latestDayCost).toHaveText(formatNzd(latestCost))
              await expect.soft(dashboard.costSoFar).toHaveText(formatNzd(shock.cost_so_far_nzd))
              await expect.soft(dashboard.projectedThisCycle).toHaveText(formatNzd(shock.projected_cycle_cost_nzd))
            })
          })
        })
      }

      test.describe(() => {
        test.use({ account: accountByAlias('july') })

        test('The summary opens and closes', async ({ page, dashboard }) => {
          await dashboard.goto()
          await expect(dashboard.usageSummary).toBeHidden()

          await test.step('Open all four tiles and keep the summary open when a tile is clicked', async () => {
            await dashboard.openUsageSummary()
            await expect(dashboard.usageTiles).toHaveCount(4)
            await dashboard.usageSoFar.click()
            await expect(dashboard.usageSummary).toBeVisible()
            await expect(dashboard.energyHome.summaryButton).toHaveAttribute('aria-expanded', 'true')
          })

          await test.step('Close the summary by clicking its chip', async () => {
            await dashboard.energyHome.summaryButton.click()
            await expect(dashboard.usageSummary).toBeHidden()
            await expect(dashboard.energyHome.summaryButton).toHaveAttribute('aria-expanded', 'false')
          })

          await test.step('Close the summary by clicking outside it', async () => {
            await dashboard.openUsageSummary()
            await dashboard.heading.click()
            await expect(dashboard.usageSummary).toBeHidden()
            await expect(dashboard.energyHome.summaryButton).toHaveAttribute('aria-expanded', 'false')
          })

          await test.step('Close the summary with Escape', async () => {
            await dashboard.openUsageSummary()
            await page.keyboard.press('Escape')
            await expect(dashboard.usageSummary).toBeHidden()
            await expect(dashboard.energyHome.summaryButton).toHaveAttribute('aria-expanded', 'false')
          })
        })
      })
    })

    test.describe('Negative Testing', () => {
      test.use({ account: accountByAlias('july') })

      test('Usage data unavailable', async ({ account, page, dashboard }) => {
        const householdPath = `/api/households/${account.customerId}`
        const pageErrors: string[] = []
        page.on('pageerror', (error) => pageErrors.push(error.message))
        await page.route((url) => url.pathname === householdPath, async (route) => {
          if (route.request().method() !== 'GET') {
            await route.fallback()
            return
          }
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Usage data unavailable.' }),
          })
        })
        const pendingHousehold = page.waitForResponse((response) =>
          response.request().method() === 'GET' && new URL(response.url()).pathname === householdPath,
        )

        await dashboard.goto()
        expect((await pendingHousehold).status()).toBe(500)
        await dashboard.openUsageSummary()

        for (const tile of [
          dashboard.usageSoFar, dashboard.latestDayCost, dashboard.costSoFar, dashboard.projectedThisCycle,
        ]) {
          await expect.soft(tile).toHaveText('—')
        }
        await expect(dashboard.heading).toBeVisible()
        await expect(dashboard.greeting).toBeVisible()
        expect(pageErrors, 'The Dashboard handles unavailable usage without an uncaught error').toEqual([])
      })
    })
  })
})
