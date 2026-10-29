import { randomUUID } from 'node:crypto'
import { expect, test } from '../../fixtures/test'
import { blockApiWrites, observeApiRequests } from '../../utils/browser-requests'

const confirmation = 'Password reset instructions prepared for your email'
const invalidEmailMessage = 'Enter a valid email address including @ and a full stop.'

test.use({ signedIn: false })

test.describe('Reset Password', () => {
  test.describe('From the login page (Forgot password?)', () => {
    test.beforeEach(async ({ page, login }) => {
      const pendingAccounts = page.waitForResponse((response) =>
        response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/auth/demo-accounts',
      )
      await login.goto()
      expect((await pendingAccounts).status()).toBe(200)
    })

    test.describe('Positive Testing', () => {
      test('Valid email', { tag: '@smoke' }, async ({ page, login, credentials, toasts }) => {
        const writes = await blockApiWrites(page)
        const resetRequests = observeApiRequests(page)

        await test.step('Request a reset link for the registered email', async () => {
          await login.openForgotPassword()
          await login.resetPassword.email.fill(credentials.email)
          await login.resetPassword.send.click()
        })
        await expect(login.resetPassword.root).toBeHidden()
        await expect(toasts.message(confirmation)).toHaveText(confirmation)
        expect(resetRequests, 'Reset controls must not call the API').toEqual([])
        expect(writes, 'The prototype must prepare reset instructions without an API write').toEqual([])
      })
    })

    test.describe('Negative Testing', () => {
      test('Empty', async ({ page, login }) => {
        const writes = await blockApiWrites(page)
        const resetRequests = observeApiRequests(page)

        await test.step('Request a reset link with no email', async () => {
          await login.openForgotPassword()
          await login.resetPassword.email.fill('')
          await login.resetPassword.send.click()
        })
        await expect(login.resetPassword.error).toHaveText(invalidEmailMessage)
        await expect(login.resetPassword.root).toBeVisible()
        expect(resetRequests, 'An empty reset email must not call the API').toEqual([])
        expect(writes, 'An empty reset email must not send an API write').toEqual([])
      })

      test('Invalid email', async ({ page, login, credentials }) => {
        const [localPart, domain] = credentials.email.split('@')
        const invalidEmail = `${localPart}@${domain!.replaceAll('.', '')}`
        const writes = await blockApiWrites(page)
        const resetRequests = observeApiRequests(page)

        await test.step('Request a reset link with no full stop in the domain', async () => {
          await login.openForgotPassword()
          await login.resetPassword.email.fill(invalidEmail)
          await login.resetPassword.send.click()
        })
        await expect(login.resetPassword.error).toHaveText(invalidEmailMessage)
        await expect(login.resetPassword.root).toBeVisible()
        expect(resetRequests, 'An invalid reset email must not call the API').toEqual([])
        expect(writes, 'An invalid reset email must not send an API write').toEqual([])
      })

      test('Not registered', async ({ page, login, credentials, toasts }) => {
        const domain = credentials.email.split('@')[1]!
        const unregisteredEmail = `reset-unregistered-${randomUUID()}@${domain}`
        const writes = await blockApiWrites(page)
        const resetRequests = observeApiRequests(page)

        await test.step('Request a reset link for an unregistered email', async () => {
          await login.openForgotPassword()
          await login.resetPassword.email.fill(unregisteredEmail)
          await login.resetPassword.send.click()
        })
        await expect(login.resetPassword.root).toBeHidden()
        await expect(toasts.message(confirmation)).toHaveText(confirmation)
        expect(resetRequests, 'The prototype must not look up an unregistered reset email').toEqual([])
        expect(writes, 'The prototype reset must not send an API write for an unregistered email').toEqual([])
      })
    })
  })
})
