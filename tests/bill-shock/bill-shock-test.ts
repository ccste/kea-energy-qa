import { test as base, expect } from '../../fixtures/test'
import { blockApiWrites } from '../../utils/browser-requests'
import type { BillShockWarning } from '../../api/types'

export const test = base.extend<{ _readOnly: void; openBillShock: () => Promise<BillShockWarning> }>({
  openBillShock: async ({ page, account, dashboard }, use) => {
    await use(async () => {
      const pending = page.waitForResponse((response) => response.request().method() === 'GET' &&
        new URL(response.url()).pathname === `/api/households/${account.customerId}/bill-shock`)
      await dashboard.billShock.goto(account.customerId)
      const response = await pending
      expect(response.ok(), 'The account needs a successful Bill Shock assessment').toBe(true)
      const shock = await response.json() as BillShockWarning
      expect(shock.customer_id).toBe(account.customerId)
      await dashboard.billShock.open()
      return shock
    })
  },
  _readOnly: [async ({ page }, use) => {
    const writes = await blockApiWrites(page)
    await use()
    expect(writes, 'Bill Shock reader journeys must not submit browser API writes').toEqual([])
  }, { auto: true }],
})

export { expect }
