const rateLimit = require('express-rate-limit')

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
})

const queryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Query rate limit exceeded — max 20 queries/minute.' },
})

module.exports = { rateLimiter, queryRateLimiter }
