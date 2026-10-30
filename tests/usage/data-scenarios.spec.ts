import type { UsageSeries } from '../../api/types'
import { accountByAlias } from '../../data/accounts'
import { expect, test } from '../../fixtures/test'
import { calendarDays, rangeDates } from '../../utils/dates'
import { expectUsageChart, readUsage } from './usage-expectations'

test.describe('Usage', () => {
  test.describe('View usage on the Usage page', () => {
    test.describe('Data scenarios', () => {
      test.beforeEach(async ({ dashboard, sidebar, usage }) => {
        await dashboard.goto()
        await sidebar.navigateTo('Usage')
        await usage.waitUntilReady()
      })

      test.describe(() => {
        const account = accountByAlias('rangi')
        test.use({ account })

        test('Daylight-saving change days', async ({ usage, usageApi }) => {
          await usage.chooseUnit('kWh')
          for (const { day, count } of [{ day: '2024-04-07', count: 25 }, { day: '2023-09-24', count: 23 }]) {
            await test.step(`${day}: ${count} hourly readings`, async () => {
              const expected = await readUsage(usageApi, account.customerId, day, 'Daily')
              expect(expected.hourly?.hours).toHaveLength(count)
              expect(new Set(expected.hourly!.hours.map(hour => hour.start)).size, 'Repeated local hours must represent distinct instants').toBe(count)
              const response = await usage.setDate(day)
              expect(response?.status()).toBe(200)
              await expectUsageChart(usage, expected, 'kWh')
              await expect.soft(usage.points).toHaveCount(count)
              await expect.soft(usage.xAxisLabels).toHaveCount(count)
            })
          }
        })
      })

      test.describe(() => {
        const account = accountByAlias('priya')
        test.use({ account })

        test('Estimated readings', async ({ usage, usageApi }, testInfo) => {
          testInfo.annotations.push({ type: 'defect', description: '#6 Daily estimated hours have no per-hour quality marking on the chart.' })
          const day = '2024-06-30'
          const weekly = await readUsage(usageApi, account.customerId, day, 'Weekly')
          expect(weekly.series.daily_quality).toEqual(Array(7).fill('estimated'))
          await usage.chooseRange('Weekly')
          await expectUsageChart(usage, weekly, '$')
          await expect.soft(usage.sourceNote).toHaveText('Includes estimated readings')

          const daily = await readUsage(usageApi, account.customerId, day, 'Daily')
          expect(daily.hourly!.hours.map(hour => hour.quality)).toEqual(Array(24).fill('estimated'))
          await usage.chooseRange('Daily')
          await expectUsageChart(usage, daily, '$')

          // A general source note cannot identify the quality of an individual plotted hour.
          const pointEvidence = []
          for (let index = 0; index < daily.values.length; index++) {
            const point = usage.points.nth(index)
            await point.focus()
            await expect(usage.tooltip, 'Focusing a point exposes that hour\'s tooltip').toContainText(daily.labels[index]!, { timeout: 1_000 })
            const evidence = await point.evaluate(element => {
              const style = getComputedStyle(element)
              const referenced = ['aria-labelledby', 'aria-describedby'].flatMap(attribute =>
                (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)
                  .map(id => document.getElementById(id)?.textContent ?? ''))
              const group = element.parentElement
              return {
                name: element.getAttribute('aria-label') ?? '',
                title: element.getAttribute('title') ?? '',
                descriptions: [...referenced, ...Array.from(group?.querySelectorAll('title, desc') ?? [], node => node.textContent ?? '')],
                classes: element.getAttribute('class') ?? '',
                groupClasses: group?.getAttribute('class') ?? '',
                fill: style.fill,
                stroke: style.stroke,
                dash: style.strokeDasharray,
              }
            })
            pointEvidence.push({ hour: daily.labels[index]!, ...evidence, tooltip: await usage.tooltip.textContent() ?? '' })
          }

          // A rendered legend can also explain a visual point marker; DOM class names alone cannot.
          const legend = await usage.card.locator('.chart-legend > *').evaluateAll(elements => elements.flatMap(element => {
            const box = element.getBoundingClientRect()
            if (!box.width || !box.height || getComputedStyle(element).visibility === 'hidden') return []
            return [{
              text: element.textContent ?? '',
              colors: Array.from(element.querySelectorAll('i, circle, path, line'), marker => {
                const style = getComputedStyle(marker)
                return [style.fill, style.stroke, style.backgroundColor]
              }).flat().filter(color => color && color !== 'none' && color !== 'rgba(0, 0, 0, 0)'),
            }]
          }))
          const estimatedLegendColors = legend.filter(entry => /estimated/i.test(entry.text)).flatMap(entry => entry.colors)
          const unmarkedHours = pointEvidence.filter(point => {
            const semanticMark = /estimated/i.test([point.name, point.title, ...point.descriptions, point.tooltip].join(' '))
            const explainedVisualMark = estimatedLegendColors.some(color => color === point.stroke || color === point.fill)
            return !semanticMark && !explainedVisualMark
          }).map(point => point.hour)
          await testInfo.attach('Estimated-hour chart evidence', {
            body: JSON.stringify({ pointEvidence, legend, unmarkedHours }, null, 2), contentType: 'application/json',
          })
          expect.soft(unmarkedHours, 'Every API-estimated hour needs an accessible label, tooltip or a visual marker explained by the chart legend').toEqual([])
        })

        test('Missing day inside the data range', async ({ usage, usageApi }, testInfo) => {
          testInfo.annotations.push({ type: 'defect', description: '#7 An empty day inside the available range silently changes to the latest reading date.' })
          const day = '2024-06-10'
          const expected = await usageApi.usageSeries(account.customerId, rangeDates(day, 'Daily'))
          expect(expected.daily_dates).toEqual([])
          expect(expected.available_from).toBe('2024-05-01')
          expect(expected.available_to).toBe('2024-06-30')
          expect(expected.available_from! <= day && day <= expected.available_to!, 'The selected missing day is inside the account\'s data range').toBe(true)
          const response = await usage.setDate(day)
          expect(response?.status()).toBe(200)
          const selected = await response!.json() as UsageSeries
          expect(selected.customer_id).toBe(account.customerId)
          expect(selected.daily_dates).toEqual([])
          const actualDate = await usage.date.inputValue()
          const visibleMessage = await usage.card.innerText()
          await testInfo.attach('Missing-day selection', {
            body: JSON.stringify({ requestedDate: day, actualDate, availableFrom: expected.available_from, availableTo: expected.available_to, visibleMessage }, null, 2),
            contentType: 'application/json',
          })
          expect.soft(actualDate, 'A missing day inside the data range must remain selected').toBe(day)
          expect.soft(visibleMessage, 'The page must explain that the chosen day has no readings').toMatch(/no (?:usage )?(?:readings|data)|(?:readings|data) (?:are |is )?(?:not available|unavailable)|missing (?:readings|data)/i)
        })
      })

      test.describe(() => {
        const account = accountByAlias('julia')
        test.use({ account })

        test('Less than 30 days of readings: Monthly', async ({ usage, usageApi }, testInfo) => {
          testInfo.annotations.push({ type: 'defect', description: '#8 Monthly rejects a partial period instead of plotting the available days and marking missing days.' })
          const expected = await readUsage(usageApi, account.customerId, '2024-08-31', 'Monthly')
          expect(expected.series.daily_dates).toEqual(calendarDays('2024-08-08', '2024-08-31'))
          expect(expected.values).toHaveLength(24)
          const dates = rangeDates(expected.date, expected.range)
          const missing = calendarDays(dates.start, dates.end).filter(day => !expected.series.daily_dates.includes(day))
          expect(missing).toEqual(calendarDays('2024-08-02', '2024-08-07'))
          await usage.chooseRange('Monthly')

          const chartVisible = await usage.chart.isVisible()
          const pointCount = await usage.points.count()
          const errorVisible = await usage.error.isVisible()
          // Inspect only chart content and its accessible point labels, excluding the generic source note.
          const chartLabels = chartVisible ? await usage.chart.locator('text, title, desc, [aria-label], [title]').evaluateAll(elements =>
            elements.flatMap(element => [element.textContent ?? '', element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? '']).filter(Boolean)) : []
          const visualEvidence = chartVisible ? await usage.chart.locator('[aria-label], [title], text').evaluateAll(elements => elements.flatMap(element => {
            const box = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            if (!box.width || !box.height || style.visibility === 'hidden') return []
            return [{ label: [element.textContent, element.getAttribute('aria-label'), element.getAttribute('title')].filter(Boolean).join(' '), fill: style.fill, stroke: style.stroke }]
          })) : []
          const missingLegendColors = await usage.card.locator('.chart-legend > *').evaluateAll(elements => elements.flatMap(element => {
            const box = element.getBoundingClientRect()
            if (!box.width || !box.height || getComputedStyle(element).visibility === 'hidden' || !/missing|no (?:readings|data)|unavailable/i.test(element.textContent ?? '')) return []
            return Array.from(element.querySelectorAll('i, circle, path, line'), marker => {
              const style = getComputedStyle(marker)
              return [style.fill, style.stroke, style.backgroundColor]
            }).flat().filter(color => color && color !== 'none' && color !== 'rgba(0, 0, 0, 0)')
          }))
          const unmarkedDates = missing.filter(day => {
            const hasDate = (label: string) => label.includes(day) || label.includes(day.slice(5))
            const semanticMark = chartLabels.some(label => hasDate(label) && /missing|no (?:readings|data)|unavailable/i.test(label))
            const explainedVisualMark = visualEvidence.some(marker => hasDate(marker.label) &&
              missingLegendColors.some(color => color === marker.fill || color === marker.stroke))
            return !semanticMark && !explainedVisualMark
          })
          await testInfo.attach('Partial-Monthly chart evidence', {
            body: JSON.stringify({ availableDates: expected.series.daily_dates, missing, chartVisible, pointCount, errorVisible, error: await usage.error.allInnerTexts(), chartLabels, visualEvidence, missingLegendColors, unmarkedDates }, null, 2),
            contentType: 'application/json',
          })
          expect.soft(errorVisible, 'A partial Monthly period must not become an error').toBe(false)
          expect.soft(chartVisible, 'Monthly must plot the available readings').toBe(true)
          expect.soft(pointCount, 'All 24 available daily readings remain plotted').toBe(24)
          expect.soft(unmarkedDates, 'Each missing day needs a dated chart marking').toEqual([])
          if (chartVisible) await expectUsageChart(usage, expected, '$', missing)
        })
      })
    })
  })
})
