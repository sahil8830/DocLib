const { Router } = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'

// Simple in-memory user store (replace with DB in production)
const users = []

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required' })
    return
  }
  if (users.find((u) => u.email === email)) {
    res.status(409).json({ error: 'User already exists' })
    return
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const id = `user_${Date.now()}`
  users.push({ id, email, passwordHash, name })
  const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' })
  res.status(201).json({ token, user: { id, email, name } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = users.find((u) => u.email === email)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
})

module.exports = router
