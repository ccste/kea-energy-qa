import { accountByAlias } from '../../data/accounts'
import { namesUsageIncreaseWithinPeriod } from '../../utils/chat-usage-timing'
import { expect, test } from './sparky-test'

const highBillQuestion = 'Why is my power bill so high?'
const scenarios = [
  { alias: 'daniel', driver: /longer (?:billing )?(?:period|cycle)|more days/i },
  { alias: 'mere', driver: /base[ -]load|around the clock|always[- ]on/i },
  { alias: 'josh', driver: /stepped up|rose|increas/i },
  { alias: 'cold', driver: /cold|weather|heating/i },
  { alias: 'priya', driver: /estimat/i },
  { alias: 'july', driver: /always[- ]on|base[ -]load|around the clock/i },
] as const

function prose(text: string): string {
  return text.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim()
}

function namesLongerPeriod(text: string): boolean {
  if (/longer (?:billing )?(?:period|cycle)|(?:billing )?(?:period|cycle) (?:is|was) longer|more days/i.test(text)) return true
  const counts = [...prose(text).matchAll(/\b(\d+) days (?:instead of|rather than|versus|vs\.?|compared (?:with|to)) (\d+)\b/gi)]
  return counts.some(match => Number(match[1]) > Number(match[2]))
}

function namesStandingLoadDriver(text: string): boolean {
  // Mentioning a category only to say that a breakdown is unavailable does not
  // explain the scenario. Require the load and its contribution in one sentence.
  return prose(text).split(/(?<=[.!?])\s+/).some(sentence =>
    /always[- ]on|base[ -]load|around the clock|standing load/i.test(sentence)
    && /\b(?:high|higher|increas\w*|rise|rose|contribut\w*|driver|reason|because|due to|accounts? for|caus\w*|largest|dominant|main|makes? up)\b/i.test(sentence))
}

