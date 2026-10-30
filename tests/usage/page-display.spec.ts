import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'

const account = accountByAlias('july')
test.use({ account })

test.describe('Usage', () => {
  test.describe('View usage on the Usage page', () => {
    test.describe('Page and chart display', () => {
      test.beforeEach(async ({ dashboard, sidebar, usage }) => {
        await dashboard.goto()
        await sidebar.navigateTo('Usage')
        await usage.waitUntilReady()
      })

      test('Opens on the latest reading date, in $ and Daily', async ({ page, api, usage }) => {
        const household = await api.household(account.customerId)
        expect(household.daily_dates.at(-1)).toBe('2026-07-31')
        await expect(page).toHaveURL(/\/usage$/)
        await expect.soft(usage.heading).toBeVisible()
        await expect.soft(usage.subtitle).toBeVisible()
        await expect.soft(usage.date).toHaveValue('2026-07-31')
        for (const unit of ['$', 'kWh'] as const) {
          await expect.soft(usage.metric(unit)).toHaveAttribute('aria-pressed', String(unit === '$'))
        }
        for (const range of ['Daily', 'Weekly', 'Monthly'] as const) {
          await expect.soft(usage.range(range)).toHaveAttribute('aria-pressed', String(range === 'Daily'))
        }
        await expect.soft(usage.points).toHaveCount(24)
        await expect.soft(usage.selectedValue).toHaveText(/^\$\d+\.\d{2}$/)
      })

      test('Daily x-axis shows only the time', async ({ page, usage }, testInfo) => {
        testInfo.annotations.push({ type: 'defect', description: '#4 Daily axis labels include timezone suffixes and overlap.' })
        await expect(usage.xAxisLabels).toHaveCount(24)
        await page.evaluate(() => document.fonts.ready)
        const labels = await usage.xAxisLabels.evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect()
          return { text: element.textContent, left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height }
        }))
        const overlapping = labels.slice(1).flatMap((label, index) => {
          const previous = labels[index]!
          return previous.right > label.left && previous.bottom > label.top && label.bottom > previous.top ? [`${previous.text} / ${label.text}`] : []
        })
        await testInfo.attach('Daily axis text and layout', { body: JSON.stringify({ labels, overlapping }, null, 2), contentType: 'application/json' })
        expect.soft(labels.map(label => label.text), 'Exactly one time-only label per hour').toEqual(Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`))
        expect.soft(labels.some(label => /NZST|NZDT/.test(label.text ?? '')), 'No timezone suffixes on the visible axis').toBe(false)
        expect.soft(labels.every(label => label.width > 0 && label.height > 0), 'Every label is rendered').toBe(true)
        expect.soft(overlapping, 'Adjacent hourly labels must not overlap at the configured desktop viewport').toEqual([])
      })
    })
  })
})
