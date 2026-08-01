const { Router } = require('express')
const { v4: uuidv4 } = require('uuid')
const { authMiddleware } = require('../middleware/auth.middleware')
const Conversation = require('../models/Conversation')

const router = Router()

// All conversation routes require authentication
router.use(authMiddleware)

// ── List all conversations for this user ──────────────────────
router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation
      .find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .select('-messages')          // exclude messages for list view (lighter payload)
    res.json({ conversations: conversations.map((c) => c.toJSON()) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Get one conversation (full messages) ─────────────────────
router.get('/:id', async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user.id })
    if (!conv) return res.status(404).json({ error: 'Conversation not found' })
    res.json(conv.toJSON())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Create a new conversation ─────────────────────────────────
router.post('/', async (req, res) => {
  const { title, messages = [] } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

  try {
    const now = new Date().toISOString()
    const conv = new Conversation({
      _id: uuidv4(),
      userId: req.user.id,
      title: title.slice(0, 80),    // cap title length
      messages,
      createdAt: now,
      updatedAt: now,
    })
    await conv.save()
    res.status(201).json(conv.toJSON())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Append messages to a conversation ────────────────────────
router.patch('/:id', async (req, res) => {
  const { messages } = req.body   // array of { role, content, timestamp }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  try {
    const conv = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        $push: { messages: { $each: messages } },
        $set:  { updatedAt: new Date().toISOString() },
      },
      { new: true }
    )
    if (!conv) return res.status(404).json({ error: 'Conversation not found' })
    res.json({ status: 'ok', messageCount: conv.messages.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Delete a conversation ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!result) return res.status(404).json({ error: 'Conversation not found' })
    res.json({ status: 'deleted', id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
