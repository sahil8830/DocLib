/** Read the chat protocol and reject failed or incomplete responses. */
export async function readChatStream(response, onEvent) {
  if (!response.ok) {
    let message = `Chat request failed (${response.status}). Please try again.`
    if (response.headers.get('content-type')?.includes('application/json')) {
      const body = await response.json()
      message = body.error || body.detail || message
    }
    throw new Error(message)
  }
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('The chat endpoint returned an unexpected response. Check the backend URL configuration.')
  }
  if (!response.body) throw new Error('The chat response has no stream. Please try again.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', answer = '', completed = false
  const parseLine = (line) => {
    if (!line.startsWith('data:')) return
    const raw = line.slice(5).trim()
    if (!raw) return
    const event = JSON.parse(raw)
    if (event.type === 'error') throw new Error(event.message || 'The AI service could not generate an answer.')
    if (event.type === 'token') answer += event.text || ''
    if (event.type === 'done') completed = true
    onEvent(event)
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const line of lines) parseLine(line)
      if (done) {
        if (buffer) parseLine(buffer)
        break
      }
    }
    if (!completed) throw new Error('The answer was interrupted. Please try again.')
    if (!answer.trim()) throw new Error('No answer was returned by the AI service. Please try again.')
    return answer
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
