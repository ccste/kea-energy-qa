import { expect, test } from './plan-test'
import { readCatalogue } from './plan-expectations'

test.describe('Plan Request', () => {
  test.describe('Check rates and terms', () => {
    test('Compare all rates', async ({ account, api, dashboard, sidebar, plans }, testInfo) => {
      testInfo.annotations.push({ type: 'defect', description: '#15 Comparison omits usage rates and the free weekend period.' })
      const catalogue = await readCatalogue(api, account.customerId)
      await dashboard.goto()
      await sidebar.navigateTo('Plans')
      await plans.chooseStyle('Time of Use')
      await plans.chooseTerm('6 months')
      await plans.openComparison()
      const dialog = plans.compareDialog
      await expect(dialog.root.getByRole('heading', { name: 'Compare all rates', exact: true })).toBeVisible()
      await expect(dialog.root.getByRole('heading', { name: 'Pricing styles', exact: true })).toBeVisible()
      await expect(dialog.root.getByRole('heading', { name: 'Commitment terms', exact: true })).toBeVisible()
      // Both tables lack accessible names; their order follows the two visible section headings.
      const tables = dialog.root.getByRole('table')
      await expect(tables).toHaveCount(2)
      const pricingRows = tables.nth(0).getByRole('row')
      const termRows = tables.nth(1).getByRole('row')
      await expect(pricingRows).toHaveCount(7)
      await expect(termRows).toHaveCount(4)
      await expect(pricingRows.first().locator(':scope > span')).toHaveText(['Charge', ...catalogue.pricing_styles.map(style => style.name)])
      // These aliases express the approved table meaning, independently of the UI's lookup code.
      const rateRows = [
        { name: 'Daily charge', label: null }, { name: 'Anytime rate', label: 'Usage rate' },
        { name: 'Peak rate', label: 'Peak' }, { name: 'Off-peak rate', label: 'Off-peak' },
        { name: 'Night rate', label: 'Night' }, { name: 'Free period', label: 'Free weekend power' },
      ]
      const expectedRows = rateRows.map(row => [row.name, ...catalogue.pricing_styles.map(style => {
        if (row.label === null) return style.daily
        const rate = style.rates.find(item => item.label === row.label)
        return rate ? `${rate.value}${rate.unit}` : '—'
      })])
      const actualRows = await Promise.all(Array.from({ length: 6 }, (_, index) =>
        pricingRows.nth(index + 1).locator(':scope > span').allTextContents()))
      expect.soft(actualRows, 'Every catalogue rate belongs in the documented row and style column').toEqual(expectedRows)
      const pickedStyleIndex = catalogue.pricing_styles.findIndex(style => style.id === 'time-of-use') + 1
      const headers = pricingRows.first().locator(':scope > span')
      await expect(headers.nth(pickedStyleIndex).locator('svg')).toBeVisible()
      for (let index = 1; index <= 3; index++) {
        if (index !== pickedStyleIndex) await expect(headers.nth(index).locator('svg')).toHaveCount(0)
      }
      const colors = await Promise.all(Array.from({ length: 6 }, (_, index) =>
        pricingRows.nth(index + 1).locator(':scope > span').evaluateAll(elements =>
          elements.slice(1).map(element => getComputedStyle(element).color))))
      for (const rowColors of colors) {
        expect(rowColors[pickedStyleIndex - 1], 'Selected style data cells have a distinct visible highlight').not.toBe(rowColors[0])
        expect(rowColors[pickedStyleIndex - 1]).not.toBe(rowColors[2])
      }
      await expect(termRows.first().locator(':scope > span')).toHaveText(['Term', 'Price treatment', 'Monthly credit', 'Total credit', 'Early exit fee'])
      for (const [index, term] of catalogue.commitment_terms.entries()) {
        const row = termRows.nth(index + 1)
        await expect.soft(row.locator(':scope > span')).toHaveText([
          term.name, term.price_treatment, term.monthly_credit, term.total_credit, term.early_exit_fee,
        ])
        await expect(row.locator('svg')).toHaveCount(term.id === '6-months' ? 1 : 0)
      }
      const backgrounds = await termRows.evaluateAll(elements => elements.slice(1).map(element => getComputedStyle(element).backgroundColor))
      expect(backgrounds[1], 'Selected term has a distinct visible highlight').not.toBe(backgrounds[0])
      await expect(dialog.root.getByText('Rates are indicative prototype figures and include GST. Final pricing depends on your address and meter.', { exact: true })).toBeVisible()
      await testInfo.attach('Catalogue and comparison tables', {
        body: JSON.stringify({ expectedRows, actualRows, termRows: await termRows.allInnerTexts(), colors, backgrounds }, null, 2),
        contentType: 'application/json',
      })
      await dialog.button('Done').click()
      await expect(dialog.root).toBeHidden()
    })

    test('Terms & Conditions', async ({ account, api, page, dashboard, sidebar, plans }, testInfo) => {
      testInfo.annotations.push({ type: 'defect', description: '#12 Terms repeat the daily-charge unit.' })
      const catalogue = await readCatalogue(api, account.customerId)
      const style = catalogue.pricing_styles.find(item => item.id === 'free-weekends')!
      const term = catalogue.commitment_terms.find(item => item.id === '12-months')!
      await dashboard.goto()
      await sidebar.navigateTo('Plans')
      await plans.chooseStyle(style.name)
      await plans.chooseTerm(term.name)
      await plans.openTerms()
      const dialog = plans.termsDialog
      await expect(dialog.root.getByRole('heading', { name: 'Terms & Conditions', exact: true })).toBeVisible()
      await expect(dialog.root.getByText(`${style.name} · ${term.name}`, { exact: true })).toBeVisible()
      // Term groups are sections without landmark names; identify each by its visible heading.
      const section = (heading: string) => dialog.root.locator('section').filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
      const pricing = section(`Pricing style — ${style.name}`).getByRole('listitem')
      await expect(pricing).toHaveCount(style.rates.length + 2)
      await expect.soft(pricing.first()).toHaveText(style.best_for)
      for (const [index, rate] of style.rates.entries()) {
        await expect.soft(pricing.nth(index + 1)).toHaveText(`${rate.label}: ${rate.value}${rate.unit}${rate.window ? ` (${rate.window})` : ''}`)
      }
      // Either normal daily-unit wording is valid; a duplicated unit is not.
      expect(style.daily).toMatch(/^\$\d+\.\d{2}\/day$/)
      const amount = style.daily.replace('/day', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      expect.soft((await pricing.last().innerText()).trim()).toMatch(new RegExp(`^Daily charge: ${amount}(?:/day| per day)\\.$`))
      await expect(section(`Commitment — ${term.name}`).getByRole('listitem')).toHaveText([
        `${term.price_treatment}.`, `${term.credit_note}, applied to your bill as ${term.total_credit} over the term.`,
        `Leaving early: ${term.early_exit_fee.toLowerCase()}.`,
      ])
      const conditions = section('Important conditions').getByRole('listitem')
      await expect(conditions).toHaveCount(4)
      await expect(conditions.last()).toHaveText('You can request a plan change through Customer Care at any time.')
      await testInfo.attach('Selected plan terms', {
        body: JSON.stringify({ style, term, visibleTerms: await dialog.root.innerText() }, null, 2), contentType: 'application/json',
      })
      await dialog.button('Done').click()
      await expect(dialog.root).toBeHidden()
    })
  })
})
