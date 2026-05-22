'use client'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'

export default function Header() {
  const { state } = useStore()
  const lang = state.lang
  const today = new Date().toLocaleDateString(
    lang === 'ja' ? 'ja-JP' : lang === 'ca' ? 'ca-ES' : lang === 'en' ? 'en-GB' : 'es-ES',
    { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
  )

  return (
    <>
      <div className="bg-slate-900 text-slate-300 text-xs py-2.5 px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${state.user ? 'bg-emerald-400' : 'bg-amber-500 animate-pulse'}`} />
          <span>{state.user ? `${t(lang, 'header_connected')} ${state.user.email}` : t(lang, 'header_local')}</span>
        </div>
        {state.syncing && <span className="text-indigo-400 animate-pulse text-xs">{t(lang, 'header_syncing')}</span>}
      </div>
      <div className="bg-indigo-50 border-b border-indigo-200 text-indigo-900 px-4 py-2.5 text-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span>☁️</span>
          <p className="text-xs">
            <strong>{t(lang, 'header_banner')}</strong>{' '}
            <strong>{t(lang, 'header_banner2')}</strong>{' '}
            {t(lang, 'header_banner3')}
          </p>
        </div>
      </div>
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shadow-md py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-wide flex items-center gap-2">🌸 小学校漢字 SRS</h1>
            <p className="text-indigo-100 text-sm mt-1">{t(lang, 'header_subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-900/40 border border-indigo-500/30 px-4 py-2 rounded-xl text-sm backdrop-blur-sm">
            <span>📅</span><span className="font-semibold">{today}</span>
          </div>
        </div>
      </header>
    </>
  )
}
