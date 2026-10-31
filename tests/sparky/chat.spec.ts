import type { Page } from '@playwright/test'
import { expect, test } from './sparky-test'
import { completedAnswer, mockChat } from './chat-mock'

const starterQuestions = [
  'Why is my power bill so high?',
  'Which day was my highest usage?',
  'Could another plan save me money?',
]
const unavailableText = 'Sparky can’t reach your usage data right now.'
const streamFailure = "Sparky's AI service is unavailable right now. Your usage pages are still available; please try asking again shortly."

async function currentHealth(page: Page) {
  const response = await page.request.get('/api/health')
  expect(response.status()).toBe(200)
  return await response.json() as { provider: string; model: string; model_ready: boolean }
}

test.describe('Sparky AI', () => {
  test.describe('Use the chat', () => {
    test.describe('Positive Testing', () => {
      test('Opens with the model status and starter questions', { tag: '@smoke' }, async ({
        page, assistant, openSparky,
      }) => {
        const health = await currentHealth(page)
        expect(health.model_ready, 'This positive case requires the deployed model to be ready').toBe(true)
        await openSparky()
        await expect(assistant.heading).toHaveText('AI Assistant')
        await expect(assistant.modelStatus).toContainText(`Sparky ready · ${health.provider} · ${health.model}`)
        await expect(assistant.refreshStatus).toHaveText('Check again')
        await expect(assistant.startHeading).toBeVisible()
        for (const question of starterQuestions) await expect(assistant.starter(question)).toBeVisible()
        await expect(assistant.root.locator('.prompt-grid').getByRole('button')).toHaveCount(3)
        await expect(assistant.message).toHaveAttribute('placeholder', 'Message Sparky')
        await expect(assistant.send).toBeDisabled()
        await assistant.attachments.click()
        await expect(assistant.attachments).toHaveAttribute('aria-expanded', 'true')
        await expect(assistant.uploadPdf).toHaveText('Upload a PDFYour bill as a PDF, from any retailer')
        await expect(assistant.uploadPhoto).toHaveText('Upload a photoA photo or screenshot of your bill')
        await assistant.attachments.click()
        await expect(assistant.attachments).toHaveAttribute('aria-expanded', 'false')
        await expect(assistant.uploadPdf).toBeHidden()
        await expect(assistant.uploadPhoto).toBeHidden()
        await expect(assistant.root.locator('.chat-footer')).toContainText('Sparky can make mistakes.')
        await expect(assistant.termsButton).toBeVisible()
        await expect(assistant.footerHelp).toBeVisible()
      })

      test('Ask a starter question', async ({ page, account, assistant, openSparky }) => {
        const mock = await mockChat(page)
        const answer = 'Your highest day was 7 June, at 21.81 kWh.'
        const stream = mock.enqueueStages([
          [
            { event: 'token', data: { text: 'Let me check that.' } },
            { event: 'reset', data: {} },
            { event: 'tool', data: { name: 'get_daily_usage', arguments: {} } },
          ],
          [
            { event: 'result', data: { name: 'get_daily_usage', ok: true, source: 'Prepared daily readings' } },
            { event: 'chart', data: {
              kind: 'bar', title: 'Highest daily usage', unit: 'kwh',
              points: [{ label: '7 June', value: 21.81, highlight: true }],
              caveat: null, source: 'Prepared daily readings',
            } },
            { event: 'token', data: { text: 'Your highest day was ' } },
          ],
          [
            { event: 'token', data: { text: '7 June, at 21.81 kWh.' } },
            { event: 'done', data: {
              sources: [{ tool: 'get_daily_usage', arguments: {}, source: 'Prepared daily readings', ok: true }],
              escalate_to_human: false, escalation_reason: null, conversation_id: 7101,
              latency_ms: 1, tokens: 1,
            } },
          ],
        ])
        await openSparky()
        await assistant.starter(starterQuestions[1]).click()
        await expect(assistant.userMessages).toHaveText([starterQuestions[1]])
        await expect(assistant.root.getByText('Reading your daily meter data', { exact: true })).toBeVisible()
        await expect(assistant.root.getByText('Let me check that.', { exact: true })).toHaveCount(0)
        await expect(assistant.charts).toHaveCount(0)
        await stream.advance(1)
        await expect(assistant.answers.last()).toContainText('Your highest day was')
        await expect(assistant.charts, 'The chart must wait for the done event').toHaveCount(0)
        await expect(assistant.sourceBadges).toHaveCount(0)
        await stream.advance(2)
        await expect(assistant.answers.last().locator(':scope > p')).toHaveText(answer)
        await expect(assistant.root.getByText('Let me check that.', { exact: true })).toHaveCount(0)
        await expect(assistant.sourceBadges).toHaveCount(1)
        await assistant.sourceBadges.getByText('Answered from your own meter data', { exact: true }).click()
        await expect(assistant.sourceBadges.getByText('Reading your daily meter data', { exact: true })).toBeVisible()
        await expect(assistant.charts).toHaveCount(1)
        await expect(assistant.charts.locator('figcaption')).toHaveText('Highest daily usage')
        const proseBox = await assistant.answers.last().locator(':scope > p').boundingBox()
        const chartBox = await assistant.charts.boundingBox()
        expect(proseBox).not.toBeNull()
        expect(chartBox).not.toBeNull()
        expect(chartBox!.y).toBeGreaterThanOrEqual(proseBox!.y + proseBox!.height)
        await expect(assistant.startHeading).toBeHidden()
        await expect(assistant.newChat).toBeVisible()
        expect(mock.requests).toEqual([{ customer_id: account.customerId, message: starterQuestions[1], conversation_id: null }])
      })

      test('Type and send a question', async ({ page, assistant, openSparky }) => {
        const mock = await mockChat(page)
        const stream = mock.enqueueStages([
          [{ event: 'tool', data: { name: 'get_daily_usage', arguments: {} } }],
          completedAnswer('Your prepared daily answer contains 10 kWh.'),
        ])
        await openSparky()
        await expect(assistant.send).toBeDisabled()
        await assistant.message.fill('   ')
        await expect(assistant.send).toBeDisabled()
        await assistant.message.fill('How much power did I use?')
        await assistant.message.press('Enter')
        await expect(assistant.userMessages).toHaveText(['How much power did I use?'])
        await expect(assistant.message).toHaveValue('')
        await expect(assistant.send).toBeDisabled()
        await expect(assistant.root.getByText('Reading your daily meter data', { exact: true })).toBeVisible()
        await assistant.message.fill('First line')
        await assistant.message.press('Shift+Enter')
        await assistant.message.pressSequentially('Second line')
        await expect(assistant.message).toHaveValue('First line\nSecond line')
        await expect(assistant.send).toBeDisabled()
        await expect(assistant.startHeading).toBeHidden()
        for (const question of starterQuestions) await expect(assistant.starter(question)).toBeHidden()
        expect(mock.requests).toHaveLength(1)
        await stream.advance(1)
        await expect(assistant.answers.last()).toHaveText('Your prepared daily answer contains 10 kWh.')
        await expect(assistant.send).toBeEnabled()
        await assistant.message.fill(' ')
        await expect(assistant.send).toBeDisabled()
        expect(mock.requests).toHaveLength(1)
      })

      test.describe(() => {
        test.use({ allowChatSignIn: true })

        test('The conversation is kept', async ({
          page, assistant, sidebar, logoutDialog, login, credentials, toasts, openSparky,
        }) => {
          const mock = await mockChat(page)
          mock.enqueue(completedAnswer('Your first prepared answer is 10 kWh.'))
          mock.enqueue(completedAnswer('Your fresh chat answer is 12 kWh.', 7102))
          await openSparky()
          await assistant.ask('Keep this conversation for me.')
          await expect(assistant.answers.last()).toHaveText('Your first prepared answer is 10 kWh.')
          await sidebar.navigateTo('Usage')
          await expect(page).toHaveURL(/\/usage$/)
          await sidebar.navigateTo('Sparky AI')
          await expect(assistant.userMessages).toHaveText(['Keep this conversation for me.'])
          await expect(assistant.answers.last()).toHaveText('Your first prepared answer is 10 kWh.')
          await page.reload()
          await expect(assistant.userMessages).toHaveText(['Keep this conversation for me.'])
          await expect(assistant.answers.last()).toHaveText('Your first prepared answer is 10 kWh.')
          await assistant.newChat.click()
          await expect(assistant.startHeading).toBeVisible()
          await expect(assistant.userMessages).toHaveCount(0)
          await expect(assistant.newChat).toBeHidden()
          await expect(toasts.message('New chat started')).toHaveText('New chat started')
          await assistant.ask('This belongs to a fresh chat.')
          await expect(assistant.answers.last()).toHaveText('Your fresh chat answer is 12 kWh.')
          expect(mock.requests.map((request) => request.conversation_id)).toEqual([null, null])
          await sidebar.logout.click()
          await logoutDialog.confirm.click()
          await expect(login.heading).toBeVisible()
          await login.signIn(credentials.email, credentials.password)
          await sidebar.navigateTo('Sparky AI')
          await expect(assistant.startHeading).toBeVisible()
          await expect(assistant.userMessages).toHaveCount(0)
          await expect(assistant.answers).toHaveCount(0)
          await expect(assistant.newChat).toBeHidden()
          expect(mock.requests).toHaveLength(2)
        })
      })

      test('Edit a sent question', async ({ page, assistant, openSparky }) => {
        const mock = await mockChat(page)
        mock.enqueue(completedAnswer('First prepared answer: 10 kWh.'))
        mock.enqueue(completedAnswer('Second prepared answer: 12 kWh.'))
        mock.enqueue(completedAnswer('Revised prepared answer: 15 kWh.'))
        await openSparky()
        await assistant.ask('Question one')
        await expect(assistant.answers.last()).toHaveText('First prepared answer: 10 kWh.')
        await assistant.ask('Question two')
        await expect(assistant.answers.last()).toHaveText('Second prepared answer: 12 kWh.')
        await assistant.editMessage(0, 'Revised question one')
        await assistant.userMessages.first().getByRole('button', { name: 'Save', exact: true }).click()
        await expect(assistant.userMessages).toHaveText(['Revised question one'])
        await expect(assistant.answers.last()).toHaveText('Revised prepared answer: 15 kWh.')
        await expect(assistant.root.getByText('First prepared answer: 10 kWh.', { exact: true })).toHaveCount(0)
        await expect(assistant.root.getByText('Second prepared answer: 12 kWh.', { exact: true })).toHaveCount(0)
        await expect(assistant.root.getByText('Question two', { exact: true })).toHaveCount(0)
        const beforeCancel = await assistant.answers.allTextContents()
        await assistant.editMessage(0, 'Discard this draft')
        await assistant.userMessages.first().getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(assistant.userMessages).toHaveText(['Revised question one'])
        await expect(assistant.answers).toHaveText(beforeCancel)
        expect(mock.requests.map((request) => request.message)).toEqual(['Question one', 'Question two', 'Revised question one'])
      })

      test('Sparky AI terms and Help & Support', async ({ page, assistant, openSparky }) => {
        await openSparky()
        for (const dismiss of ['Got it', 'Escape']) {
          await assistant.termsButton.click()
          await expect(assistant.terms.root).toBeVisible()
          for (const part of ['What Sparky reads', 'It can be wrong', 'What it can’t see', 'Getting help']) {
            await expect(assistant.terms.root.getByText(part, { exact: true })).toBeVisible()
          }
          if (dismiss === 'Got it') await assistant.terms.button('Got it').click()
          else await assistant.terms.pressEscape()
          await expect(assistant.terms.root).toBeHidden()
        }
        await assistant.footerHelp.click()
        await expect(page).toHaveURL(/\/help$/)
      })
    })

    test.describe('Negative Testing', () => {
      for (const failure of ['model not ready', 'health request failed'] as const) {
        test(`Sparky model unavailable — ${failure}`, async ({ page, assistant, openSparky }) => {
          const health = await currentHealth(page)
          await page.route('**/api/health', async (route) => {
            if (failure === 'model not ready') await route.fulfill({ json: { ...health, model_ready: false } })
            else await route.fulfill({ status: 503, json: { detail: 'The health service is unavailable.' } })
          })
          await openSparky()
          const label = failure === 'model not ready' ? `${health.provider} · ${health.model}` : 'Service unreachable'
          await expect(assistant.modelStatus).toContainText(`Sparky unavailable · ${label}`)
          await page.unroute('**/api/health')
          const recovered = page.waitForResponse('**/api/health')
          await assistant.refreshStatus.click()
          expect((await recovered).status()).toBe(200)
          await expect(assistant.modelStatus).toContainText(`Sparky ready · ${health.provider} · ${health.model}`)
        })
      }

      test('Account data unavailable', async ({ page, account, assistant, openSparky }) => {
        await page.route(`**/api/households/${account.customerId}`, async (route) => {
          if (new URL(page.url()).pathname !== '/assistant') return route.fallback()
          await route.fulfill({ status: 503, json: { detail: 'Account data is unavailable.' } })
        })
        await openSparky()
        await expect(assistant.offline).toContainText(unavailableText)
        await expect(assistant.offline).toContainText('Answers are unavailable rather than guessed. Please try again shortly.')
        await expect(assistant.message).toBeDisabled()
        await expect(assistant.message).toHaveAttribute('placeholder', 'Unavailable while Sparky is offline')
        for (const question of starterQuestions) await expect(assistant.starter(question)).toBeDisabled()
        await assistant.offline.getByRole('button', { name: 'See support options', exact: true }).click()
        await expect(page).toHaveURL(/\/help$/)
      })

      for (const failure of ['error event', 'HTTP 503'] as const) {
        test(`The answer fails — ${failure}`, async ({ page, assistant, toasts, openSparky }) => {
          const mock = await mockChat(page)
          mock.enqueue([{ event: 'error', data: { message: streamFailure, retryable: true } }], failure === 'HTTP 503' ? 503 : 200)
          await openSparky()
          await assistant.starter(starterQuestions[0]).click()
          const expected = failure === 'error event' ? streamFailure : unavailableText
          await expect(assistant.answers.last().locator('.answer-withheld')).toHaveText(expected)
          await expect(toasts.messages.filter({ hasText: failure === 'error event' ? streamFailure : /chat\/stream → 503/ })).toHaveClass(/toast-warning/)
          await expect(assistant.sourceBadges).toHaveCount(0)
          await expect(assistant.charts).toHaveCount(0)
          if (failure === 'HTTP 503') {
            await expect(assistant.offline).toContainText(unavailableText)
            await expect(assistant.message).toBeDisabled()
          }
          expect(mock.requests).toHaveLength(1)
        })
      }

      test.describe(() => {
        test.use({ allowInvalidUpload: true })

        for (const file of [
          { name: 'unsupported.txt', mimeType: 'text/plain', size: 10, message: 'Sparky can read a photo or a PDF of your bill. text/plain is not one it can open.' },
          { name: 'empty.pdf', mimeType: 'application/pdf', size: 0, message: 'That file was empty.' },
          { name: 'too-large.pdf', mimeType: 'application/pdf', size: 13_000_000, message: 'That file is 13 MB. Please send one under 12 MB — a normal phone photo is well inside that.' },
        ]) {
          test(`Attachment that cannot be accepted — ${file.name}`, async ({ page, assistant, toasts, openSparky }) => {
            const chatRequests: string[] = []
            page.on('request', (request) => {
              if (new URL(request.url()).pathname === '/api/chat/stream') chatRequests.push(request.method())
            })
            await openSparky()
            await assistant.attachments.click()
            const chooserPromise = page.waitForEvent('filechooser')
            await assistant.uploadPdf.click()
            const chooser = await chooserPromise
            const rejected = page.waitForResponse((response) =>
              new URL(response.url()).pathname === '/api/bills/analyse' && response.request().method() === 'POST')
            await chooser.setFiles({ name: file.name, mimeType: file.mimeType, buffer: Buffer.alloc(file.size, 65) })
            const response = await rejected
            expect(response.status()).toBe(422)
            expect(await response.json()).toEqual({ detail: file.message })
            await expect(assistant.userMessages.getByText(file.name, { exact: true })).toBeVisible()
            await expect(assistant.userMessages.getByText('Could not be read', { exact: true })).toBeVisible()
            await expect(toasts.message(file.message)).toHaveText(file.message)
            await expect(toasts.message(file.message)).toHaveClass(/toast-warning/)
            await expect(assistant.answers).toHaveCount(1)
            await expect(assistant.answers).toHaveText('Hello! I’m Sparky. Ask me about your bill, usage, or energy plan.')
            expect(chatRequests, 'A rejected file must not start an answer').toEqual([])
          })
        }
      })
    })
  })
})
