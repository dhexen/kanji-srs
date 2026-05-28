'use client'
import { useState, useEffect, useRef } from 'react'
import { Theme, getStoredTheme, setStoredTheme, applyTheme } from '@/lib/theme'

const OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: 'light',  icon: '☀️', label: 'Claro' },
  { value: 'dark',   icon: '🌙', label: 'Oscuro' },
  { value: 'system', icon: '💻', label: 'Sistema' },
]

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setTheme(getStoredTheme()) }, [])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function select(t: Theme) {
    setTheme(t)
    setStoredTheme(t)
    applyTheme(t)
    setOpen(false)
  }

  const current = OPTIONS.find(o => o.value === theme) ?? OPTIONS[2]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        title="Cambiar tema"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-300 transition-all text-xs font-medium border border-slate-200 dark:border-slate-700"
      >
        <span className="text-sm leading-none">{current.icon}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <svg
          className={`w-3 h-3 opacity-40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all ${
                theme === opt.value
                  ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
              {theme === opt.value && (
                <svg className="w-3 h-3 ml-auto shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
