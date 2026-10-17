const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
require('dotenv').config()

const { connectDB } = require('./db')

const authRoutes = require('./routes/auth.routes')
const documentsRoutes = require('./routes/documents.routes')
const queryRoutes = require('./routes/query.routes')
const analyticsRoutes = require('./routes/analytics.routes')
const settingsRoutes = require('./routes/settings.routes')
const conversationsRoutes = require('./routes/conversations.routes')
const { errorHandler } = require('./middleware/errorHandler')
const { rateLimiter } = require('./middleware/rateLimiter')

const app = express()
const PORT = process.env.PORT || 3001

// Trust Nginx reverse proxy (fixes express-rate-limit X-Forwarded-For warning)
app.set('trust proxy', 1)

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(morgan('dev'))
app.use(rateLimiter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'DocLib Backend', timestamp: new Date().toISOString() })
})

// Await the shared database connection before routes use Mongoose models.
app.use('/api', async (_req, res, next) => {
  try {
    await connectDB()
  } catch (err) {
    console.error('Database unavailable:', err.message)
    return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' })
  }
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/query', queryRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/conversations', conversationsRoutes)

// Error Handler
app.use(errorHandler)

// Vercel invokes the exported app; only local execution opens a port.
if (require.main === module && !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 DocLib Backend running on http://localhost:${PORT}`)
      console.log(`   AI Service: ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}\n`)
    })
  }).catch((err) => {
    console.error('Backend startup failed:', err.message)
    process.exitCode = 1
  })
}

module.exports = app
