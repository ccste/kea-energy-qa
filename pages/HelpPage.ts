import type { Locator, Page } from '@playwright/test'
import type { FaqTopic } from '../data/faq-cases'

export type TopicFilter = 'All' | FaqTopic
const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export class HelpPage {
  readonly heading: Locator
  readonly subtitle: Locator
  readonly faq: Locator
  readonly faqHeading: Locator
  readonly search: Locator
  readonly topicFilters: Locator
  readonly topicCounts: Locator
  readonly groupHeadings: Locator
  readonly questions: Locator
  readonly answers: Locator
  readonly notes: Locator
  readonly emptyMessage: Locator
  readonly askSparky: Locator
  readonly customerCareCard: Locator
  readonly emailSupportCard: Locator
  readonly sparkyCard: Locator
  readonly phoneCopy: Locator
  readonly emailCopy: Locator
  readonly callNow: Locator
  readonly writeEmail: Locator
  readonly contactAskSparky: Locator

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Help & Support', exact: true })
    this.subtitle = page.getByText('Find answers or connect with our support team.', { exact: true })
    // The FAQ section and its text paragraphs have no accessible landmark names.
    this.faq = page.locator('section.help-faq')
    this.faqHeading = this.faq.getByRole('heading', { name: 'Frequently asked questions', exact: true })
    this.search = this.faq.getByRole('searchbox', { name: 'Search frequently asked questions', exact: true })
    this.topicFilters = this.faq.getByRole('group', { name: 'Filter by topic', exact: true })
    this.topicCounts = this.topicFilters.getByRole('button').locator('span')
    this.groupHeadings = this.faq.getByRole('heading', { level: 3 })
    this.questions = this.faq.getByRole('article').getByRole('button')
    this.answers = this.faq.locator('article > p:not(.faq-note)')
    this.notes = this.faq.locator('article > p.faq-note')
    this.emptyMessage = this.faq.locator('.faq-empty > p')
    this.askSparky = this.faq.getByRole('button', { name: 'Ask Sparky instead', exact: true })
    const contactCard = (name: string): Locator => page.getByRole('article').filter({
      has: page.getByRole('heading', { name, exact: true }),
    })
    this.customerCareCard = contactCard('Call Customer Care')
    this.emailSupportCard = contactCard('Email support')
    this.sparkyCard = contactCard('Ask Sparky AI')
    this.phoneCopy = this.customerCareCard.getByRole('button', { name: 'Copy', exact: true })
    this.emailCopy = this.emailSupportCard.getByRole('button', { name: 'Copy', exact: true })
    this.callNow = this.customerCareCard.getByRole('link', { name: 'Call now', exact: true })
    this.writeEmail = this.emailSupportCard.getByRole('link', { name: 'Write email', exact: true })
    this.contactAskSparky = this.sparkyCard.getByRole('button', { name: 'Ask Sparky', exact: true })
  }

  topicButton(topic: TopicFilter): Locator {
    return this.topicFilters.getByRole('button', { name: new RegExp(`^${escapePattern(topic)}\\s*\\d+$`) })
  }

  group(topic: FaqTopic): Locator {
    return this.faq.locator('section.faq-group').filter({
      has: this.page.getByRole('heading', { name: topic, exact: true }),
    })
  }

  question(question: string): Locator {
    return this.faq.getByRole('button', { name: question, exact: true })
  }

  answer(question: string): Locator {
    return this.faq.getByRole('article').filter({
      has: this.page.getByRole('button', { name: question, exact: true }),
    }).locator(':scope > p:not(.faq-note)')
  }

  note(question: string): Locator {
    return this.faq.getByRole('article').filter({
      has: this.page.getByRole('button', { name: question, exact: true }),
    }).locator(':scope > p.faq-note')
  }

  arrow(question: string): Locator {
    return this.question(question).locator('svg')
  }

  async selectTopic(topic: TopicFilter): Promise<void> {
    await this.topicButton(topic).click()
  }

  async toggleQuestion(question: string): Promise<void> {
    await this.question(question).click()
  }

  async searchFor(query: string): Promise<void> {
    await this.search.fill(query)
  }

  async clearSearchWithCancelButton(): Promise<void> {
    await this.search.scrollIntoViewIfNeeded()
    await this.search.focus()
    const bounds = await this.search.boundingBox()
    if (!bounds) throw new Error('The FAQ search field is not visible.')
    // Chromium's native search cancel control has no DOM locator or accessible name.
    await this.search.click({ position: { x: bounds.width - 10, y: bounds.height / 2 } })
  }

  async clearSearchWithKeyboard(): Promise<void> {
    await this.search.focus()
    await this.search.press('ControlOrMeta+A')
    await this.search.press('Backspace')
  }
}
