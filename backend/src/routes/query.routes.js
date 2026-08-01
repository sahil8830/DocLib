const { Router } = require('express')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
const { queryRateLimiter } = require('../middleware/rateLimiter')
const { analyticsStore } = require('../services/store.service')

const router = Router()
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

// Single-shot query
router.post('/', queryRateLimiter, async (req, res) => {
  const { question, filters, rewrite = true, history = [] } = req.body
  if (!question?.trim()) {
    res.status(400).json({ error: 'Question is required' })
    return
  }

  const queryId = uuidv4()
  const startTime = Date.now()
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/query/`, { question, filters, rewrite, history, stream: false })
    const latencyMs = Date.now() - startTime
    await analyticsStore.addQuery({
      id: queryId,
      question,
      timestamp: new Date().toISOString(),
      latencyMs,
      chunkCount: response.data.chunk_count || 0,
    })
    res.json({ queryId, ...response.data, latencyMs })
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.detail || err.message })
  }
})

// SSE Streaming query
router.post('/stream', queryRateLimiter, async (req, res) => {
  const { question, filters, rewrite = true, history = [] } = req.body
  if (!question?.trim()) {
    res.status(400).json({ error: 'Question is required' })
    return
  }

  const queryId = uuidv4()
  const startTime = Date.now()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // Send queryId immediately so the frontend can wire up feedback before the stream finishes
  res.write(`data: ${JSON.stringify({ type: 'query_id', queryId })}\n\n`)

  try {
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/query/stream`,
      { question, filters, rewrite, history, stream: true },
      { responseType: 'stream' }
    )

    aiResponse.data.on('data', (chunk) => {
      res.write(chunk.toString())
    })

    aiResponse.data.on('end', async () => {
      const latencyMs = Date.now() - startTime
      await analyticsStore.addQuery({
        id: queryId,
        question,
        timestamp: new Date().toISOString(),
        latencyMs,
        chunkCount: 0,
      })
      res.end()
    })

    aiResponse.data.on('error', (err) => {
      console.error('AI stream error:', err.message)
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`)
      res.end()
    })
  } catch (err) {
    console.error('Stream query failed:', err.message)
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
    res.end()
  }
})


// Feedback endpoint
router.post('/:queryId/feedback', (req, res) => {
  const { feedback } = req.body
  if (!['up', 'down'].includes(feedback)) {
    res.status(400).json({ error: "Feedback must be 'up' or 'down'" })
    return
  }
  analyticsStore.updateFeedback(String(req.params.queryId), feedback)
    .then(() => res.json({ status: 'ok' }))
    .catch((err) => res.status(500).json({ error: err.message }))
})

module.exports = router
