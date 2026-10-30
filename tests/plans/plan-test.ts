import { expect, test as base } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { blockApiWrites } from '../../utils/browser-requests'

export const test = base.extend<{ _planWriteGuard: void }>({
  account: accountByAlias('tariff'),
  _planWriteGuard: [async ({ page }, use) => {
    // Explicit request tests install a narrower route after this guard.
    // Only their approved POST may be fulfilled locally or forwarded once.
    const writes = await blockApiWrites(page)
    await use()
    expect(writes, 'Plan journeys must not attempt any unapproved API writes').toEqual([])
  }, { auto: true }],
})

export { expect }
