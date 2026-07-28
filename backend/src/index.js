const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const authRoutes = require('./routes/auth.routes')
const documentsRoutes = require('./routes/documents.routes')
const queryRoutes = require('./routes/query.routes')
const analyticsRoutes = require('./routes/analytics.routes')
const { errorHandler } = require('./middleware/errorHandler')
const { rateLimiter } = require('./middleware/rateLimiter')

const app = express()
const PORT = process.env.PORT || 3001

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'Contexa Backend', timestamp: new Date().toISOString() })
})

// Error Handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\n🚀 Contexa Backend running on http://localhost:${PORT}`)
  console.log(`   AI Service: ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}\n`)
})

module.exports = app
