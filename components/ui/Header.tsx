'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useSidebar } from '@/lib/sidebar-context'
import ThemeToggle from './ThemeToggle'
import FeedbackModal from './FeedbackModal'
import { useState } from 'react'

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function NetworkDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      title={isOnline ? 'Online' : 'Sin conexión'}
      className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}
    />
  )
}

export default function Header() {
  const { state } = useStore()
  const { toggle } = useSidebar()
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const user = state.user
  const initial = (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-violet-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-2.5">

          {/* Hamburger */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir/cerrar menú"
            data-sidebar-toggle="true"
            className="p-1.5 -ml-1 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition shrink-0"
          >
            <HamburgerIcon />
          </button>

          {/* Logo */}
          <Link
            href="/review"
            className="font-bold text-xl text-violet-700 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors select-none shrink-0"
          >
            栞
          </Link>

          <div className="flex-1" />

          {/* Pending writes indicator */}
          {state.pendingWrites > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 px-2 py-1 rounded-full">
              ⏳ {state.pendingWrites}
            </span>
          )}

          {/* Syncing indicator */}
          {state.syncing && (
            <span className="text-violet-400 animate-pulse text-xs hidden sm:inline">Sincronizando…</span>
          )}

          {/* User info */}
          {user ? (
            <Link
              href="/stats?tab=account"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-full bg-violet-600 dark:bg-violet-700 flex items-center justify-center text-white font-bold text-xs select-none">
                  {initial}
                </div>
                <span
                  title={state.isOnline ? 'Online' : 'Sin conexión'}
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${state.isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}
                />
              </div>
              <span className="hidden sm:block text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[140px] truncate">
                {user.email}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline px-2 py-1"
            >
              Iniciar sesión
            </Link>
          )}

          {/* Feedback */}
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            title="Reportar incidencia o mejora"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-500 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition-all shrink-0"
          >
            <span>🐛</span>
            <span className="hidden md:inline">Reportar</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
