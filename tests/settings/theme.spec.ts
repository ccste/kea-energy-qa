import type { Page } from '@playwright/test'
import type { SettingsPage } from '../../pages/SettingsPage'
import { expect, test } from './settings-test'

async function expectTheme(page: Page, settings: SettingsPage, theme: 'light' | 'dark'): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  await expect(theme === 'light' ? settings.lightTheme : settings.darkTheme).toHaveClass(/\bactive\b/)
  await expect(theme === 'light' ? settings.darkTheme : settings.lightTheme).not.toHaveClass(/\bactive\b/)
}

async function waitForVisualAssets(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images, image => image.decode()))
  })
  await page.mouse.move(0, 0)
}

test.describe('Settings Change', () => {
  test.describe('Change the theme', () => {
    test.describe('Positive Testing', () => {
      test('Switch to Dark and back to Light', async ({
        page, account, api, openSettings, settings, toasts, preferenceWrites,
      }) => {
        const saved = await api.alertPreferences(account.customerId)
        // The optional catalogue changes the page layout; a failed request has no response.
        const catalogueSettled = page.waitForRequest((request) => request.method() === 'GET'
          && new URL(request.url()).pathname === '/api/offline/models').then(async (request) => {
          const response = await request.response()
          if (response) await response.finished()
        })
        await openSettings()
        await catalogueSettled
        await expectTheme(page, settings, 'light')

        for (const theme of ['dark', 'light'] as const) {
          await test.step(`Switch to ${theme} and compare the Settings viewport`, async () => {
            await (theme === 'dark' ? settings.darkTheme : settings.lightTheme).click()
            const toast = toasts.message(theme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled')
            await expect(toast).toBeVisible()
            await expectTheme(page, settings, theme)
            await expect(toast).toBeHidden()
            await waitForVisualAssets(page)
            await expect.soft(page).toHaveScreenshot(`settings-${theme}.png`, {
              animations: 'disabled',
              mask: [toasts.root],
            })
          })
        }

        expect(preferenceWrites, 'Appearance changes must not save account preferences').toHaveLength(0)
        expect(await api.alertPreferences(account.customerId)).toEqual(saved)
      })

      test.describe(() => {
        test.use({ allowSignIn: true })

        test('Theme lasts for this sign-in only', async ({
          page, account, api, openSettings, settings, sidebar, usage, logoutDialog,
          login, credentials, preferenceWrites,
        }) => {
          const saved = await api.alertPreferences(account.customerId)
          await openSettings()
          await settings.darkTheme.click()
          await expectTheme(page, settings, 'dark')

          await test.step('Keep Dark after a reload and a sidebar visit to Usage', async () => {
            await page.reload()
            await expect(settings.heading).toBeVisible()
            await settings.waitForPreferences()
            await expectTheme(page, settings, 'dark')
            await sidebar.navigateTo('Usage')
            await expect(page).toHaveURL(/\/usage$/)
            await expect(usage.heading).toBeVisible()
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
          })

          await test.step('Logout resets the sign-in page to Light', async () => {
            await sidebar.logout.click()
            await expect(logoutDialog.root).toBeVisible()
            await logoutDialog.confirm.click()
            await expect(logoutDialog.root).toBeHidden()
            await expect(page).toHaveURL(/\/login$/)
            await expect(login.heading).toBeVisible()
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
          })

          await test.step('A new sign-in starts in Light and Settings agrees', async () => {
            await login.signIn(credentials.email, credentials.password)
            await expect(page).toHaveURL(/\/dashboard$/)
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
            await sidebar.openUtility('Settings')
            await expect(settings.heading).toBeVisible()
            await settings.waitForPreferences()
            await expectTheme(page, settings, 'light')
          })

          expect(preferenceWrites, 'The session theme must not change account preferences').toHaveLength(0)
          expect(await api.alertPreferences(account.customerId)).toEqual(saved)
        })
      })

      test('Top-bar theme button', async ({
        page, account, api, dashboard, sidebar, settings, topBar, toasts, preferenceWrites,
      }) => {
        const saved = await api.alertPreferences(account.customerId)
        await dashboard.goto()
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
        await expect(topBar.themeToggle).toHaveAccessibleName('Use dark theme')

        await test.step('The Dashboard top-bar button switches to Dark', async () => {
          await topBar.themeToggle.click()
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
          await expect(topBar.themeToggle).toHaveAccessibleName('Use light theme')
          await expect(toasts.messages).toHaveCount(0)
        })

        await test.step('Settings follows the theme selected in the top bar', async () => {
          await sidebar.openUtility('Settings')
          await expect(settings.heading).toBeVisible()
          await settings.waitForPreferences()
          await expectTheme(page, settings, 'dark')
          await expect(topBar.themeToggle).toHaveAccessibleName('Use light theme')
        })

        await test.step('The second top-bar click updates both controls to Light', async () => {
          await topBar.themeToggle.click()
          await expectTheme(page, settings, 'light')
          await expect(topBar.themeToggle).toHaveAccessibleName('Use dark theme')
          await expect(toasts.messages).toHaveCount(0)
        })

        expect(preferenceWrites, 'Top-bar theme changes must not save account preferences').toHaveLength(0)
        expect(await api.alertPreferences(account.customerId)).toEqual(saved)
      })
    })
  })
})
