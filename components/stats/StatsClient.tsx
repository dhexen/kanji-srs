'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { t, LANG_NAMES, Lang } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'

export default function StatsClient() {
  const { state, dispatch, syncUp, saveVocabDb, login, signup, signInWithGoogle, logout, setLang, resetRemoteProgress, updateGeminiKey } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [geminiKey, setGeminiKey] = useState(state.geminiApiKey ?? '')
  const [geminiStepsOpen, setGeminiStepsOpen] = useState(false)
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
          if (state.user) {
            saveVocabDb(parsed).then(() => showToast('OK', 'success')).catch(() => {})
          } else {
            dispatch({ type: 'SET_DB', payload: parsed })
            showToast('OK', 'success')
          }
        }
      } catch { showToast('Error', 'error') }
    }
    reader.readAsText(file)
  }

  async function handleSaveGeminiKey() {
    const key = geminiKey.trim()
    await updateGeminiKey(key)
    showToast(key ? t(lang, 'ctx_key_save') + ' ✓' : t(lang, 'api_remove'), 'success')
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

  function resetTutorials() {
    if (!confirm(t(lang, 'stats_tutorials_sub'))) return
    try {
      localStorage.removeItem('kanji_tutorial_v1_done')
      localStorage.removeItem('kanji_tutorial_v1_step')
      Object.keys(localStorage)
        .filter(k => k.startsWith('sectionhelp_v1_'))
        .forEach(k => localStorage.removeItem(k))
      showToast(t(lang, 'stats_tutorials_reset_btn') + ' ✓', 'success')
      setTimeout(() => window.location.reload(), 800)
    } catch {
      showToast('Error', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-800">{t(lang, 'nav_stats')}</h1>
        <SectionHelp section="profile" lang={lang} />
      </div>

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
          ) : emailSent ? (
            <div className="space-y-4">
              <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                <div className="text-3xl mb-2">📧</div>
                <p className="font-bold text-indigo-800 text-sm">{t(lang, 'stats_check_email')}</p>
                <p className="text-xs text-indigo-600 mt-1">
                  {t(lang, 'stats_email_sent').replace('{email}', email)}
                </p>
              </div>
              <button onClick={() => setEmailSent(false)} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition">
                {t(lang, 'stats_back_login')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">{t(lang, 'stats_no_session')}</div>

              {/* Google */}
              <button
                disabled={authLoading}
                onClick={() => handleAuth(signInWithGoogle, t(lang, 'stats_google_redirecting'))}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t(lang, 'stats_google_login')}
              </button>

              <div className="flex items-center gap-2">
                <hr className="flex-1 border-slate-200" />
                <span className="text-xs text-slate-400">{t(lang, 'stats_or')}</span>
                <hr className="flex-1 border-slate-200" />
              </div>

              <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder={t(lang, 'stats_email')}
                autoComplete="off" data-lpignore="true" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t(lang, 'stats_password')}
                autoComplete="new-password" data-lpignore="true" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="flex gap-2">
                <button disabled={authLoading} onClick={() => handleAuth(() => login(email, password), t(lang, 'stats_login'))}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 transition">
                  {t(lang, 'stats_login')}
                </button>
                <button
                  disabled={authLoading}
                  onClick={async () => {
                    setAuthLoading(true)
                    try {
                      const result = await signup(email, password)
                      if (result === 'needs_confirmation') {
                        setEmailSent(true)
                      } else {
                        showToast(t(lang, 'stats_signup'), 'success')
                      }
                    } catch (e: any) {
                      showToast(e.message, 'error')
                    } finally {
                      setAuthLoading(false)
                    }
                  }}
                  className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 transition"
                >
                  {t(lang, 'stats_signup')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Gemini API Key */}
          <div data-tutorial-id="profile-api-section" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900">{t(lang, 'api_title')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t(lang, 'api_subtitle')}</p>
            </div>

            {/* Sections that use it */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 font-medium">
                {t(lang, 'stats_ai_context')}
              </span>
              <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-medium">
                {t(lang, 'stats_ai_grammar')}
              </span>
            </div>

            {/* Step-by-step guide */}
            <div>
              <button
                type="button"
                onClick={() => setGeminiStepsOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                <span className={`transition-transform inline-block ${geminiStepsOpen ? 'rotate-90' : ''}`}>▶</span>
                {t(lang, 'api_steps_title')}
              </button>

              {geminiStepsOpen && (
                <div className="mt-3 bg-slate-50 rounded-xl p-4">
                  <ol className="space-y-2.5 text-xs text-slate-600">
                    {[
                      { n: 1, es: <>Ve a <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">aistudio.google.com</a> e inicia sesión con tu cuenta de Google</>, en: <>Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">aistudio.google.com</a> and sign in with your Google account</>, ca: <>Ves a <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">aistudio.google.com</a> i inicia sessió amb el teu compte de Google</>, ja: <><a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">aistudio.google.com</a> にアクセスし、Googleアカウントでログイン</> },
                      { n: 2, es: <>Haz clic en <strong>«Get API key»</strong> en el menú lateral izquierdo</>, en: <>Click <strong>"Get API key"</strong> in the left sidebar</>, ca: <>Fes clic a <strong>«Get API key»</strong> al menú lateral esquerre</>, ja: <>左メニューの <strong>「Get API key」</strong> をクリック</> },
                      { n: 3, es: <>Pulsa <strong>«Create API key»</strong> y selecciona o crea un proyecto</>, en: <>Click <strong>"Create API key"</strong> and select or create a project</>, ca: <>Prem <strong>«Create API key»</strong> i selecciona o crea un projecte</>, ja: <><strong>「Create API key」</strong> を押してプロジェクトを選択または作成</> },
                      { n: 4, es: <>Copia la clave generada — empieza por <code className="bg-slate-200 px-1 rounded text-slate-700">AIzaSy...</code></>, en: <>Copy the generated key — starts with <code className="bg-slate-200 px-1 rounded text-slate-700">AIzaSy...</code></>, ca: <>Copia la clau generada — comença per <code className="bg-slate-200 px-1 rounded text-slate-700">AIzaSy...</code></>, ja: <>生成されたキーをコピー — <code className="bg-slate-200 px-1 rounded text-slate-700">AIzaSy...</code> で始まります</> },
                      { n: 5, es: <>Pégala en el campo de abajo y pulsa <strong>Guardar</strong></>, en: <>Paste it in the field below and press <strong>Save</strong></>, ca: <>Enganxa-la al camp de sota i prem <strong>Guardar</strong></>, ja: <>下のフィールドに貼り付けて <strong>保存</strong> を押す</> },
                    ].map(step => (
                      <li key={step.n} className="flex gap-2.5 items-start">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[10px] flex items-center justify-center mt-0.5">
                          {step.n}
                        </span>
                        <span>{(step as any)[lang] ?? step.es}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Input + save */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">API Key</label>
                {state.geminiApiKey
                  ? <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">{t(lang, 'ctx_key_set')}</span>
                  : <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-medium">{t(lang, 'ctx_key_unset')}</span>
                }
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSaveGeminiKey}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition"
                >
                  {t(lang, 'ctx_key_save')}
                </button>
              </div>
              {state.geminiApiKey && (
                <button
                  onClick={() => { setGeminiKey(''); updateGeminiKey('') }}
                  className="text-xs text-slate-400 hover:text-rose-500 transition underline"
                >
                  {t(lang, 'api_remove')}
                </button>
              )}
            </div>
          </div>

          {/* Language selector */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <label htmlFor="ui-lang" className="block font-bold text-slate-900 mb-3">
              {t(lang, 'stats_language')}
            </label>
            <select
              id="ui-lang"
              value={state.lang}
              onChange={e => setLang(e.target.value as Lang)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
            >
              {(Object.entries(LANG_NAMES) as [Lang, string][]).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
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

          {/* Tutorial reset */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-900">{t(lang, 'stats_tutorials_title')}</h3>
            <p className="text-slate-500 text-xs">{t(lang, 'stats_tutorials_sub')}</p>
            <button
              onClick={resetTutorials}
              className="w-full py-2.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm transition"
            >
              {t(lang, 'stats_tutorials_reset_btn')}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
