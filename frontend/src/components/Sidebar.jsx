import React from 'react'
import { MessageSquare, BookOpen, BarChart2, Settings, LogOut, Zap, Clock } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import '../styles/sidebar.css'

const navItems = [
  { id: 'chat',       label: 'Chat',       icon: MessageSquare },
  { id: 'history',   label: 'History',    icon: Clock         },
  { id: 'library',   label: 'Library',    icon: BookOpen      },
  { id: 'analytics', label: 'Analytics',  icon: BarChart2     },
  { id: 'settings',  label: 'Settings',   icon: Settings      },
]

export default function Sidebar() {
  const { currentPage, setCurrentPage, user, logout } = useAppStore()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon"><Zap size={18} strokeWidth={2.5} /></div>
          <div>
            <div className="logo-text">DocLib</div>
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
        {/* User info + logout */}
        {user && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {(user.name || user.email || '?')[0].toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user.name || 'User'}</div>
              <div className="user-email">{user.email}</div>
            </div>
            <button
              id="btn-logout"
              className="logout-btn"
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
