import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ThumbsUp, ThumbsDown, BookOpen, X, FileText, Zap, Bot, User2, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { useAppStore } from '../store/useAppStore.js'
import api from '../services/api.js'
import '../styles/chat.css'

const SUGGESTIONS = [
  'Summarize the main points of this document',
  'What are the key findings?',
  'Explain the methodology used',
  'List all important dates mentioned',
]

function TypingIndicator() {
  return (
    <div className="message fade-in">
      <div className="message-avatar ai"><Bot size={15} strokeWidth={2} /></div>
      <div className="typing-indicator">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  const { setFeedback } = useAppStore()

  const handleFeedback = async (type) => {
    if (!msg.queryId) return
    try {
      await api.post(`/query/${msg.queryId}/feedback`, { feedback: type })
      setFeedback(msg.id, type)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }

  return (
    <motion.div
      className={`message ${msg.role}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={`message-avatar ${msg.role}`}>
        {msg.role === 'ai' ? <Bot size={15} strokeWidth={2} /> : <User2 size={14} strokeWidth={2} />}
      </div>
      <div className="message-content">
        <div className={`message-bubble ${msg.role} ${msg.streaming ? 'streaming' : ''}`}>
          {msg.role === 'ai' ? (
            <div className="markdown-body">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ) : (
            <span>{msg.content}</span>
          )}
        </div>

        {msg.role === 'ai' && !msg.streaming && (
          <div className="message-meta">
            {msg.latencyMs && <span>{msg.latencyMs}ms</span>}
            <button
              id={`feedback-up-${msg.id}`}
              className={`feedback-btn ${msg.feedback === 'up' ? 'active-up' : ''}`}
              onClick={() => handleFeedback('up')}
              title="Good answer"
            ><ThumbsUp size={13} /></button>
            <button
              id={`feedback-down-${msg.id}`}
              className={`feedback-btn ${msg.feedback === 'down' ? 'active-down' : ''}`}
              onClick={() => handleFeedback('down')}
              title="Bad answer"
            ><ThumbsDown size={13} /></button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Sources Panel ────────────────────────────────────────────
function SourcesPanel({ sources, onClose }) {
  return (
    <motion.div
      className="sources-panel"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
    >
      <div className="sources-header">
        <div className="sources-title">
          <BookOpen size={15} />
          <span>Sources ({sources.length})</span>
        </div>
        <button className="sources-close" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="sources-list">
        {sources.map((src, i) => {
          const filename = src.metadata?.source || src.metadata?.filename || 'Document'
          const page = src.metadata?.page
          return (
            <div key={i} className="source-item">
              <div className="source-item-header">
                <div className="source-name">
                  <FileText size={12} />
                  <span>{filename}{page ? `, p.${page}` : ''}</span>
                </div>
                <span className="source-score">{(src.score * 100).toFixed(0)}%</span>
              </div>
              <p className="source-preview">{src.content?.slice(0, 220)}…</p>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const {
    messages, isStreaming, activeSources, documents, activeConversationId,
    addMessage, updateLastMessage, setActiveSources, setStreaming, setLastMessageQueryId,
    setActiveConversationId, newChat,
  } = useAppStore()

  const [input, setInput] = useState('')
  const [showSources, setShowSources] = useState(false)
  const [filterDocId, setFilterDocId] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  // Track current conversation ID within this render session
  const conversationIdRef = useRef(activeConversationId)

  useEffect(() => {
    conversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeSources.length > 0) setShowSources(true)
  }, [activeSources])

  const buildHistory = useCallback(() => {
    return messages
      .filter((m) => !m.streaming && m.content)
      .slice(-6)
      .map((m) => ({ role: m.role === 'ai' ? 'model' : 'user', content: m.content }))
  }, [messages])

  const handleSend = useCallback(async (question) => {
    if (!question.trim() || isStreaming) return
    setInput('')

    const now = new Date().toISOString()

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: now,
    }
    addMessage(userMsg)
    setStreaming(true)

    const aiMsg = {
      id: `ai-${Date.now()}`,
      role: 'ai',
      content: '',
      timestamp: now,
      streaming: true,
    }
    addMessage(aiMsg)
    setActiveSources([])

    // ── Create conversation on first message of a session ──
    let convId = conversationIdRef.current
    if (!convId) {
      try {
        const token = localStorage.getItem('doclib_token') || ''
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: question, messages: [] }),
        })
        const data = await res.json()
        convId = data.id
        conversationIdRef.current = convId
        setActiveConversationId(convId)
      } catch (err) {
        console.error('Failed to create conversation:', err)
      }
    }

    const filters = filterDocId ? { document_id: filterDocId } : undefined
    const history = buildHistory()

    let fullText = ''
    let aiTimestamp = new Date().toISOString()

    try {
      const response = await fetch('/api/query/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('doclib_token') || ''}`,
        },
        body: JSON.stringify({ question, filters, history, rewrite: false }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'query_id') {
              setLastMessageQueryId(data.queryId)
            } else if (data.type === 'sources') {
              setActiveSources(data.sources)
            } else if (data.type === 'token') {
              fullText += data.text
              updateLastMessage(fullText, true)
            } else if (data.type === 'error') {
              console.error('Stream error from server:', data.message)
            }
          } catch (parseErr) {
            console.warn('Failed to parse SSE line:', line, parseErr)
          }
        }
      }

      updateLastMessage(fullText, false)

      // ── Append Q&A pair to conversation in MongoDB ────────
      if (convId && fullText) {
        try {
          const token = localStorage.getItem('doclib_token') || ''
          await fetch(`/api/conversations/${convId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              messages: [
                { role: 'user', content: question, timestamp: now },
                { role: 'ai',   content: fullText,  timestamp: aiTimestamp },
              ],
            }),
          })
        } catch (err) {
          console.error('Failed to save conversation messages:', err)
        }
      }
    } catch (err) {
      console.error('handleSend stream failed:', err)
      updateLastMessage('Sorry, something went wrong. Please try again.', false)
    } finally {
      setStreaming(false)
    }
  }, [isStreaming, filterDocId, buildHistory, addMessage, updateLastMessage, setActiveSources, setStreaming, setLastMessageQueryId, setActiveConversationId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleTextareaResize = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }

  const handleNewChat = () => {
    newChat()
    conversationIdRef.current = null
    setFilterDocId(null)
    setShowSources(false)
  }

  const readyDocs = documents.filter((d) => d.status === 'ready')

  return (
    <div className="chat-layout">
      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-header-icon"><Zap size={16} strokeWidth={2.5} /></div>
            <div>
              <div className="chat-title">Document Chat</div>
              <div className="chat-subtitle">Ask anything about your uploaded documents</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeSources.length > 0 && (
              <button
                id="toggle-sources"
                className={`sources-toggle-btn ${showSources ? 'active' : ''}`}
                onClick={() => setShowSources((v) => !v)}
                title="Toggle sources panel"
              >
                <BookOpen size={14} />
                {activeSources.length} source{activeSources.length !== 1 ? 's' : ''}
              </button>
            )}
            <button
              id="new-chat-btn"
              className="new-chat-btn"
              onClick={handleNewChat}
              title="Start a new conversation"
            >
              <Plus size={14} />
              New Chat
            </button>
          </div>
        </div>

        <div className="chat-body">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <div className="welcome-icon"><Bot size={40} strokeWidth={1.5} /></div>
                <h1 className="welcome-title">Ask DocLib</h1>
                <p className="welcome-subtitle">
                  Upload documents in the Library, then ask questions. I'll find the most relevant information and cite my sources.
                </p>
                <div className="suggestion-chips">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="suggestion-chip" onClick={() => handleSend(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            </AnimatePresence>

            {isStreaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <AnimatePresence>
            {showSources && activeSources.length > 0 && (
              <SourcesPanel sources={activeSources} onClose={() => setShowSources(false)} />
            )}
          </AnimatePresence>
        </div>

        <div className="chat-input-area">
          {readyDocs.length > 0 && (
            <div className="doc-filter-chips">
              <button
                className={`doc-chip ${filterDocId === null ? 'active' : ''}`}
                onClick={() => setFilterDocId(null)}
              >
                All docs
              </button>
              {readyDocs.map((doc) => (
                <button
                  key={doc.id}
                  className={`doc-chip ${filterDocId === doc.id ? 'active' : ''}`}
                  onClick={() => setFilterDocId(filterDocId === doc.id ? null : doc.id)}
                  title={doc.originalName}
                >
                  {doc.originalName.length > 22 ? doc.originalName.slice(0, 20) + '…' : doc.originalName}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              id="chat-input"
              className="chat-textarea"
              placeholder={filterDocId
                ? `Ask about ${readyDocs.find(d => d.id === filterDocId)?.originalName ?? 'this document'}…`
                : 'Ask a question about your documents…'
              }
              value={input}
              onChange={(e) => { setInput(e.target.value); handleTextareaResize() }}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
            />
            <button
              id="send-btn"
              className="send-btn"
              onClick={() => handleSend(input)}
              disabled={isStreaming || !input.trim()}
              title="Send (Enter)"
            >
              {isStreaming
                ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                : <Send size={18} color="#fff" />
              }
            </button>
          </div>
          <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}
