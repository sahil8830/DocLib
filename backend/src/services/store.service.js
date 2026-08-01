// MongoDB-backed document and analytics store
// Replaces the previous in-memory Map / array implementation.
// The public API surface is preserved so existing routes need no changes.

const Document = require('../models/Document')
const Query = require('../models/Query')

// ---------------------------------------------------------------------------
// DocumentStore — wraps the Document Mongoose model
// ---------------------------------------------------------------------------
class DocumentStore {
  async add(doc) {
    // doc.id is the uuid from the route; map it to _id for Mongoose
    const record = new Document({ ...doc, _id: doc.id })
    await record.save()
  }

  async get(id) {
    const doc = await Document.findById(id)
    return doc ? doc.toJSON() : undefined
  }

  async update(id, updates) {
    await Document.findByIdAndUpdate(id, { $set: updates })
  }

  async delete(id) {
    await Document.findByIdAndDelete(id)
  }

  async list() {
    const docs = await Document.find().sort({ uploadedAt: -1 })
    return docs.map((d) => d.toJSON())
  }
}

// ---------------------------------------------------------------------------
// AnalyticsStore — wraps the Query Mongoose model
// ---------------------------------------------------------------------------
class AnalyticsStore {
  async addQuery(record) {
    const q = new Query({ ...record, _id: record.id })
    await q.save()
  }

  async updateFeedback(id, feedback) {
    await Query.findByIdAndUpdate(id, { $set: { feedback } })
  }

  async getAll() {
    const queries = await Query.find().sort({ timestamp: -1 })
    return queries.map((q) => q.toJSON())
  }

  async getSummary() {
    const queries = await Query.find()
    const total = queries.length
    const avgLatency =
      total > 0
        ? Math.round(queries.reduce((s, q) => s + q.latencyMs, 0) / total)
        : 0
    const positive = queries.filter((q) => q.feedback === 'up').length
    const negative = queries.filter((q) => q.feedback === 'down').length

    const byDay = {}
    queries.forEach((q) => {
      const day = q.timestamp.split('T')[0]
      byDay[day] = (byDay[day] || 0) + 1
    })

    return { total, avgLatency, positive, negative, byDay }
  }
}

const documentStore = new DocumentStore()
const analyticsStore = new AnalyticsStore()

module.exports = { documentStore, analyticsStore }
