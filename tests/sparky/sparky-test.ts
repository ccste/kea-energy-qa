import { test as base, expect } from '../../fixtures/test'
import { accountByAlias } from '../../data/accounts'
import { parseChatStream, type ChatAnswer, type ChatRequest } from '../../utils/chat-stream'
import { normalizeAnswerWhitespace, renderedAnswerText } from '../../utils/chat-text'

type SparkyFixtures = {
  liveChat: boolean
  allowInvalidUpload: boolean
  allowChatSignIn: boolean
  openSparky: () => Promise<void>
  askSparky: (question: string, starter?: boolean) => Promise<ChatAnswer>
  _sparkyGuard: void
}

export const test = base.extend<SparkyFixtures>({
  account: accountByAlias('josh'),
  liveChat: [false, { option: true }],
  allowInvalidUpload: [false, { option: true }],
  allowChatSignIn: [false, { option: true }],
  _sparkyGuard: [async ({ page, liveChat, allowInvalidUpload, allowChatSignIn, account, baseURL }, use) => {
    const unexpected: string[] = []
    await page.route('**/api/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (['GET', 'HEAD'].includes(request.method())) return route.fallback()
      const sameOrigin = url.origin === new URL(baseURL!).origin
      const permitted = request.method() === 'POST' && sameOrigin && (
        (liveChat && url.pathname === '/api/chat/stream' && request.postDataJSON()?.customer_id === account.customerId)
        || (allowInvalidUpload && url.pathname === '/api/bills/analyse')
        || (allowChatSignIn && url.pathname === '/api/auth/login')
      )
      if (permitted) return route.fallback()
      unexpected.push(`${request.method()} ${url.pathname}`)
      await route.abort('blockedbyclient')
    })
    try { await use() } finally {
      expect(unexpected, 'Only explicitly enabled chat, rejected-file and sign-in requests may leave this test').toEqual([])
    }
  }, { auto: true }],
  openSparky: async ({ page, account, dashboard, sidebar, assistant, _sparkyGuard }, use) => {
    await use(async () => {
      await dashboard.goto()
      const household = page.waitForRequest((request) =>
        request.method() === 'GET' && new URL(request.url()).pathname === `/api/households/${account.customerId}`)
      await sidebar.navigateTo('Sparky AI')
      await (await (await household).response())?.finished()
      await expect(assistant.heading).toBeVisible()
      await expect(assistant.modelStatus).not.toContainText('Checking Sparky')
    })
  },
  askSparky: async ({ page, assistant, account, liveChat }, use, testInfo) => {
    let turn = 0
    await use(async (question, starter = false) => {
      if (!liveChat) throw new Error('Live capture requires the liveChat option.')
      turn += 1
      const responsePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/chat/stream' && response.request().method() === 'POST')
      if (starter) await assistant.starter(question).click()
      else await assistant.ask(question)
      const response = await responsePromise
      const request = response.request().postDataJSON() as ChatRequest
      const body = await response.text()
      await testInfo.attach(`Turn ${turn} question`, {
        body: JSON.stringify({ customerId: request.customer_id, question, conversationId: request.conversation_id }),
        contentType: 'application/json',
      })
      await testInfo.attach(`Turn ${turn} response`, { body, contentType: 'text/plain' })
      expect(response.status(), 'The deployed chat service must answer successfully').toBe(200)
      expect(response.headers()['content-type']).toContain('text/event-stream')
      const answer = { ...parseChatStream(body), request }
      await testInfo.attach(`Turn ${turn} question and answer`, {
        body: JSON.stringify({ question, answer: answer.text, tools: answer.tools, done: answer.done, charts: answer.charts }, null, 2),
        contentType: 'application/json',
      })
      expect(request.customer_id).toBe(account.customerId)
      expect(request.message).toBe(question)
      expect(answer.text.trim(), 'A completed answer must contain customer-facing text').not.toBe('')
      // The edit control returns only after the UI has consumed the complete stream.
      await expect(assistant.editButtons.last()).toBeVisible()
      await expect(assistant.answers.last()).toBeVisible()
      const visibleText = await assistant.answerText(-1).evaluateAll((elements) => elements.flatMap((element) =>
        element.matches('ul, ol')
          ? Array.from(element.children, (item) => item.textContent ?? '')
          : [element.textContent ?? ''],
      ).join('\n'))
      expect(normalizeAnswerWhitespace(visibleText), 'The visible answer must match this response, excluding Markdown decoration')
        .toBe(renderedAnswerText(answer.text))
      return answer
    })
  },
})

export { expect } from '@playwright/test'
