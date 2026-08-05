import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, BookOpen, BarChart2, Settings, LogOut, Zap, Clock, Sun, Moon, Menu, X } from 'lucide-react'
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
  const { currentPage, setCurrentPage, user, logout, theme, toggleTheme } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarRef = useRef(null)

  // Close sidebar when navigating
  useEffect(() => {
    setMobileOpen(false)
  }, [currentPage])

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Close sidebar on outside click / Escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const openSidebar  = () => setMobileOpen(true)
  const closeSidebar = () => setMobileOpen(false)

  return (
    <>
      {/* ── Hamburger — always in DOM, shown via CSS on mobile ── */}
      <button
        id="btn-mobile-menu"
        className={`mobile-menu-btn${mobileOpen ? ' menu-hidden' : ''}`}
        onClick={openSidebar}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      {/* ── Overlay — shown when sidebar is open on mobile ── */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* ── Sidebar panel ── */}
      <aside
        ref={sidebarRef}
        className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}
        aria-label="Navigation"
      >
        {/* Close button inside sidebar (mobile) */}
        <button
          className="sidebar-close-btn"
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        >
          <X size={18} strokeWidth={2} />
        </button>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon"><Zap size={18} strokeWidth={2.5} /></div>
            <div>
              <div className="logo-text">DocLib</div>
              <div className="logo-tagline">AI Document Q&amp;A</div>
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
              className={`nav-item${currentPage === id ? ' active' : ''}`}
              onClick={() => setCurrentPage(id)}
            >
              <Icon className="nav-icon" size={17} />
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            id="btn-theme-toggle"
            className="theme-toggle-sidebar"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {theme === 'dark'
              ? <Sun  size={14} strokeWidth={2} />
              : <Moon size={14} strokeWidth={2} />
            }
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>

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
    </>
  )
}
