import { expect, test } from './plan-test'
import { COMMITMENT_TERMS, PRICING_STYLES } from '../../data/plan-cases'
import { expectSelection, readCatalogue } from './plan-expectations'

test.describe('Plan Request', () => {
  test.describe('Choose a plan', () => {
    for (const style of PRICING_STYLES) {
      test(`Choosing a pricing style scrolls to Step 2 — ${style.name}`, async ({ page, dashboard, sidebar, plans }) => {
        await page.setViewportSize({ width: 1280, height: 720 })
        await dashboard.goto()
        await sidebar.navigateTo('Plans')
        await expect(plans.heading).toBeInViewport()
        await expect(plans.termHeading).not.toBeInViewport()
        await plans.chooseStyle(style.name)
        // No action targets Step 2 before these checks: scrolling must come from the product.
        await expect(plans.termHeading).toBeInViewport({ timeout: 2_000 })
        await expect.poll(async () => (await plans.termHeading.boundingBox())?.y, {
          message: 'Choosing a style scrolls the commitment heading near the top', timeout: 2_000,
        }).toBeLessThan(240)
        for (const term of COMMITMENT_TERMS) await expect(plans.termCard(term.name)).toBeInViewport()
        await expect(plans.styleChoice(style.name)).toHaveText('Selected')
        await expect(plans.styleChoice(style.name)).toBeChecked()
      })
    }

    for (const style of PRICING_STYLES) {
      for (const term of COMMITMENT_TERMS) {
        test(`Your selection for all 9 combinations — ${style.name} / ${term.name}`, async ({ account, api, dashboard, sidebar, plans }) => {
          const catalogue = await readCatalogue(api, account.customerId)
          await dashboard.goto()
          await sidebar.navigateTo('Plans')
          await plans.chooseStyle(style.name)
          await plans.chooseTerm(term.name)
          await expectSelection(plans, catalogue, style.id, term.id)
        })
      }
    }

    test('Change the selection', async ({ account, api, dashboard, sidebar, plans }) => {
      const catalogue = await readCatalogue(api, account.customerId)
      await dashboard.goto()
      await sidebar.navigateTo('Plans')
      await plans.chooseStyle('Time of Use')
      await plans.chooseTerm('12 months')
      await expectSelection(plans, catalogue, 'time-of-use', '12-months')
      await test.step('Changing the pricing style keeps the term', async () => {
        await plans.chooseStyle('Free Weekends')
        await expectSelection(plans, catalogue, 'free-weekends', '12-months')
      })
      await test.step('Changing the term keeps the pricing style', async () => {
        await plans.chooseTerm('Flexible')
        await expectSelection(plans, catalogue, 'free-weekends', 'flexible')
      })
    })
  })
})
