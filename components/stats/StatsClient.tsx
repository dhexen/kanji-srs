'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { MODE_CONFIG, ReviewMode, STAGE_NAMES, getSrsClass, getModeLevelAndDue } from '@/lib/srs'
import { showToast } from '@/components/ui/Toast'
import { t, LANG_NAMES, Lang } from '@/lib/i18n'

export default function StatsClient() {
  const { state, dispatch, syncUp, login, signup, logout, setLang, resetRemoteProgress } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const lang = state.lang

  const active = state.db.filter(i => i.status === 'active')
  const pending = active.filter(i => i.due <= Date.now()).length
  const mastered = active.filter(i => i.srsLevel >= 5).length

  async function handleAuth(fn: () => Promise<void>, successMsg: string) {
    setAuthLoading(true)
    try { await fn(); showToast(successMsg, 'success') }
    catch (e: any) { showToast(e.message, 'error') }
    finally { setAuthLoading(false) }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state.db, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `srs_backup_${Date.now()}.json`; a.click()
    showToast(t(lang, 'stats_export'), 'success')
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (Array.isArray(parsed)) {
          dispatch({ type: 'SET_DB', payload: parsed })
          if (state.user) syncUp().catch(() => showToast('Error', 'error'))
          showToast('OK', 'success')
        }
      } catch { showToast('Error', 'error') }
    }
    reader.readAsText(file)
  }

  async function resetAll() {
    if (!confirm(t(lang, 'stats_reset') + '?')) return
    try {
      if (state.user) await resetRemoteProgress()
      dispatch({ type: 'RESET' })
      showToast('OK', 'success')
    } catch {
      showToast('Error', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t(lang, 'stats_active_kanjis'), val: Array.from(new Set(active.map(i => i.kanji))).length, color: 'text-indigo-600' },
          { label: t(lang, 'stats_total_words'), val: state.db.length, color: 'text-emerald-600' },
          { label: t(lang, 'stats_pending'), val: pending, color: 'text-amber-600' },
          { label: t(lang, 'stats_mastered'), val: mastered, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-900">{t(lang, 'stats_account')}</h3>
          {state.user ? (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-sm font-bold text-emerald-800">{t(lang, 'stats_sync_active')}</span>
                </div>
                <p className="text-xs text-emerald-600">{state.user.email}</p>
                <p className="text-xs text-emerald-500 mt-1">{t(lang, 'stats_sync_msg')}</p>
              </div>
              {state.syncing && <div className="text-xs text-indigo-500 flex items-center gap-2 animate-pulse"><span>↕</span>{t(lang, 'header_syncing')}</div>}
              <button onClick={() => handleAuth(logout, t(lang, 'stats_logout'))}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm transition">
                {t(lang, 'stats_logout')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">{t(lang, 'stats_no_session')}</div>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder={t(lang, 'stats_email')}
                autoComplete="off" data-lpignore="true" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t(lang, 'stats_password')}
                autoComplete="new-password" data-lpignore="true" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="flex gap-2">
                <button disabled={authLoading} onClick={() => handleAuth(() => login(email, password), t(lang, 'stats_login'))}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 transition">
                  {t(lang, 'stats_login')}
                </button>
                <button disabled={authLoading} onClick={() => handleAuth(() => signup(email, password), t(lang, 'stats_signup'))}
                  className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 transition">
                  {t(lang, 'stats_signup')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Language selector */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">{t(lang, 'stats_language')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(LANG_NAMES) as [Lang, string][]).map(([code, name]) => (
                <button key={code} onClick={() => setLang(code)}
                  className={`py-2.5 px-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                    state.lang === code ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Backup */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-900">{t(lang, 'stats_backup')}</h3>
            <p className="text-slate-500 text-xs">{t(lang, 'stats_backup_sub')}</p>
            <div className="flex gap-3">
              <button onClick={exportJSON} className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition">
                {t(lang, 'stats_export')}
              </button>
              <label className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition flex items-center justify-center cursor-pointer">
                {t(lang, 'stats_import')}
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
            </div>
            <button onClick={resetAll} className="w-full py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition">
              {t(lang, 'stats_reset')}
            </button>
          </div>
        </div>
      </div>

      {/* Vocab table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-bold text-slate-800">{t(lang, 'stats_vocab_title')} ({state.db.length})</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.entries(MODE_CONFIG) as [ReviewMode, any][]).map(([, cfg]) => (
              <span key={cfg.key} className={`px-2 py-0.5 rounded font-semibold ${cfg.badge}`}>{cfg.label}</span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-3 px-3">{t(lang, 'th_kanji')}</th>
                <th className="py-3 px-3">{t(lang, 'th_word')}</th>
                <th className="py-3 px-3">{t(lang, 'th_reading')}</th>
                <th className="py-3 px-3 hidden md:table-cell">{t(lang, 'th_meaning')}</th>
                {(Object.keys(MODE_CONFIG) as ReviewMode[]).map(m => (
                  <th key={m} className="py-3 px-3 text-center">{MODE_CONFIG[m].label.split(' ')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {state.db.map(item => {
                const meaning = lang === 'ca' && (item as any).meaning_ca ? (item as any).meaning_ca
                  : lang === 'en' && (item as any).meaning_en ? (item as any).meaning_en
                  : item.meaning
                return (
                  <tr key={item.jp} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-400 text-lg">{item.kanji}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{item.jp}</td>
                    <td className="py-3 px-3 text-indigo-600 font-semibold text-sm">{item.reading}</td>
                    <td className="py-3 px-3 text-slate-500 text-sm hidden md:table-cell">{meaning}</td>
                    {(Object.keys(MODE_CONFIG) as ReviewMode[]).map(mode => {
                      if (item.status === 'locked') return <td key={mode} className="py-3 px-3 text-center"><span className="text-slate-300 text-xs">—</span></td>
                      const { level, due } = getModeLevelAndDue(item, mode)
                      const isPending = due <= Date.now()
                      return (
                        <td key={mode} className="py-3 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getSrsClass(level, item.status, due)}`} title={STAGE_NAMES[level]}>
                            {level}<span className="opacity-40">/7</span>
                          </span>
                          {isPending && <span className="text-rose-400 text-xs ml-0.5">!</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
