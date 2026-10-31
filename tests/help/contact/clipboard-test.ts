import { test as base } from '../help-test'
import { CONTACT_EMAIL, CONTACT_PHONE } from '../../../data/contact-details'

export const test = base.extend<{ clipboardMatches: (expected: string) => Promise<boolean> }>({
  clipboardMatches: async ({ page, context, baseURL }, use, testInfo) => {
    if (!baseURL) throw new Error('Clipboard checks require the deployed website origin.')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseURL).origin })
    await page.bringToFront()
    const marker = `Contact clipboard baseline: ${testInfo.testId}`
    // An old matching value must not let a broken Copy button pass.
    await page.evaluate((value) => navigator.clipboard.writeText(value), marker)
    try {
      await use(async (expected) => {
        await page.bringToFront()
        // Return only the comparison result; unrelated clipboard text must not enter reports.
        return page.evaluate(async (value) => (await navigator.clipboard.readText()) === value, expected)
      })
    } finally {
      await page.bringToFront()
      await page.evaluate(async (ownedValues) => {
        if (ownedValues.includes(await navigator.clipboard.readText())) await navigator.clipboard.writeText('')
      }, [marker, CONTACT_PHONE, CONTACT_EMAIL])
    }
  },
})

export { expect } from '../help-test'
