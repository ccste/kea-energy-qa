import { expect, test as base } from '../../fixtures/test'
import { blockApiWrites } from '../../utils/browser-requests'

export const test = base.extend<{ _profileWriteGuard: void }>({
  _profileWriteGuard: [async ({ page }, use) => {
    const writes = await blockApiWrites(page)
    await use()
    expect(writes, 'Profile journeys must not write to the shared accounts').toEqual([])
  }, { auto: true }],
})

export { expect }
