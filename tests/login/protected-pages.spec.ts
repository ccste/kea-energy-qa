import { expect, test } from '../../fixtures/test'

test.use({ signedIn: false })

test.describe('Login', () => {
  test.describe('Access protected pages', () => {
    test('Signed out: opening a protected page redirects to /login', { tag: '@smoke' }, async ({ page, login }) => {
      await test.step('Open Billing without a session', async () => {
        await page.goto('/billing')
      })
      await expect(page).toHaveURL(/\/login$/)
      await expect(login.heading).toBeVisible()
      await expect(login.submit).toBeEnabled()
    })
  })
})
