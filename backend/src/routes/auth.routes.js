const { Router } = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/mail.service')

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'

// Generate a secure random token
function makeToken() {
  return crypto.randomBytes(32).toString('hex')
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() })
  if (existing) {
    return res.status(409).json({ error: 'User already exists' })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const verifyToken = makeToken()
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 h

    await User.create({ email, passwordHash, name, verifyToken, verifyTokenExpiry })

    // Send verification email (don't crash registration if mail fails)
    try {
      await sendVerificationEmail(email.toLowerCase().trim(), name, verifyToken)
    } catch (mailErr) {
      console.error('⚠️  Verification email failed:', mailErr.message)
    }

    res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
      emailSent: true,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Verify Email ──────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Verification token is required' })

  try {
    const user = await User.findOne({
      verifyToken: token,
      verifyTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link. Please register again.' })
    }

    user.isVerified = true
    user.verifyToken = null
    user.verifyTokenExpiry = null
    await user.save()

    res.json({ message: 'Email verified! You can now sign in.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email before signing in. Check your inbox.',
        code: 'EMAIL_NOT_VERIFIED',
      })
    }

    const id = user._id.toString()
    const token = jwt.sign({ id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id, email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Forgot Password ───────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // Always respond with success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' })
    }

    const resetToken = makeToken()
    user.resetToken = resetToken
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 h
    await user.save()

    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken)
    } catch (mailErr) {
      console.error('⚠️  Reset email failed:', mailErr.message)
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Reset Password ────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' })
    }

    user.passwordHash = await bcrypt.hash(password, 10)
    user.resetToken = null
    user.resetTokenExpiry = null
    user.isVerified = true // auto-verify if they reset via email
    await user.save()

    res.json({ message: 'Password updated successfully. You can now sign in.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Resend Verification Email ─────────────────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user || user.isVerified) {
      return res.json({ message: 'If an unverified account exists, a new link has been sent.' })
    }

    const verifyToken = makeToken()
    user.verifyToken = verifyToken
    user.verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await user.save()

    await sendVerificationEmail(user.email, user.name, verifyToken)
    res.json({ message: 'Verification email resent!' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
