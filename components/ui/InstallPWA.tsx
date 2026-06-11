'use client'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa_install_dismissed'

export default function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Register the service worker (required for installability).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ })
    }
    // Respect a recent dismissal.
    try {
      if (Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < 14 * 864e5) setHidden(true)
    } catch { /* ignore */ }

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent) }
    const onInstalled = () => { setDeferred(null); setHidden(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!deferred || hidden) return null

  const install = async () => {
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch { /* ignore */ }
    setDeferred(null)
  }
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
    setHidden(true)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-slate-600 shadow-lg animate-slide-in">
      <span className="text-lg">📥</span>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Instalar la app</span>
      <button
        onClick={install}
        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition"
      >
        Instalar
      </button>
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-base leading-none px-1"
      >
        ✕
      </button>
    </div>
  )
}
