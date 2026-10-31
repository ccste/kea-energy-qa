import { expect, test as base } from '../../fixtures/test'
import type { KeaApi } from '../../api/client'
import type { AlertPreferences, BillShockWarning } from '../../api/types'
import { DEFAULT_ALERT_PREFERENCES } from '../../data/alert-defaults'
import type { SettingsPage } from '../../pages/SettingsPage'
import type { ToastStack } from '../../pages/components/ToastStack'
import { expectPanelState } from './expectations'

const test = base.extend<{ _billShockSettingsGuard: void; _billShockSettingsEntry: void }>({
  _billShockSettingsGuard: [async ({ page, account, baseURL }, use) => {
    const unexpectedWrites: string[] = []
    const preferencesPath = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
    await page.route((url) => url.pathname === '/api' || url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (request.method() === 'GET' || request.method() === 'HEAD'
        || (request.method() === 'PUT' && account.alias === 'rangi'
          && url.origin === new URL(baseURL!).origin && url.pathname === preferencesPath)) {
        await route.fallback()
        return
      }
      unexpectedWrites.push(`${request.method()} ${url.pathname}`)
      await route.abort('blockedbyclient')
    })
    await use()
    expect(unexpectedWrites, 'Only the reserved account alert-preference write is allowed').toEqual([])
  }, { auto: true }],
  _billShockSettingsEntry: [async ({ dashboard, sidebar, settings, account, api, _alertIsolation, _billShockSettingsGuard }, use) => {
    if (account.alias !== 'rangi') throw new Error('Bill Shock settings cases require the reserved Rangi account.')
    await dashboard.billShock.goto(account.customerId)
    await dashboard.billShock.open()
    await expectStateAndFigures(dashboard.billShock, await api.billShock(account.customerId), 'warning')
    await sidebar.openUtility('Settings')
    await expect(settings.heading).toBeVisible()
    await expect(settings.billShockAlerts).toBeChecked()
    await expect(settings.emailAlerts).toBeChecked()
    await expect(settings.emailThresholds.getByRole('radio', { name: /^15 percent above normal(?:,|$)/ })).toBeChecked()
    await expect(settings.minimumOvershoot).toHaveValue('20')
    await use()
  }, { auto: true }],
})

async function expectStateAndFigures(
  panel: Parameters<typeof expectPanelState>[0],
  response: BillShockWarning,
  state: 'warning' | 'normal',
): Promise<void> {
  expect(response.triggered, 'The independent assessment agrees with the expected warning state').toBe(state === 'warning')
  expect(response.projected_cycle_cost_nzd).toBe(144.65)
  expect(response.expected_cost_nzd).toBe(108.07)
  await expectPanelState(panel, state)
  await expect(panel.summary).toContainText('144.65 NZD')
  await expect(panel.summary).toContainText('108.07 NZD')
}

async function saveAndVerify(
  settings: SettingsPage,
  api: KeaApi,
  customerId: string,
  expected: AlertPreferences,
  toasts: ToastStack,
): Promise<void> {
  const response = await settings.saveAlertSettings(customerId)
  expect(response.status(), 'The browser save succeeds').toBe(200)
  expect(response.request().postDataJSON(), 'The browser changes only the selected preference').toEqual(expected)
  expect(await response.json(), 'The save response confirms the complete preference record').toEqual(expected)
  await expect(toasts.message('Alert settings saved')).toBeVisible()
  expect(await api.alertPreferences(customerId), 'An independent read confirms the saved preferences').toEqual(expected)
}

test.describe('Power Bill Shock Warning', () => {
  test.describe('Warning follows the alert settings', () => {
    const boundaries = [
      { title: 'Email 30%', field: 'tier1_pct', value: 30, state: 'warning' },
      { title: 'Email 40%', field: 'tier1_pct', value: 40, state: 'normal' },
      { title: 'Never alert me under $35', field: 'min_overshoot_nzd', value: 35, state: 'warning' },
      { title: 'Never alert me under $40', field: 'min_overshoot_nzd', value: 40, state: 'normal' },
    ] as const

    for (const row of boundaries) {
      test(`Email level and dollar floor decide the warning — ${row.title}`, async ({
        account, api, credentials, settings, sidebar, dashboard, toasts,
      }) => {
        const original = await api.alertPreferences(account.customerId)
        expect(original).toMatchObject({ ...DEFAULT_ALERT_PREFERENCES, account_ref: account.customerId })
        if (row.field === 'tier1_pct') await settings.selectEmailThreshold(row.value)
        else await settings.setMinimumOvershoot(row.value)
        await saveAndVerify(settings, api, account.customerId, { ...original, [row.field]: row.value }, toasts)

        await dashboard.billShock.goto(account.customerId, () => sidebar.navigateTo('Dashboard'))
        await dashboard.billShock.open()
        await expectStateAndFigures(dashboard.billShock, await api.billShock(account.customerId), row.state)

        // Leave Dashboard so returning through the sidebar obtains a fresh assessment without a reload.
        await sidebar.openUtility('Settings')
        await expect(settings.heading).toBeVisible()
        const { access_token } = await api.login(credentials)
        await api.resetAlertPreferences(account.customerId, access_token)
        expect(await api.alertPreferences(account.customerId)).toEqual(original)
        await dashboard.billShock.goto(account.customerId, () => sidebar.navigateTo('Dashboard'))
        await dashboard.billShock.open()
        await expectStateAndFigures(dashboard.billShock, await api.billShock(account.customerId), 'warning')
      })
    }

    for (const row of [
      { title: 'Bill-shock alerts master switch', field: 'enabled' },
      { title: 'Email channel only', field: 'email_enabled' },
    ] as const) {
      test(`Turning alerts off keeps the warning in the app — ${row.title}`, async ({
        account, api, settings, sidebar, dashboard, toasts,
      }) => {
        const original = await api.alertPreferences(account.customerId)
        expect(original).toMatchObject({ ...DEFAULT_ALERT_PREFERENCES, account_ref: account.customerId })
        await (row.field === 'enabled' ? settings.billShockAlerts : settings.emailAlerts).uncheck()
        await saveAndVerify(settings, api, account.customerId, { ...original, [row.field]: false }, toasts)
        await dashboard.billShock.goto(account.customerId, () => sidebar.navigateTo('Dashboard'))
        await dashboard.billShock.open()
        await expectStateAndFigures(dashboard.billShock, await api.billShock(account.customerId), 'warning')
      })
    }
  })
})
