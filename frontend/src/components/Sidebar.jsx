import React from 'react'
import { MessageSquare, BookOpen, BarChart2, Settings } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import '../styles/sidebar.css'

const navItems = [
  { id: 'chat',       label: 'Chat',       icon: MessageSquare },
  { id: 'library',   label: 'Library',    icon: BookOpen      },
  { id: 'analytics', label: 'Analytics',  icon: BarChart2     },
  { id: 'settings',  label: 'Settings',   icon: Settings      },
]

export default function Sidebar() {
  const { currentPage, setCurrentPage } = useAppStore()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">⚡</div>
          <div>
            <div className="logo-text">Contexa</div>
            <div className="logo-tagline">AI Document Q&A</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Menu</div>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            className={`nav-item ${currentPage === id ? 'active' : ''}`}
            onClick={() => setCurrentPage(id)}
          >
            <Icon className="nav-icon" size={17} />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="ai-status">
          <span className="status-dot" />
          AI Service Online
        </div>
      </div>
    </aside>
  )
}
