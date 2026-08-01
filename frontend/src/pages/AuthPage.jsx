import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import api from '../services/api.js'
import {
  Zap, FileText, Bot, Shield, Mail,
  Eye, EyeOff, AlertTriangle, CheckCircle,
  Loader2, ArrowLeft, RotateCcw
} from 'lucide-react'
import '../styles/auth.css'

export default function AuthPage() {
  const { setAuth } = useAppStore()
  const [mode, setMode] = useState('login')

  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [resetToken, setResetToken] = useState('')

  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const token  = params.get('token')
    if (action === 'verify-email' && token) {
      setMode('verifying')
      api.get(`/auth/verify-email?token=${token}`)
        .then(() => { setSuccess('Email verified! You can now sign in.'); setMode('login') })
        .catch((err) => { setError(err.response?.data?.error || 'Verification failed.'); setMode('login') })
        .finally(() => window.history.replaceState({}, '', window.location.pathname))
    }
    if (action === 'reset-password' && token) {
      setResetToken(token); setMode('reset')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const clear = () => { setError(''); setSuccess('') }
  const switchMode = (m) => { clear(); setMode(m) }

  const handleSubmit = async (e) => {
    e.preventDefault(); clear(); setLoading(true)
    try {
      if (mode === 'login') {
        const { data } = await api.post('/auth/login', { email, password })
        setAuth(data.user, data.token); return
      }
      if (mode === 'register') {
        if (password !== confirmPw) { setError('Passwords do not match'); return }
        await api.post('/auth/register', { email, password, name })
        setMode('check-email'); return
      }
      if (mode === 'forgot') {
        await api.post('/auth/forgot-password', { email })
        setSuccess('Reset link sent! Check your inbox.'); return
      }
      if (mode === 'reset') {
        if (password !== confirmPw) { setError('Passwords do not match'); return }
        if (password.length < 8)   { setError('Min. 8 characters required'); return }
        await api.post('/auth/reset-password', { token: resetToken, password })
        setSuccess('Password updated!'); setMode('login'); setPassword(''); setConfirmPw(''); return
      }
    } catch (err) { setError(err.response?.data?.error || 'Something went wrong') }
    finally { setLoading(false) }
  }

  const handleResend = async () => {
    clear(); setLoading(true)
    try { await api.post('/auth/resend-verification', { email }); setSuccess('New link sent!') }
    catch { setError('Could not resend. Try again.') }
    finally { setLoading(false) }
  }

  const isLogin    = mode === 'login'
  const isRegister = mode === 'register'
  const isForgot   = mode === 'forgot'
  const isReset    = mode === 'reset'
  const isCheck    = mode === 'check-email'
  const isVerify   = mode === 'verifying'

  const SUBMIT_LABEL = { login:'Sign In', register:'Create Account', forgot:'Send Reset Link', reset:'Update Password' }

  return (
    <div className="al-root">
      {/* ── LEFT: Form Panel ──────────────────────────────────────── */}
      <div className="al-left">
        <div className="al-left-inner">

          {/* Brand */}
          <div className="al-brand">
            <div className="al-brand-icon"><Zap size={18} strokeWidth={2.5} /></div>
            <span className="al-brand-name">DocLib</span>
          </div>

          {/* ── Check-email ───────────────────────────────────────── */}
          {isCheck && (
            <div className="al-form-area">
              <div className="al-inbox-wrap">
                <div className="al-inbox-icon"><Mail size={32} strokeWidth={1.5} /></div>
                <h1 className="al-heading">Check your inbox</h1>
                <p className="al-sub">
                  We sent a verification link to{' '}
                  <strong className="al-em">{email}</strong>.
                  Click it to activate your account.
                </p>
              </div>
              {error   && <Alert type="error">{error}</Alert>}
              {success && <Alert type="success">{success}</Alert>}
              <button className="al-btn-primary" onClick={handleResend} disabled={loading}>
                {loading ? <Loader2 size={16} className="al-spin" /> : <><RotateCcw size={14}/> Resend email</>}
              </button>
              <button className="al-btn-link" onClick={() => switchMode('login')}>
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          )}

          {/* ── Verifying ─────────────────────────────────────────── */}
          {isVerify && (
            <div className="al-form-area al-center">
              <Loader2 size={36} className="al-spin al-spin-purple" />
              <p className="al-sub" style={{ marginTop: 16 }}>Verifying your email…</p>
            </div>
          )}

          {/* ── Main form ─────────────────────────────────────────── */}
          {!isCheck && !isVerify && (
            <div className="al-form-area">

              {/* Title */}
              {(isLogin || isRegister) ? (
                <>
                  <h1 className="al-heading">
                    {isLogin ? 'Welcome back' : 'Create your account'}
                  </h1>
                  <p className="al-sub">
                    {isLogin
                      ? 'Sign in to your DocLib workspace'
                      : 'Start using RAG-powered document Q&A'}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="al-heading">{isForgot ? 'Forgot password?' : 'Set new password'}</h1>
                  <p className="al-sub">
                    {isForgot ? "Enter your email and we'll send a reset link." : 'Choose a strong password (min. 8 chars).'}
                  </p>
                </>
              )}

              {/* Tab switcher */}
              {(isLogin || isRegister) && (
                <div className="al-tabs">
                  <button className={`al-tab ${isLogin ? 'al-tab-active' : ''}`} type="button" onClick={() => switchMode('login')}>Sign In</button>
                  <button className={`al-tab ${isRegister ? 'al-tab-active' : ''}`} type="button" onClick={() => switchMode('register')}>Register</button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="al-form">
                {isRegister && (
                  <div className="al-field">
                    <label className="al-label">Full name</label>
                    <input id="auth-name" type="text" className="al-input" placeholder="Jane Smith"
                      value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
                  </div>
                )}

                {!isReset && (
                  <div className="al-field">
                    <label className="al-label">Email address</label>
                    <input id="auth-email" type="email" className="al-input" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                )}

                {(isLogin || isRegister || isReset) && (
                  <div className="al-field">
                    <label className="al-label">{isReset ? 'New password' : 'Password'}</label>
                    <div className="al-pw-wrap">
                      <input id="auth-password" type={showPw ? 'text' : 'password'} className="al-input"
                        placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                        required autoComplete={isLogin ? 'current-password' : 'new-password'} />
                      <button type="button" className="al-eye" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {(isRegister || isReset) && (
                  <div className="al-field">
                    <label className="al-label">Confirm password</label>
                    <input id="auth-confirm-password" type={showPw ? 'text' : 'password'} className="al-input"
                      placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      required autoComplete="new-password" />
                  </div>
                )}

                {isLogin && (
                  <div className="al-forgot-row">
                    <button type="button" className="al-text-link" onClick={() => switchMode('forgot')}>Forgot password?</button>
                  </div>
                )}

                {error   && <Alert type="error">{error}</Alert>}
                {success && <Alert type="success">{success}</Alert>}

                <button id="auth-submit" type="submit" className="al-btn-primary" disabled={loading}>
                  {loading ? <Loader2 size={16} className="al-spin" /> : SUBMIT_LABEL[mode]}
                </button>
              </form>

              {(isForgot || isReset) && (
                <button className="al-btn-link" onClick={() => switchMode('login')}>
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Animated Visual Panel ─────────────────────────── */}
      <div className="al-right">
        <AnimatedPanel />
      </div>
    </div>
  )
}

/* ── Animated right panel ──────────────────────────────────────── */
function AnimatedPanel() {
  const CHAT = [
    { role: 'user', text: 'What are the key findings in Q3 report?' },
    { role: 'ai',   text: 'The Q3 report highlights a 24% revenue increase, driven by APAC expansion and new enterprise contracts…' },
    { role: 'user', text: 'Summarize the risk factors' },
    { role: 'ai',   text: 'Three primary risks identified: supply chain volatility, FX exposure in emerging markets, and regulatory changes in EU…' },
  ]

  const DOCS = [
    { name: 'Q3 Financial Report.pdf',   pages: 42,  color: '#7c3aed' },
    { name: 'Product Roadmap 2026.docx', pages: 18,  color: '#3b82f6' },
    { name: 'Legal Contract Draft.pdf',  pages: 67,  color: '#06b6d4' },
  ]

  return (
    <div className="ap-root">
      {/* Orbs */}
      <div className="ap-orb ap-orb-1" />
      <div className="ap-orb ap-orb-2" />
      <div className="ap-orb ap-orb-3" />

      <div className="ap-content">
        {/* Headline */}
        <div className="ap-headline">
          <h2 className="ap-h2">Question what's inside<br /><span className="ap-grad">your documents.</span></h2>
          <p className="ap-desc">Upload any file. Ask anything. Get precise answers with citations — in seconds.</p>
        </div>

        {/* Document pills */}
        <div className="ap-docs">
          {DOCS.map((d, i) => (
            <div key={d.name} className="ap-doc-pill" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="ap-doc-icon" style={{ background: `${d.color}22`, color: d.color }}>
                <FileText size={14} strokeWidth={1.8} />
              </div>
              <span className="ap-doc-name">{d.name}</span>
              <span className="ap-doc-pages">{d.pages}p</span>
            </div>
          ))}
        </div>

        {/* Animated chat window */}
        <div className="ap-chat">
          <div className="ap-chat-header">
            <Bot size={14} strokeWidth={2} />
            <span>DocLib AI</span>
            <span className="ap-dot" />
          </div>
          <div className="ap-chat-body">
            {CHAT.map((m, i) => (
              <div key={i} className={`ap-msg ap-msg-${m.role}`} style={{ animationDelay: `${0.4 + i * 0.5}s` }}>
                {m.role === 'ai' && <div className="ap-ai-avatar"><Bot size={11} /></div>}
                <div className="ap-bubble">{m.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust row */}
        <div className="ap-trust">
          {[
            { Icon: Shield,   label: 'Private & secure' },
            { Icon: Zap,      label: 'Real-time streaming' },
            { Icon: FileText, label: 'PDF, DOCX, TXT' },
          ].map(({ Icon, label }) => (
            <div key={label} className="ap-trust-item">
              <Icon size={13} strokeWidth={2} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Alert({ type, children }) {
  const Icon = type === 'error' ? AlertTriangle : CheckCircle
  return (
    <div className={`al-alert al-alert-${type}`}>
      <Icon size={13} strokeWidth={2} />
      <span>{children}</span>
    </div>
  )
}
