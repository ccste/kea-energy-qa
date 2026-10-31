import type { Locator, Response, Route } from '@playwright/test'
import { test, expect } from './settings-test'
import type { AlertPreferences } from '../../api/types'
import type { KeaApi } from '../../api/client'
import type { SettingsPage } from '../../pages/SettingsPage'
import type { ToastStack } from '../../pages/components/ToastStack'

async function expectSaved(response: Response, expected: AlertPreferences, api: KeaApi, settings: SettingsPage, toasts: ToastStack): Promise<void> {
  expect(response.status()).toBe(200)
  expect(response.request().postDataJSON()).toEqual(expected)
  expect(await response.json()).toEqual(expected)
  await expect(toasts.message('Alert settings saved')).toBeVisible()
  await expect(settings.saveAlertSettingsButton).toBeDisabled()
  expect(await api.alertPreferences(expected.account_ref)).toEqual(expected)
}

async function optionValues(thresholds: Locator): Promise<number[]> {
  return thresholds.getByRole('radio').evaluateAll((radios) => radios.map((radio) => Number((radio as HTMLInputElement).value)))
}

async function expectDisabledOptions(thresholds: Locator, disabled: boolean): Promise<void> {
  const actual = await thresholds.getByRole('radio').evaluateAll((radios) => radios.map((radio) => radio.matches(':disabled')))
  expect(actual.length, 'The channel offers level options').toBeGreaterThan(0)
  expect.soft(actual, 'Every level option follows its channel enabled state').toEqual(actual.map(() => disabled))
}

