import React, { useCallback, useEffect, useState } from 'react'
import { Upload, Trash2, RefreshCw, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore.js'
import api from '../services/api.js'
import '../styles/pages.css'

const DOC_ICONS = {
  pdf:  { emoji: '📄', cls: 'pdf' },
  docx: { emoji: '📝', cls: 'docx' },
  txt:  { emoji: '📃', cls: 'txt' },
  md:   { emoji: '📝', cls: 'docx' },
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function LibraryPage() {
  const { documents, setDocuments, addDocument, updateDocument, removeDocument, addToast } = useAppStore()
  const [dragover, setDragover] = useState(false)
  const [uploads, setUploads] = useState([])

  useEffect(() => {
    loadDocuments()
  }, [])

  // Poll status for processing docs
  useEffect(() => {
    const processing = documents.filter((d) => d.status === 'processing')
    if (processing.length === 0) return
    const timer = setInterval(async () => {
      for (const doc of processing) {
        try {
          const { data } = await api.get(`/documents/${doc.id}/status`)
          if (data.status !== 'processing') {
            updateDocument(doc.id, { status: data.status, chunks: data.chunks })
          }
        } catch {}
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [documents])

  const loadDocuments = async () => {
    try {
      const { data } = await api.get('/documents/')
      setDocuments(data.documents)
    } catch {}
  }

  const handleUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      const uploadId = `up-${Date.now()}-${file.name}`
      setUploads((prev) => [...prev, { id: uploadId, name: file.name, progress: 0, status: 'uploading' }])

      const formData = new FormData()
      formData.append('file', file)

      try {
        const { data } = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const pct = Math.round((e.loaded * 100) / (e.total || 1))
            setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, progress: pct } : u))
          },
        })

        setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, status: 'processing' } : u))
        addDocument({
          id: data.documentId,
          filename: file.name,
          originalName: file.name,
          size: file.size,
          type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          uploadedAt: new Date().toISOString(),
          status: 'processing',
        })

        addToast({ id: uploadId, message: `${file.name} uploaded — processing…`, type: 'info' })
        setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== uploadId)), 5000)
      } catch {
        setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, status: 'error' } : u))
        addToast({ id: uploadId, message: `Failed to upload ${file.name}`, type: 'error' })
        setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== uploadId)), 4000)
      }
    }
  }, [addDocument, addToast])

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.originalName}"?`)) return
    try {
      await api.delete(`/documents/${doc.id}`)
      removeDocument(doc.id)
      addToast({ id: doc.id, message: `Deleted ${doc.originalName}`, type: 'success' })
    } catch {
      addToast({ id: doc.id, message: 'Failed to delete document', type: 'error' })
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragover(false)
    handleUpload(e.dataTransfer.files)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Library</h1>
          <p className="page-subtitle">{documents.length} document{documents.length !== 1 ? 's' : ''} in your collection</p>
        </div>
        <button id="refresh-docs" className="btn btn-ghost" onClick={loadDocuments}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="page-body">
        <div
          id="upload-dropzone"
          className={`drop-zone ${dragover ? 'dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files)}
          />
          <div className="drop-icon"><Upload /></div>
          <div className="drop-title">Drop files here or click to browse</div>
          <div className="drop-subtitle">Upload PDF, DOCX, TXT, or Markdown files (max 50MB each)</div>
          <div className="drop-formats">
            {['PDF', 'DOCX', 'TXT', 'MD'].map((f) => (
              <span key={f} className="badge badge-purple">{f}</span>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {uploads.map((u) => (
            <motion.div
              key={u.id}
              className="upload-progress"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="progress-header">
                <span className="progress-filename">{u.name}</span>
                <span className={`badge ${u.status === 'error' ? 'badge-red' : u.status === 'processing' ? 'badge-orange' : 'badge-green'}`}>
                  {u.status}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${u.status === 'processing' ? 'indeterminate' : ''}`}
                  style={{ width: u.status === 'processing' ? undefined : `${u.progress}%` }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: '0.9rem' }}>
            No documents yet — upload your first file above
          </div>
        ) : (
          <div className="doc-grid">
            <AnimatePresence>
              {documents.map((doc) => {
                const iconInfo = DOC_ICONS[doc.type] || { emoji: '📁', cls: 'other' }
                return (
                  <motion.div
                    key={doc.id}
                    className="doc-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <div className="doc-card-header">
                      <div className={`doc-icon ${iconInfo.cls}`}>{iconInfo.emoji}</div>
                      <span className={`badge ${
                        doc.status === 'ready' ? 'badge-green' :
                        doc.status === 'processing' ? 'badge-orange' : 'badge-red'
                      }`}>
                        {doc.status === 'processing' && (
                          <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1 }} />
                        )}
                        {doc.status}
                      </span>
                    </div>
                    <div className="doc-name">{doc.originalName}</div>
                    <div className="doc-meta">
                      <span className="doc-meta-item"><FileText size={11} />{formatBytes(doc.size)}</span>
                      {doc.chunks && <span className="doc-meta-item">· {doc.chunks} chunks</span>}
                      <span className="doc-meta-item">· {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="doc-actions">
                      <button
                        id={`delete-${doc.id}`}
                        className="btn btn-danger"
                        style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
