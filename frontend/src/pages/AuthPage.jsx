import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import api from '../services/api.js'
import '../styles/pages.css'

export default function AuthPage() {
  const { setAuth } = useAppStore()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login' ? { email, password } : { email, password, name }
      const { data } = await api.post(endpoint, body)
      setAuth(data.user, data.token)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Contexa</span>
        </div>

        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Sign in to your Contexa workspace' : 'Start using RAG-powered document Q&A'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Name</label>
              <input id="auth-name" className="input" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input id="auth-email" className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="auth-password" className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: '0.82rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button id="auth-submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} type="submit" disabled={loading}>
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button
          id="auth-switch-mode"
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  )
}