function definiteApplianceCauses(text: string): string[] {
  // Catch explicit causal claims only. Nuanced attribution remains part of answer review.
  return text.split(/(?<=[.!?])\s+|\n/).filter(sentence =>
    /\b(?:heat pump|dryer|cylinder|element|heater|appliance)\b/i.test(sentence)
    && /\b(?:caused|is responsible for|was responsible for|is the (?:cause|reason)|was the (?:cause|reason)|definitely|certainly)\b/i.test(sentence)
    && !/\b(?:cannot|can't|can’t|could|may|might|not|isn't|isn’t|wasn't|wasn’t|whether|if|unable|uncertain)\b/i.test(sentence))
}

function quotedBillIncreases(text: string): number[] {
  const values: number[] = []
  // Only an explicitly labelled overall bill change is interpreted automatically.
  // Component attribution and less explicit arithmetic are reviewed in the attached answer.
  const expressions = [
    /(?:your |the |this )?bill (?:is |was |has (?:gone |risen )?)?(?:up|higher|increased|rose|risen)(?: by)?\s*(?:NZ)?\$\s*([\d,]+(?:\.\d+)?)/gi,
    /\b(?:(?:overall|total) (?:bill )?(?:increase|difference)|bill (?:increase|difference))(?: (?:is|was|of))?\s*(?:NZ)?\$\s*([\d,]+(?:\.\d+)?)/gi,
    /(?:NZ)?\$\s*([\d,]+(?:\.\d+)?)\s*(?:more|higher)\s*(?:than (?:the )?(?:last|previous|prior) (?:bill|period)|on (?:your|this|the) bill)/gi,
  ]
  for (const expression of expressions) {
    for (const match of prose(text).matchAll(expression)) values.push(Number(match[1].replaceAll(',', '')))
  }
  return [...new Set(values)]
}

test.describe('Sparky AI', { tag: '@ai' }, () => {
  test.use({ liveChat: true })

  test.describe('Bill Explainer', () => {
    for (const scenario of scenarios) {
      const selectedAccount = accountByAlias(scenario.alias)
      test.describe(() => {
        test.use({ account: selectedAccount })
        test(`Explanation names the scenario's driver — ${selectedAccount.displayName}`, async ({ openSparky, askSparky, assistant }, testInfo) => {
          if (scenario.alias === 'cold') {
            testInfo.annotations.push({ type: 'defect', description: '#45 The Cold Snap explanation can omit the documented weather driver.' })
          }
          if (scenario.alias === 'july') {
            testInfo.annotations.push({ type: 'defect', description: 'NEW-Sparky-01 The July explanation can omit the documented high standing load.' })
          }
          if (scenario.alias === 'priya') {
            testInfo.annotations.push({ type: 'defect', description: 'NEW-Sparky-05 The Priya explanation can omit the estimated-read qualification.' })
          }
          if (scenario.alias === 'josh') {
            testInfo.annotations.push({ type: 'defect', description: 'NEW-Sparky-06 The Josh explanation can omit the documented increase partway through the period.' })
          }
          await openSparky()
          const answer = await askSparky(highBillQuestion, true)
          expect.soft(answer.tools.length, 'A bill explanation reads this account before giving figures').toBeGreaterThan(0)
          expect.soft(answer.done.sources.some(source => source.ok), 'The completed stream confirms a successful account lookup').toBe(true)
          await expect(assistant.sourceBadges.getByText('Answered from your own meter data', { exact: true })).toBeVisible()
          if (scenario.alias === 'daniel') {
            expect.soft(namesLongerPeriod(answer.text), 'The answer identifies a longer billing period, including an explicit increase in billed days').toBe(true)
          } else if (scenario.alias === 'july') {
            expect.soft(namesStandingLoadDriver(answer.text), 'The answer identifies the standing load as a contributor, not merely a category it cannot explain').toBe(true)
          } else {
            expect.soft(answer.text, selectedAccount.scenario).toMatch(scenario.driver)
          }
          expect.soft(definiteApplianceCauses(answer.text), 'Whole-house readings do not establish a particular appliance as the cause').toEqual([])
          if (scenario.alias === 'josh') {
            expect.soft(namesUsageIncreaseWithinPeriod(answer.text), 'The usage increase is connected to a point within the period, not described only as a higher total').toBe(true)
          }
          if (scenario.alias === 'priya') {
            expect.soft(answer.text, 'An estimated reading needs an explicit qualification')
              .toMatch(/\b(?:may|might|could|uncertain|uncertainty|approximate|provisional|unconfirmed|caution)\b|not (?:exact|actual|confirmed)|rather than (?:actual|measured)|(?:actual|meter) read(?:ing)?s? (?:are |is )?(?:needed|required)|confirm.{0,60}(?:read|bill)/i)
          }
          if (scenario.alias === 'cold') {
            expect.soft(answer.text, 'Cold-snap usage must not be presented as a proven change in the household\'s habits')
              .not.toMatch(/(?:your|the household['’]s) (?:habits|behaviour|behavior) (?:caused|causes|are responsible for)/i)
          }
        })
      })
    }

    for (const item of [
      { alias: 'tama', question: "Is it my heat pump that's using all the power?" },
      { alias: 'josh', question: 'Was it my new dryer that pushed my bill up?' },
    ] as const) {
      const selectedAccount = accountByAlias(item.alias)
      test.describe(() => {
        test.use({ account: selectedAccount })
        test(`No appliance is named as the cause — ${selectedAccount.displayName}`, async ({ openSparky, askSparky }) => {
          await openSparky()
          const { text } = await askSparky(item.question)
          expect.soft(text, 'The answer explains the limits of whole-house metering').toMatch(/whole[- ]house|house as a whole|household (?:meter|usage)|total (?:household |home )?(?:power|usage)|meter (?:data|readings)|meter.{0,60}(?:whole|entire|total)|appliance[- ]level|not (?:a )?measurement of (?:a )?(?:specific|particular|individual) appliance/i)
          expect.soft(text, 'It must say that the available readings cannot identify an appliance')
            .toMatch(/(?:cannot|can't|can’t|unable to|does not|doesn't|doesn’t|not possible to|no way to).{0,100}(?:tell|say|identify|confirm|determine|pinpoint|separate|distinguish|show|attribute)|(?:cannot|can't|can’t).{0,100}(?:appliance|dryer|heat pump)|without.{0,40}appliance[- ]level/i)
          expect.soft(definiteApplianceCauses(text), 'A named appliance must not be confirmed as the cause').toEqual([])
        })
      })
    }

    for (const alias of ['ana', 'daniel', 'mere'] as const) {
      const selectedAccount = accountByAlias(alias)
      test.describe(() => {
        test.use({ account: selectedAccount })
        test(`Bill comparison chart matches Billing — ${selectedAccount.displayName}`, async ({ account, api, openSparky, askSparky, assistant }, testInfo) => {
          testInfo.annotations.push({ type: 'defect', description: '#47 The comparison can explain invoices absent from Billing and expose internal instructions in its note.' })
          const billing = await api.billing(account.customerId)
          expect(billing.invoices.length, 'This comparison scenario requires a Billing invoice').toBeGreaterThan(0)
          const newest = billing.invoices[0]
          expect(typeof newest.amount).toBe('number')
          await openSparky()
          const answer = await askSparky(highBillQuestion, true)
          const charts = answer.charts.filter(chart => chart.title === 'This bill against the one before')
          expect(charts, 'The completed response contains one bill comparison').toHaveLength(1)
          const chart = charts[0]
          expect(chart.kind).toBe('bar')
          expect(chart.unit).toBe('nzd')
          expect(chart.points).toHaveLength(2)
          const [previous, current] = chart.points
          expect(Number.isFinite(previous.value) && Number.isFinite(current.value)).toBe(true)
          const visibleChart = assistant.charts.filter({ hasText: chart.title })
          await expect(visibleChart).toHaveCount(1)
          await expect(visibleChart).toBeVisible()
          // The bars have no individual accessible name; compare the visible label
          // and amount in each row with the response before checking Billing.
          const bars = visibleChart.locator('ul.answer-chart-bars > li')
          await expect(bars).toHaveCount(chart.points.length)
          await expect(bars.locator('.bar-label')).toHaveText(chart.points.map(point => point.label))
          await expect(bars.locator('.bar-value')).toHaveText(chart.points.map(point => `$${point.value.toFixed(2)}`))
          const delta = Math.round((current.value - previous.value) * 100)
          const quotedIncreases = quotedBillIncreases(answer.text)
          await testInfo.attach('Bill comparison against independent Billing records', {
            body: JSON.stringify({ invoices: billing.invoices, chart, deltaCents: delta, quotedIncreases, manualReview: 'Review every component sum and any amount not explicitly labelled as the overall bill increase in the attached answer.' }, null, 2),
            contentType: 'application/json',
          })
          expect.soft(Math.round(previous.value * 100), 'The period before equals the newest invoice displayed in Billing').toBe(Math.round(newest.amount! * 100))
          expect.soft(billing.invoices.some(invoice => invoice.amount !== null && Math.round(invoice.amount * 100) === Math.round(current.value * 100)), 'The bill being explained also exists in Billing').toBe(true)
          for (const increase of quotedIncreases) {
            expect.soft(Math.round(increase * 100), 'An explicitly quoted overall bill increase equals the chart difference').toBe(delta)
          }
          expect.soft(chart.caveat ?? '', 'The chart note is customer-facing rather than instructions to the model')
            .not.toMatch(/you may quote|do not call|quote (?:them|the prices) as real|do NOT|the model|Sparky (?:must|should)/i)
          if (chart.caveat) await expect.soft(visibleChart).toContainText(chart.caveat)
        })
      })
    }
  })
})
