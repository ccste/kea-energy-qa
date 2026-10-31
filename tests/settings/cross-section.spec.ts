import { test, expect } from './settings-test'

test.describe('Settings Change', () => {
  test.describe('Change settings in several sections', () => {
    test('Every change is kept', async ({ page, account, api, openSettings, settings, toasts, preferenceWrites }) => {
      test.info().annotations.push({ type: 'defect', description: '#24: Saving Bill reminders overwrites the alert editor\'s previously saved Email level.' })
      const original = await api.alertPreferences(account.customerId)
      await openSettings()
      await settings.selectEmailThreshold(30)
      const alertResponse = await settings.saveAlertSettings(account.customerId)
      expect(alertResponse.status()).toBe(200)
      await expect(toasts.message('Alert settings saved')).toBeVisible()
      expect(await api.alertPreferences(account.customerId)).toEqual({ ...original, tier1_pct: 30 })

      const responsePromise = page.waitForResponse((response) => response.request().method() === 'PUT'
        && new URL(response.url()).pathname === `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`)
      await settings.billReminders.uncheck()
      const reminderResponse = await responsePromise
      expect(reminderResponse.status()).toBe(200)
      await expect(toasts.message('Bill reminders off')).toBeVisible()
      const saved = await api.alertPreferences(account.customerId)
      await test.info().attach('Preferences after both saves', {
        body: JSON.stringify({ firstSave: alertResponse.request().postDataJSON(), secondSave: reminderResponse.request().postDataJSON(), saved }, null, 2),
        contentType: 'application/json',
      })
      await settings.reloadPreferences()
      expect.soft(saved, 'Both saved changes survive in the full server record').toEqual({ ...original, tier1_pct: 30, bill_reminders: false })
      await expect.soft(settings.channel('Email').value).toHaveText('30% above normal')
      await expect(settings.billReminders).not.toBeChecked()
      expect(preferenceWrites).toHaveLength(2)
    })
  })
})
