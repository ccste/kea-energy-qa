import { test } from 'node:test'
import assert from 'node:assert/strict'
import { answerNamesDate } from './chat-dates'

test('highest-day answers retain a year stated earlier in the same sentence', () => {
  const josh = 'Your highest usage day in June 2024 was on June 7th, with 21.81 kWh imported.'
  const spike = 'Your highest usage day in July 2026 was on **July 7th**, with a total import of **19.61 kWh**.'
  assert.equal(answerNamesDate(josh, '2024-06-07'), true)
  assert.equal(answerNamesDate(spike, '2026-07-07'), true)
  assert.equal(answerNamesDate(josh.replace('June 7th', 'June 8th'), '2024-06-07'), false)
  assert.equal(answerNamesDate(josh.replace('2024', '2025'), '2024-06-07'), false)
  assert.equal(answerNamesDate(spike.replace('July 7th', 'June 7th'), '2026-07-07'), false)
})

test('full dates remain supported without borrowing context from another sentence', () => {
  for (const answer of ['2024-06-07', '7 June 2024', 'June 7, 2024', '7/6/2024', '7 Jun. 2024']) {
    assert.equal(answerNamesDate(answer, '2024-06-07'), true, answer)
  }
  assert.equal(answerNamesDate('Your highest day was June 7th. Readings are from June 2024.', '2024-06-07'), false)
  assert.equal(answerNamesDate('Your highest day was June 7th.', '2024-06-07'), false)
})

test('contradictory dates and years cannot pass as an omitted-year answer', () => {
  for (const answer of [
    'In June 2024 the highest day was June 7th, or June 8th.',
    'In June 2024 the highest day was June 7, 2025.',
    'In June 2024 and June 2025 the highest day was June 7th.',
    'The highest day was 2024-06-07, actually 2024-06-08.',
    'In June 2025 the highest day was 2024-06-07.',
  ]) assert.equal(answerNamesDate(answer, '2024-06-07'), false, answer)
})

test('documented tied dates can share one month and year', () => {
  const dates = ['2024-06-07', '2024-06-08']
  const answer = 'In June 2024, June 7th and June 8th were tied for highest usage.'
  for (const date of dates) assert.equal(answerNamesDate(answer, date, dates), true)
})
