import React from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import '../styles/global.css'

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          {t.type === 'success' && <CheckCircle size={16} />}
          {t.type === 'error' && <XCircle size={16} />}
          {t.type === 'info' && <Info size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  )
}
