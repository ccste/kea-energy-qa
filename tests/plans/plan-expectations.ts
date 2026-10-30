import { expect } from './plan-test'
import type { KeaApi } from '../../api/client'
import type { Plans } from '../../api/types'
import type { PlansPage } from '../../pages/PlansPage'
import { COMMITMENT_TERMS, PRICING_STYLES } from '../../data/plan-cases'

export async function readCatalogue(api: KeaApi, customerId: string): Promise<Plans> {
  const catalogue = await api.plans(customerId)
  expect(catalogue.pricing_styles.map(style => style.id)).toEqual(PRICING_STYLES.map(style => style.id))
  expect(catalogue.commitment_terms.map(term => term.id)).toEqual(COMMITMENT_TERMS.map(term => term.id))
  return catalogue
}

export async function expectSelection(plans: PlansPage, catalogue: Plans, styleId: string, termId: string): Promise<void> {
  const style = catalogue.pricing_styles.find(item => item.id === styleId)
  const term = catalogue.commitment_terms.find(item => item.id === termId)
  if (!style || !term) throw new Error(`The catalogue does not contain ${styleId} / ${termId}.`)
  await expect(plans.pricingGroup.getByRole('radio', { checked: true })).toHaveCount(1)
  await expect(plans.termStep.getByRole('radio', { checked: true })).toHaveCount(1)
  for (const item of catalogue.pricing_styles) {
    await expect(plans.styleChoice(item.name)).toBeChecked({ checked: item.id === styleId })
    await expect(plans.styleChoice(item.name)).toHaveText(item.id === styleId ? 'Selected' : `Choose ${item.name}`)
  }
  for (const item of catalogue.commitment_terms) {
    await expect(plans.termChoice(item.name)).toBeChecked({ checked: item.id === termId })
  }
  await expect.soft(plans.summaryHeading).toHaveText('Your selection')
  await expect.soft(plans.summaryStyle).toHaveText(style.name)
  await expect.soft(plans.summaryTerm).toHaveText(`${term.name} · ${term.price_treatment.toLowerCase()}`)
  await expect.soft(plans.summaryValue('Usage rates').locator('span')).toHaveText(
    style.rates.map(rate => `${rate.value}${rate.unit} ${rate.label.toLowerCase()}`),
  )
  for (const [label, value] of [
    ['Daily charge', style.daily], ['Monthly credit', term.monthly_credit],
    ['Credit over term', term.total_credit], ['Early exit fee', term.early_exit_fee],
  ]) await expect.soft(plans.summaryValue(label)).toHaveText(value)
  await expect(plans.requestButton).toHaveText('Request this plan')
  await expect(plans.requestButton).toBeEnabled()
}
