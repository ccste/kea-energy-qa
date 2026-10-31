import type { Request } from '@playwright/test'
import { test as base, expect } from '../../fixtures/test'

type SettingsFixtures = {
  allowSignIn: boolean
  openSettings: () => Promise<void>
  preferenceWrites: Request[]
  _settingsGuard: void
}

export const test = base.extend<SettingsFixtures>({
  allowSignIn: [false, { option: true }],
  _settingsGuard: [async ({ page, account, baseURL, allowSignIn, credentials, _alertIsolation }, use) => {
    if (account.alias !== 'rangi') throw new Error('Settings cases require the reserved Rangi account.')
    const unexpectedWrites: string[] = []
    const path = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
    await page.route((url) => url.pathname === '/api' || url.pathname.startsWith('/api/'), async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const sameOrigin = url.origin === new URL(baseURL!).origin
      if (['GET', 'HEAD'].includes(request.method())
        || (sameOrigin && request.method() === 'PUT' && url.pathname === path)
        || (allowSignIn && sameOrigin && request.method() === 'POST' && url.pathname === '/api/auth/login'
          && request.postDataJSON()?.email === credentials.email)) {
        await route.fallback()
      } else {
        unexpectedWrites.push(`${request.method()} ${url.pathname}`)
        await route.abort('blockedbyclient')
      }
    })
    try {
      await use()
    } finally {
      expect(unexpectedWrites, 'Only reserved-account preference writes and an explicit sign-in are allowed').toEqual([])
    }
  }, { auto: true }],
  preferenceWrites: async ({ page, account }, use) => {
    const writes: Request[] = []
    const path = `/api/households/${encodeURIComponent(account.customerId)}/alert-preferences`
    const record = (request: Request) => {
      if (request.method() === 'PUT' && new URL(request.url()).pathname === path) writes.push(request)
    }
    page.on('request', record)
    await use(writes)
    page.off('request', record)
  },
  openSettings: async ({ dashboard, sidebar, settings, _settingsGuard }, use) => {
    await use(async () => {
      await dashboard.goto()
      await sidebar.openUtility('Settings')
      await expect(settings.heading).toBeVisible()
      await settings.waitForPreferences()
    })
  },
})

export { expect } from '@playwright/test'
