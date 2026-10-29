import { expect, test } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { blockApiWrites, observeApiRequests } from './reset-requests'

test.use({ signedIn: false, account: accountByAlias('spike') })

test.describe('Reset Password', () => {
  test.describe('From Edit profile (signed in)', () => {
    test('Reset password button', async ({ page, login, credentials, topBar, profile, toasts }) => {
      await test.step('Sign in as Spike Household', async () => {
        await login.goto()
        await login.signIn(credentials.email, credentials.password)
      })
      const writes = await blockApiWrites(page)

      await test.step('Open Edit profile from the avatar menu', async () => {
        await topBar.openProfile()
        await expect(profile.heading).toBeVisible()
        await profile.openEditProfile()
      })
      const resetRequests = observeApiRequests(page)
      await profile.resetPasswordButton.click()

      const confirmation = toasts.message('Password reset instructions prepared')
      await expect(confirmation).toHaveText('Password reset instructions prepared')
      await expect(profile.editDialog.root).toBeVisible()
      const bounds = await confirmation.boundingBox()
      const viewport = page.viewportSize()
      if (!bounds || !viewport) throw new Error('The reset confirmation needs a visible desktop viewport.')
      expect(bounds.x, 'The reset confirmation is in the right half of the page').toBeGreaterThanOrEqual(viewport.width / 2)
      expect(bounds.y + bounds.height, 'The reset confirmation is near the top of the page').toBeLessThan(viewport.height / 2)
      expect(resetRequests, 'The Profile reset control must not call the API').toEqual([])
      expect(writes, 'The prototype must prepare reset instructions without an API write').toEqual([])
    })
  })
})
