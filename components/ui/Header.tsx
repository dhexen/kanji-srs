'use client'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const { state } = useStore()
  const lang = state.lang
  const localeTag = lang === 'ja' ? 'ja-JP' : lang === 'ca' ? 'ca-ES' : lang === 'en' ? 'en-GB' : 'es-ES'
  const today = new Date().toLocaleDateString(localeTag, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-violet-100/80 dark:border-slate-800 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-violet-500/80 text-xs font-medium">{t(lang, 'header_subtitle')}</p>
          <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 capitalize">{today}</p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