test.describe('Settings Change', () => {
  test.describe('Set bill-shock alerts', () => {
    test.describe('Positive Testing', () => {
      test('Turn all bill-shock alerts off', async ({ account, api, openSettings, settings, toasts, preferenceWrites }) => {
        const original = await api.alertPreferences(account.customerId)
        await openSettings()
        await expect(settings.saveAlertSettingsButton).toBeDisabled()
        await settings.billShockAlerts.uncheck()
        await expect(settings.saveAlertSettingsButton).toBeEnabled()
        const expectDisabledSection = async () => {
          await expect(settings.billShockAlerts).not.toBeChecked()
          await expect(settings.alertFieldset).toHaveAttribute('disabled', '')
          await expect(settings.alertFieldset).toHaveCSS('opacity', '0.45')
          for (const channel of settings.alertChannels) {
            await expect(channel.switch).toBeDisabled()
            await expectDisabledOptions(channel.thresholds, true)
          }
          await expect(settings.minimumOvershoot).toBeDisabled()
          await expect(settings.quietHoursStart).toBeDisabled()
          await expect(settings.quietHoursEnd).toBeDisabled()
          await expect(settings.billReminders).toBeEnabled()
          await expect(settings.billReminders).toBeChecked()
        }
        await expectDisabledSection()
        await expectSaved(await settings.saveAlertSettings(account.customerId), { ...original, enabled: false }, api, settings, toasts)
        await settings.reloadPreferences()
        await expectDisabledSection()
        expect(preferenceWrites).toHaveLength(1)
      })

      test('Turn one channel off or on', async ({ account, api, openSettings, settings, toasts, preferenceWrites }) => {
        test.info().annotations.push({ type: 'defect', description: '#29: Disabled channels leave their level options selectable.' })
        const original = await api.alertPreferences(account.customerId)
        await openSettings()
        const channels = settings.alertChannels
        const expectedStates = [true, true, false]
        for (const [index, enabled] of [[0, false], [1, false], [2, true]] as const) {
          await channels[index].switch.setChecked(enabled)
          expectedStates[index] = enabled
          for (const [rowIndex, channel] of channels.entries()) {
            await expect(channel.switch).toBeChecked({ checked: expectedStates[rowIndex] })
            await expect(channel.switch).toBeEnabled()
            if (expectedStates[rowIndex]) {
              await expect(channel.row).not.toHaveClass(/\bchannel-off\b/)
              await expect(channel.row).toHaveCSS('opacity', '1')
            } else {
              await expect(channel.row).toHaveClass(/\bchannel-off\b/)
              await expect(channel.row).toHaveCSS('opacity', '0.5')
            }
          }
        }
        for (const [index, channel] of channels.entries()) await expectDisabledOptions(channel.thresholds, !expectedStates[index])
        const expected = { ...original, email_enabled: false, sms_enabled: false, voice_enabled: true }
        await expectSaved(await settings.saveAlertSettings(account.customerId), expected, api, settings, toasts)
        await settings.reloadPreferences()
        for (const [index, channel] of channels.entries()) await expect(channel.switch).toBeChecked({ checked: expectedStates[index] })
        expect(preferenceWrites).toHaveLength(1)
      })

      test('Choose alert levels and save', async ({ page, account, api, openSettings, settings, toasts, preferenceWrites }) => {
        const original = await api.alertPreferences(account.customerId)
        await openSettings()
        await expect(settings.saveAlertSettingsButton).toBeDisabled()
        await settings.selectEmailThreshold(30)
        await expect(settings.saveAlertSettingsButton).toBeEnabled()
        await settings.selectThreshold('Text message', 60)
        await settings.channel('A call from Sparky').switch.check()
        await settings.selectThreshold('A call from Sparky', 90)
        await settings.minimumOvershoot.fill('50')
        await settings.quietHoursStart.selectOption('22')
        await settings.quietHoursEnd.selectOption('7')
        const expectValues = async () => {
          for (const [index, level] of [30, 60, 90].entries()) {
            await expect(settings.alertChannels[index].value).toHaveText(`${level}% above normal`)
            await expect(settings.alertChannels[index].thresholds.getByRole('radio', { name: `${level} percent above normal`, exact: true })).toBeChecked()
          }
          await expect(settings.channel('A call from Sparky').switch).toBeChecked()
          await expect(settings.minimumOvershoot).toHaveValue('50')
          await expect(settings.quietHoursStart).toHaveValue('22')
          await expect(settings.quietHoursEnd).toHaveValue('7')
          await expect(settings.quietHoursStart.locator('option:checked')).toHaveText('10 pm')
          await expect(settings.quietHoursEnd.locator('option:checked')).toHaveText('7 am')
        }
        await expectValues()
        expect(preferenceWrites).toHaveLength(0)
        const path = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
        const match = (url: URL) => url.pathname === path
        let reached!: () => void
        let release!: (forward: boolean) => void
        let pendingSave: Promise<void> | undefined
        const entered = new Promise<void>((resolve) => { reached = resolve })
        const gate = new Promise<boolean>((resolve) => { release = resolve })
        const holdSave = async (route: Route) => {
          if (route.request().method() !== 'PUT') return route.fallback()
          pendingSave = (async () => {
            reached()
            if (!await gate) return route.abort('aborted')
            const response = await route.fetch({ timeout: 10_000, maxRetries: 0 })
            await route.fulfill({ response })
          })()
          await pendingSave
        }
        await page.route(match, holdSave)
        const responsePromise = page.waitForResponse((response) => response.request().method() === 'PUT' && new URL(response.url()).pathname === path)
          .catch(() => undefined)
        try {
          await settings.saveAlertSettingsButton.click()
          await entered
          await expect.soft(settings.saveAlertSettingsButton).toHaveText('Saving…')
          await expect.soft(settings.saveAlertSettingsButton).toBeDisabled()
          release(true)
          const expected = { ...original, tier1_pct: 30, tier2_pct: 60, tier3_pct: 90, voice_enabled: true, min_overshoot_nzd: 50, quiet_hours_start: 22, quiet_hours_end: 7 }
          const response = await responsePromise
          expect(response, 'The real preference save returns a response').toBeDefined()
          await expectSaved(response!, expected, api, settings, toasts)
        } finally {
          // Abort an unreleased save; finish an already forwarded save before fixture restoration.
          release(false)
          try {
            await pendingSave
          } finally {
            await page.unroute(match, holdSave)
          }
        }
        await settings.reloadPreferences()
        await expectValues()
        expect(preferenceWrites).toHaveLength(1)
      })

      test('Level options stay the same and include the default', async ({ account, api, openSettings, settings, toasts, preferenceWrites }) => {
        test.info().annotations.push({ type: 'defect', description: '#30: Email and Call default levels disappear from the options after saving another level.' })
        const original = await api.alertPreferences(account.customerId)
        const defaults = [original.tier1_pct, original.tier2_pct, original.tier3_pct]
        const steps = [[10, 20, 30, 40], [40, 50, 60, 70], [70, 80, 90, 100]]
        await openSettings()
        const before: number[][] = []
        for (const [index, channel] of settings.alertChannels.entries()) {
          before.push(await optionValues(channel.thresholds))
          expect(before[index]).toEqual([...new Set([...steps[index], defaults[index]])].sort((a, b) => a - b))
        }
        await settings.selectEmailThreshold(40)
        await settings.channel('A call from Sparky').switch.check()
        await settings.selectThreshold('A call from Sparky', 90)
        await expectSaved(await settings.saveAlertSettings(account.customerId), { ...original, tier1_pct: 40, tier3_pct: 90, voice_enabled: true }, api, settings, toasts)
        await settings.reloadPreferences()
        const after: number[][] = []
        for (const [index, channel] of settings.alertChannels.entries()) {
          after.push(await optionValues(channel.thresholds))
          expect.soft(after[index], `${channel.name} options stay fixed after saving`).toEqual(before[index])
          expect.soft(after[index], `${channel.name} default remains available`).toContain(defaults[index])
          if (after[index].includes(defaults[index])) {
            await settings.selectThreshold(channel.name, defaults[index])
            await expect(channel.thresholds.getByRole('radio', { name: `${defaults[index]} percent above normal`, exact: true })).toBeChecked()
          }
        }
        await test.info().attach('Level options before and after saving', { body: JSON.stringify({ defaults, before, after }, null, 2), contentType: 'application/json' })
        expect(preferenceWrites).toHaveLength(1)
      })
    })

    test.describe('Negative Testing', () => {
      test.describe('Never alert me under ($)', () => {
        for (const { amount, reason } of [
          { amount: 501, reason: 'Input should be less than or equal to 500' },
          { amount: -5, reason: 'Input should be greater than or equal to 0' },
        ]) {
          test(`Amount outside $0–$500 — ${amount}`, async ({ account, api, openSettings, settings, toasts, preferenceWrites }) => {
            const original = await api.alertPreferences(account.customerId)
            await openSettings()
            await settings.minimumOvershoot.fill(String(amount))
            const response = await settings.saveAlertSettings(account.customerId)
            expect(response.status()).toBe(422)
            expect(response.request().postDataJSON()).toEqual({ ...original, min_overshoot_nzd: amount })
            await expect(toasts.message(`Could not save: ${reason}`)).toBeVisible()
            await expect(toasts.message('Alert settings saved')).toBeHidden()
            expect(await api.alertPreferences(account.customerId)).toEqual(original)
            await settings.reloadPreferences()
            await expect(settings.minimumOvershoot).toHaveValue(String(original.min_overshoot_nzd))
            expect(preferenceWrites).toHaveLength(1)
          })
        }

        test('Empty', async ({ page, account, api, openSettings, settings, toasts, preferenceWrites }) => {
          test.info().annotations.push({ type: 'defect', description: '#25: Clearing the minimum amount coerces the field to zero and saves zero without validation.' })
          const original = await api.alertPreferences(account.customerId)
          await openSettings()
          const path = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
          const responses: Response[] = []
          const record = (response: Response) => {
            if (response.request().method() === 'PUT' && new URL(response.url()).pathname === path) responses.push(response)
          }
          const requiredMessage = page.getByText(/(?:enter|provide|specify).*(?:amount|minimum)|(?:amount|minimum).*required/i)
          let attemptedSave = false
          const hasValidation = async () => await requiredMessage.first().isVisible()
            || (attemptedSave && await settings.minimumOvershoot.evaluate((input) =>
              document.activeElement === input && !(input as HTMLInputElement).validity.valid
                && Boolean((input as HTMLInputElement).validationMessage)))
          page.on('response', record)
          try {
            await settings.minimumOvershoot.fill('')
            const clearedValue = await settings.minimumOvershoot.inputValue()
            if (await settings.saveAlertSettingsButton.isEnabled()) {
              attemptedSave = true
              await settings.saveAlertSettingsButton.click()
              await expect.poll(async () => responses.length > 0 || await hasValidation(), { message: 'Saving finishes or required-amount validation is shown' }).toBe(true)
            }
            const responseEvidence: { status: number; body: unknown }[] = []
            for (const response of responses) {
              await response.finished()
              responseEvidence.push({ status: response.status(), body: await response.json() })
            }
            await expect(settings.saveAlertSettingsButton).toHaveText('Save alert settings')
            const validationShown = await hasValidation()
            const successShown = await toasts.message('Alert settings saved').isVisible()
            const saved = await api.alertPreferences(account.customerId)
            await settings.reloadPreferences()
            const reloadedValue = await settings.minimumOvershoot.inputValue()
            const afterReload = await api.alertPreferences(account.customerId)
            await test.info().attach('Empty amount save and reload evidence', {
              body: JSON.stringify({ clearedValue, validationShown, successShown, requests: preferenceWrites.map((request) => request.postDataJSON()), responses: responseEvidence, original, saved, reloadedValue, afterReload }, null, 2),
              contentType: 'application/json',
            })
            expect.soft(clearedValue, 'Clearing the field leaves an empty amount instead of replacing it with zero').toBe('')
            expect.soft(validationShown, 'The page asks for an amount').toBe(true)
            expect.soft(successShown, 'An empty amount must not be reported as saved').toBe(false)
            expect.soft(saved, 'The entire saved record remains unchanged').toEqual(original)
            expect.soft(reloadedValue, 'Reload restores the previous amount').toBe(String(original.min_overshoot_nzd))
            expect.soft(afterReload).toEqual(original)
          } finally {
            page.off('response', record)
          }
        })

      })

      test('Save fails', async ({ page, account, api, openSettings, settings, toasts, preferenceWrites }) => {
        const original = await api.alertPreferences(account.customerId)
        await openSettings()
        const path = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
        const match = (url: URL) => url.pathname === path
        const reason = 'Alert settings service unavailable.'
        const failSave = async (route: Route) => {
          if (route.request().method() !== 'PUT') return route.fallback()
          await route.fulfill({ status: 500, json: { detail: reason } })
        }
        await page.route(match, failSave)
        try {
          await settings.selectEmailThreshold(30)
          const response = await settings.saveAlertSettings(account.customerId)
          expect(response.status()).toBe(500)
          expect(response.request().postDataJSON()).toEqual({ ...original, tier1_pct: 30 })
          await expect(toasts.message(`Could not save: ${reason}`)).toBeVisible()
          await expect(toasts.message('Alert settings saved')).toBeHidden()
          expect(await api.alertPreferences(account.customerId)).toEqual(original)
        } finally {
          await page.unroute(match, failSave)
        }
        await settings.reloadPreferences()
        await expect(settings.channel('Email').value).toHaveText(`${original.tier1_pct}% above normal`)
        expect(await api.alertPreferences(account.customerId)).toEqual(original)
        expect(preferenceWrites).toHaveLength(1)
      })
    })
  })
})
