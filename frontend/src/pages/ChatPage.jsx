import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ThumbsUp, ThumbsDown, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
      <div className="message-avatar ai">⚡</div>
      <div className="typing-indicator">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

function SourceCard({ source, index }) {
  const filename = source.metadata?.source?.split(/[/\\]/).pop() || 'Document'
  const page = source.metadata?.page ? ` · p.${source.metadata.page}` : ''
  return (
    <motion.div
      className="source-card"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <div className="source-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="source-rank">{index + 1}</div>
          <span className="source-filename">{filename}{page}</span>
        </div>
        <span className="source-score">{(source.score * 100).toFixed(0)}%</span>
      </div>
      <p className="source-excerpt">{source.content}</p>
    </motion.div>
  )
}

function MessageBubble({ msg }) {
  const { setFeedback } = useAppStore()

  const handleFeedback = async (type) => {
    if (!msg.queryId) return
    try {
      await api.post(`/query/${msg.queryId}/feedback`, { feedback: type })
      setFeedback(msg.id, type)
    } catch {}
  }

  return (
    <motion.div
      className={`message ${msg.role}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={`message-avatar ${msg.role}`}>
        {msg.role === 'ai' ? '⚡' : '👤'}
      </div>
      <div className="message-content">
        <div className={`message-bubble ${msg.role} ${msg.streaming ? 'streaming' : ''}`}>
          {msg.content.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**'))
              return <strong key={i}>{line.slice(2, -2)}</strong>
            return <span key={i}>{line}<br /></span>
          })}
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

export default function ChatPage() {
  const {
    messages, isStreaming, activeSources,
    addMessage, updateLastMessage, setActiveSources, setStreaming,
  } = useAppStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async (question) => {
    if (!question.trim() || isStreaming) return
    setInput('')

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    }
    addMessage(userMsg)
    setStreaming(true)

    const aiMsg = {
      id: `ai-${Date.now()}`,
      role: 'ai',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    }
    addMessage(aiMsg)
    setActiveSources([])

    try {
      const response = await fetch('/api/query/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('contexa_token') || ''}`,
        },
        body: JSON.stringify({ question, rewrite: true }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter((l) => l.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'sources') {
              setActiveSources(data.sources)
            } else if (data.type === 'token') {
              fullText += data.text
              updateLastMessage(fullText, true)
            }
          } catch {}
        }
      }

      updateLastMessage(fullText, false)
    } catch {
      updateLastMessage('Sorry, something went wrong. Please try again.', false)
    } finally {
      setStreaming(false)
    }
  }, [isStreaming, addMessage, updateLastMessage, setActiveSources, setStreaming])

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

  return (
    <div className="chat-layout">
      <div className="chat-main">
        <div className="chat-header">
          <div>
            <div className="chat-title">Document Chat</div>
            <div className="chat-subtitle">Ask anything about your uploaded documents</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <FileText size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {activeSources.length > 0 ? `${activeSources.length} sources found` : 'No active query'}
            </span>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="welcome-icon">⚡</div>
              <h1 className="welcome-title">Ask Contexa</h1>
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

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              id="chat-input"
              className="chat-textarea"
              placeholder="Ask a question about your documents…"
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

      <div className="sources-panel">
        <div className="sources-header">
          Sources {activeSources.length > 0 && `(${activeSources.length})`}
        </div>
        <div className="sources-list">
          <AnimatePresence>
            {activeSources.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: 32 }}>
                Sources will appear here after a query
              </div>
            ) : (
              activeSources.map((s, i) => <SourceCard key={i} source={s} index={i} />)
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
