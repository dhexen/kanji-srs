'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { t, LANG_NAMES, Lang } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'
import { fetchKnownGrammar } from '@/lib/supabase'
import ProgressClient from '@/components/progress/ProgressClient'

// Total grammar points (MNN1: 73 + MNN2: 48)
const TOTAL_GRAMMAR_POINTS = 121

type TabKey = 'stats' | 'settings' | 'account'

// ─── Mini circular progress ring ─────────────────────────────────────────────
function ProgressRing({
  pct,
  label,
  sub,
  color,
}: {
  pct: number
  label: string
  sub: string
  color: string
}) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-700" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke="currentColor" strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={`${color} transition-all duration-700`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${color}`}>
          {pct}%
        </span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
        <p className="text-[11px] text-slate-400">{sub}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function StatsClient() {
  const { state, dispatch, syncUp, saveVocabDb, logout, setLang, resetRemoteProgress, updateGeminiKey, updatePexelsKey, setSimulatedRole } = useStore()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabKey | null
  const [activeTab, setActiveTab] = useState<TabKey>(
    tabParam === 'settings' ? 'settings' : tabParam === 'account' ? 'account' : 'stats'
  )

  // Sync tab with URL param changes (when nav link is clicked)
  useEffect(() => {
    setActiveTab(tabParam === 'settings' ? 'settings' : tabParam === 'account' ? 'account' : 'stats')
  }, [tabParam])
  const [authLoading, setAuthLoading] = useState(false)
  const [geminiKey, setGeminiKey] = useState(state.geminiApiKey ?? '')
  const [geminiStepsOpen, setGeminiStepsOpen] = useState(false)
  const [pexelsKey, setPexelsKey] = useState(state.pexelsApiKey ?? '')
  const [knownGrammarCount, setKnownGrammarCount] = useState(-1) // -1 = loading
  const lang = state.lang

  const active = state.db.filter(i => i.status === 'active')
  const pending = active.filter(i => i.due <= Date.now()).length
  const mastered = active.filter(i => i.srsLevel >= 5).length

  // Fetch grammar progress
  useEffect(() => {
    if (!state.user) { setKnownGrammarCount(0); return }
    fetchKnownGrammar()
      .then(set => setKnownGrammarCount(set.size))
      .catch(() => setKnownGrammarCount(0))
  }, [state.user])

  // Progress calculations
  const { vocabPct, kanjiPct, grammarPct } = useMemo(() => {
    const vPct = active.length > 0 ? Math.round((mastered / active.length) * 100) : 0

    const allKanjis = new Set(active.map(i => i.kanji))
    const masteredKanjis = Array.from(allKanjis).filter(kanji => {
      const kanjiWords = active.filter(w => w.kanji === kanji)
      return kanjiWords.every(w => w.srsLevel >= 5)
    }).length
    const kPct = allKanjis.size > 0 ? Math.round((masteredKanjis / allKanjis.size) * 100) : 0

    const gPct = knownGrammarCount >= 0
      ? Math.round((knownGrammarCount / TOTAL_GRAMMAR_POINTS) * 100)
      : 0

    return { vocabPct: vPct, kanjiPct: kPct, grammarPct: gPct }
  }, [active, mastered, knownGrammarCount])

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

  async function handleSavePexelsKey() {
    const key = pexelsKey.trim()
    await updatePexelsKey(key)
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
      localStorage.removeItem('kanji_tour_v3_done')
      localStorage.removeItem('kanji_tour_v3_phase')
      // Also clear old v1/v2 keys and section help seen flags
      localStorage.removeItem('kanji_tutorial_v1_done')
      localStorage.removeItem('kanji_tutorial_v1_step')
      localStorage.removeItem('kanji_tutorial_v2_done')
      localStorage.removeItem('kanji_tutorial_v2_step')
      Object.keys(localStorage)
        .filter(k => k.startsWith('sectionhelp_v1_'))
        .forEach(k => localStorage.removeItem(k))
      showToast(t(lang, 'stats_tutorials_reset_btn') + ' ✓', 'success')
      setTimeout(() => window.location.reload(), 800)
    } catch {
      showToast('Error', 'error')
    }
  }

  // ── Tab definitions ────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; badge?: boolean }[] = [
    { key: 'stats',    label: t(lang, 'stats_tab_stats') },
    { key: 'settings', label: t(lang, 'stats_tab_settings') },
    { key: 'account',  label: t(lang, 'stats_tab_account'), badge: !state.user },
  ]

  return (
    <div className="space-y-6">
      {/* Back to dashboard */}
      <Link href="/review" className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
        ← Dashboard
      </Link>

      {/* Page header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t(lang, 'nav_stats')}</h1>
        <SectionHelp section="profile" lang={lang} />
      </div>

      {/* Tab bar — visible on mobile only (desktop uses the sidebar submenu) */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl lg:hidden">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
            {/* dot badge when not logged in → account tab */}
            {tab.badge && (
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Estadísticas ──────────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Progress overview */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-5">{t(lang, 'stats_prog_overview')}</h3>
            <div className="flex justify-around gap-4">
              <ProgressRing
                pct={vocabPct}
                label={t(lang, 'stats_prog_vocab')}
                sub={`${mastered} ${t(lang, 'stats_prog_mastered')} ${t(lang, 'stats_prog_of')} ${active.length}`}
                color="text-indigo-500"
              />
              <ProgressRing
                pct={kanjiPct}
                label={t(lang, 'stats_prog_kanji')}
                sub={`${Array.from(new Set(active.filter(i => i.srsLevel >= 5).map(i => i.kanji))).length} ${t(lang, 'stats_prog_mastered')} ${t(lang, 'stats_prog_of')} ${new Set(active.map(i => i.kanji)).size}`}
                color="text-emerald-500"
              />
              <ProgressRing
                pct={knownGrammarCount < 0 ? 0 : grammarPct}
                label={t(lang, 'stats_prog_grammar')}
                sub={`${knownGrammarCount < 0 ? '…' : knownGrammarCount} ${t(lang, 'stats_prog_mastered')} ${t(lang, 'stats_prog_of')} ${TOTAL_GRAMMAR_POINTS}`}
                color="text-purple-500"
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t(lang, 'stats_active_kanjis'), val: Array.from(new Set(active.map(i => i.kanji))).length, color: 'text-indigo-600' },
              { label: t(lang, 'stats_total_words'),   val: state.db.length,                                       color: 'text-emerald-600' },
              { label: t(lang, 'stats_pending'),        val: pending,                                                color: 'text-amber-600' },
              { label: t(lang, 'stats_mastered'),       val: mastered,                                               color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Vocabulary progress list */}
          <ProgressClient />
        </div>
      )}

      {/* ── TAB: Ajustes ──────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Gemini API Key */}
          <div data-tutorial-id="profile-api-section" className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{t(lang, 'api_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t(lang, 'api_subtitle')}</p>
            </div>

            {/* Sections that use it */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg border border-purple-100 dark:border-purple-800 font-medium">
                {t(lang, 'stats_ai_context')}
              </span>
              <span className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800 font-medium">
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
                <div className="mt-3 bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                  <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {[
                      { n: 1, es: <>Ve a <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">aistudio.google.com</a> e inicia sesión con tu cuenta de Google</>, en: <>Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">aistudio.google.com</a> and sign in with your Google account</>, ca: <>Ves a <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">aistudio.google.com</a> i inicia sessió amb el teu compte de Google</>, ja: <><a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">aistudio.google.com</a> にアクセスし、Googleアカウントでログイン</> },
                      { n: 2, es: <>Haz clic en <strong>«Get API key»</strong> en el menú lateral izquierdo</>, en: <>Click <strong>"Get API key"</strong> in the left sidebar</>, ca: <>Fes clic a <strong>«Get API key»</strong> al menú lateral esquerre</>, ja: <>左メニューの <strong>「Get API key」</strong> をクリック</> },
                      { n: 3, es: <>Pulsa <strong>«Create API key»</strong> y selecciona o crea un proyecto</>, en: <>Click <strong>"Create API key"</strong> and select or create a project</>, ca: <>Prem <strong>«Create API key»</strong> i selecciona o crea un projecte</>, ja: <><strong>「Create API key」</strong> を押してプロジェクトを選択または作成</> },
                      { n: 4, es: <>Copia la clave generada — empieza por <code className="bg-slate-200 dark:bg-slate-600 px-1 rounded text-slate-700 dark:text-slate-300">AIzaSy...</code></>, en: <>Copy the generated key — starts with <code className="bg-slate-200 dark:bg-slate-600 px-1 rounded text-slate-700 dark:text-slate-300">AIzaSy...</code></>, ca: <>Copia la clau generada — comença per <code className="bg-slate-200 dark:bg-slate-600 px-1 rounded text-slate-700 dark:text-slate-300">AIzaSy...</code></>, ja: <>生成されたキーをコピー — <code className="bg-slate-200 dark:bg-slate-600 px-1 rounded text-slate-700 dark:text-slate-300">AIzaSy...</code> で始まります</> },
                      { n: 5, es: <>Pégala en el campo de abajo y pulsa <strong>Guardar</strong></>, en: <>Paste it in the field below and press <strong>Save</strong></>, ca: <>Enganxa-la al camp de sota i prem <strong>Guardar</strong></>, ja: <>下のフィールドに貼り付けて <strong>保存</strong> を押す</> },
                    ].map(step => (
                      <li key={step.n} className="flex gap-2.5 items-start">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] flex items-center justify-center mt-0.5">
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
                  ? <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded font-medium">{t(lang, 'ctx_key_set')}</span>
                  : <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded font-medium">{t(lang, 'ctx_key_unset')}</span>
                }
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
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

          {/* Pexels API Key — solo admins */}
          {state.role === 'admin' && <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Pexels API Key</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'ca' ? 'Per a la cerca automàtica d\'imatges de vocabulari' :
                 lang === 'en' ? 'For automatic vocabulary image search' :
                 lang === 'ja' ? '語彙画像の自動検索用' :
                 'Para la búsqueda automática de imágenes de vocabulario'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-800 font-medium">
                {lang === 'ca' ? '🖼️ Imatges de vocabulari' :
                 lang === 'en' ? '🖼️ Vocabulary images' :
                 lang === 'ja' ? '🖼️ 語彙画像' :
                 '🖼️ Imágenes de vocabulario'}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              {[
                { n: 1,
                  es: <>Ve a <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">pexels.com/api</a> e inicia sesión o crea una cuenta gratuita</>,
                  ca: <>Ves a <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">pexels.com/api</a> i inicia sessió o crea un compte gratuït</>,
                  en: <>Go to <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">pexels.com/api</a> and sign in or create a free account</>,
                  ja: <><a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">pexels.com/api</a> にアクセスし、無料アカウントでログイン</>,
                },
                { n: 2,
                  es: <>Haz clic en <strong>«Your API Key»</strong> — se genera automáticamente y es gratuita</>,
                  ca: <>Fes clic a <strong>«Your API Key»</strong> — es genera automàticament i és gratuïta</>,
                  en: <>Click <strong>"Your API Key"</strong> — it's generated automatically and is free</>,
                  ja: <><strong>「Your API Key」</strong> をクリック — 自動生成で無料</>,
                },
                { n: 3,
                  es: <>Copia la clave y pégala en el campo de abajo</>,
                  ca: <>Copia la clau i enganxa-la al camp de sota</>,
                  en: <>Copy the key and paste it in the field below</>,
                  ja: <>キーをコピーして下のフィールドに貼り付ける</>,
                },
              ].map(step => (
                <div key={step.n} className="flex gap-2.5 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center justify-center mt-0.5">
                    {step.n}
                  </span>
                  <span>{(step as any)[lang] ?? step.es}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">API Key</label>
                {state.pexelsApiKey
                  ? <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded font-medium">{t(lang, 'ctx_key_set')}</span>
                  : <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded font-medium">{t(lang, 'ctx_key_unset')}</span>
                }
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={pexelsKey}
                  onChange={e => setPexelsKey(e.target.value)}
                  placeholder="pexels.com/api — clave gratuita inmediata"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-rose-400 dark:bg-slate-700 dark:text-slate-100"
                />
                <button
                  onClick={handleSavePexelsKey}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition"
                >
                  {t(lang, 'ctx_key_save')}
                </button>
              </div>
              {state.pexelsApiKey && (
                <button
                  onClick={() => { setPexelsKey(''); updatePexelsKey('') }}
                  className="text-xs text-slate-400 hover:text-rose-500 transition underline"
                >
                  {t(lang, 'api_remove')}
                </button>
              )}
            </div>
          </div>}

          {/* Language selector */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <label htmlFor="ui-lang" className="block font-bold text-slate-900 dark:text-slate-100 mb-3">
              {t(lang, 'stats_language')}
            </label>
            <select
              id="ui-lang"
              value={state.lang}
              onChange={e => setLang(e.target.value as Lang)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
            >
              {(Object.entries(LANG_NAMES) as [Lang, string][]).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          {/* Backup */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t(lang, 'stats_backup')}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{t(lang, 'stats_backup_sub')}</p>
            <div className="flex gap-3">
              <button onClick={exportJSON} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition">
                {t(lang, 'stats_export')}
              </button>
              <label className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition flex items-center justify-center cursor-pointer">
                {t(lang, 'stats_import')}
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
            </div>
            <button onClick={resetAll} className="w-full py-2.5 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm transition">
              {t(lang, 'stats_reset')}
            </button>
          </div>

          {/* Tutorial reset */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t(lang, 'stats_tutorials_title')}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{t(lang, 'stats_tutorials_sub')}</p>
            <button
              onClick={resetTutorials}
              className="w-full py-2.5 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl text-sm transition"
            >
              {t(lang, 'stats_tutorials_reset_btn')}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Cuenta ────────────────────────────────────────────────────── */}
      {activeTab === 'account' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{t(lang, 'stats_account')}</h3>
          <div className="space-y-3">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">{t(lang, 'stats_sync_active')}</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{state.user?.email}</p>
              <p className="text-xs text-emerald-500 dark:text-emerald-500 mt-1">{t(lang, 'stats_sync_msg')}</p>
            </div>
            {state.syncing && <div className="text-xs text-indigo-500 flex items-center gap-2 animate-pulse"><span>↕</span>{t(lang, 'header_syncing')}</div>}
            <button onClick={() => handleAuth(logout, t(lang, 'stats_logout'))}
              className="w-full py-2.5 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm transition">
              {t(lang, 'stats_logout')}
            </button>

            {/* Role simulation — admins only */}
            {state.role === 'admin' && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">👁 Simular rol</p>
                <div className="flex gap-2 flex-wrap">
                  {(['admin', 'contributor', 'user'] as const).map(role => {
                    const active = (state.simulatedRole ?? state.role) === role
                    const isCurrentReal = !state.simulatedRole && role === state.role
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSimulatedRole(isCurrentReal ? null : role)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        }`}
                      >
                        {role === 'user' ? '👤 Usuario' : role === 'contributor' ? '✏️ Contributor' : '👑 Admin'}
                        {isCurrentReal && <span className="ml-1 text-[9px] opacity-60">real</span>}
                      </button>
                    )
                  })}
                </div>
                {state.simulatedRole && (
                  <button
                    type="button"
                    onClick={() => setSimulatedRole(null)}
                    className="mt-2 text-xs text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors underline"
                  >
                    Salir de la simulación
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
