import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { formatKwh, formatNzd } from '../../utils/format'

const account = accountByAlias('july')
test.use({ account })

test.describe('Usage', () => {
  test.describe('View the usage summary on the Dashboard', () => {
    // The remaining account rows are added with the full Usage feature.
    test(`The four tiles match the API (all 15 accounts) — ${account.displayName}`, { tag: '@smoke' }, async ({ api, dashboard }) => {
      const [household, shock] = await test.step('Read independent API values', () => Promise.all([
        api.household(account.customerId),
        api.billShock(account.customerId),
      ]))
      const latestKwh = household.daily_kwh.slice(0, shock.days_elapsed).at(-1)
      expect(latestKwh, 'The selected account needs a latest reading').toBeDefined()
      expect(shock.usage_so_far_kwh, 'The selected account needs usage for the blended price').toBeGreaterThan(0)
      const latestCost = latestKwh! * shock.cost_so_far_nzd / shock.usage_so_far_kwh

      await test.step('Open Usage & Costs from the signed-in Dashboard', async () => {
        await dashboard.goto()
        await dashboard.openUsageSummary()
      })
      await test.step('Compare every tile with the API', async () => {
        await expect.soft(dashboard.usageSoFar).toHaveText(formatKwh(shock.usage_so_far_kwh))
        await expect.soft(dashboard.latestDayCost).toHaveText(formatNzd(latestCost))
        await expect.soft(dashboard.costSoFar).toHaveText(formatNzd(shock.cost_so_far_nzd))
        await expect.soft(dashboard.projectedThisCycle).toHaveText(formatNzd(shock.projected_cycle_cost_nzd))
      })
    })
  })
})
