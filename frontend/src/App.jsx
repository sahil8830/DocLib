import React from 'react'
import { useAppStore } from './store/useAppStore.js'
import Sidebar from './components/Sidebar.jsx'
import ChatPage from './pages/ChatPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import ToastContainer from './components/ToastContainer.jsx'
import './styles/global.css'
import './styles/sidebar.css'

const PAGES = {
  chat: ChatPage,
  library: LibraryPage,
  analytics: AnalyticsPage,
  settings: SettingsPage,
}

export default function App() {
  const { user, currentPage } = useAppStore()

  if (!user) return <AuthPage />

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
