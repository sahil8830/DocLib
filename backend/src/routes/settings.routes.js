const { Router } = require('express')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const router = Router()

const SETTINGS_PATH = path.resolve(__dirname, '../../../config/settings.yaml')

// GET /api/settings — read current settings.yaml
router.get('/', (_req, res) => {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return res.status(404).json({ error: 'settings.yaml not found' })
    }
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8')
    const parsed = yaml.load(raw) || {}
    res.json(parsed)
  } catch (err) {
    console.error('Failed to read settings:', err.message)
    res.status(500).json({ error: 'Failed to read settings' })
  }
})

// PUT /api/settings — write new settings.yaml and hot-reload the AI service
router.put('/', async (req, res) => {
  const body = req.body
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid settings payload' })
  }

  try {
    // Preserve structure by merging with existing settings
    let existing = {}
    if (fs.existsSync(SETTINGS_PATH)) {
      existing = yaml.load(fs.readFileSync(SETTINGS_PATH, 'utf8')) || {}
    }

    // Deep merge top-level sections
    const merged = { ...existing }
    for (const [section, values] of Object.entries(body)) {
      if (typeof values === 'object' && !Array.isArray(values)) {
        merged[section] = { ...(existing[section] || {}), ...values }
      } else {
        merged[section] = values
      }
    }

    const yamlStr = yaml.dump(merged, { indent: 2 })
    fs.writeFileSync(SETTINGS_PATH, yamlStr, 'utf8')

    // Notify AI service to reload its config
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
    try {
      const axios = require('axios')
      await axios.post(`${AI_SERVICE_URL}/settings/reload`, {}, { timeout: 5000 })
    } catch (reloadErr) {
      console.warn('AI service reload failed (settings saved anyway):', reloadErr.message)
    }

    res.json({ status: 'ok', message: 'Settings saved successfully' })
  } catch (err) {
    console.error('Failed to write settings:', err.message)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

module.exports = router
