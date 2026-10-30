import type { UsageSeries } from '../../api/types'
import { accountByAlias } from '../../data/accounts'
import { expect, test } from '../../fixtures/test'
import { expectUsageChart, readUsage } from './usage-expectations'

test.describe('Usage', () => {
  test.describe('View usage on the Usage page', () => {
    test.describe('Choose a date', () => {
      test.beforeEach(async ({ dashboard, sidebar, usage }) => {
        await dashboard.goto()
        await sidebar.navigateTo('Usage')
        await usage.waitUntilReady()
      })

      test.describe('Positive Testing', () => {
        test.describe(() => {
          const account = accountByAlias('rangi')
          test.use({ account })

          test('Date with readings', async ({ usage, usageApi }) => {
            const day = '2024-01-15'
            await expect(usage.date).toHaveValue('2024-08-31')
            const daily = await readUsage(usageApi, account.customerId, day, 'Daily')
            expect(daily.values).toHaveLength(24)
            const response = await usage.setDate(day)
            expect(response?.status(), 'Selecting a different date requests its readings').toBe(200)
            await expectUsageChart(usage, daily, '$')

            for (const range of ['Weekly', 'Monthly'] as const) {
              const expected = await readUsage(usageApi, account.customerId, day, range)
              expect(expected.values).toHaveLength(range === 'Weekly' ? 7 : 30)
              await usage.chooseRange(range)
              await expectUsageChart(usage, expected, '$')
              await expect.soft(usage.xAxisLabels.last()).toHaveText('01-15')
            }
          })
        })
      })

      test.describe('Negative Testing', () => {
        test.describe(() => {
          const account = accountByAlias('julia')
          test.use({ account })

          test('Date with no readings', async ({ page, usage, usageApi }) => {
            const latest = '2024-08-31'
            const expected = await readUsage(usageApi, account.customerId, latest, 'Daily')
            expect(expected.series.available_from).toBe('2024-08-08')
            expect(expected.series.available_to).toBe(latest)
            await expect(usage.date).toHaveValue(latest)

            await test.step('A date before the available range returns to the latest reading', async () => {
              const response = await usage.setDate('2024-07-01')
              expect(response?.status()).toBe(200)
              const unavailable = await response!.json() as UsageSeries
              expect(unavailable.customer_id).toBe(account.customerId)
              expect(unavailable.daily_dates).toEqual([])
              expect(unavailable.available_to).toBe(latest)
              await expectUsageChart(usage, expected, '$')
            })

            await test.step('Calendar Today also returns to the latest reading', async () => {
              const browserDay = () => page.evaluate(() => {
                const now = new Date()
                return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
              })
              const before = await browserDay()
              expect(before > latest, 'Today must be after this account\'s final reading').toBe(true)
              const response = await usage.chooseToday()
              const after = await browserDay()
              const requested = new URL(response.url()).searchParams
              expect([before, after], 'Today uses the browser calendar date').toContain(requested.get('end'))
              expect(requested.get('start')).toBe(requested.get('end'))
              expect(response.status()).toBe(200)
              const unavailable = await response.json() as UsageSeries
              expect(unavailable.customer_id).toBe(account.customerId)
              expect(unavailable.daily_dates).toEqual([])
              expect(unavailable.available_to).toBe(latest)
              await expectUsageChart(usage, expected, '$')
            })
          })
        })

        test.describe(() => {
          const account = accountByAlias('july')
          test.use({ account })

          test('Clear the date', async ({ usage, usageApi }) => {
            const day = '2026-07-31'
            const expected = await readUsage(usageApi, account.customerId, day, 'Weekly')
            const expectEmptyDate = async () => {
              await expect.soft(usage.date).toHaveValue('')
              await expect.soft(usage.empty.getByRole('heading', { name: 'Choose a date', exact: true })).toBeVisible()
              await expect.soft(usage.empty).toContainText('Pick a date to see its electricity readings.')
              await expect.soft(usage.chart).toBeHidden()
              await expect.soft(usage.selectedPeriod).toBeHidden()
              await expect.soft(usage.error).toBeHidden()
            }

            await usage.clearDate()
            await expectEmptyDate()
            await usage.chooseRange('Weekly')
            await expect.soft(usage.range('Weekly')).toHaveAttribute('aria-pressed', 'true')
            await expectEmptyDate()
            const response = await usage.setDate(day)
            expect(response?.status()).toBe(200)
            await expectUsageChart(usage, expected, '$')
          })
        })
      })
    })
  })
})
