import { expect, test as base } from '../../../fixtures/test'
import { accountByAlias } from '../../../data/accounts'
import { blockApiWrites } from '../../../utils/browser-requests'

export const test = base.extend<{ _faqWriteGuard: void; _faqEntry: void }>({
  account: accountByAlias('mere'),
  _faqWriteGuard: [async ({ page }, use) => {
    const writes = await blockApiWrites(page)
    await use()
    expect(writes, 'FAQ journeys must not submit account changes or chat questions').toEqual([])
  }, { auto: true }],
  _faqEntry: [async ({ dashboard, sidebar, help, _faqWriteGuard }, use) => {
    await dashboard.goto()
    await sidebar.openUtility('Help & Support')
    await expect(help.faqHeading).toBeVisible()
    await use()
  }, { auto: true }],
})

export { expect }
