import React, { useState } from 'react'
import '../styles/pages.css'

export default function SettingsPage() {
  const [chunkSize, setChunkSize] = useState(512)
  const [chunkOverlap, setChunkOverlap] = useState(64)
  const [topK, setTopK] = useState(6)
  const [threshold, setThreshold] = useState(0.65)
  const [hybridSearch, setHybridSearch] = useState(true)
  const [rewrite, setRewrite] = useState(true)
  const [bm25Weight, setBm25Weight] = useState(0.3)
  const [strategy, setStrategy] = useState('fixed_size')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Tune the RAG pipeline parameters</p>
        </div>
        <button id="save-settings" className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Changes'}
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
        </div>

        {/* Generation */}
        <div className="settings-section">
          <div className="settings-section-title">🤖 Generation</div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Query Rewriting</div>
              <div className="setting-desc">Rewrite queries with Gemini before retrieval for better recall</div>
            </div>
            <div className="setting-control">
              <label className="toggle">
                <input id="rewrite-toggle" type="checkbox" checked={rewrite} onChange={(e) => setRewrite(e.target.checked)} />
                <span className="toggle-track" />
              </label>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">LLM Model</div>
              <div className="setting-desc">Gemini model for answer generation</div>
            </div>
            <div className="setting-control">
              <select id="llm-model" className="input" style={{ width: 200 }}>
                <option>gemini-2.5-flash</option>
                <option>gemini-2.5-pro</option>
                <option>gemini-1.5-flash</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
