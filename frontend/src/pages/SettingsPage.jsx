import React, { useState, useEffect } from 'react'
import api from '../services/api.js'
import { useAppStore } from '../store/useAppStore.js'
import '../styles/pages.css'

const DEFAULT_SETTINGS = {
  chunking: { strategy: 'fixed_size', chunk_size: 512, chunk_overlap: 64 },
  retrieval: { top_k: 6, similarity_threshold: 0.65, hybrid_search: true, bm25_weight: 0.3 },
}

export default function SettingsPage() {
  const { addToast } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Chunking
  const [chunkSize, setChunkSize] = useState(512)
  const [chunkOverlap, setChunkOverlap] = useState(64)
  const [strategy, setStrategy] = useState('fixed_size')

  // Retrieval
  const [topK, setTopK] = useState(6)
  const [threshold, setThreshold] = useState(0.65)
  const [hybridSearch, setHybridSearch] = useState(true)
  const [bm25Weight, setBm25Weight] = useState(0.3)
  const [rewrite, setRewrite] = useState(true)

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => {
        const s = data
        setStrategy(s.chunking?.strategy ?? 'fixed_size')
        setChunkSize(s.chunking?.chunk_size ?? 512)
        setChunkOverlap(s.chunking?.chunk_overlap ?? 64)
        setTopK(s.retrieval?.top_k ?? 6)
        setThreshold(s.retrieval?.similarity_threshold ?? 0.65)
        setHybridSearch(s.retrieval?.hybrid_search ?? true)
        setBm25Weight(s.retrieval?.bm25_weight ?? 0.3)
        setRewrite(s.retrieval?.rewrite ?? true)
      })
      .catch((err) => {
        console.error('Failed to load settings:', err)
        addToast({ id: 'settings-load-err', message: 'Could not load settings — showing defaults', type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings', {
        chunking: { strategy, chunk_size: chunkSize, chunk_overlap: chunkOverlap },
        retrieval: {
          top_k: topK,
          similarity_threshold: threshold,
          hybrid_search: hybridSearch,
          bm25_weight: bm25Weight,
          rewrite,
        },
      })
      setSaved(true)
      addToast({ id: 'settings-saved', message: 'Settings saved — pipeline reloaded', type: 'success' })
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      addToast({ id: 'settings-save-err', message: 'Failed to save settings. Please try again.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Tune the RAG pipeline parameters</p>
          </div>
        </div>
        <div className="page-body">
          <div className="settings-section">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="setting-row">
                <div className="setting-info">
                  <div className="skeleton" style={{ height: 16, width: 140, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: 220 }} />
                </div>
                <div className="setting-control">
                  <div className="skeleton" style={{ height: 32, width: 160, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Tune the RAG pipeline parameters</p>
        </div>
        <button id="save-settings" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving
            ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            : saved ? '✓ Saved' : 'Save Changes'
          }
        </button>
      </div>

      <div className="page-body">
        {/* Chunking */}
        <div className="settings-section">
          <div className="settings-section-title">🗂️ Chunking</div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Strategy</div>
              <div className="setting-desc">How documents are split into chunks</div>
            </div>
            <div className="setting-control">
              <select id="chunk-strategy" className="input" style={{ width: 160 }} value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                <option value="fixed_size">Fixed Size</option>
                <option value="semantic">Semantic</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Chunk Size</div>
              <div className="setting-desc">Characters per chunk (100–2000)</div>
            </div>
            <div className="setting-control">
              <div className="slider-wrapper">
                <input id="chunk-size-slider" type="range" min={100} max={2000} step={50} className="slider" value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} />
                <span className="slider-value">{chunkSize}</span>
              </div>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Chunk Overlap</div>
              <div className="setting-desc">Overlap between consecutive chunks</div>
            </div>
            <div className="setting-control">
              <div className="slider-wrapper">
                <input id="chunk-overlap-slider" type="range" min={0} max={200} step={8} className="slider" value={chunkOverlap} onChange={(e) => setChunkOverlap(Number(e.target.value))} />
                <span className="slider-value">{chunkOverlap}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Retrieval */}
        <div className="settings-section">
          <div className="settings-section-title">🔍 Retrieval</div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Top-K Chunks</div>
              <div className="setting-desc">Number of chunks retrieved per query (1–20)</div>
            </div>
            <div className="setting-control">
              <div className="slider-wrapper">
                <input id="topk-slider" type="range" min={1} max={20} className="slider" value={topK} onChange={(e) => setTopK(Number(e.target.value))} />
                <span className="slider-value">{topK}</span>
              </div>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Similarity Threshold</div>
              <div className="setting-desc">Minimum similarity score (0.0–1.0)</div>
            </div>
            <div className="setting-control">
              <div className="slider-wrapper">
                <input id="threshold-slider" type="range" min={0} max={1} step={0.05} className="slider" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
                <span className="slider-value">{threshold}</span>
              </div>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Hybrid Search</div>
              <div className="setting-desc">Combine vector similarity + BM25 keyword search (recommended)</div>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input id="hybrid-search-toggle" type="checkbox" checked={hybridSearch} onChange={(e) => setHybridSearch(e.target.checked)} />
                <span className="toggle-track" />
              </label>
            </div>
          </div>

          {hybridSearch && (
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-label">BM25 Weight</div>
                <div className="setting-desc">Keyword vs vector balance (0 = pure vector)</div>
              </div>
              <div className="setting-control">
                <div className="slider-wrapper">
                  <input id="bm25-weight-slider" type="range" min={0} max={1} step={0.05} className="slider" value={bm25Weight} onChange={(e) => setBm25Weight(Number(e.target.value))} />
                  <span className="slider-value">{bm25Weight}</span>
                </div>
              </div>
            </div>
          )}

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Query Rewrite</div>
              <div className="setting-desc">Rewrite your question with AI before searching — improves recall for vague or short queries (costs 1 extra LLM call)</div>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input id="rewrite-toggle" type="checkbox" checked={rewrite} onChange={(e) => setRewrite(e.target.checked)} />
                <span className="toggle-track" />
              </label>
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}
