import { test, expect } from './settings-test'
import { DEFAULT_ALERT_PREFERENCES } from '../../data/alert-defaults'

test.describe('Settings Change', () => {
  test.describe('View the settings', () => {
    test.describe('Positive Testing', () => {
      test('Opens with the saved settings', { tag: '@smoke' }, async ({
        page, openSettings, settings, api, account, preferenceWrites,
      }) => {
        test.info().annotations.push({ type: 'defect', description: '#29: The default disabled Call channel leaves its level options enabled.' })
        const saved = await api.alertPreferences(account.customerId)
        expect(saved).toMatchObject({ ...DEFAULT_ALERT_PREFERENCES, account_ref: account.customerId })
        await openSettings()
        await expect(settings.heading).toBeVisible()
        await expect(settings.subtitle).toBeVisible()
        await expect(settings.appearanceDescription).toBeVisible()
        await expect(settings.lightTheme).toHaveClass(/\bactive\b/)
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
        await expect(settings.billShockAlerts).toBeChecked({ checked: saved.enabled })

        const rows = [
          { name: 'Email', enabled: saved.email_enabled, level: saved.tier1_pct, steps: [10, 20, 30, 40], note: 'Always in writing, so you have a record.' },
          { name: 'Text message', enabled: saved.sms_enabled, level: saved.tier2_pct, steps: [40, 50, 60, 70], note: 'Interrupts your day — set this higher than the email.' },
          { name: 'A call from Sparky', enabled: saved.voice_enabled, level: saved.tier3_pct, steps: [70, 80, 90, 100], note: 'Sparky calls you. Off unless you turn it on.' },
        ] as const
        for (const row of rows) {
          const channel = settings.channel(row.name)
          await expect(channel.switch).toBeChecked({ checked: row.enabled })
          await expect(channel.switch).toBeEnabled()
          const options = [...new Set<number>([...row.steps, row.level])].sort((a, b) => a - b)
          await expect(channel.thresholds.getByRole('radio')).toHaveCount(options.length)
          expect(await channel.thresholds.getByRole('radio').evaluateAll((radios) =>
            radios.map((radio) => Number((radio as HTMLInputElement).value)))).toEqual(options)
          await expect(channel.thresholds.getByRole('radio', { name: `${row.level} percent above normal`, exact: true })).toBeChecked()
          await expect(channel.value).toHaveText(`${row.level}% above normal`)
          await expect(channel.note).toHaveText(row.note)
          if (row.enabled) {
            await expect(channel.row).not.toHaveClass(/\bchannel-off\b/)
          } else {
            await expect(channel.row).toHaveClass(/\bchannel-off\b/)
            await expect(channel.row).toHaveCSS('opacity', '0.5')
          }
          const disabled = await channel.thresholds.getByRole('radio').evaluateAll((radios) =>
            radios.map((radio) => radio.matches(':disabled')))
          expect.soft(disabled, `${row.name} options follow its channel's enabled state`).toEqual(options.map(() => !row.enabled))
        }
        await expect(settings.minimumOvershoot).toHaveValue(String(saved.min_overshoot_nzd))
        await expect(settings.quietHoursStart).toHaveValue(String(saved.quiet_hours_start))
        await expect(settings.quietHoursEnd).toHaveValue(String(saved.quiet_hours_end))
        await expect(settings.quietHoursStart.locator('option:checked')).toHaveText('9 pm')
        await expect(settings.quietHoursEnd.locator('option:checked')).toHaveText('8 am')
        await expect(settings.saveAlertSettingsButton).toBeDisabled()
        await expect(settings.billReminders).toBeChecked({ checked: saved.bill_reminders })
        expect(preferenceWrites).toHaveLength(0)
        expect(await api.alertPreferences(account.customerId)).toEqual(saved)
      })
    })

    test.describe('Negative Testing', () => {
      test('Alert settings unavailable', async ({ page, account, dashboard, sidebar, settings, preferenceWrites }) => {
        const path = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
        const reason = 'Settings are temporarily unavailable'
        let failedReads = 0
        await page.route((url) => url.pathname === path, async (route) => {
          if (route.request().method() !== 'GET') return route.fallback()
          failedReads++
          await route.fulfill({ status: 500, json: { detail: reason } })
        })
        await dashboard.goto()
        await sidebar.openUtility('Settings')
        await expect(settings.heading).toBeVisible()
        await expect(settings.alertError).toHaveText(`Could not load your alert settings: ${reason}`)
        await expect(settings.alertFieldset).toBeHidden()
        await expect(settings.billShockAlerts).toBeHidden()
        await expect(settings.saveAlertSettingsButton).toBeHidden()
        await expect(settings.billReminders).toBeDisabled()
        expect(failedReads).toBeGreaterThanOrEqual(2)
        expect(preferenceWrites).toHaveLength(0)
      })
    })
  })
})
