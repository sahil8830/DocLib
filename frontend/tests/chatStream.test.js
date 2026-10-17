import test from 'node:test'
import assert from 'node:assert/strict'
import { readChatStream } from '../src/services/chatStream.js'

function responseFor(parts) {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part))
      controller.close()
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } })
}

test('reads tokens across arbitrary network boundaries and CRLF lines', async () => {
  const events = []
  const response = responseFor([
    'data: {"type":"query_id","queryId":"id"}\r\n\r\nda',
    'ta: {"type":"token","text":"Hello "}\r\n\r\ndata: {"type":"token",',
    '"text":"world"}\n\ndata: {"type":"done"}',
  ])
  assert.equal(await readChatStream(response, event => events.push(event)), 'Hello world')
  assert.equal(events[0].queryId, 'id')
  assert.equal(events.at(-1).type, 'done')
})

test('rejects frontend HTML instead of producing an empty answer', async () => {
  await assert.rejects(readChatStream(new Response('<html>app</html>', {
    headers: { 'Content-Type': 'text/html' },
  }), () => {}), /backend URL/)
})

test('shows HTTP error details', async () => {
  const response = new Response(JSON.stringify({ error: 'Session expired' }), {
    status: 401, headers: { 'Content-Type': 'application/json' },
  })
  await assert.rejects(readChatStream(response, () => {}), /Session expired/)
})

test('shows Gemini quota stream errors', async () => {
  await assert.rejects(readChatStream(responseFor([
    'data: {"type":"error","message":"Gemini quota exceeded. Try again after 47 seconds."}\n\n',
  ]), () => {}), /Gemini quota exceeded/)
})

test('rejects a connection that closes without a completion event', async () => {
  await assert.rejects(readChatStream(responseFor([
    'data: {"type":"token","text":"Partial answer"}\n\n',
  ]), () => {}), /interrupted/)
})

test('rejects completed streams without an answer', async () => {
  await assert.rejects(readChatStream(responseFor([
    'data: {"type":"sources","sources":[]}\n\ndata: {"type":"done"}\n\n',
  ]), () => {}), /No answer/)
})

test('rejects malformed stream events', async () => {
  await assert.rejects(readChatStream(responseFor(['data: invalid JSON\n\n']), () => {}), SyntaxError)
})
