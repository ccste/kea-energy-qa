import { accountByAlias, type AccountAlias } from '../../data/accounts'
import { addCalendarDays, calendarDays } from '../../utils/dates'
import { expect, test } from './bill-shock-test'

const CYCLE_CASES = [
  { account: 'ana', invoiceStart: '2024-05-01', invoiceEnd: '2024-05-31', usageDate: '2024-06-30', elapsed: 30, length: 30, remaining: 0 },
  { account: 'mereana', invoiceStart: '2024-05-01', invoiceEnd: '2024-05-31', usageDate: '2024-06-10', elapsed: 10, length: 30, remaining: 20 },
  { account: 'rangi', invoiceStart: '2024-07-01', invoiceEnd: '2024-07-31', usageDate: '2024-08-31', elapsed: 31, length: 31, remaining: 0 },
  { account: 'generated', invoiceStart: '2026-08-02', invoiceEnd: '2026-09-01', usageDate: '2026-09-16', elapsed: 15, length: 30, remaining: 15 },
] as const satisfies readonly {
  account: AccountAlias; invoiceStart: string; invoiceEnd: string; usageDate: string
  elapsed: number; length: number; remaining: number
}[]

function displayedPeriod(text: string): { start: string; end: string } {
  const match = text.trim().match(/^(\d{4}-\d{2}-\d{2})\s+[–-]\s+(\d{4}-\d{2}-\d{2})$/)
  expect(match, 'Billing displays a complete date-only invoice period').not.toBeNull()
  const [, start, end] = match!
  for (const day of [start, end]) {
    expect(new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10), 'Invoice dates are valid calendar dates').toBe(day)
  }
  return { start, end }
}

function followingCalendarPeriod(invoiceEnd: string): { start: string; end: string } {
  const start = addCalendarDays(invoiceEnd, 1)
  const nextStart = new Date(`${start}T12:00:00Z`)
  // The approved scenarios start on the first or second, so advancing a calendar month cannot overflow.
  expect([1, 2]).toContain(nextStart.getUTCDate())
  nextStart.setUTCMonth(nextStart.getUTCMonth() + 1)
  return { start, end: addCalendarDays(nextStart.toISOString().slice(0, 10), -1) }
}

test.describe('Power Bill Shock Warning', () => {
  test.describe('View the warning', () => {
    test.describe('Data scenarios', () => {
      for (const row of CYCLE_CASES) {
        test.describe(() => {
          const account = accountByAlias(row.account)
          test.use({ account })

          test(`Cycle length matches the billing history — ${account.displayName}`, async ({ dashboard, sidebar, billing, usage }, testInfo) => {
            testInfo.annotations.push({
              type: 'assumption',
              description: 'The current cycle follows the calendar-period pattern shown in Billing: first to month-end, or second to first for Generated Demo Household.',
            })
            if (row.account === 'ana' || row.account === 'mereana') {
              testInfo.annotations.push({ type: 'defect', description: '#39 The Dashboard cycle must follow the calendar period shown by Billing and the current Usage date.' })
            }

            const invoice = await test.step('Read the latest invoice period and history from Billing', async () => {
              await dashboard.goto()
              await sidebar.navigateTo('Billing')
              await expect(billing.cardPeriod).toBeVisible()
              await expect(billing.historyHeading).toBeVisible()
              await expect(billing.rows.first()).toBeVisible()
              const cardText = (await billing.cardPeriod.innerText()).trim()
              const period = displayedPeriod(cardText)
              expect(period, 'The documented latest invoice is still the scenario fixture').toEqual({ start: row.invoiceStart, end: row.invoiceEnd })
              // History cells share a period and a due date on separate rendered lines.
              const historyText = await billing.rows.locator(':scope > span:first-of-type').allInnerTexts()
              const history = historyText.map(text => displayedPeriod(text.split('\n')[0]))
              expect(history[0], 'The card agrees with the newest visible history record').toEqual(period)
              if (row.account === 'mereana') {
                const earlierJune = { start: '2023-06-01', end: '2023-06-30' }
                expect(history, 'Mereana has a visible 30-day June cycle in Billing history').toContainEqual(earlierJune)
                expect(calendarDays(earlierJune.start, earlierJune.end)).toHaveLength(30)
              }
              return { ...period, cardText, history }
            })

            const usageDate = await test.step('Read the default date from Usage', async () => {
              await sidebar.navigateTo('Usage')
              await usage.waitUntilReady()
              await expect(usage.chart).toBeVisible()
              await expect(usage.date).toHaveValue(row.usageDate)
              return usage.date.inputValue()
            })

            // This oracle uses visible page dates only, never the bill-shock API's cycle fields.
            const cycle = followingCalendarPeriod(invoice.end)
            expect(usageDate >= cycle.start && usageDate <= cycle.end, 'Usage opens within the calendar cycle following the latest invoice').toBe(true)
            const length = calendarDays(cycle.start, cycle.end).length
            const elapsed = calendarDays(cycle.start, usageDate).length
            const remaining = length - elapsed
            expect({ elapsed, length, remaining }).toEqual({ elapsed: row.elapsed, length: row.length, remaining: row.remaining })

            await test.step('Compare the Dashboard cycle with the visible Billing and Usage dates', async () => {
              await dashboard.billShock.goto(account.customerId, () => sidebar.navigateTo('Dashboard'))
              await dashboard.billShock.open()
              const actual = {
                heading: await dashboard.billShock.heading.innerText(),
                summary: await dashboard.billShock.summary.innerText(),
                daysLeft: await dashboard.billShock.daysLeft.allInnerTexts(),
                closedCycle: await dashboard.billShock.closedCycle.allInnerTexts(),
              }
              await testInfo.attach('Calendar-cycle evidence from customer pages', {
                body: JSON.stringify({
                  customerId: account.customerId, invoice, usageDate,
                  expectedCycle: { ...cycle, elapsed, length, remaining },
                  dashboard: actual,
                }, null, 2),
                contentType: 'application/json',
              })
              // The final panel is loaded; compare all related values without cumulative retry timeouts.
              expect.soft(actual.summary).toMatch(new RegExp(`^You are ${elapsed} of ${length} days\\b`))
              if (remaining === 0) {
                expect.soft(actual.daysLeft).toEqual([])
                expect(['Power Bill Shock Warning', 'No bill shock expected']).toContain(actual.heading)
                if (actual.heading === 'Power Bill Shock Warning') {
                  expect.soft(actual.closedCycle).toHaveLength(1)
                  expect.soft(actual.closedCycle.join(' ')).toContain('This cycle has closed, so this is what the bill will reflect.')
                } else expect.soft(actual.closedCycle).toEqual([])
              } else {
                expect.soft(actual.daysLeft).toEqual([`${remaining} ${remaining === 1 ? 'day' : 'days'} left in this cycle — enough to change the outcome.`])
                expect.soft(actual.closedCycle).toEqual([])
              }
            })
          })
        })
      }
    })
  })
})
