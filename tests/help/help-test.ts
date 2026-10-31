import { expect, test as base } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { blockApiWrites } from '../../utils/browser-requests'

export const test = base.extend<{ _helpWriteGuard: void; _helpEntry: void }>({
  account: accountByAlias('mere'),
  _helpWriteGuard: [async ({ page }, use) => {
    const writes = await blockApiWrites(page)
    await use()
    expect(writes, 'Help journeys must not submit account changes or chat questions').toEqual([])
  }, { auto: true }],
  _helpEntry: [async ({ dashboard, sidebar, help, _helpWriteGuard }, use) => {
    await dashboard.goto()
    await sidebar.openUtility('Help & Support')
    await expect(help.faqHeading).toBeVisible()
    await use()
  }, { auto: true }],
})

export { expect }
