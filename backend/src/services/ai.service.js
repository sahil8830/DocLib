const axios = require('axios')

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120_000,
})

const aiService = {
  async ingestDocument(filePath, documentId, filename, userId) {
    const response = await client.post('/ingest/', {
      file_path: filePath,
      document_id: documentId,
      filename,
      user_id: userId,          // ← scope ingest to user
    })
    return response.data
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
