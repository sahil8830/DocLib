const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')
const fs = require('fs')
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

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(morgan('dev'))
app.use(rateLimiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/query', queryRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/conversations', conversationsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'DocLib Backend', timestamp: new Date().toISOString() })
})

// Error Handler
app.use(errorHandler)

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 DocLib Backend running on http://localhost:${PORT}`)
    console.log(`   AI Service: ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}\n`)
  })
})

module.exports = app
