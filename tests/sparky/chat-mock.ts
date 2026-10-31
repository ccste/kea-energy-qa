import type { Page } from '@playwright/test'
import { encodeSse, type ChatEvent, type ChatRequest } from '../../utils/chat-stream'

const endpoint = '**/api/chat/stream'

export function completedAnswer(text: string, conversationId = 7101): ChatEvent[] {
  return [
    { event: 'token', data: { text } },
    { event: 'done', data: {
      sources: [], escalate_to_human: false, escalation_reason: null,
      conversation_id: conversationId, latency_ms: 1, tokens: 1,
    } },
  ]
}

type PreparedStream = { id: string; chunks: string[]; status: number }
type MockWindow = Window & {
  __sparkyMockStages?: Map<string, () => void>
}

/** Mock only chat responses; the deployed page still handles every SSE frame. */
export async function mockChat(page: Page) {
  const pending: PreparedStream[] = []
  const requests: ChatRequest[] = []
  let sequence = 0

  // route.fulfill supplies a complete body. This adapter releases marked portions
  // separately so a test can inspect the UI between chart, token and done events.
  // Unmarked responses, including every live response, retain the native fetch path.
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window)
    const stages = new Map<string, () => void>()
    ;(window as MockWindow).__sparkyMockStages = stages
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await nativeFetch(...args)
      const id = response.headers.get('x-e2e-chat-stream')
      const lengths = response.headers.get('x-e2e-chat-chunks')
      if (!id || !lengths) return response
      const body = await response.text()
      const sizes = JSON.parse(lengths) as number[]
      const encoder = new TextEncoder()
      let cancelled = false
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let offset = 0
          for (let index = 0; index < sizes.length; index += 1) {
            if (index > 0) {
              const key = `${id}:${index}`
              await new Promise<void>((resolve) => stages.set(key, resolve))
              stages.delete(key)
            }
            if (cancelled) return
            const size = sizes[index]
            controller.enqueue(encoder.encode(body.slice(offset, offset + size)))
            offset += size
          }
          controller.close()
        },
        cancel() {
          cancelled = true
          for (const [key, release] of stages) {
            if (key.startsWith(`${id}:`)) release()
          }
        },
      })
      return new Response(stream, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      })
    }
  })

  await page.route(endpoint, async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.fallback()
    requests.push(request.postDataJSON() as ChatRequest)
    const prepared = pending.shift()
    if (!prepared) {
      await route.fulfill({ status: 503, json: { detail: 'No chat response was prepared for this request.' } })
      return
    }
    await route.fulfill({
      status: prepared.status,
      contentType: 'text/event-stream',
      headers: prepared.chunks.length > 1 ? {
        'x-e2e-chat-stream': prepared.id,
        'x-e2e-chat-chunks': JSON.stringify(prepared.chunks.map((chunk) => chunk.length)),
      } : {},
      body: prepared.chunks.join(''),
    })
  })

  return {
    requests,
    enqueue(events: ChatEvent[], status = 200) {
      pending.push({ id: `chat-${++sequence}`, chunks: [encodeSse(events)], status })
    },
    enqueueStages(stages: ChatEvent[][]) {
      const id = `chat-${++sequence}`
      pending.push({ id, chunks: stages.map(encodeSse), status: 200 })
      return {
        async advance(index: number) {
          const key = `${id}:${index}`
          await page.waitForFunction((stageKey) =>
            (window as MockWindow).__sparkyMockStages?.has(stageKey), key)
          await page.evaluate((stageKey) =>
            (window as MockWindow).__sparkyMockStages?.get(stageKey)?.(), key)
        },
      }
    },
  }
}
