import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseChatStream } from './chat-stream'

const completion = 'event: done\ndata: {"sources":[],"escalate_to_human":false,"conversation_id":7}\n\n'

test('SSE evidence drops pre-reset tokens, preserves Unicode and accepts multiline JSON and CRLF', () => {
  const body = ': heartbeat\n\nevent: token\ndata: {"text":"Discard this."}\n\n'
    + 'event: reset\ndata: {}\n\nevent: token\ndata: {\ndata: "text":"Your bill is $21.50 — today."}\n\n'
    + completion
  const answer = parseChatStream(body.replace(/\n/g, '\r\n'))
  assert.equal(answer.text, 'Your bill is $21.50 — today.')
  assert.equal(answer.done.conversation_id, 7)
})

test('SSE evidence rejects truncated, duplicate and error completions instead of treating them as answers', () => {
  assert.throws(() => parseChatStream('event: token\ndata: {"text":"Partial"}\n\n'), /exactly one done/)
  assert.throws(() => parseChatStream(completion + completion), /exactly one done/)
  assert.throws(() => parseChatStream('event: error\ndata: {"message":"Unavailable"}\n\n' + completion), /reported an error/)
  assert.throws(() => parseChatStream('event: done\ndata: {}\n\n'), /missing completion metadata/)
})
