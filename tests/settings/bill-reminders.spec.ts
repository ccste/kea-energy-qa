import { test, expect } from './settings-test'

test.describe('Settings Change', () => {
  test.describe('Turn bill reminders on or off', () => {
    test.describe('Positive Testing', () => {
      test('Turn bill reminders off and on', async ({ page, account, api, openSettings, settings, toasts, preferenceWrites }) => {
        const original = await api.alertPreferences(account.customerId)
        const path = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
        await openSettings()
        for (const enabled of [false, true]) {
          const responsePromise = page.waitForResponse((response) =>
            response.request().method() === 'PUT' && new URL(response.url()).pathname === path)
          await settings.billReminders.setChecked(enabled)
          const response = await responsePromise
          expect(response.status()).toBe(200)
          const expected = { ...original, bill_reminders: enabled }
          expect(response.request().postDataJSON()).toEqual(expected)
          expect(await response.json()).toEqual(expected)
          await expect(toasts.message(`Bill reminders ${enabled ? 'on' : 'off'}`)).toBeVisible()
          await expect(settings.saveAlertSettingsButton).toBeDisabled()
          expect(await api.alertPreferences(account.customerId)).toEqual(expected)
          await settings.reloadPreferences()
          await expect(settings.billReminders).toBeChecked({ checked: enabled })
        }
        expect(preferenceWrites).toHaveLength(2)
      })
    })

    test.describe('Negative Testing', () => {
      test('Save fails', async ({ page, account, api, openSettings, settings, toasts, preferenceWrites }) => {
        const original = await api.alertPreferences(account.customerId)
        await openSettings()
        const path = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
        const reason = 'Reminder settings are temporarily unavailable'
        await page.route((url) => url.pathname === path, async (route) => {
          if (route.request().method() !== 'PUT') return route.fallback()
          await route.fulfill({ status: 500, json: { detail: reason } })
        })
        const responsePromise = page.waitForResponse((response) =>
          response.request().method() === 'PUT' && new URL(response.url()).pathname === path)
        await settings.billReminders.uncheck()
        expect((await responsePromise).status()).toBe(500)
        await expect(toasts.message(`Could not save: ${reason}`)).toBeVisible()
        await expect(toasts.message('Bill reminders off')).toBeHidden()
        await expect(settings.billReminders).toBeChecked()
        expect(await api.alertPreferences(account.customerId)).toEqual(original)
        await settings.reloadPreferences()
        await expect(settings.billReminders).toBeChecked()
        expect(preferenceWrites).toHaveLength(1)
      })
    })
  })
})
