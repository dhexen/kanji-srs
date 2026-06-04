'use client'
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

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

const DURATIONS: Record<ToastType, number> = { success: 4000, info: 4000, error: 8000 }

export default function Toast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Track recent error messages to prevent duplicates within a short window
  const recentErrors = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const show = useCallback((message: string, type: ToastType = 'success') => {
    // Deduplicate: if the same error message appeared in the last 5s, skip it
    if (type === 'error') {
      const last = recentErrors.current.get(message) ?? 0
      if (Date.now() - last < 5000) return
      recentErrors.current.set(message, Date.now())
    }

    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => dismiss(id), DURATIONS[type])
  }, [dismiss])

  _show = show

  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-600',
    error:   'bg-rose-600',
    info:    'bg-indigo-600',
  }
  const icons: Record<ToastType, string> = { success: '✅', error: '❌', info: 'ℹ️' }

  return (
    <ToastContext.Provider value={{ show }}>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${colors[t.type]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in`}
          >
            <span className="shrink-0">{icons[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar"
              className="shrink-0 ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition text-white font-bold text-xs leading-none"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
