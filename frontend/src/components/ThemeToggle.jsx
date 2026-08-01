import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore()
  const isDark = theme === 'dark'

  return (
    <button
      id="btn-theme-toggle"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      style={{
        position: 'fixed',
        top: 16,
        right: 20,
        zIndex: 9999,
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--text-primary)'
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.transform = 'scale(1.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--text-secondary)'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {isDark
        ? <Sun size={16} strokeWidth={2} />
        : <Moon size={16} strokeWidth={2} />
      }
    </button>
  )
}
