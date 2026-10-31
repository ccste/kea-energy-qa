import { test, expect } from './bill-shock-test'
import { accountByAlias } from '../../data/accounts'
import { expectPanelState } from './expectations'

test.describe('Power Bill Shock Warning › View the warning › Negative Testing', () => {
  test.use({ account: accountByAlias('tama') })

  for (const endpoint of ['bill-shock', 'household'] as const) {
    test(`Bill-shock data unavailable — ${endpoint} returns HTTP 500`, async ({ page, account, dashboard }) => {
      const failedPath = `/api/households/${account.customerId}${endpoint === 'bill-shock' ? '/bill-shock' : ''}`
      await page.route((url) => url.pathname === failedPath, async (route) => {
        if (route.request().method() !== 'GET') return route.fallback()
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Assessment data unavailable.' }) })
      })
      const pending = page.waitForResponse((response) => response.request().method() === 'GET' && new URL(response.url()).pathname === failedPath)
      await dashboard.billShock.goto(account.customerId)
      expect((await pending).status()).toBe(500)
      await dashboard.billShock.open()
      const panel = dashboard.billShock
      await test.step('Show an unavailable assessment without figures or actions', async () => {
        await expectPanelState(panel, 'unavailable')
        await expect.soft(panel.summary).toHaveText('Kea can’t reach your meter data right now, so there is no projection to show. Nothing here is estimated in the meantime.')
        await expect.soft(panel.root).not.toContainText(/\d|NZD|%/)
        await expect.soft(panel.root.getByRole('button')).toHaveCount(0)
      })
      await test.step('Show placeholders in all four Usage & Costs tiles', async () => {
        await dashboard.openUsageSummary()
        await expect(dashboard.usageTiles).toHaveCount(4)
        for (const value of [dashboard.usageSoFar, dashboard.latestDayCost, dashboard.costSoFar, dashboard.projectedThisCycle]) {
          await expect.soft(value).toHaveText('—')
        }
      })
    })
  }

  test('Another household in the address', {
    annotation: { type: 'defect', description: '#38: A household URL parameter must not show another account’s data under the signed-in customer’s name.' },
  }, async ({ page, account, dashboard, login, openBillShock }, testInfo) => {
    const ownShock = await openBillShock()
    expect(ownShock.customer_id).toBe(account.customerId)
    const ownSummary = await dashboard.billShock.summary.innerText()
    await dashboard.openUsageSummary()
    const ownTiles = await dashboard.usageTiles.allInnerTexts()
    expect(ownTiles).toHaveLength(4)
    expect(ownTiles.join(' ')).not.toContain('—')

    await test.step('Open a foreign household address while still signed in as Tama', async () => {
      const refusals: number[] = []
      page.on('response', (response) => {
        if (/^\/api\/households\/[^/]+(?:\/bill-shock)?$/.test(new URL(response.url()).pathname)
          && [401, 403].includes(response.status())) refusals.push(response.status())
      })
      const document = await page.goto('/dashboard?household=H-JUL')
      // A forbidden response or an explicit access-denied page is also a valid outcome.
      if (document?.status() === 403) {
        await expect(dashboard.energyHome.root).toBeHidden()
        return
      }
      const denied = page.getByRole('alert').filter({ hasText: /access denied|not authorized|not authorised|forbidden/i })
      await expect(dashboard.heading.or(denied).or(login.heading).first()).toBeVisible()
      if (await login.heading.isVisible()) {
        await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
        await expect(dashboard.energyHome.root).toBeHidden()
        return
      }
      if (await denied.isVisible()) {
        await expect(dashboard.energyHome.root).toBeHidden()
        return
      }
      await expect(dashboard.greeting).toHaveText(`Welcome, ${account.displayName}`)
      await dashboard.billShock.open()
      if (await dashboard.billShock.heading.innerText() === 'Usage data unavailable') {
        expect(refusals, 'Unavailable is acceptable only with explicit authorization refusal, not an unrelated outage').not.toEqual([])
        await expect(dashboard.billShock.root).not.toContainText(/\d|NZD|%/)
        await dashboard.openUsageSummary()
        await expect(dashboard.usageTiles.locator('strong')).toHaveText(['—', '—', '—', '—'])
        return
      }
      const actualSummary = await dashboard.billShock.summary.innerText()
      await dashboard.openUsageSummary()
      const actualTiles = await dashboard.usageTiles.allInnerTexts()
      await testInfo.attach('Account isolation evidence', {
        body: JSON.stringify({ signedInAccount: account.displayName, ownSummary, actualSummary, ownTiles, actualTiles }, null, 2),
        contentType: 'application/json',
      })
      expect.soft(actualSummary, 'The panel retains Tama’s own assessment').toBe(ownSummary)
      expect.soft(actualTiles, 'Every summary tile retains Tama’s own figures').toEqual(ownTiles)
    })
  })
})
