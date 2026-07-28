const { Router } = require('express')
const { analyticsStore, documentStore } = require('../services/store.service')
const { aiService } = require('../services/ai.service')

const router = Router()

router.get('/summary', async (_req, res) => {
  try {
    const querySummary = analyticsStore.getSummary()
    const aiStats = await aiService.getStats().catch(() => ({ total_chunks: 0, total_documents: 0 }))
    res.json({
      queries: querySummary,
      documents: {
        total: documentStore.list().length,
        ready: documentStore.list().filter((d) => d.status === 'ready').length,
        totalChunks: aiStats.total_chunks,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/queries', (_req, res) => {
  res.json({ queries: analyticsStore.getAll() })
})

module.exports = router
