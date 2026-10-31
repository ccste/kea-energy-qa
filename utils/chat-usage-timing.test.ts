import { test } from 'node:test'
import assert from 'node:assert/strict'
import { namesUsageIncreaseWithinPeriod } from './chat-usage-timing'

test('usage increases are connected to a point within the period', () => {
  for (const answer of [
    'Your usage stepped up halfway through June.',
    'Your daily use rose from 5 June 2024.',
    'From June 5, 2024, your daily consumption increased.',
    'The increase in your usage started mid-period.',
    'Your use increased on 2024-06-05.',
  ]) assert.equal(namesUsageIncreaseWithinPeriod(answer), true, answer)
})

test('currency, decrease, month and year are not evidence of an increase date', () => {
  for (const answer of [
    'Your usage increased. The unit price was a $5.53 decrease.',
    'Your daily usage increased in June 2024.',
    'Your daily usage rose in June 2024, with a $5.53 decrease in unit price.',
    'Your usage rose on 53 December 2024.',
    'The bill increased from 5 June 2024.',
    'Your usage decreased from 5 June 2024.',
  ]) assert.equal(namesUsageIncreaseWithinPeriod(answer), false, answer)
})

test('unrelated timing and a trailing heating disclaimer cannot supply the missing explanation', () => {
  for (const answer of [
    'Your usage increased. Meter readings start from 5 June 2024.',
    'Your usage increased and the price changed from 5 June 2024.',
    'Your usage increased.\n\nSparky could not work out how much of your June 2024 use is heating — your daily use rose from 5 June 2024.',
  ]) assert.equal(namesUsageIncreaseWithinPeriod(answer), false, answer)
})
