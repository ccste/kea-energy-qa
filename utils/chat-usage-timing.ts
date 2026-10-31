const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
const DAY = '(?:0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?'
const DATE = `(?:\\d{4}-\\d{2}-\\d{2}|${DAY}\\s+${MONTH}\\b(?:\\s+\\d{4})?|${MONTH}\\s+${DAY}\\b(?:,?\\s+\\d{4})?)`
const TIMING = new RegExp(`\\b(?:mid[- ](?:period|month|cycle|${MONTH})\\b|(?:partway|halfway|midway)\\s+(?:through|into)\\s+(?:(?:the|this|your|billing|current)\\s+)*(?:period|month|cycle|${MONTH})\\b|(?:since|from|on|around|after|starting|beginning)\\s+${DATE})`, 'i')
const USAGE_CHANGE = /\b(?:(?:your|daily|electricity|power|energy)\s+)*(?:use|usage|consumption)\s+(?:(?:has|had|suddenly|noticeably|sharply|clearly|steadily|significantly)\s+)*(?:stepped up|rose|risen|increased|went up|jumped|was higher|became higher)\b|\b(?:increase|rise|step[- ]up)\s+in\s+(?:(?:your|daily|electricity|power|energy)\s+)*(?:use|usage|consumption)\b/i

/** Require the usage increase and its timing in the same short clause. */
export function namesUsageIncreaseWithinPeriod(text: string): boolean {
  const mainAnswer = text.split(/\n\s*\n(?=Sparky could not work out how much of your\b)/i)[0]
    .replace(/[*_`]/g, '')
  const clauses = mainAnswer.split(/(?<=[.!?])\s+|\n|;|\s+(?:but|whereas|while|and)\s+/i)
  return clauses.some(clause => {
    const change = USAGE_CHANGE.exec(clause)
    const timing = TIMING.exec(clause)
    if (!change || !timing) return false
    const gap = Math.max(change.index, timing.index) - Math.min(change.index + change[0].length, timing.index + timing[0].length)
    return gap <= 60
  })
}
