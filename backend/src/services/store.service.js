// MongoDB-backed document and analytics store — per-user isolated.
// Every read operation is scoped to a userId so users never see each other's data.

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

  async get(id, userId) {
    const query = { _id: id }
    if (userId) query.userId = userId          // ← scope to user
    const doc = await Document.findOne(query)
    return doc ? doc.toJSON() : undefined
  }

  async update(id, updates) {
    await Document.findByIdAndUpdate(id, { $set: updates })
  }

  async delete(id) {
    await Document.findByIdAndDelete(id)
  }

  async list(userId) {
    const query = userId ? { userId } : {}     // ← scope to user
    const docs = await Document.find(query).sort({ uploadedAt: -1 })
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

  async getAll(userId) {
    const query = userId ? { userId } : {}     // ← scope to user
    const queries = await Query.find(query).sort({ timestamp: -1 })
    return queries.map((q) => q.toJSON())
  }

  async getSummary(userId) {
    const query = userId ? { userId } : {}     // ← scope to user
    const queries = await Query.find(query)
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
