import { expect, test } from './faq-test'
import { FAQ_ITEMS, FAQ_SEARCH_CASES } from '../../../data/faq-cases'
import { expectSelectedTopic, expectVisibleQuestions } from './faq-expectations'

test.describe("FAQ's", () => {
  test.describe('Search help topics', () => {
    test.describe('Positive Testing', () => {
      for (const row of FAQ_SEARCH_CASES) {
        test(`Search matches questions, answers and notes — ${JSON.stringify(row.query)}`, async ({ help }, testInfo) => {
          testInfo.annotations.push({ type: 'defect', description: '#35 Topic counts must follow matches in questions, answers and notes.' })
          await help.searchFor(row.query)
          await expect(help.search).toHaveValue(row.query)
          await expectVisibleQuestions(help, row.questions)
          await expect(help.topicCounts, 'All and each topic count must reflect the current search').toHaveText(row.counts.map(String))
        })
      }

      test('Search within a topic', async ({ help }) => {
        await help.selectTopic('Bills, warnings and plans')
        await help.searchFor('warning')
        await expectSelectedTopic(help, 'Bills, warnings and plans')
        await expectVisibleQuestions(help, ['What is a bill-shock warning?', 'How often will Kea send warnings?'])
        await help.selectTopic('All')
        await expectSelectedTopic(help, 'All')
        await expect(help.search).toHaveValue('warning')
        await expectVisibleQuestions(help, FAQ_SEARCH_CASES[0].questions)
      })

      test('Clear the search', async ({ help }) => {
        for (const topic of ['All', 'Bills, warnings and plans'] as const) {
          for (const method of ['native cancel button', 'keyboard deletion'] as const) {
            await test.step(`${topic}: ${method}`, async () => {
              await help.selectTopic(topic)
              await help.searchFor('warning')
              await expectVisibleQuestions(help, topic === 'All' ? FAQ_SEARCH_CASES[0].questions : FAQ_SEARCH_CASES[0].questions.slice(1))
              if (method === 'native cancel button') await help.clearSearchWithCancelButton()
              else await help.clearSearchWithKeyboard()
              await expect(help.search).toHaveValue('')
              await expectSelectedTopic(help, topic)
              await expectVisibleQuestions(help, FAQ_ITEMS.filter((item) => topic === 'All' || item.topic === topic).map((item) => item.question))
            })
          }
        }
      })
    })

    test.describe('Negative Testing', () => {
      for (const query of ['solar', '%#@']) {
        test(`No matching topic — ${query}`, async ({ page, help }) => {
          await help.searchFor(query)
          await expect(help.questions).toHaveCount(0)
          await expect(help.groupHeadings).toHaveCount(0)
          await expect(help.emptyMessage).toHaveText(`No help topics match “${query}”.`)
          await expect(help.askSparky).toBeVisible()
          await help.askSparky.click()
          await expect(page).toHaveURL(/\/assistant$/)
          await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible()
        })
      }
    })
  })
})
