import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set) => ({
      // Auth
      user: JSON.parse(localStorage.getItem('doclib_user') || 'null'),
      token: localStorage.getItem('doclib_token'),
      setAuth: (user, token) => {
        localStorage.setItem('doclib_token', token)
        localStorage.setItem('doclib_user', JSON.stringify(user))
        set({ user, token })
      },
      logout: () => {
        localStorage.removeItem('doclib_token')
        localStorage.removeItem('doclib_user')
        // Clear persisted chat state on logout
        set({ user: null, token: null, messages: [], activeSources: [] })
      },

      // Chat
      messages: [],
      isStreaming: false,
      activeSources: [],
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      updateLastMessage: (content, streaming) =>
        set((s) => {
          const msgs = [...s.messages]
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content, streaming }
          }
          return { messages: msgs }
        }),
      setLastMessageQueryId: (queryId) =>
        set((s) => {
          const msgs = [...s.messages]
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], queryId }
          }
          return { messages: msgs }
        }),
      setActiveSources: (sources) => set({ activeSources: sources }),
      setStreaming: (val) => set({ isStreaming: val }),
      clearMessages: () => set({ messages: [], activeSources: [] }),
      setFeedback: (id, feedback) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, feedback } : m)),
        })),

      // Documents
      documents: [],
      setDocuments: (docs) => set({ documents: docs }),
      addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
      updateDocument: (id, updates) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),
      removeDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

      // UI
      currentPage: 'chat',
      setCurrentPage: (page) => set({ currentPage: page }),
      theme: localStorage.getItem('doclib_theme') || 'dark',
      toggleTheme: () => set((s) => {
        const next = s.theme === 'dark' ? 'light' : 'dark'
        localStorage.setItem('doclib_theme', next)
        document.documentElement.setAttribute('data-theme', next)
        return { theme: next }
      }),
      toasts: [],
      addToast: (toast) =>
        set((s) => {
          const newToasts = [...s.toasts, toast]
          setTimeout(() => useAppStore.getState().removeToast(toast.id), 4000)
          return { toasts: newToasts }
        }),
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'doclib-chat',
      // Only persist chat messages and sources — documents are always re-fetched from server
      partialize: (state) => ({
        messages: state.messages.filter((m) => !m.streaming),
        activeSources: state.activeSources,
        theme: state.theme,
      }),
    }
  )
)

