import type { Plans } from '../../api/types'
import { accountByAlias } from '../../data/accounts'
import { expect, test } from './sparky-test'

type RateQuote = { amount: number; unit: 'kwh' | 'day'; plan: string | null; band: string | null; text: string; context: string }

function plain(text: string): string {
  return text.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim()
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rateQuotes(text: string, catalogue: Plans): RateQuote[] {
  const source = text.replace(/[*_`]/g, '')
  const quotes: RateQuote[] = []
  function add(match: RegExpMatchArray, amount: number, unit: RateQuote['unit']): void {
    const position = match.index!
    const preceding = source.slice(Math.max(0, position - 240), position)
    // Use an explicit name in this sentence or table row; do not attribute a later
    // "your current plan" quote to the last plan in an earlier list of options.
    const sentences = preceding.split(/[.!?](?:\s+|$)|\n/)
    const before = sentences.at(-1) ?? ''
    const named = catalogue.pricing_styles.map(style => ({ style, index: before.toLowerCase().lastIndexOf(style.name.toLowerCase()) }))
      .filter(item => item.index >= 0).sort((left, right) => right.index - left.index)
    let plan = named[0]?.style.name ?? null
    if (!plan && /^\s*This plan\b/i.test(before)) {
      const previousNames = catalogue.pricing_styles.filter(style => sentences.at(-2)?.toLowerCase().includes(style.name.toLowerCase()))
      if (previousNames.length === 1) plan = previousNames[0].name
    }
    // Bind an explicitly adjacent band to its own rate. More complex lists and
    // implied band associations remain in manual answer review.
    const prefixBand = before.match(/\b(off[- ]peak|peak|night)(?: (?:rate|price|power|usage))?\s*(?:(?:is|of|at)\s*|:\s*)?$/i)?.[1]
    const suffixBand = source.slice(position + match[0].length).match(/^\s*(?:for |during )?(?:the )?(off[- ]peak|peak|night)\b/i)?.[1]
    const band = unit === 'kwh' ? (prefixBand ?? suffixBand)?.toLowerCase().replace(' ', '-') ?? null : null
    quotes.push({
      amount, unit, band,
      plan, text: match[0], context: source.slice(Math.max(0, position - 120), position + match[0].length + 100),
    })
  }
  const usageRate = /(?:(?:(?:NZ)?\$|NZD\s*)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:cents?|c))\s*(?:\/|per\s+)?\s*(?:kwh|kilowatt[- ]hours?)\b/gi
  for (const match of source.matchAll(usageRate)) {
    add(match, match[1] === undefined ? Number(match[2]) / 100 : Number(match[1]), 'kwh')
  }
  // An average total cost such as "$8.23 per day" includes energy: it is not a
  // daily fixed charge. Only explicitly labelled daily charges are compared here.
  const dailyCharge = /(?:daily (?:fixed )?|standing |fixed daily )(?:charge|fee)\s*(?:(?:is|of|at)\s*|:\s*)?(?:(?:NZ)?\$|NZD\s*)\s*(\d+(?:\.\d+)?)/gi
  for (const match of source.matchAll(dailyCharge)) add(match, Number(match[1]), 'day')
  return quotes
}

function money(text: string): number {
  const match = text.match(/\$\s*([\d.]+)/)
  if (!match) throw new Error(`The catalogue rate is not a dollar amount: ${text}`)
  return Number(match[1])
}

function annualSavings(text: string): number[] {
  const expression = /(?:sav(?:e|es|ing|ings)|better off)[^.!?\n$]{0,60}\$\s*([\d,]+(?:\.\d+)?)[^.!?\n]{0,30}(?:per year|a year|annually|annual)/gi
  return [...plain(text).matchAll(expression)].map(match => Number(match[1].replaceAll(',', '')))
}

test.describe('Sparky AI', { tag: '@ai' }, () => {
  test.use({ liveChat: true })

  test.describe('Plan Comparison', () => {
    for (const alias of ['tariff', 'ana'] as const) {
      const selectedAccount = accountByAlias(alias)
      test.describe(() => {
        test.use({ account: selectedAccount })
        test(`Could another plan save me money? — ${selectedAccount.displayName}`, async ({ account, api, openSparky, askSparky }, testInfo) => {
          testInfo.annotations.push({ type: 'defect', description: '#44 Plan advice can call published rates illustrative or dismiss material savings.' })
          const catalogue = await api.plans(account.customerId)
          expect(catalogue.pricing_styles.map(style => style.name)).toEqual(['Anytime Rate', 'Time of Use', 'Free Weekends'])
          await openSparky()
          const answer = await askSparky('Could another plan save me money?', true)
          expect(answer.tools).toContain('get_plan_options')
          expect(answer.done.sources.some(source => source.tool === 'get_plan_options' && source.ok)).toBe(true)
          const text = plain(answer.text)
          // The design requires Kea catalogue identities, not an exhaustive list in
          // every short answer; some accounts cannot price every option.
          expect.soft(catalogue.pricing_styles.some(style => new RegExp(escaped(style.name), 'i').test(text)), 'The advice names a plan from the published Kea catalogue').toBe(true)
          const quotes = rateQuotes(answer.text, catalogue)
          const unattributed = quotes.filter(quote => quote.plan === null)
          for (const quote of quotes.filter(quote => quote.plan !== null)) {
            const style = catalogue.pricing_styles.find(item => item.name === quote.plan)!
            const rateRows = quote.band && style.id === 'time-of-use'
              ? style.rates.filter(rate => rate.label.toLowerCase().replace(' ', '-') === quote.band) : style.rates
            const rates = quote.unit === 'day' ? [money(style.daily)] : rateRows.map(rate => money(rate.value))
            expect.soft(rates, `${quote.plan}: ${quote.text} must be the published ${quote.unit === 'day' ? 'daily charge' : quote.band ? `${quote.band} rate` : 'usage rate'} for that plan`).toContain(quote.amount)
          }
          expect.soft(text, 'Published prices must not be described as illustrative')
            .not.toMatch(/(?:rates?|prices?|tariffs?)[^.!?]{0,90}(?:are |is |be |as )illustrative|illustrative[^.!?]{0,40}(?:rates?|prices?|tariffs?)/i)
          const yearlySavings = annualSavings(text)
          if (yearlySavings.some(amount => amount > 30)) {
            expect.soft(text, 'A stated saving over $30 per year is not dismissed as too small to switch')
              .not.toMatch(/(?:saving|difference|benefit)[^.!?]{0,60}(?:small|negligible|not worth)|not worth (?:switching|changing)|(?:small|negligible)[^.!?]{0,30}(?:saving|difference|benefit)/i)
          }
          const comparison = answer.charts.find(chart => /^What each plan would have cost over /.test(chart.title))
          if (comparison) {
            expect(comparison.unit).toBe('nzd')
            expect(comparison.points.length).toBeGreaterThan(1)
            const ranked = [...comparison.points].sort((left, right) => left.value - right.value)
            for (const point of ranked) expect(catalogue.pricing_styles.map(style => style.name)).toContain(point.label)
            if (alias === 'tariff') {
              const cheapest = escaped(ranked[0].label)
              expect.soft(text, 'The Low User scenario names its cheaper option as the recommendation')
                .toMatch(new RegExp(`(?:recommend|consider|cheapest|lowest|best|save|saving)[^.!?]{0,160}${cheapest}|${cheapest}[^.!?]{0,160}(?:cheapest|lowest|best|save|saving|cheaper)`, 'i'))
            }
            const current = ranked.find(point => point.highlight)
            if (current && Math.round(current.value * 100) === Math.round(ranked[0].value * 100)) {
              expect.soft(text, 'When no alternative is cheaper, remaining on the current plan is a valid choice')
                .toMatch(/stay|staying|keep|remain|already (?:on|the)|current plan.{0,70}(?:best|lowest|cheapest)|no (?:real |meaningful |material )?saving/i)
            }
          } else if (alias === 'tariff') {
            expect.soft(text, 'The Low User scenario recommends a cheaper plan')
              .toMatch(/recommend|cheaper|lowest[- ]cost|best (?:option|plan)|save.{0,100}(?:Anytime Rate|Time of Use|Free Weekends)/i)
          }
          await testInfo.attach('Plan advice against the independent published catalogue', {
            body: JSON.stringify({ catalogue, quotes, unattributed, yearlySavings, comparison, manualReview: 'Check unlabelled or unattributed amounts, implicit band associations and complex rate lists, recommendation reasoning, and separation of usage savings from monthly credits and exit fees. Narrow wording checks do not establish the full quality of the advice.' }, null, 2),
            contentType: 'application/json',
          })
        })
      })
    }

    test('Ask Sparky to switch plan', async ({ openSparky, askSparky }) => {
      await openSparky()
      const { text, tools, done } = await askSparky('Please switch me to Free Weekends.')
      expect.soft(text, 'The requested plan is identified').toMatch(/Free Weekends/i)
      expect.soft(text, 'The response explains rates, free hours, charges or conditions before seeking confirmation')
        .toMatch(/rate|charge|(?:free|no charge).{0,40}(?:power|electricity|9\s*am)|9\s*am|5\s*pm|term|cost/i)
      expect.soft(text, 'A switch needs a separate customer confirmation').toMatch(/confirm|would you like|shall I|do you (?:want|wish)|ready to (?:proceed|switch)/i)
      expect.soft(text, 'No completed change or recorded request is claimed before confirmation')
        .not.toMatch(/(?:I(?:'ve| have)|we(?:'ve| have)) (?:now )?(?:switched|changed|recorded|submitted|processed)|(?:your (?:plan|request)|the (?:plan|request)) (?:has been|is now|was) (?:changed|switched|recorded|submitted|processed)|you(?:'re| are) now on Free Weekends/i)
      // A tool call with confirm omitted/false prepares an offer; confirm:true
      // records the request. The customer has not given that second confirmation.
      const switchCalls = done.sources.filter(source => source.tool === 'request_plan_change')
      if (tools.includes('request_plan_change')) expect(switchCalls.length).toBeGreaterThan(0)
      for (const source of switchCalls) {
        expect(source.arguments, 'The stream exposes whether the plan change was only staged').not.toBeNull()
        expect([undefined, false], 'A plan request must not be confirmed on the first question').toContain(source.arguments?.confirm)
        expect(source.source ?? '', 'A staged offer must not claim a recorded request').not.toMatch(/recorded against this account/i)
      }
    })
  })
})
