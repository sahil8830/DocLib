import React, { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { MessageCircle, FileText, Zap, ThumbsUp, Layers, TrendingUp } from 'lucide-react'
import api from '../services/api.js'
import '../styles/pages.css'

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/summary')
      .then(({ data }) => setSummary(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const chartData = summary
    ? Object.entries(summary.queries.byDay).map(([date, count]) => ({ date, queries: count }))
    : []

  const metrics = summary
    ? [
        { label: 'Total Queries',     value: summary.queries.total,                                                                                                                                                          Icon: MessageCircle, bg: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
        { label: 'Documents Ready',   value: `${summary.documents.ready}/${summary.documents.total}`,                                                                                                                         Icon: FileText,      bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
        { label: 'Avg Latency',       value: `${summary.queries.avgLatency}ms`,                                                                                                                                                Icon: Zap,           bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
        { label: '👍 Positive',       value: summary.queries.positive,                                                                                                                                                         Icon: ThumbsUp,      bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
        { label: '👎 Negative',       value: summary.queries.negative ?? 0,                                                                                                                                                    Icon: ThumbsUp,      bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
        { label: 'Total Feedback',    value: (summary.queries.positive || 0) + (summary.queries.negative || 0),                                                                                                                Icon: Layers,        bg: 'rgba(6,182,212,0.15)',   color: '#22d3ee'  },
        { label: 'Total Chunks',      value: summary.documents.totalChunks,                                                                                                                                                    Icon: Layers,        bg: 'rgba(124,58,237,0.12)',  color: '#c4b5fd'  },
        { label: 'Satisfaction Rate', value: (summary.queries.positive + (summary.queries.negative ?? 0)) > 0 ? `${Math.round(summary.queries.positive / (summary.queries.positive + (summary.queries.negative || 0)) * 100)}%` : 'N/A', Icon: TrendingUp, bg: 'rgba(245,158,11,0.12)', color: '#fde68a' },
      ]
    : []

  const tooltipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Query performance and system metrics</p>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="analytics-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="metric-card">
                <div className="skeleton" style={{ height: 40, width: 40, borderRadius: 10, marginBottom: 14 }} />
                <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '80%' }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="analytics-grid">
              {metrics.map((m) => (
                <div key={m.label} className="metric-card">
                  <div className="metric-icon" style={{ background: m.bg, color: m.color }}>
                    <m.Icon size={20} strokeWidth={1.8} />
                  </div>
                  <div className="metric-value">{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="chart-card">
              <div className="chart-title">Queries Over Time</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="queries" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title">Feedback Distribution</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: 'Positive',    value: summary?.queries.positive || 0,                                                                                            fill: '#10b981' },
                  { name: 'Negative',    value: summary?.queries.negative || 0,                                                                                            fill: '#ef4444' },
                  { name: 'No Feedback', value: (summary?.queries.total || 0) - (summary?.queries.positive || 0) - (summary?.queries.negative || 0),                      fill: '#5a5a72' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: 'Positive',    value: summary?.queries.positive || 0,                                                                                            fill: '#10b981' },
                      { name: 'Negative',    value: summary?.queries.negative || 0,                                                                                            fill: '#ef4444' },
                      { name: 'No Feedback', value: (summary?.queries.total || 0) - (summary?.queries.positive || 0) - (summary?.queries.negative || 0),                      fill: '#5a5a72' },
                    ].map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
