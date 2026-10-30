import { expect, test } from '../../fixtures/test'
import { ACCOUNTS } from '../../data/accounts'
import { USAGE_DEFAULT_DATES } from '../../data/usage-cases'
import { expectUsageChart, missingUsageDates, readUsage } from './usage-expectations'

test.describe('Usage', () => {
  test.describe('View usage on the Usage page', () => {
    test.describe('Figures match the API (all 15 accounts)', () => {
      for (const range of ['Daily', 'Weekly', 'Monthly'] as const) {
        const count = range === 'Daily' ? 24 : range === 'Weekly' ? 7 : 30
        test.describe(`${range} (${count} ${range === 'Daily' ? 'hourly' : 'daily'} points)`, () => {
          for (const account of ACCOUNTS) {
            test.describe(() => {
              test.use({ account })
              for (const unit of ['$', 'kWh'] as const) {
                test(`${unit} — ${account.displayName}`, async ({ api, usageApi, dashboard, sidebar, usage }, testInfo) => {
                  const day = USAGE_DEFAULT_DATES[account.alias]
                  const household = await api.household(account.customerId)
                  expect(household.daily_dates.at(-1), 'The documented default date is the latest reading').toBe(day)
                  const expected = await test.step('Read independent API readings for the requested range', () => readUsage(usageApi, account.customerId, day, range))
                  if (range === 'Monthly') {
                    const missing = missingUsageDates(expected)
                    if (missing.length) {
                      await testInfo.attach('Monthly data availability', { body: JSON.stringify({ customerId: account.customerId, day, completeDays: expected.series.daily_dates.length, missing }, null, 2), contentType: 'application/json' })
                    }
                    test.skip(missing.length > 0, `${account.displayName}: ${30 - missing.length}/30 complete days ending ${day}; missing ${missing.join(', ')}. Partial-Monthly behaviour is tested separately.`)
                  }
                  expect(expected.values, 'Normal comparisons require the complete designed range').toHaveLength(count)
                  await test.step('Open Usage through the sidebar and select the range and unit', async () => {
                    await dashboard.goto()
                    await sidebar.navigateTo('Usage')
                    await usage.waitUntilReady()
                    await usage.chooseRange(range)
                    await usage.chooseUnit(unit)
                  })
                  await test.step('Compare points, axes, selected total and source note', () => expectUsageChart(usage, expected, unit))
                })
              }
            })
          }
        })
      }
    })
  })
})
