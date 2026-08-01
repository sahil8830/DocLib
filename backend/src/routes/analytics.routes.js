const { Router } = require('express')
const { analyticsStore, documentStore } = require('../services/store.service')
const { aiService } = require('../services/ai.service')

const router = Router()

router.get('/summary', async (_req, res) => {
  try {
    const [querySummary, allDocs, aiStats] = await Promise.all([
      analyticsStore.getSummary(),
      documentStore.list(),
      aiService.getStats().catch(() => ({ total_chunks: 0, total_documents: 0 })),
    ])
    res.json({
      queries: querySummary,
      documents: {
        total: allDocs.length,
        ready: allDocs.filter((d) => d.status === 'ready').length,
        totalChunks: aiStats.total_chunks,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/queries', async (_req, res) => {
  try {
    const queries = await analyticsStore.getAll()
    res.json({ queries })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
