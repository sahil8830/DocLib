// In-memory document and analytics store
// Replace with SQLite/PostgreSQL in production

class DocumentStore {
  constructor() {
    this.documents = new Map()
  }

  add(doc) { this.documents.set(doc.id, doc) }
  get(id) { return this.documents.get(id) }
  update(id, updates) {
    const doc = this.documents.get(id)
    if (doc) this.documents.set(id, { ...doc, ...updates })
  }
  delete(id) { this.documents.delete(id) }
  list() {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    )
  }
}

class AnalyticsStore {
  constructor() {
    this.queries = []
  }

  addQuery(record) { this.queries.push(record) }

  updateFeedback(id, feedback) {
    const q = this.queries.find((q) => q.id === id)
    if (q) q.feedback = feedback
  }

  getAll() { return this.queries }

  getSummary() {
    const total = this.queries.length
    const avgLatency = total > 0
      ? Math.round(this.queries.reduce((s, q) => s + q.latencyMs, 0) / total)
      : 0
    const positive = this.queries.filter((q) => q.feedback === 'up').length
    const negative = this.queries.filter((q) => q.feedback === 'down').length

    const byDay = {}
    this.queries.forEach((q) => {
      const day = q.timestamp.split('T')[0]
      byDay[day] = (byDay[day] || 0) + 1
    })

    return { total, avgLatency, positive, negative, byDay }
  }
}

const documentStore = new DocumentStore()
const analyticsStore = new AnalyticsStore()

module.exports = { documentStore, analyticsStore }
