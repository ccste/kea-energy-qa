import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import type { LoginResponse } from '../../api/types'

const account = accountByAlias('josh')
test.use({ signedIn: false, account })

test.describe('Login', () => {
  test.describe('Other sign-in options', () => {
    test(`Sign in from a demo account card — ${account.displayName}`, async ({ page, login, dashboard }) => {
      await test.step('Open the demo account cards', async () => {
        await login.goto()
        await login.demoAccountsToggle.click()
      })

      const response = await test.step('Choose the Josh Fuller card', async () => {
        const pending = page.waitForResponse((response) =>
          response.request().method() === 'POST'
          && new URL(response.url()).pathname === '/api/auth/login',
        )
        await login.demoAccount(account.displayName).click()
        return pending
      })
      expect(response.ok(), 'The selected demo card should sign in successfully').toBe(true)
      const session = await response.json() as LoginResponse
      expect(session.customer_id).toBe(account.customerId)
      expect(session.display_name).toBe(account.displayName)

      await test.step('Confirm the selected account on the Dashboard', async () => {
        await expect(page).toHaveURL(/\/dashboard$/)
        await expect(dashboard.heading).toBeVisible()
        await login.dismissWelcome()
        await expect(dashboard.greeting).toHaveText(`Welcome, ${account.displayName}`)
      })
    })

    for (const provider of ['Google', 'Apple'] as const) {
      test(`Google / Apple sign-in — ${provider}`, async ({ page, login, toasts }) => {
        await login.goto()
        await login.socialButton(provider).click()

        await expect(toasts.message(`${provider} sign-in is not available in this prototype`))
          .toHaveText(`${provider} sign-in is not available in this prototype`)
        await expect(page).toHaveURL(/\/login$/)
        await expect(login.heading).toBeVisible()
      })
    }
  })
})
