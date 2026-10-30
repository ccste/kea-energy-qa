export type UsageRange = 'Daily' | 'Weekly' | 'Monthly'

/** Calendar arithmetic in UTC avoids daylight-saving shifts in date-only API parameters. */
export function addCalendarDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function rangeDates(end: string, range: UsageRange): { start: string; end: string } {
  return { start: addCalendarDays(end, range === 'Monthly' ? -29 : range === 'Weekly' ? -6 : 0), end }
}

export function calendarDays(start: string, end: string): string[] {
  const dates: string[] = []
  for (let day = start; day <= end; day = addCalendarDays(day, 1)) dates.push(day)
  return dates
}
