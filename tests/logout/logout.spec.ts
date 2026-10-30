import type { Page } from '@playwright/test'
import { accountByAlias, type AccountMetadata } from '../../data/accounts'
import { expect, test } from '../../fixtures/test'
import type { LoginPage } from '../../pages/LoginPage'
import type { LogoutDialog } from '../../pages/components/LogoutDialog'
import type { TopBar } from '../../pages/components/TopBar'

test.use({ signedIn: false, account: accountByAlias('july') })

async function expectConfirmation(dialog: LogoutDialog): Promise<void> {
  await expect(dialog.root).toBeVisible()
  await expect(dialog.prompt).toBeVisible()
  await expect(dialog.confirm).toBeVisible()
  await expect(dialog.confirm).toBeEnabled()
  await expect(dialog.cancel).toBeVisible()
  await expect(dialog.cancel).toBeEnabled()
}

async function expectSignedOut(page: Page, login: LoginPage, dialog: LogoutDialog): Promise<void> {
  await expect(dialog.root).toBeHidden()
  await expect(page).toHaveURL(/\/login$/)
  await expect(login.heading).toBeVisible()
  await expect(login.email).toBeVisible()
  await expect(login.password).toBeVisible()
  await expect(login.submit).toBeEnabled()
}

async function expectStillSignedIn(
  page: Page,
  topBar: TopBar,
  account: AccountMetadata,
  dialog: LogoutDialog,
): Promise<void> {
  await test.step('Cancellation keeps Power Clash and the signed-in identity', async () => {
    await expect(dialog.root).toBeHidden()
    await expect(page).toHaveURL(/\/clash$/)
    await expect(page.getByRole('heading', { name: 'Power Clash', exact: true })).toBeVisible()
    await topBar.openProfileMenu()
    await expect(topBar.profileName).toHaveText(account.displayName)
    await expect(topBar.profileCustomerId).toHaveText(`CID: ${account.customerId}`)
  })

  await test.step('Reload confirms that cancellation preserved the session', async () => {
    await page.reload()
    await expect(page).toHaveURL(/\/clash$/)
    await expect(page.getByRole('heading', { name: 'Power Clash', exact: true })).toBeVisible()
    await topBar.openProfileMenu()
    await expect(topBar.profileCustomerId).toHaveText(`CID: ${account.customerId}`)
  })
}

test.describe('Logout', () => {
  test.beforeEach(async ({ page, login, credentials, sidebar }) => {
    await test.step('Sign in as July Household and open Power Clash from the sidebar', async () => {
      await login.goto()
      await login.signIn(credentials.email, credentials.password)
      await expect(login.welcome.root).toBeHidden()
      await sidebar.navigateTo('Power Clash')
      await expect(page).toHaveURL(/\/clash$/)
      await expect(page.getByRole('heading', { name: 'Power Clash', exact: true })).toBeVisible()
      await expect(sidebar.toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(sidebar.logoutLabel).toBeVisible()
    })
  })

  test.describe('Log out from the sidebar', () => {
    test('Expanded sidebar: Logout → Yes', { tag: '@smoke' }, async ({ page, login, sidebar, logoutDialog }) => {
      await sidebar.logout.click()
      await expectConfirmation(logoutDialog)
      await logoutDialog.confirm.click()
      await expectSignedOut(page, login, logoutDialog)
    })

    test('Expanded sidebar: Logout → Cancel', async ({ page, sidebar, topBar, account, logoutDialog }) => {
      await sidebar.logout.click()
      await expectConfirmation(logoutDialog)
      await logoutDialog.cancel.click()
      await expectStillSignedIn(page, topBar, account, logoutDialog)
    })

    test('Collapsed sidebar: Logout icon → Yes', async ({ page, login, sidebar, logoutDialog }) => {
      await sidebar.toggle.click()
      await expect(sidebar.toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(sidebar.logoutLabel).toBeHidden()
      await sidebar.logout.click()
      await expectConfirmation(logoutDialog)
      await logoutDialog.confirm.click()
      await expectSignedOut(page, login, logoutDialog)
    })

    test('Collapsed sidebar: Logout icon → click outside the dialog', async ({ page, sidebar, topBar, account, logoutDialog }) => {
      await sidebar.toggle.click()
      await expect(sidebar.toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(sidebar.logoutLabel).toBeHidden()
      await sidebar.logout.click()
      await expectConfirmation(logoutDialog)
      await logoutDialog.clickOutside()
      await expectStillSignedIn(page, topBar, account, logoutDialog)
    })
  })

  test.describe('Log out from the profile menu', () => {
    test('Avatar → Logout → Yes', async ({ page, login, topBar, logoutDialog }) => {
      await topBar.openProfileMenu()
      await topBar.logout.click()
      await expectConfirmation(logoutDialog)
      await logoutDialog.confirm.click()
      await expectSignedOut(page, login, logoutDialog)
    })

    test('Avatar → Logout → Cancel', async ({ page, topBar, account, logoutDialog }) => {
      await topBar.openProfileMenu()
      await topBar.logout.click()
      await expectConfirmation(logoutDialog)
      await logoutDialog.cancel.click()
      await expectStillSignedIn(page, topBar, account, logoutDialog)
    })
  })

  test.describe('After logging out', () => {
    test('Protected pages are no longer accessible', async ({ page, login, sidebar, logoutDialog }) => {
      await test.step('Confirm logout from Power Clash', async () => {
        await sidebar.logout.click()
        await expectConfirmation(logoutDialog)
        await logoutDialog.confirm.click()
        await expectSignedOut(page, login, logoutDialog)
      })

      await test.step('Browser Back returns to Login instead of restoring Power Clash', async () => {
        await page.goBack()
        await expectSignedOut(page, login, logoutDialog)
        await expect(page.getByRole('heading', { name: 'Power Clash', exact: true })).toBeHidden()
      })

      await test.step('Opening the protected address directly also returns to Login', async () => {
        await page.goto('/clash')
        await expectSignedOut(page, login, logoutDialog)
        await expect(page.getByRole('heading', { name: 'Power Clash', exact: true })).toBeHidden()
      })
    })
  })
})
