const { Router } = require('express')
const { analyticsStore, documentStore } = require('../services/store.service')
const { authMiddleware } = require('../middleware/auth.middleware')
const { aiService } = require('../services/ai.service')

const router = Router()

// All analytics routes require authentication
router.use(authMiddleware)

router.get('/summary', async (req, res) => {
  const userId = req.user.id                          // ← from JWT
  try {
    const [querySummary, allDocs, aiStats] = await Promise.all([
      analyticsStore.getSummary(userId),              // ← scoped to user
      documentStore.list(userId),                     // ← scoped to user
      aiService.getStats(userId).catch(() => ({ total_chunks: 0, total_documents: 0 })),
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

router.get('/queries', async (req, res) => {
  const userId = req.user.id                          // ← from JWT
  try {
    const queries = await analyticsStore.getAll(userId)  // ← scoped to user
    res.json({ queries })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
