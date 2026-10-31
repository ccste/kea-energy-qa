import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAnswerWhitespace, renderedAnswerText } from './chat-text'

test('mixed paragraphs retain list markers that become inline text in the answer', () => {
  const response = 'Here is the breakdown:\n- Heating: **$12.32**\n- Other use: **$75.47**'
  const visible = 'Here is the breakdown: - Heating: $12.32 - Other use: $75.47'
  assert.equal(renderedAnswerText(response), normalizeAnswerWhitespace(visible))
  assert.notEqual(renderedAnswerText(response), normalizeAnswerWhitespace(visible.replace('$12.32', '$21.32')))
  assert.notEqual(renderedAnswerText(response), normalizeAnswerWhitespace(visible.replace('Other use:', 'Heating:')))
})

test('standalone lists, headings and paired emphasis preserve item boundaries and content', () => {
  const response = '## Breakdown\n\n- **Heating:** $12.32\n- _Other use:_ $75.47\n\n1. Check `base_load_kwh`.\n2. Ask *support*.'
  const visible = 'Breakdown\nHeating: $12.32\nOther use: $75.47\nCheck base_load_kwh.\nAsk support.'
  assert.equal(renderedAnswerText(response), normalizeAnswerWhitespace(visible))
  assert.notEqual(renderedAnswerText(response), normalizeAnswerWhitespace(visible.replace('Heating: $12.32\n', '')))
})

test('negative amounts, arithmetic, identifiers and literal unpaired markers are significant', () => {
  const response = 'A credit of -$4.87: 2 * 3 * 4 = 24; base_load_kwh stays unchanged.\n\nA literal * marker and unmatched ` remain.'
  assert.equal(renderedAnswerText(response), normalizeAnswerWhitespace(response))
  for (const [before, after] of [['-$4.87', '$4.87'], ['2 * 3 * 4', '2 3 4'], ['base_load_kwh', 'baseloadkwh'], ['`', '']]) {
    assert.notEqual(renderedAnswerText(response), normalizeAnswerWhitespace(response.replace(before, after)))
  }
})

test('formatting never spans separate list items', () => {
  const response = '- *First item\n- Last item*'
  assert.equal(renderedAnswerText(response), '*First item Last item*')
  assert.notEqual(renderedAnswerText(response), 'First item Last item')
})
