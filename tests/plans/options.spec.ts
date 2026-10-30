import { accountByAlias } from '../../data/accounts'
import { expect, test } from './plan-test'
import { expectSelection, readCatalogue } from './plan-expectations'

test.describe('Plan Request', () => {
  test.describe('View plan options', () => {
    test.describe('Positive Testing', () => {
      test('Opens on the default selection', { tag: '@smoke' }, async ({ account, api, dashboard, sidebar, page, plans }) => {
        const catalogue = await readCatalogue(api, account.customerId)
        expect(catalogue.current_plan).toEqual({ pricing_style: null, term: null })
        await dashboard.goto()
        await sidebar.navigateTo('Plans')
        await expect(page).toHaveURL(/\/plans$/)
        await expect(plans.heading).toBeVisible()
        await expect(plans.subtitle).toBeVisible()
        await expect(plans.pricingStep).toBeVisible()
        await expect(plans.termStep).toBeVisible()
        await expect(plans.styleCards).toHaveCount(3)
        await expect(plans.termCards).toHaveCount(3)
        await expectSelection(plans, catalogue, 'anytime', 'flexible')
        await expect(plans.styleChoice('Anytime Rate')).toHaveText('Selected')
        await expect(plans.styleChoice('Time of Use')).toHaveText('Choose Time of Use')
        await expect(plans.styleChoice('Free Weekends')).toHaveText('Choose Free Weekends')
        await expect(plans.pricingGroup.getByText('Your current style', { exact: true })).toHaveCount(0)
      })

      test('Plan options match the API', async ({ account, api, dashboard, sidebar, plans }, testInfo) => {
        testInfo.annotations.push({ type: 'defect', description: '#12 Daily charge must state its unit once on each pricing card.' })
        const catalogue = await readCatalogue(api, account.customerId)
        await dashboard.goto()
        await sidebar.navigateTo('Plans')
        await expect(plans.styleCards).toHaveCount(catalogue.pricing_styles.length)
        await expect(plans.termCards).toHaveCount(catalogue.commitment_terms.length)
        await expect.soft(plans.styleCards.getByRole('heading', { level: 3 }))
          .toHaveText(catalogue.pricing_styles.map(style => style.name))
        // Card details are plain elements rather than individually named controls.
        await expect.soft(plans.termCards.locator('.term-name'))
          .toHaveText(catalogue.commitment_terms.map(term => term.name))

        const displayedDailyCharges: { style: string; expected: string; actual: string }[] = []
        for (const style of catalogue.pricing_styles) {
          const card = plans.styleCard(style.name)
          await expect.soft(card.locator('.pricing-eyebrow')).toHaveText(style.eyebrow)
          await expect.soft(card.locator('.pricing-summary')).toHaveText(style.best_for)
          const rateRows = card.locator('.pricing-rates > div:not(.pricing-daily)')
          await expect.soft(rateRows).toHaveCount(style.rates.length)
          for (const [index, rate] of style.rates.entries()) {
            const row = rateRows.nth(index)
            await expect.soft(row.locator('dt')).toHaveText(`${rate.label}${rate.window ?? ''}`)
            await expect.soft(row.locator('dd')).toHaveText(`${rate.value}${rate.unit}`)
            if (rate.window) await expect.soft(row.locator('dt > small')).toHaveText(rate.window)
            else await expect.soft(row.locator('dt > small')).toHaveCount(0)
          }
          await expect.soft(card.locator('.pricing-daily > dt')).toHaveText('Daily charge')
          const actual = (await card.locator('.pricing-daily > dd').innerText()).replace(/\s+/g, '')
          displayedDailyCharges.push({ style: style.name, expected: style.daily, actual })
          // The loaded catalogue is static; inspect every unit without repeated assertion timeouts.
          expect.soft(actual, `${style.name} shows the daily-charge unit exactly once`).toBe(style.daily.replace(/\s+/g, ''))
          await expect.soft(card.locator('.pricing-points > li')).toHaveText(style.highlights)
          await expect.soft(card.locator('.pricing-points > li > svg[aria-hidden="true"]')).toHaveCount(style.highlights.length)
          await expect.soft(card.locator('.pricing-bestfor > span')).toHaveText('Best for')
          await expect.soft(card.locator('.pricing-bestfor > strong')).toHaveText(style.best_for)
        }

        for (const term of catalogue.commitment_terms) {
          const card = plans.termCard(term.name)
          await expect.soft(card.locator('.term-credit')).toHaveText(`${term.monthly_credit}${term.monthly_credit === 'No credit' ? '' : ' / month'}`)
          await expect.soft(card.locator('.term-line')).toHaveText([
            term.price_treatment,
            `${term.total_credit} total credit`,
            `Early exit fee: ${term.early_exit_fee.toLowerCase()}`,
          ])
        }
        await testInfo.attach('Catalogue options and displayed daily charges', {
          body: JSON.stringify({ catalogue, displayedDailyCharges }, null, 2),
          contentType: 'application/json',
        })
      })
    })

    test.describe('Data scenarios', () => {
      test.use({ account: accountByAlias('generated') })
      test('Current plan is recognised', async ({ account, api, dashboard, topBar, profile, sidebar, billing, plans }, testInfo) => {
        testInfo.annotations.push({ type: 'defect', description: '#13 Plans must recognise Generated Demo Household\'s Free Weekends plan shown on Profile and Billing.' })
        const catalogue = await readCatalogue(api, account.customerId)
        const knownPlan = 'Free Weekends (VECT, Standard user)'
        await dashboard.goto()
        await topBar.openProfile()
        await expect(profile.detail('Plan:')).toHaveText(knownPlan)
        const profilePlan = (await profile.detail('Plan:').innerText()).trim()
        await sidebar.navigateTo('Billing')
        await expect(billing.cardHeading).toHaveText(knownPlan)
        const billingPlan = (await billing.cardHeading.innerText()).trim()
        await sidebar.navigateTo('Plans')
        await expect(plans.styleCards).toHaveCount(3)
        const freeWeekends = plans.styleCard('Free Weekends')
        const anytime = plans.styleCard('Anytime Rate')
        const actual = {
          freeWeekendsChecked: await plans.styleChoice('Free Weekends').getAttribute('aria-checked'),
          freeWeekendsButton: (await plans.styleChoice('Free Weekends').innerText()).trim(),
          freeWeekendsCurrentTags: await freeWeekends.getByText('Your current style', { exact: true }).count(),
          anytimeChecked: await plans.styleChoice('Anytime Rate').getAttribute('aria-checked'),
          anytimeCurrentTags: await anytime.getByText('Your current style', { exact: true }).count(),
        }
        await testInfo.attach('Current plan across customer pages', {
          body: JSON.stringify({ customerId: account.customerId, profilePlan, billingPlan, apiCurrentPlan: catalogue.current_plan, actual }, null, 2),
          contentType: 'application/json',
        })
        expect.soft(actual.freeWeekendsChecked, 'Free Weekends is preselected').toBe('true')
        expect.soft(actual.freeWeekendsButton).toBe('Selected')
        expect.soft(actual.freeWeekendsCurrentTags, 'Free Weekends is identified as the current style').toBe(1)
        expect.soft(actual.anytimeChecked, 'Anytime Rate is not preselected').toBe('false')
        expect.soft(actual.anytimeCurrentTags, 'Anytime Rate has no current-style tag').toBe(0)
      })
    })

    test.describe('Negative Testing', () => {
      test('Plans service unavailable', async ({ account, api, dashboard, sidebar, page, plans }, testInfo) => {
        testInfo.annotations.push({ type: 'defect', description: '#14 A Plans load failure must offer Retry and recover when the service returns.' })
        const catalogue = await readCatalogue(api, account.customerId)
        const path = `/api/households/${encodeURIComponent(account.customerId)}/plans`
        const matches = (url: URL) => url.pathname === path
        await page.route(matches, route => route.request().method() === 'GET'
          ? route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
          : route.fallback())
        try {
          await dashboard.goto()
          const failedResponse = page.waitForResponse(response =>
            response.request().method() === 'GET' && new URL(response.url()).pathname === path && response.status() === 500,
          )
          await sidebar.navigateTo('Plans')
          await failedResponse
          await expect(plans.error.getByRole('heading', { name: 'Something went wrong', exact: true })).toBeVisible()
          await expect.soft(plans.error).toContainText('Account request failed (500).')
          await expect.soft(plans.pricingStep).toBeHidden()
          await expect.soft(plans.termStep).toBeHidden()
          await expect.soft(plans.summary).toBeHidden()
          await testInfo.attach('Plans error and recovery control', {
            body: JSON.stringify({ error: await plans.error.innerText(), retryButtons: await plans.retry.count() }, null, 2),
            contentType: 'application/json',
          })
          await page.unroute(matches)
          await expect(plans.retry, 'The recovered service can be retried without reloading the browser').toBeVisible()
          const recoveredResponse = page.waitForResponse(response =>
            response.request().method() === 'GET' && new URL(response.url()).pathname === path && response.status() === 200,
          )
          await plans.retry.click()
          await (await recoveredResponse).finished()
          await expect(plans.error).toBeHidden()
          await expect(plans.styleCards).toHaveCount(3)
          await expectSelection(plans, catalogue, 'anytime', 'flexible')
        } finally {
          await page.unroute(matches)
        }
      })
    })
  })
})
