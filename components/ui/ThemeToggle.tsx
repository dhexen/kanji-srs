'use client'
import { useState, useEffect } from 'react'
import { Theme, getStoredTheme, setStoredTheme, applyTheme } from '@/lib/theme'

const THEMES: Theme[] = ['light', 'dark', 'system']
const ICONS: Record<Theme, string> = { light: '☀️', dark: '🌙', system: '💻' }
const LABELS: Record<Theme, string> = { light: 'Claro', dark: 'Oscuro', system: 'Sistema' }

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  // Re-apply when system preference changes (only relevant in 'system' mode)
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function cycle() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    setStoredTheme(next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Tema: ${LABELS[theme]}`}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-500 dark:hover:text-violet-400 transition-all text-xs font-medium"
    >
      <span className="text-sm leading-none">{ICONS[theme]}</span>
      <span>{LABELS[theme]}</span>
    </button>
  )
}
