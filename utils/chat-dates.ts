const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH = MONTH_NAMES.map(name => `${name.slice(0, 3)}(?:${name.slice(3)})?\\.?`).join('|')
const monthNumber = (name: string): string => String(MONTH_NAMES.findIndex(month => month.slice(0, 3).toLowerCase() === name.slice(0, 3).toLowerCase()) + 1).padStart(2, '0')
const isoDate = (year: string, month: string, day: string): string => `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

/** Accept an omitted year only when its sentence supplies one unambiguous month and year. */
export function answerNamesDate(text: string, expected: string, allowedDates: readonly string[] = [expected]): boolean {
  const allowed = new Set(allowedDates)
  const allowedMonths = new Set(allowedDates.map(date => date.slice(0, 7)))
  const sentences = text.replace(/[*_`]/g, '').split(/(?<=[.!?])\s+(?=[A-Z])|\n+/)
  return sentences.some(sentence => {
    const complete = new RegExp(`\\b(?:(\\d{4})-(\\d{2})-(\\d{2})|(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH})\\s*,?\\s*(\\d{4})|(${MONTH})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(\\d{4})|(\\d{1,2})/(\\d{1,2})/(\\d{4}))\\b`, 'gi')
    const dates: string[] = []
    const remaining = sentence.replace(complete, (...match: string[]) => {
      if (match[1]) dates.push(isoDate(match[1], match[2], match[3]))
      else if (match[4]) dates.push(isoDate(match[6], monthNumber(match[5]), match[4]))
      else if (match[7]) dates.push(isoDate(match[9], monthNumber(match[7]), match[8]))
      else dates.push(isoDate(match[12], match[11], match[10]))
      return ' '
    })
    if (dates.some(date => !allowed.has(date))) return false
    const contexts = new Set(dates.map(date => date.slice(0, 7)))
    const monthYear = new RegExp(`\\b(?:(${MONTH})\\s+(\\d{4})|(\\d{4})-(\\d{2})(?!-\\d{2}))\\b`, 'gi')
    for (const match of remaining.matchAll(monthYear)) contexts.add(match[1] ? `${match[2]}-${monthNumber(match[1])}` : `${match[3]}-${match[4]}`)
    if ([...contexts].some(month => !allowedMonths.has(month))) return false
    const shortDate = new RegExp(`\\b(?:(${MONTH})\\s+(\\d{1,2})(?:st|nd|rd|th)?|(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH}))(?!\\d)\\b`, 'gi')
    const shortDates = [...remaining.matchAll(shortDate)]
    if (shortDates.length) {
      if (contexts.size !== 1) return false
      const context = [...contexts][0]
      for (const match of shortDates) {
        const month = monthNumber(match[1] ?? match[4])
        if (month !== context.slice(5)) return false
        dates.push(isoDate(context.slice(0, 4), month, match[2] ?? match[3]))
      }
    }
    return dates.includes(expected) && dates.every(date => allowed.has(date))
  })
}
