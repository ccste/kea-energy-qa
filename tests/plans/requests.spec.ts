import type { Page, Request, Route } from '@playwright/test'
import { expect, test } from './plan-test'
import { PLAN_REQUEST_CONFIRMATION } from '../../data/plan-cases'
import { expectSelection, readCatalogue } from './plan-expectations'

type RequestEvidence = { body: unknown; hasBearerToken: boolean; forwarded: boolean }

/** Hold the response until the pending UI has been checked. Never log authorization values. */
async function controlRequest(page: Page, customerId: string, mode: 'real' | 'error' | 'duplicate') {
  const pathname = `/api/households/${customerId}/plan-change-requests`
  const matches = (url: URL) => url.pathname === pathname
  const isPost = (request: Request) => new URL(request.url()).pathname === pathname && request.method() === 'POST'
  const requests: RequestEvidence[] = []
  let release!: (send: boolean) => void
  const gate = new Promise<boolean>(resolve => { release = resolve })
  const active = new Set<Promise<void>>()
  const expectedBody = { customer_id: customerId, pricing_style: 'time-of-use', commitment_term: '6-months' }
  const handle = async (route: Route) => {
    if (!isPost(route.request())) return route.fallback()
    const request = route.request()
    const body = request.postDataJSON() as Record<string, unknown>
    const entry = { body, hasBearerToken: /^Bearer \S+$/.test(await request.headerValue('authorization') ?? ''), forwarded: false }
    requests.push(entry)
    // Keep even a broken duplicate-click implementation from recording extra real requests.
    if (requests.length > 1 || Object.keys(body).length !== 3 ||
        Object.entries(expectedBody).some(([key, value]) => body[key] !== value) || !entry.hasBearerToken) {
      await route.abort('blockedbyclient')
      return
    }
    if (!await gate) {
      await route.abort('blockedbyclient')
      return
    }
    if (mode === 'real') {
      entry.forwarded = true
      await route.continue()
    } else if (mode === 'error') {
      await route.fulfill({ status: 500, json: {} })
    } else {
      await route.fulfill({ status: 201, json: {
        account_ref: customerId, from_plan: null, to_plan_code: 'time-of-use',
        to_plan_name: 'Time of Use · 6-months', status: 'pending_review', channel: 'app',
        requested_at: new Date().toISOString(),
      } })
    }
  }
  const handler = (route: Route) => {
    const task = handle(route)
    active.add(task)
    void task.then(() => active.delete(task), () => active.delete(task))
    return task
  }
  await page.route(matches, handler)
  return {
    requests, release, isPost, expectedBody,
    async close() {
      release(false)
      await page.unroute(matches, handler)
      await Promise.all(active)
    },
  }
}

