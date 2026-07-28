const axios = require('axios')

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120_000,
})

const aiService = {
  async ingestDocument(filePath, documentId, filename) {
    const response = await client.post('/ingest/', { file_path: filePath, document_id: documentId, filename })
    return response.data
  },

  async query(question, filters, rewrite = true) {
    const response = await client.post('/query/', { question, filters, rewrite, stream: false })
    return response.data
  },

  async listDocuments() {
    const response = await client.get('/documents/')
    return response.data
  },

  async deleteDocument(documentId) {
    const response = await client.delete(`/documents/${documentId}`)
    return response.data
  },

  async getStats() {
    const response = await client.get('/documents/stats')
    return response.data
  },

  async healthCheck() {
    const response = await client.get('/health/')
    return response.data
  },
}

module.exports = { aiService }
