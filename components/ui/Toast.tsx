'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ show: (msg: string, type?: ToastType) => void } | null>(null)

let _show: ((msg: string, type?: ToastType) => void) | null = null
export function showToast(msg: string, type: ToastType = 'success') { _show?.(msg, type) }

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside provider')
  return ctx
}

export default function Toast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  _show = show

  const colors = { success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-indigo-600' }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }

  return (
    <ToastContext.Provider value={{ show }}>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`${colors[t.type]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-auto`}>
            <span>{icons[t.type]}</span><span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
