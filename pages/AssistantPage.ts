import type { Locator, Page } from '@playwright/test'
import { Dialog } from './components/Dialog'

export class AssistantPage {
  readonly heading: Locator
  readonly root: Locator
  readonly modelStatus: Locator
  readonly refreshStatus: Locator
  readonly startHeading: Locator
  readonly message: Locator
  readonly send: Locator
  readonly newChat: Locator
  readonly attachments: Locator
  readonly uploadPdf: Locator
  readonly uploadPhoto: Locator
  readonly userMessages: Locator
  readonly answers: Locator
  readonly editButtons: Locator
  readonly terms: Dialog
  readonly termsButton: Locator
  readonly footerHelp: Locator
  readonly offline: Locator
  readonly charts: Locator
  readonly sourceBadges: Locator

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'AI Assistant', exact: true })
    this.root = page.getByRole('region', { name: 'Chat with Sparky', exact: true })
    this.modelStatus = page.getByRole('status').filter({ has: page.getByRole('button', { name: 'Refresh Sparky model status' }) })
    this.refreshStatus = this.modelStatus.getByRole('button', { name: 'Refresh Sparky model status' })
    this.startHeading = this.root.getByText('How can I help you today?', { exact: true })
    this.message = this.root.getByPlaceholder(/^(?:Message Sparky|Unavailable while Sparky is offline)$/)
    this.send = this.root.getByRole('button', { name: 'Send message', exact: true })
    this.newChat = this.root.getByRole('button', { name: 'New chat', exact: true })
    this.attachments = this.root.getByRole('button', { name: 'Add attachment', exact: true })
    this.uploadPdf = this.root.getByRole('button', { name: /^Upload a PDF/ })
    this.uploadPhoto = this.root.getByRole('button', { name: /^Upload a photo/ })
    // Message bubbles, chart captions and sources have no individual accessible names.
    this.userMessages = this.root.locator('.user-bubble')
    this.answers = this.root.locator('.assistant-bubble')
    this.editButtons = this.root.getByRole('button', { name: 'Edit message', exact: true })
    this.charts = this.root.locator('figure.answer-chart')
    this.sourceBadges = this.root.locator('details.answer-sources')
    this.terms = new Dialog(page, 'Sparky AI terms')
    this.termsButton = page.getByRole('button', { name: 'Sparky AI terms', exact: true })
    this.footerHelp = page.getByRole('button', { name: 'Help & Support', exact: true }).filter({ hasNot: page.locator('svg') })
    this.offline = page.getByRole('alert').filter({ hasText: 'Sparky can’t reach your usage data right now.' })
  }

  starter(question: string): Locator {
    return this.root.getByRole('button', { name: question, exact: true })
  }

  answerText(index: number): Locator {
    // Exclude chart labels, source details and transient tool activity from answer prose.
    return this.answers.nth(index).locator(':scope > p, :scope > ul.answer-list, :scope > ol.answer-list')
  }

  async ask(question: string): Promise<void> {
    await this.message.fill(question)
    await this.send.click()
  }

  async editMessage(index: number, text: string): Promise<void> {
    await this.editButtons.nth(index).click()
    await this.userMessages.nth(index).getByRole('textbox').fill(text)
  }
}
