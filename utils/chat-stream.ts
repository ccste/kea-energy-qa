export type ChatEvent = { event: string; data: Record<string, unknown> }
export type ChatChart = {
  kind: 'bar' | 'line'
  title: string
  unit: 'nzd' | 'kwh'
  points: { label: string; value: number; highlight?: boolean }[]
  caveat: string | null
  source: string | null
}
export type ChatDone = {
  sources: { tool: string; ok: boolean; source: string | null; arguments: Record<string, unknown> | null }[]
  escalate_to_human: boolean
  escalation_reason: string | null
  conversation_id: number | null
}
export type ChatRequest = { customer_id: string; message: string; conversation_id: number | null }
export type ChatAnswer = {
  text: string
  events: ChatEvent[]
  tools: string[]
  charts: ChatChart[]
  done: ChatDone
  request: ChatRequest
}

export function encodeSse(events: ChatEvent[]): string {
  return events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('')
}

/** Read the browser's response without importing the application's stream parser. */
export function parseChatStream(body: string): Omit<ChatAnswer, 'request'> {
  const events: ChatEvent[] = []
  for (const frame of body.replace(/\r\n?/g, '\n').split('\n\n')) {
    let event = 'message'
    const data: string[] = []
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
    }
    if (!data.length) continue
    const payload: unknown = JSON.parse(data.join('\n'))
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error(`The ${event} event did not contain a JSON object.`)
    }
    events.push({ event, data: payload as Record<string, unknown> })
  }
  const doneEvents = events.filter(({ event }) => event === 'done')
  if (events.some(({ event }) => event === 'error')) throw new Error('The chat stream reported an error; inspect the attached response.')
  if (doneEvents.length !== 1 || events.at(-1)?.event !== 'done') {
    throw new Error('The chat stream must finish with exactly one done event.')
  }
  const done = doneEvents[0].data
  if (!Array.isArray(done.sources) || typeof done.escalate_to_human !== 'boolean'
    || !(done.conversation_id === null || typeof done.conversation_id === 'number')) {
    throw new Error('The done event is missing completion metadata.')
  }
  let text = ''
  for (const item of events) {
    if (item.event === 'reset') text = ''
    if (item.event === 'token') {
      if (typeof item.data.text !== 'string') throw new Error('A token event has no text.')
      text += item.data.text
    }
  }
  return {
    events, text,
    tools: events.filter(({ event }) => event === 'tool').map(({ data }) => String(data.name)),
    charts: events.filter(({ event }) => event === 'chart').map(({ data }) => data as ChatChart),
    done: done as ChatDone,
  }
}