test.describe('Plan Request', () => {
  test.describe('Request this plan', () => {
    test.describe('Positive Testing', () => {
      // This is the only real plan write. A retry would create another stored request.
      test.describe.configure({ retries: 0 })

      test('Request a new plan', async ({ account, api, page, dashboard, sidebar, plans, toasts }, testInfo) => {
        const catalogue = await readCatalogue(api, account.customerId)
        const before = await api.profile(account.customerId)
        await dashboard.goto()
        await sidebar.navigateTo('Plans')
        await plans.chooseStyle('Time of Use')
        await plans.chooseTerm('6 months')
        await expectSelection(plans, catalogue, 'time-of-use', '6-months')
        const controlled = await controlRequest(page, account.customerId, 'real')
        try {
          const sent = page.waitForRequest(controlled.isPost)
          await plans.requestButton.click()
          await sent
          await expect(plans.requestButton).toHaveText('Sending request…')
          await expect(plans.requestButton).toBeDisabled()
          await expect.poll(() => controlled.requests.length).toBe(1)
          expect(controlled.requests).toEqual([{ body: controlled.expectedBody, hasBearerToken: true, forwarded: false }])
          const responded = page.waitForResponse(response => controlled.isPost(response.request()))
          controlled.release(true)
          const response = await responded
          expect(response.status()).toBe(201)
          const receipt = await response.json() as { account_ref: string; to_plan_code: string; to_plan_name: string; status: string; channel: string }
          expect(receipt).toMatchObject({ account_ref: account.customerId, to_plan_code: 'time-of-use', to_plan_name: 'Time of Use · 6-months', status: 'pending_review', channel: 'app' })
          await expect(toasts.message(PLAN_REQUEST_CONFIRMATION)).toHaveCount(1)
          await expect(toasts.message(PLAN_REQUEST_CONFIRMATION)).toHaveClass(/\btoast-info\b/)
          await expect(plans.requestButton).toHaveText('Request this plan')
          await expect(plans.requestButton).toBeEnabled()
          await page.reload()
          await expectSelection(plans, catalogue, 'anytime', 'flexible')
          expect((await api.plans(account.customerId)).current_plan).toEqual(catalogue.current_plan)
          const after = await api.profile(account.customerId)
          expect(after.plan_name).toBe(before.plan_name)
          expect(controlled.requests).toEqual([{ body: controlled.expectedBody, hasBearerToken: true, forwarded: true }])
          await testInfo.attach('Recorded plan request', {
            body: JSON.stringify({ requests: controlled.requests, status: response.status(), receipt, currentPlanBefore: before.plan_name, currentPlanAfter: after.plan_name }, null, 2),
            contentType: 'application/json',
          })
        } finally {
          await controlled.close()
        }
      })
    })

    test.describe('Negative Testing', () => {
      test('Request fails', async ({ account, api, page, dashboard, sidebar, plans, toasts }, testInfo) => {
        const catalogue = await readCatalogue(api, account.customerId)
        const controlled = await controlRequest(page, account.customerId, 'error')
        try {
          await dashboard.goto()
          await sidebar.navigateTo('Plans')
          await plans.chooseStyle('Time of Use')
          await plans.chooseTerm('6 months')
          const sent = page.waitForRequest(controlled.isPost)
          await plans.requestButton.click()
          await sent
          await expect(plans.requestButton).toHaveText('Sending request…')
          await expect(plans.requestButton).toBeDisabled()
          await expect.poll(() => controlled.requests.length).toBe(1)
          const responded = page.waitForResponse(response => controlled.isPost(response.request()))
          controlled.release(true)
          expect((await responded).status()).toBe(500)
          await expect(toasts.message('Account request failed (500).')).toBeVisible()
          await expect(toasts.message('Account request failed (500).')).toHaveClass(/\btoast-warning\b/)
          await expect(toasts.message(PLAN_REQUEST_CONFIRMATION)).toHaveCount(0)
          await expectSelection(plans, catalogue, 'time-of-use', '6-months')
          expect(controlled.requests).toEqual([{ body: controlled.expectedBody, hasBearerToken: true, forwarded: false }])
          await testInfo.attach('Rejected plan request (intercepted)', { body: JSON.stringify(controlled.requests, null, 2), contentType: 'application/json' })
        } finally {
          await controlled.close()
        }
      })

      test('Click Request twice quickly', async ({ account, page, dashboard, sidebar, plans, toasts }, testInfo) => {
        const controlled = await controlRequest(page, account.customerId, 'duplicate')
        try {
          await dashboard.goto()
          await sidebar.navigateTo('Plans')
          await plans.chooseStyle('Time of Use')
          await expect.poll(async () => (await plans.termHeading.boundingBox())?.y, {
            message: 'The pricing-style scroll has reached Step 2 before targeting the request button',
          }).toBeLessThan(240)
          await plans.chooseTerm('6 months')
          await expect(plans.requestButton).toBeEnabled()
          const sent = page.waitForRequest(controlled.isPost)
          // One action checks stability, then dispatches two physical clicks without re-waiting.
          await plans.requestButton.dblclick({ delay: 50 })
          await sent
          await expect(plans.requestButton).toHaveText('Sending request…')
          await expect(plans.requestButton).toBeDisabled()
          await expect.poll(() => controlled.requests.length).toBe(1)
          const responded = page.waitForResponse(response => controlled.isPost(response.request()))
          controlled.release(true)
          expect((await responded).status()).toBe(201)
          await expect(toasts.message(PLAN_REQUEST_CONFIRMATION)).toHaveCount(1)
          await expect(plans.requestButton).toHaveText('Request this plan')
          await expect(plans.requestButton).toBeEnabled()
          expect(controlled.requests).toEqual([{ body: controlled.expectedBody, hasBearerToken: true, forwarded: false }])
          await testInfo.attach('Double-click request count (intercepted)', { body: JSON.stringify(controlled.requests, null, 2), contentType: 'application/json' })
        } finally {
          await controlled.close()
        }
      })
    })
  })
})
