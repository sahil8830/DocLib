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

export default function App() {
  const { user, currentPage, theme, setDocuments } = useAppStore()

  // Apply saved theme on first render
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── Fetch documents globally on login/refresh ──
  // This ensures doc filter chips in ChatPage are always populated
  useEffect(() => {
    if (!user) return
    api.get('/documents/')
      .then(({ data }) => setDocuments(data.documents))
      .catch((err) => console.error('Failed to load documents:', err))
  }, [user])

  if (!user) return (
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
