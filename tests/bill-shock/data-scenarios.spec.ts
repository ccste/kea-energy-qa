import { test, expect } from './bill-shock-test'
import { accountByAlias } from '../../data/accounts'
import { expectPanelState } from './expectations'
import { formatPercent } from '../../utils/format'

test.describe('Power Bill Shock Warning › View the warning › Data scenarios', () => {
  for (const row of [{ alias: 'july', days: 0 }, { alias: 'tama', days: 1 }, { alias: 'priya', days: 2 }] as const) {
    const account = accountByAlias(row.alias)
    test.describe(() => {
      test.use({ account })
      test(`Days-left line: 0, 1 and 2 days — ${account.displayName} (${row.days})`, {
        annotation: row.days === 0 ? { type: 'defect', description: '#37: The closed-cycle paragraph refers to figures below that are absent.' } : [],
      }, async ({ openBillShock, dashboard }) => {
        const shock = await openBillShock()
        expect(shock.triggered).toBe(true)
        expect(shock.days_remaining, 'Keep this boundary row tied to its documented account data').toBe(row.days)
        const panel = dashboard.billShock
        if (row.days > 0) {
          await expect(panel.daysLeft).toHaveText(`${row.days} ${row.days === 1 ? 'day' : 'days'} left in this cycle — enough to change the outcome.`)
          await expect(panel.closedCycle).toHaveCount(0)
        } else {
          await expect(panel.daysLeft).toHaveCount(0)
          await expect(panel.closedCycle).toContainText('This cycle has closed, so this is what the bill will reflect.')
          const closedText = await panel.closedCycle.innerText()
          const followingText = (await panel.contentAfterClosedCycle.allInnerTexts()).join(' ')
          const hasSupportingFigures = /(?:\d+(?:\.\d+)?\s*(?:NZD|kWh|%)|\$\d+(?:\.\d+)?)/.test(followingText)
          expect(!/figures below/i.test(closedText) || hasSupportingFigures,
            'If the closed-cycle copy refers to figures below, the panel must actually show figures below it',
          ).toBe(true)
        }
      })
    })
  }

  for (const row of [{ alias: 'josh', trend: 9 }, { alias: 'priya', trend: 27 }, { alias: 'tama', trend: null }] as const) {
    const account = accountByAlias(row.alias)
    test.describe(() => {
      test.use({ account })
      test(`Rising daily use line — ${account.displayName}`, async ({ openBillShock, dashboard }) => {
        const shock = await openBillShock()
        expect(shock.reasons.includes('higher_daily_use')).toBe(row.trend !== null)
        if (row.trend === null) await expect(dashboard.billShock.dailyUse).toHaveCount(0)
        else {
          expect(formatPercent(shock.recent_trend_pct)).toBe(`${row.trend}%`)
          await expect(dashboard.billShock.dailyUse).toHaveText(`Daily use is up ${formatPercent(shock.recent_trend_pct)} since the start of the cycle.`)
        }
      })
    })
  }

  test.describe(() => {
    test.use({ account: accountByAlias('cold') })
    test('No warning when the overshoot is under the dollar floor', async ({ openBillShock, dashboard, api, account }) => {
      const preferences = await api.alertPreferences(account.customerId)
      expect(preferences.tier1_pct).toBe(15)
      expect(preferences.min_overshoot_nzd).toBe(20)
      const shock = await openBillShock()
      expect(shock.triggered).toBe(false)
      // This fixed scenario is an independent known outcome, not a rebuilt trigger algorithm.
      expect(shock.overshoot_nzd).toBe(17.26)
      await expectPanelState(dashboard.billShock, 'normal')
      await expect(dashboard.billShock.summary).toContainText('31 of 31 days')
      await expect(dashboard.billShock.summary).toContainText('87.79 NZD')
      await expect(dashboard.billShock.summary).toContainText('70.53 NZD')
    })
  })

  for (const row of [
    { alias: 'cold', projected: '87.79 NZD', normal: '70.53 NZD', description: /(?:above|higher|more than)\b/i },
    { alias: 'drop', projected: '50.34 NZD', normal: '80.60 NZD', description: /(?:below|lower|less than)\b/i },
    { alias: 'tariff', projected: '61.35 NZD', normal: '60.45 NZD', description: /(?:in line with|close to|about the same|near)\b/i },
  ] as const) {
    const account = accountByAlias(row.alias)
    test.describe(() => {
      test.use({ account })
      test(`No-warning wording matches the figures — ${account.displayName}`, {
        annotation: row.alias !== 'tariff' ? { type: 'defect', description: '#36: The no-warning comparison must describe a materially higher or lower bill accurately.' } : [],
      }, async ({ openBillShock, dashboard }) => {
        const shock = await openBillShock()
        expect(shock.triggered).toBe(false)
        const summary = dashboard.billShock.summary
        await expect(summary).toContainText(row.projected)
        await expect(summary).toContainText(row.normal)
        const comparison = (await summary.innerText()).split(row.projected)[1]
        expect(comparison, 'The comparison after the projection describes these figures truthfully').toMatch(row.description)
        if (row.alias !== 'tariff') expect(comparison).not.toMatch(/in line with/i)
      })
    })
  }
})
