import { expect, test } from './faq-test'
import { FAQ_ITEMS } from '../../../data/faq-cases'
import { expectAnswer, expectArrowAngle } from './faq-expectations'

test.describe("FAQ's", () => {
  test.describe('Read an answer', () => {
    for (const item of FAQ_ITEMS) {
      test(`Open and close an answer — ${item.question}`, async ({ help }) => {
        await help.toggleQuestion(item.question)
        await expectAnswer(help, item)
        await expectArrowAngle(help, item.question, 180)
        await help.toggleQuestion(item.question)
        await expect(help.question(item.question)).toHaveAttribute('aria-expanded', 'false')
        await expect(help.answer(item.question)).toBeHidden()
        await expect(help.note(item.question)).toBeHidden()
        await expectArrowAngle(help, item.question, 0)
      })
    }

    test('Only one answer open at a time', async ({ help }) => {
      await expect(help.answers).toHaveCount(0)
      let previous: string | undefined
      for (const question of ['What is Sparky AI?', 'How does Sparky work?', 'Can I speak to a real person?']) {
        await test.step(question, async () => {
          await help.toggleQuestion(question)
          await expectAnswer(help, FAQ_ITEMS.find((item) => item.question === question)!)
          await expect(help.answers).toHaveCount(1)
          if (previous) {
            await expect(help.question(previous)).toHaveAttribute('aria-expanded', 'false')
            await expect(help.answer(previous)).toBeHidden()
          }
        })
        previous = question
      }
    })

    test('Answers with an extra note', async ({ help }) => {
      const withNotes = ['How does Kea compare plans?', 'Where do Sparky’s numbers come from?']
      for (const question of withNotes) {
        await test.step(question, async () => {
          const item = FAQ_ITEMS.find((item) => item.question === question)!
          await help.toggleQuestion(question)
          await expectAnswer(help, item)
          await expect(help.note(question)).toBeVisible()
          await expect(help.note(question)).toHaveText(item.note!)
          await expect(help.notes).toHaveCount(1)
        })
      }
      for (const item of FAQ_ITEMS.filter((item) => !item.note)) {
        await test.step(`No extra note: ${item.question}`, async () => {
          await help.toggleQuestion(item.question)
          await expectAnswer(help, item)
          await expect(help.notes).toHaveCount(0)
        })
      }
    })
  })
})
