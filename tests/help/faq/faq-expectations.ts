import { expect } from '@playwright/test'
import { FAQ_ITEMS, FAQ_TOPICS, type FaqItem } from '../../../data/faq-cases'
import type { HelpPage, TopicFilter } from '../../../pages/HelpPage'

export async function expectVisibleQuestions(help: HelpPage, questions: readonly string[]): Promise<void> {
  const topics = FAQ_TOPICS.filter((topic) => FAQ_ITEMS.some((item) => item.topic === topic && questions.includes(item.question)))
  await expect(help.questions).toHaveText([...questions])
  await expect(help.groupHeadings).toHaveText(topics)
  for (const topic of topics) {
    const expected = FAQ_ITEMS.filter((item) => item.topic === topic && questions.includes(item.question))
    await expect(help.group(topic).getByRole('button')).toHaveText(expected.map((item) => item.question))
  }
}

export async function expectSelectedTopic(help: HelpPage, selected: TopicFilter): Promise<void> {
  for (const topic of ['All', ...FAQ_TOPICS] as const) {
    if (topic === selected) {
      await expect(help.topicButton(topic)).toHaveClass(/\bactive\b/)
      await expect(help.topicButton(topic)).toHaveCSS('background-image', /linear-gradient/)
    } else {
      await expect(help.topicButton(topic)).not.toHaveClass(/\bactive\b/)
    }
  }
}

export async function expectAnswer(help: HelpPage, item: FaqItem): Promise<void> {
  await expect(help.question(item.question)).toHaveAttribute('aria-expanded', 'true')
  await expect(help.answer(item.question)).toBeVisible()
  await expect(help.answer(item.question)).toHaveText(item.answer)
}

export async function expectArrowAngle(help: HelpPage, question: string, angle: number): Promise<void> {
  await expect.poll(async () => help.arrow(question).evaluate((arrow) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(arrow).transform)
    return Math.round(Math.abs(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI))
  }), { message: `The arrow for ${question} rotates to ${angle} degrees` }).toBe(angle)
}
