import { test, expect } from './bill-shock-test'
import { accountByAlias } from '../../data/accounts'
import { formatNzd } from '../../utils/format'
import { BASIS_NOTES, expectPanelState, warningSummary } from './expectations'

test.describe('Power Bill Shock Warning', () => {
  test.describe('View the warning', () => {
    test.describe('Positive Testing', () => {
      for (const alias of ['july', 'rangi', 'ana', 'tama', 'mere', 'josh', 'priya', 'daniel', 'mereana', 'generated'] as const) {
        const account = accountByAlias(alias)
        test.describe(() => {
          test.use({ account })
          test(`Warning panel matches the API — ${account.displayName}`, {
            tag: alias === 'july' ? '@smoke' : [],
          }, async ({ openBillShock, dashboard }) => {
            const shock = await test.step('Open the account assessment and read its browser API response', openBillShock)
            expect(shock.triggered, 'The designed warning account must trigger with default settings').toBe(true)
            const panel = dashboard.billShock
            await expectPanelState(panel, 'warning')
            for (const label of ['Power Bill Shock Warning', 'Projection for this cycle', 'See why →']) {
              await expect.soft(panel.chip).toContainText(label)
            }
            await expect.soft(panel.chip).toHaveClass(/\bis-ringing\b/)
            await expect.soft(panel.summary).toHaveText(warningSummary(shock))
            expect(BASIS_NOTES[shock.expectation_basis], 'The comparison basis is documented').toBeDefined()
            await expect.soft(panel.basis).toHaveText(BASIS_NOTES[shock.expectation_basis]!)
          })
        })
      }

      for (const alias of ['cold', 'spike', 'drop', 'tariff', 'julia'] as const) {
        const account = accountByAlias(alias)
        test.describe(() => {
          test.use({ account })
          test(`No-warning panel matches the API — ${account.displayName}`, async ({ openBillShock, dashboard }) => {
            const shock = await openBillShock()
            expect(shock.triggered, 'The designed no-warning account must remain green with default settings').toBe(false)
            const panel = dashboard.billShock
            await expectPanelState(panel, 'normal')
            await expect.soft(panel.summary).toContainText(`You are ${shock.days_elapsed} of ${shock.days_in_cycle} days in and on track for ${formatNzd(shock.projected_cycle_cost_nzd)}`)
            await expect.soft(panel.summary).toContainText(formatNzd(shock.expected_cost_nzd))
            await expect.soft(panel.summary).not.toContainText(/more, or .*%/)
            await expect.soft(panel.daysLeft).toHaveCount(0)
            await expect.soft(panel.closedCycle).toHaveCount(0)
            expect(BASIS_NOTES[shock.expectation_basis]).toBeDefined()
            await expect.soft(panel.basis).toHaveText(BASIS_NOTES[shock.expectation_basis]!)
          })
        })
      }

      test.describe(() => {
        test.use({ account: accountByAlias('tama') })
        test('Open and close the panel', async ({ page, account, dashboard }) => {
          const panel = dashboard.billShock
          await panel.goto(account.customerId)
          await expect(panel.root).toBeHidden()
          await expect(panel.chip).toHaveAttribute('aria-expanded', 'false')
          await test.step('Toggle the panel with its chip', async () => {
            await panel.open()
            await expect(panel.chip).toHaveAttribute('aria-expanded', 'true')
            await panel.chip.click()
            await expect(panel.root).toBeHidden()
            await expect(panel.chip).toHaveAttribute('aria-expanded', 'false')
          })
          await test.step('Close with an outside click', async () => {
            await panel.open()
            await dashboard.heading.click()
            await expect(panel.root).toBeHidden()
            await expect(panel.chip).toHaveAttribute('aria-expanded', 'false')
          })
          await test.step('Close with Escape', async () => {
            await panel.open()
            await page.keyboard.press('Escape')
            await expect(panel.root).toBeHidden()
            await expect(panel.chip).toHaveAttribute('aria-expanded', 'false')
          })
        })
      })
    })
  })

  test.describe('Use the panel buttons', () => {
    for (const alias of ['tama', 'tariff'] as const) {
      const account = accountByAlias(alias)
      test.describe(() => {
        test.use({ account })
        test(`View Usage — ${account.displayName}`, {
          annotation: alias === 'tariff' ? { type: 'defect', description: '#40: The no-warning panel also needs a View Usage action.' } : [],
        }, async ({ openBillShock, dashboard, page, usage, sidebar }) => {
          const shock = await openBillShock()
          expect(shock.triggered).toBe(alias === 'tama')
          await expect(dashboard.billShock.viewUsage).toBeVisible()
          await dashboard.billShock.viewUsage.click()
          await expect(page).toHaveURL(/\/usage$/)
          await expect(usage.heading).toBeVisible()
          await expect(sidebar.destination('Usage')).toHaveClass(/\bactive\b/)
        })

        test(`Ask Sparky AI — ${account.displayName}`, async ({ openBillShock, dashboard, page, sidebar }) => {
          const shock = await openBillShock()
          expect(shock.triggered).toBe(alias === 'tama')
          await dashboard.billShock.askSparky.click()
          await expect(page).toHaveURL(/\/assistant$/)
          await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible()
          await expect(sidebar.destination('Sparky AI')).toHaveClass(/\bactive\b/)
        })
      })
    }
  })
})
