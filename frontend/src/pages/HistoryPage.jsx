import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, MessageSquare, Trash2, ArrowLeft, Bot, User2, ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import '../styles/history.css'

const token = () => localStorage.getItem('doclib_token') || ''

function formatDate(isoString) {
  const d = new Date(isoString)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HistoryPage() {
  const { setCurrentPage, loadConversation } = useAppStore()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)  // full conversation with messages
  const [loadingConv, setLoadingConv] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // Fetch conversation list
  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token()}` },
      })
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  // Open a specific conversation
  async function openConversation(conv) {
    setLoadingConv(true)
    try {
      const res = await fetch(`/api/conversations/${conv.id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      const data = await res.json()
      setSelected(data)
    } catch (err) {
      console.error('Failed to load conversation:', err)
    } finally {
      setLoadingConv(false)
    }
  }

  // Delete a conversation
  async function deleteConversation(id, e) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      })
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    } finally {
      setDeletingId(null)
    }
  }

  // Load conversation back into chat
  function continueInChat(conv) {
    loadConversation(conv)
    setCurrentPage('chat')
  }

  // ── Conversation detail view ──────────────────────────────
  if (selected) {
    return (
      <div className="history-page">
        <div className="history-header">
          <button className="history-back-btn" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} />
            Back to History
          </button>
          <div className="history-header-right">
            <span className="history-conv-date">{formatDate(selected.createdAt)}</span>
            <button
              className="history-continue-btn"
              onClick={() => continueInChat(selected)}
            >
              Continue in Chat
            </button>
          </div>
        </div>

        <div className="history-conv-title">{selected.title}</div>

        <div className="history-messages">
          {selected.messages?.map((msg, i) => (
            <motion.div
              key={i}
              className={`history-msg ${msg.role}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className={`history-msg-avatar ${msg.role}`}>
                {msg.role === 'ai' ? <Bot size={14} strokeWidth={2} /> : <User2 size={13} strokeWidth={2} />}
              </div>
              <div className="history-msg-bubble">
                <div className="history-msg-content">{msg.content}</div>
                <div className="history-msg-time">{formatDate(msg.timestamp)}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // ── Conversation list view ────────────────────────────────
  return (
    <div className="history-page">
      <div className="history-header">
        <div className="history-title-row">
          <Clock size={20} strokeWidth={2} />
          <h1 className="history-title">Conversation History</h1>
        </div>
        <span className="history-count">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="history-loading">
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <span>Loading conversations…</span>
        </div>
      ) : conversations.length === 0 ? (
        <div className="history-empty">
          <MessageSquare size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
          <p>No conversations yet.</p>
          <p style={{ opacity: 0.5, fontSize: 13 }}>Start chatting and your sessions will appear here.</p>
          <button className="history-go-chat-btn" onClick={() => setCurrentPage('chat')}>
            Go to Chat
          </button>
        </div>
      ) : (
        <div className="history-list">
          <AnimatePresence>
            {conversations.map((conv, i) => (
              <motion.div
                key={conv.id}
                className="history-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => openConversation(conv)}
              >
                <div className="history-item-icon">
                  <MessageSquare size={16} strokeWidth={2} />
                </div>
                <div className="history-item-body">
                  <div className="history-item-title">{conv.title}</div>
                  <div className="history-item-meta">
                    <span>{formatDate(conv.updatedAt || conv.createdAt)}</span>
                  </div>
                </div>
                <div className="history-item-actions">
                  <button
                    className="history-delete-btn"
                    onClick={(e) => deleteConversation(conv.id, e)}
                    disabled={deletingId === conv.id}
                    title="Delete conversation"
                  >
                    {deletingId === conv.id
                      ? <div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                      : <Trash2 size={14} />
                    }
                  </button>
                  <ChevronRight size={16} style={{ opacity: 0.3 }} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
