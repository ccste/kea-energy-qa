import type { CustomerProfile } from '../../api/types'
import { ACCOUNTS, accountByAlias } from '../../data/accounts'
import { expect, test } from '../../fixtures/test'
import { blockApiWrites, observeApiRequests } from './reset-requests'

test.use({ signedIn: false })

const expiryText = 'The link expires in 30 minutes. Your current password works until you use it.'
const sentText = 'Password reset instructions sent'
const accountsWithEmail = ACCOUNTS.filter((account) => account.kind !== 'household')

test.describe('Reset Password', () => {
  test.describe('From Settings (Password and security)', () => {
    test.beforeEach(async ({ account, credentials, login, toasts }) => {
      await login.goto()
      await login.signIn(credentials.email, credentials.password)
      const welcomeText = `Welcome back, ${account.displayName}`
      if (await toasts.message(welcomeText).isVisible()) await toasts.dismiss(welcomeText)
      await expect(toasts.messages).toHaveCount(0)
    })

    test.describe('Positive Testing', () => {
      test.use({ account: accountByAlias('ana') })

      test('Send reset link', { tag: '@smoke' }, async ({ account, api, page, settings, sidebar, toasts }) => {
        const expectedProfile = await api.profile(account.customerId)
        if (!expectedProfile.email) throw new Error(`The selected profile needs an email: ${account.customerId}`)
        const writes = await blockApiWrites(page)
        const profilePath = `/api/households/${account.customerId}/profile`
        const pendingProfile = page.waitForResponse((response) =>
          response.request().method() === 'GET' && new URL(response.url()).pathname === profilePath,
        )
        await sidebar.openUtility('Settings')
        await expect(settings.heading).toBeVisible()
        const profileResponse = await pendingProfile
        expect(profileResponse.status()).toBe(200)
        expect((await profileResponse.json() as CustomerProfile).email).toBe(expectedProfile.email)

        const resetRequests = observeApiRequests(page)
        await settings.openPasswordSecurity()
        await expect(settings.resetPassword.root).toHaveAccessibleName('Reset password')
        await expect(settings.resetPassword.root.getByText(
          `Send a secure reset link to ${expectedProfile.email}?`, { exact: true },
        )).toBeVisible()
        await expect(settings.resetPassword.root.getByText(expiryText, { exact: true })).toBeVisible()
        await expect(settings.resetPassword.cancel).toBeVisible()
        await expect(settings.resetPassword.send).toBeVisible()
        // Keep the accessible name without showing a title or close control.
        await expect(settings.resetPassword.root.getByRole('heading', {
          name: 'Reset password', exact: true,
        })).not.toBeInViewport()
        await expect(settings.resetPassword.root.getByRole('button', {
          name: 'Close', exact: true, includeHidden: true,
        })).toBeHidden()

        await settings.resetPassword.send.click()
        await expect(settings.resetPassword.root).toBeHidden()
        await expect(toasts.message(sentText)).toHaveText(sentText)
        expect(resetRequests, 'The Settings reset controls must not call the API').toEqual([])
        expect(writes, 'The prototype reset must not send an API write').toHaveLength(0)
      })

      test('Cancel', async ({ account, api, page, settings, sidebar, toasts }) => {
        const expectedProfile = await api.profile(account.customerId)
        if (!expectedProfile.email) throw new Error(`The selected profile needs an email: ${account.customerId}`)
        const writes = await blockApiWrites(page)
        const profilePath = `/api/households/${account.customerId}/profile`
        const pendingProfile = page.waitForResponse((response) =>
          response.request().method() === 'GET' && new URL(response.url()).pathname === profilePath,
        )
        await sidebar.openUtility('Settings')
        await expect(settings.heading).toBeVisible()
        const profileResponse = await pendingProfile
        expect(profileResponse.status()).toBe(200)
        expect((await profileResponse.json() as CustomerProfile).email).toBe(expectedProfile.email)

        const resetRequests = observeApiRequests(page)
        for (const mode of ['Cancel button', 'Escape', 'outside the dialog'] as const) {
          await test.step(`Dismiss with ${mode}`, async () => {
            await settings.openPasswordSecurity()
            await expect(settings.resetPassword.root.getByText(
              `Send a secure reset link to ${expectedProfile.email}?`, { exact: true },
            )).toBeVisible()
            if (mode === 'Cancel button') await settings.resetPassword.cancel.click()
            else if (mode === 'Escape') await page.keyboard.press('Escape')
            else await settings.resetPassword.clickOutside()
            await expect(settings.resetPassword.root).toBeHidden()
            await expect(toasts.messages).toHaveCount(0)
            expect(resetRequests, 'Opening and dismissing the reset dialog must not call the API').toEqual([])
            expect(writes, 'Dismissing the reset dialog must not send an API write').toHaveLength(0)
          })
        }
      })
    })

    test.describe('Data scenarios', () => {
      for (const selectedAccount of accountsWithEmail) {
        test.describe(() => {
          test.use({ account: selectedAccount })

          test(`Email shown is the account's own — ${selectedAccount.displayName}`, async ({
            account, api, page, profile, settings, sidebar, topBar,
          }) => {
            const expectedProfile = await api.profile(account.customerId)
            const expectedEmail = expectedProfile.email
            if (!expectedEmail) throw new Error(`The selected profile needs an email: ${account.customerId}`)
            const writes = await blockApiWrites(page)
            const profilePath = `/api/households/${account.customerId}/profile`

            await test.step('Read the customer email on Profile', async () => {
              const pendingProfile = page.waitForResponse((response) =>
                response.request().method() === 'GET' && new URL(response.url()).pathname === profilePath,
              )
              await topBar.openProfile()
              await expect(profile.heading).toBeVisible()
              const profileResponse = await pendingProfile
              expect(profileResponse.status()).toBe(200)
              expect((await profileResponse.json() as CustomerProfile).email).toBe(expectedEmail)
              await expect(profile.emailValue).toHaveText(expectedEmail)
            })

            await test.step('Compare the Settings reset destination with Profile', async () => {
              const pendingProfile = page.waitForResponse((response) =>
                response.request().method() === 'GET' && new URL(response.url()).pathname === profilePath,
              )
              await sidebar.openUtility('Settings')
              await expect(settings.heading).toBeVisible()
              const profileResponse = await pendingProfile
              expect(profileResponse.status()).toBe(200)
              expect((await profileResponse.json() as CustomerProfile).email).toBe(expectedEmail)
              const resetRequests = observeApiRequests(page)
              await settings.openPasswordSecurity()
              await expect(settings.resetPassword.root.getByText(
                `Send a secure reset link to ${expectedEmail}?`, { exact: true },
              )).toBeVisible()
              expect(resetRequests, 'Opening the reset dialog must not call the API').toEqual([])
              expect(writes, 'Opening the reset dialog must not send an API write').toHaveLength(0)
            })
          })
        })
      }

      test.describe(() => {
        test.use({ account: accountByAlias('july') })

        test('Account without an email on file', async ({ account, api, page, settings, sidebar, toasts }) => {
          const expectedProfile = await api.profile(account.customerId)
          expect(expectedProfile.email, 'The selected household has no email on its profile').toBeNull()
          const writes = await blockApiWrites(page)
          const profilePath = `/api/households/${account.customerId}/profile`
          const pendingProfile = page.waitForResponse((response) =>
            response.request().method() === 'GET' && new URL(response.url()).pathname === profilePath,
          )
          await sidebar.openUtility('Settings')
          await expect(settings.heading).toBeVisible()
          const profileResponse = await pendingProfile
          expect(profileResponse.status()).toBe(200)
          expect((await profileResponse.json() as CustomerProfile).email).toBeNull()

          const resetRequests = observeApiRequests(page)
          await settings.openPasswordSecurity()
          await expect(settings.resetPassword.root.getByText(
            'Send a secure reset link to your email?', { exact: true },
          )).toBeVisible()
          await expect(settings.resetPassword.root.getByText(expiryText, { exact: true })).toBeVisible()
          await settings.resetPassword.send.click()
          await expect(settings.resetPassword.root).toBeHidden()
          await expect(toasts.message(sentText)).toHaveText(sentText)
          expect(resetRequests, 'A reset without a profile email must not call the API').toEqual([])
          expect(writes, 'The prototype reset must not send an API write').toHaveLength(0)
        })
      })
    })
  })
})
