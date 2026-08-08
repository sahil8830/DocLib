import React, { useEffect } from 'react'
import { useAppStore } from './store/useAppStore.js'
import Sidebar from './components/Sidebar.jsx'
import ChatPage from './pages/ChatPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import ToastContainer from './components/ToastContainer.jsx'
import api from './services/api.js'
import './styles/global.css'
import './styles/sidebar.css'

const PAGES = {
  chat: ChatPage,
  history: HistoryPage,
  library: LibraryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
}

// Email action links (reset-password, verify-email) must always open AuthPage,
// even if the user is already logged in.
function isEmailActionLink() {
  const action = new URLSearchParams(window.location.search).get('action')
  return action === 'reset-password' || action === 'verify-email'
}

export default function App() {
  const { user, currentPage, theme, setDocuments, newChat } = useAppStore()

  // Apply saved theme on first render
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── On fresh open → new chat. On reload → keep existing chat ──
  // sessionStorage is cleared when a new tab/window is opened,
  // but survives page reloads — so we use it to tell them apart.
  useEffect(() => {
    if (!user) return
    const isReload = sessionStorage.getItem('doclib_session')
    if (!isReload) {
      newChat() // fresh open → clear previous chat
      sessionStorage.setItem('doclib_session', '1')
    }
    api.get('/documents/')
      .then(({ data }) => setDocuments(data.documents))
      .catch((err) => console.error('Failed to load documents:', err))
  }, [user])

  // Always show AuthPage for email action links so the token can be processed
  if (!user || isEmailActionLink()) return (
    <>
      <AuthPage />
    </>
  )

  const Page = PAGES[currentPage] || ChatPage

  return (
    <>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Page />
        </div>
      </div>
      <ToastContainer />
    </>
  )
}
