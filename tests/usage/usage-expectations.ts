import type { KeaApi } from '../../api/client'
import type { HourlyUsage, UsageSeries } from '../../api/types'
import { expect } from '../../fixtures/test'
import type { UsagePage, UsageUnit } from '../../pages/UsagePage'
import { calendarDays, rangeDates, type UsageRange } from '../../utils/dates'

export interface UsageExpectation {
  date: string
  range: UsageRange
  series: UsageSeries
  hourly?: HourlyUsage
  values: number[]
  labels: string[]
  note: string
}

export async function readUsage(api: KeaApi, customerId: string, date: string, range: UsageRange): Promise<UsageExpectation> {
  const dates = rangeDates(date, range)
  const series = await api.usageSeries(customerId, dates)
  expect(series.customer_id, 'Independent usage data belongs to the selected account').toBe(customerId)
  expect(series.daily_kwh).toHaveLength(series.daily_dates.length)
  expect(series.daily_quality).toHaveLength(series.daily_dates.length)
  expect(series.daily_kwh.every(value => Number.isFinite(value) && value >= 0), 'Daily readings must be finite; zero is valid').toBe(true)
  expect(series.daily_dates, 'API readings must be in calendar order').toEqual([...new Set(series.daily_dates)].sort())
  expect(series.daily_dates.every(day => day >= dates.start && day <= dates.end)).toBe(true)
  expect(series.daily_quality.every(quality => ['measured', 'estimated', 'demo'].includes(quality))).toBe(true)
  if (range !== 'Daily') {
    return {
      date, range, series, values: series.daily_kwh, labels: series.daily_dates.map(day => day.slice(5)),
      note: series.date_source === 'demo' ? 'Illustrative fixture readings' :
        series.daily_quality.includes('estimated') ? 'Includes estimated readings' : 'Account meter readings',
    }
  }
  const hourly = await api.hourlyUsage(customerId, date)
  expect(hourly.customer_id).toBe(customerId)
  expect(hourly.day).toBe(date)
  expect(hourly.hours.every(hour => hour.kwh !== null && Number.isFinite(hour.kwh)), 'The selected daily comparison requires complete hourly readings').toBe(true)
  return { date, range, series, hourly, values: hourly.hours.map(hour => hour.kwh!), labels: hourly.hours.map(hour => hour.label), note: hourly.note }
}

export function missingUsageDates(expected: UsageExpectation): string[] {
  const dates = rangeDates(expected.date, expected.range)
  // The endpoint returns only complete days; estimated complete days are still usable.
  return calendarDays(dates.start, dates.end).filter(day => !expected.series.daily_dates.includes(day))
}

/** All assertions concern the same chart screen and remain soft to report every mismatch. */
export async function expectUsageChart(usage: UsagePage, expected: UsageExpectation, unit: UsageUnit, missingDates: string[] = []): Promise<void> {
  const { values, labels, series, range, date, note } = expected
  expect(series.total_kwh).toBeGreaterThanOrEqual(0)
  if (series.total_kwh === 0 && unit === '$') {
    expect(series.estimated_cost_nzd, 'A zero-use period has no estimated energy charge').toBe(0)
  }
  const price = series.total_kwh > 0 ? series.estimated_cost_nzd / series.total_kwh : 0
  const displayed = values.map(value => unit === '$' ? value * price : value)
  // The graph uses its padded top scale for label precision; this is display formatting only.
  const chartTop = Math.max(1, ...displayed) * 1.15
  const formatted = displayed.map(value => unit === '$' ? `$${value.toFixed(2)}` : `${value.toFixed(chartTop <= 2 ? 1 : 0)} kWh`)
  const names = formatted.map((value, index) => `${labels[index]}: ${value}`.replace(/ NZ(?:ST|DT)(?=:)/g, ''))
  const total = values.reduce((sum, value) => sum + value, 0)

  await expect.soft(usage.date).toHaveValue(date)
  await expect.soft(usage.range(range)).toHaveAttribute('aria-pressed', 'true')
  await expect.soft(usage.metric(unit)).toHaveAttribute('aria-pressed', 'true')
  await expect.soft(usage.chart).toHaveAttribute('aria-label', `${range} electricity usage`)
  await expect.soft(usage.points).toHaveCount(values.length)
  if (range === 'Daily') {
    // Numeric cases check ordered hours. The dedicated display case rejects timezone suffixes.
    await expect.soft.poll(async () => (await usage.xAxisLabels.allTextContents()).map(label => label.replace(/ NZ(?:ST|DT)$/, '')))
      .toEqual(labels.map(label => label.replace(/ NZ(?:ST|DT)$/, '')))
  } else if (missingDates.length) {
    // A partial chart may keep missing dates on its axis while plotting only available values.
    const missingLabels = missingDates.map(day => day.slice(5))
    await expect.soft.poll(async () => (await usage.xAxisLabels.allTextContents()).filter(label => !missingLabels.includes(label))).toEqual(labels)
  } else {
    await expect.soft(usage.xAxisLabels).toHaveText(labels)
  }
  await expect.soft.poll(async () => usage.points.evaluateAll(points =>
    points.map(point => (point.getAttribute('aria-label') ?? '').replace(/^Peak usage, /, '').replace(/ NZ(?:ST|DT)(?=:)/g, ''))),
  { message: 'Every plotted point must match the ordered API readings at display precision' }).toEqual(names)
  await expect.soft(usage.yAxisLabels).toHaveCount(5)
  for (const tick of await usage.yAxisLabels.allTextContents()) {
    expect.soft(tick, 'Every y-axis tick shows the selected unit').toMatch(unit === '$' ? /^\$\d+(?:\.\d+)?$/ : /^\d+(?:\.\d+)? kWh$/)
  }
  await expect.soft(usage.selectedValue).toHaveText(unit === '$' ? `$${(total * price).toFixed(2)}` : `${total.toFixed(1)} kWh`)
  await expect.soft(usage.selectedDetail).toHaveText(unit === '$' ? 'Estimated energy cost; excludes daily charges' : 'Total electricity imported')
  await expect.soft(usage.sourceNote).toHaveText(note)
  await expect.soft(usage.error).toBeHidden()
}
