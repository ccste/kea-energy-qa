import { expect, test } from '../help-test'
import { FAQ_ITEMS, FAQ_TOPICS } from '../../../data/faq-cases'
import { expectSelectedTopic, expectVisibleQuestions } from './faq-expectations'

test.describe("FAQ's", () => {
  test.describe('Browse questions by topic', () => {
    test('Opens on All', { tag: '@smoke' }, async ({ page, help }) => {
      await expect(page).toHaveURL(/\/help$/)
      await expect(help.heading).toBeVisible()
      await expect(help.subtitle).toBeVisible()
      await expect(help.search).toHaveAttribute('placeholder', 'Search help topics')
      await expect(help.search).toHaveValue('')
      await expect(help.topicFilters.getByRole('button')).toHaveCount(5)
      await expect(help.topicCounts).toHaveText(['15', '4', '2', '6', '3'])
      await expectSelectedTopic(help, 'All')
      await expectVisibleQuestions(help, FAQ_ITEMS.map((item) => item.question))
      for (const item of FAQ_ITEMS) await expect(help.question(item.question)).toHaveAttribute('aria-expanded', 'false')
      await expect(help.answers).toHaveCount(0)
      await expect(help.notes).toHaveCount(0)
    })

    for (const topic of [...FAQ_TOPICS, 'All'] as const) {
      test(`Filter by topic — ${topic}`, async ({ help }) => {
        if (topic === 'All') await help.selectTopic('Bills, warnings and plans')
        await help.selectTopic(topic)
        await expectSelectedTopic(help, topic)
        const expected = FAQ_ITEMS.filter((item) => topic === 'All' || item.topic === topic)
        await expectVisibleQuestions(help, expected.map((item) => item.question))
        await expect(help.topicButton(topic).locator('span')).toHaveText(String(expected.length))
        await help.selectTopic('All')
        await expectSelectedTopic(help, 'All')
        await expectVisibleQuestions(help, FAQ_ITEMS.map((item) => item.question))
      })
    }
  })
})
