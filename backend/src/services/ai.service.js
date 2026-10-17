const axios = require('axios')

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120_000,
})

// Retry helper — handles Render free tier cold starts (service sleeps after 15min)
async function withRetry(fn, retries = 3, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries - 1) throw err
      console.log(`⚠️ AI service call failed, retrying in ${delayMs}ms... (attempt ${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
}

const aiService = {
  async ingestDocument(filePath, documentId, filename, userId, fileUrl = null) {
    return withRetry(() => client.post('/ingest/', {
      file_path: filePath,
      document_id: documentId,
      filename,
      user_id: userId,
      file_url: fileUrl,
    }).then(r => r.data), 3, 8000)  // 3 retries, 8s apart (for Render cold start ~30s)
  },

  async query(question, filters, rewrite = true, userId) {
    const response = await client.post('/query/', {
      question, filters, rewrite, stream: false,
      user_id: userId,          // ← scope query to user
    })
    return response.data
  },

  async listDocuments(userId) {
    const response = await client.get('/documents/', { params: { user_id: userId } })
    return response.data
  },

  async deleteDocument(documentId, userId) {
    const response = await client.delete(`/documents/${documentId}`, {
      params: { user_id: userId },  // ← scope delete to user
    })
    return response.data
  },

  async getStats(userId) {
    const response = await client.get('/documents/stats', { params: { user_id: userId } })
    return response.data
  },

  async healthCheck() {
    const response = await client.get('/health/')
    return response.data
  },
}

module.exports = { aiService }
