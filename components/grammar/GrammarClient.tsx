'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { GRAMMAR_POINTS as MNN1_POINTS, ROLE_COLORS } from '@/lib/grammar-mnn1'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS as MNN2_POINTS } from '@/lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS as MNNC1_POINTS } from '@/lib/grammar-mnnc1'
import { fetchKnownGrammar, setGrammarKnown, fetchAllGrammarSrsStats, saveGrammarSrsResult, markGrammarAsStudying, removeGrammarFromSrs, fetchGrammarSentenceCounts } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { generateGrammarSentences, GrammarGenerateError, DEFAULT_GEN_MAX_ATTEMPTS } from '@/lib/grammar-generate'
import { showToast } from '@/components/ui/Toast'
import GrammarDetail from './GrammarDetail'
import GrammarPractice from './GrammarPractice'
import GrammarReviewSession from './GrammarReviewSession'
import { t } from '@/lib/i18n'
import { type GrammarSrsStat, getGrammarForecast, formatNextReview, getSrsLevelLabel, GRAMMAR_SRS_INTERVALS } from '@/lib/grammar-srs'

type BookKey = 'mnn1' | 'mnn2' | 'mnnc1'
type BookFilter = 'all' | BookKey
type JlptFilter = 'all' | 'N5' | 'N4' | 'N3'
type GrammarPointWithBook = GrammarPoint & { book: BookKey }

// Which "view" the user is in
type View =
  | { kind: 'list' }
  | { kind: 'detail'; grammar: GrammarPointWithBook }
  | { kind: 'practice'; grammar: GrammarPointWithBook }
  | { kind: 'srs_queue'; queue: GrammarPointWithBook[]; showShared: boolean; free?: boolean }
  | { kind: 'queue_select'; candidates: GrammarPointWithBook[] }
  | { kind: 'free_select' }

const BOOKS: { key: BookKey; label: string; subtitle: string }[] = [
  { key: 'mnn1', label: 'MNN 1', subtitle: 'Minna no Nihongo 1' },
  { key: 'mnn2', label: 'MNN 2', subtitle: 'Minna no Nihongo 2' },
  { key: 'mnnc1', label: 'MNN Ch.I', subtitle: 'Minna no Nihongo Chūkyū I' },
]

const ALL_GRAMMAR_POINTS: GrammarPointWithBook[] = [
  ...MNN1_POINTS.map(p => ({ ...p, book: 'mnn1' as const })),
  ...MNN2_POINTS.map(p => ({ ...p, book: 'mnn2' as const })),
  ...MNNC1_POINTS.map(p => ({ ...p, book: 'mnnc1' as const })),
]

// ─────────────────────────────────────────────────────────────────────────────
// GrammarCard
// ─────────────────────────────────────────────────────────────────────────────

function GrammarCard({
  grammar,
  known,
  srsStat,
  onToggleKnown,
  onAddToSrs,
  onSelect,
  lang,
  showBook,
}: {
  grammar: GrammarPointWithBook
  known: boolean
  srsStat?: GrammarSrsStat
  onToggleKnown: (id: string, val: boolean) => void
  onAddToSrs: (id: string) => void
  onSelect: (g: GrammarPointWithBook) => void
  lang: string
  showBook: boolean
}) {
  const name =
    lang === 'ca' ? grammar.name_ca :
    lang === 'en' ? grammar.name_en :
    grammar.name_es

  const isDue = srsStat && srsStat.next_review <= Date.now()
  const hasStarted = !!srsStat

  const cardBg = known
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 opacity-70 hover:opacity-90'
    : hasStarted
      ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/60 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm'
      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm'

  const badgeBg = known
    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
    : hasStarted
      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-all group ${cardBg}`}
      onClick={() => onSelect(grammar)}
    >
      {/* Number badge */}
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${badgeBg}`}>
        {grammar.number}
      </div>

      <div className="flex-1 min-w-0">
        {/* JLPT + lesson + book */}
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            grammar.jlpt === 'N5' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400' :
            grammar.jlpt === 'N4' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' :
            'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400'
          }`}>
            {grammar.jlpt}
          </span>
          {showBook && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
              {grammar.book === 'mnn1' ? 'MNN1' : 'MNN2'}
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {t(lang as any, 'grammar_lesson').replace('{n}', String(grammar.lesson))}
          </span>
          {/* SRS state badges */}
          {isDue && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 animate-pulse">
              ⏰ {t(lang as any, 'gp_due')}
            </span>
          )}
          {/* User's SRS level for this grammar */}
          {known ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
              ⭐ {getSrsLevelLabel(srsStat?.level ?? 8, lang)}
            </span>
          ) : hasStarted && !isDue ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {getSrsLevelLabel(srsStat!.level, lang)}
            </span>
          ) : null}
        </div>

        {/* Pattern */}
        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{grammar.pattern}</p>
        {/* Name */}
        <p className="text-xs text-slate-500 truncate">{name}</p>
        {/* Structure preview */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {grammar.structure.slice(0, 5).map((p, i) => {
            const c = ROLE_COLORS[p.role]
            return (
              <span key={i} className={`${c.bg} ${c.text} text-[10px] font-medium px-1.5 py-0.5 rounded border ${c.border}`}>
                {p.text}
              </span>
            )
          })}
        </div>
      </div>

      {/* Add to reviews (only if not yet in SRS and not known) */}
      {!hasStarted && !known && (
        <button
          onClick={e => { e.stopPropagation(); onAddToSrs(grammar.id) }}
          title={lang === 'en' ? 'Add to reviews' : lang === 'ca' ? 'Afegir als repassos' : 'Añadir a repasos'}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Known toggle */}
      <button
        onClick={e => { e.stopPropagation(); onToggleKnown(grammar.id, !known) }}
        title={known ? t(lang as any, 'grammar_unknown_title') : t(lang as any, 'grammar_known_title')}
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          known
            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-500'
        }`}
      >
        {known ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue selection screen
// ─────────────────────────────────────────────────────────────────────────────

function QueueSelect({
  candidates,
  lang,
  srsStats,
  geminiKey,
  geminiModel,
  sessionToken,
  activeVocab,
  hasWaniKani,
  onStart,
  onCancel,
}: {
  candidates: GrammarPointWithBook[]
  lang: string
  srsStats: Map<string, GrammarSrsStat>
  geminiKey: string
  geminiModel: string
  sessionToken: string
  activeVocab: { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }[]
  hasWaniKani: boolean
  onStart: (queue: GrammarPointWithBook[], opts: { showShared: boolean }) => void
  onCancel: () => void
}) {
  const now = Date.now()
  // All candidates selected by default
  const [selected, setSelected] = useState<Set<string>>(new Set(candidates.map(g => g.id)))
  const [useWk, setUseWk] = useState(() => {
    try { return localStorage.getItem('gp_use_wk_vocab') === 'true' } catch { return false }
  })
  const [showShared, setShowShared] = useState(true)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [countsLoading, setCountsLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [genAttempt, setGenAttempt] = useState<{ n: number; max: number } | null>(null)
  // Persistent dismissable error (e.g. out of quota) shown at the top of the screen
  const [genErrorMsg, setGenErrorMsg] = useState('')

  useEffect(() => {
    fetchGrammarSentenceCounts(candidates.map(g => g.id))
      .then(setCounts)
      .finally(() => setCountsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleGenerate(g: GrammarPointWithBook) {
    if (!sessionToken) { showToast(t(lang as any, 'gp_need_login'), 'error'); return }
    setGeneratingId(g.id)
    setGenAttempt({ n: 1, max: DEFAULT_GEN_MAX_ATTEMPTS })
    try {
      const { kept } = await generateGrammarSentences({
        grammar: g, lang: lang as any, geminiKey, sessionToken, model: geminiModel, activeVocab,
        useWkVocab: useWk && hasWaniKani,
        onAttempt: (n, max) => setGenAttempt({ n, max }),
      })
      const fresh = await fetchGrammarSentenceCounts([g.id])
      setCounts(prev => new Map(prev).set(g.id, fresh.get(g.id) ?? 0))
      showToast(`✓ ${kept} ${lang === 'en' ? 'sentences generated' : lang === 'ca' ? 'frases generades' : 'frases generadas'}`, 'success')
    } catch (e: any) {
      const kind = e instanceof GrammarGenerateError ? e.kind : 'transient'
      if (kind === 'quota') {
        setGenErrorMsg(lang === 'en'
          ? 'No Gemini quota left. Add your own API key in your profile, or try again later.'
          : lang === 'ca'
            ? 'Sense quota de Gemini. Afegeix la teva pròpia API key al perfil, o prova-ho més tard.'
            : 'Sin cuota de Gemini disponible. Añade tu propia API key en tu perfil, o inténtalo más tarde.')
      } else if (kind === 'no_sentences') {
        showToast(t(lang as any, 'gp_no_sentences'), 'error')
      } else { // exhausted / auth / transient
        setGenErrorMsg(lang === 'en'
          ? `"${g.pattern}": the API is saturated and did not respond after ${DEFAULT_GEN_MAX_ATTEMPTS} attempts. Try again in a moment.`
          : lang === 'ca'
            ? `"${g.pattern}": l'API està saturada i no ha respost després de ${DEFAULT_GEN_MAX_ATTEMPTS} intents. Torna-ho a provar d'aquí una estona.`
            : `"${g.pattern}": la API está saturada y no respondió tras ${DEFAULT_GEN_MAX_ATTEMPTS} intentos. Inténtalo de nuevo en un momento.`)
      }
    } finally {
      setGeneratingId(null)
      setGenAttempt(null)
    }
  }

  const queue = candidates.filter(g => selected.has(g.id))

  return (
    <div className="space-y-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t(lang as any, 'gp_back')}
      </button>

      {/* Persistent dismissable generation error (quota / saturated API) */}
      {genErrorMsg && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
          <span className="flex-1 leading-relaxed">{genErrorMsg}</span>
          <button onClick={() => setGenErrorMsg('')} aria-label="Cerrar" className="shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 font-bold leading-none text-base">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {t(lang as any, 'gp_select_review_title')}
        </h2>
        <div className="flex gap-2 text-xs shrink-0">
          <button onClick={() => setSelected(new Set(candidates.map(g => g.id)))} className="text-indigo-600 dark:text-indigo-400 hover:underline">
            {t(lang as any, 'gp_select_all')}
          </button>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline">
            {t(lang as any, 'gp_select_none')}
          </button>
        </div>
      </div>

      {/* Global generation/review options */}
      <div className="flex flex-wrap gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-3">
        {hasWaniKani && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useWk}
              onChange={e => { setUseWk(e.target.checked); try { localStorage.setItem('gp_use_wk_vocab', String(e.target.checked)) } catch { /* incognito */ } }}
              className="w-3.5 h-3.5 rounded accent-pink-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {lang === 'en' ? 'Use WaniKani vocabulary (when generating)' : lang === 'ca' ? 'Usar vocabulari WaniKani (en generar)' : 'Usar vocabulario WaniKani (al generar)'}
            </span>
          </label>
        )}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={showShared} onChange={e => setShowShared(e.target.checked)} className="w-3.5 h-3.5 rounded accent-violet-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {lang === 'en' ? 'Include community sentences' : lang === 'ca' ? 'Incloure frases de la comunitat' : 'Incluir frases de la comunidad'}
          </span>
        </label>
      </div>

      <div className="space-y-2">
        {candidates.map(g => {
          const stat = srsStats.get(g.id)
          const isDue = stat && stat.next_review <= now
          const isSelected = selected.has(g.id)
          const name = lang === 'ca' ? g.name_ca : lang === 'en' ? g.name_en : g.name_es
          const count = counts.get(g.id) ?? 0
          const isGenerating = generatingId === g.id
          return (
            <div
              key={g.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                isSelected
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
              }`}
            >
              {/* Left: checkbox + info (clickable to toggle) */}
              <div onClick={() => toggle(g.id)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{g.pattern}</span>
                    {isDue && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                        ⏰ {t(lang as any, 'gp_due')}
                      </span>
                    )}
                    {stat && !isDue && (
                      <span className="text-[10px] text-slate-400">{formatNextReview(stat.next_review, lang)}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{name}</p>
                </div>
              </div>

              {/* Right: sentence count + generate */}
              <div className="shrink-0 flex items-center gap-2">
                <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${
                  count === 0
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {countsLoading ? '…' : `${count} ${lang === 'en' ? 'sent.' : 'fr.'}`}
                </span>
                <button
                  onClick={() => handleGenerate(g)}
                  disabled={isGenerating || !sessionToken}
                  title={lang === 'en' ? 'Generate more sentences' : lang === 'ca' ? 'Generar més frases' : 'Generar más frases'}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-40 transition"
                >
                  {isGenerating ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                  ) : '✨'}
                  <span className="hidden sm:inline">
                    {isGenerating && genAttempt && genAttempt.n > 1
                      ? `${genAttempt.n}/${genAttempt.max}`
                      : (lang === 'en' ? 'Generate' : lang === 'ca' ? 'Generar' : 'Generar')}
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        disabled={queue.length === 0}
        onClick={() => onStart(queue, { showShared })}
        className={`w-full py-3 rounded-xl font-bold text-sm transition ${
          queue.length > 0
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {t(lang as any, 'gp_start_selected').replace('{n}', String(queue.length))}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FreeReviewSelect — pick lessons (of grammars you're studying) for a free review
// ─────────────────────────────────────────────────────────────────────────────
function FreeReviewSelect({
  lessons,
  lang,
  onStart,
  onCancel,
}: {
  lessons: { key: string; book: BookKey; lesson: number; points: GrammarPointWithBook[] }[]
  lang: string
  onStart: (queue: GrammarPointWithBook[]) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(lessons.map(l => l.key)))
  const bookLabel = (b: BookKey) => BOOKS.find(x => x.key === b)?.label ?? b
  const toggle = (key: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const queue = lessons.filter(l => selected.has(l.key)).flatMap(l => l.points)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          🎲 {lang === 'en' ? 'Free grammar review' : lang === 'ca' ? 'Repàs lliure de gramàtica' : 'Repaso libre de gramática'}
        </h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {lang === 'en'
          ? 'Pick the lessons to review. It won\'t affect your levels, and after each correct fill-in you\'ll write the whole sentence.'
          : lang === 'ca'
          ? 'Tria les lliçons a repassar. No afecta els teus nivells, i després d\'encertar el buit escriuràs la frase sencera.'
          : 'Elige las lecciones a repasar. No afecta a tus niveles, y tras acertar el hueco escribirás la frase entera.'}
      </p>

      {lessons.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {lang === 'en' ? 'You are not studying any grammar yet. Add grammar points to your reviews first.'
            : lang === 'ca' ? 'Encara no estudies cap gramàtica. Afegeix punts als teus repassos primer.'
            : 'Todavía no estás estudiando ninguna gramática. Añade puntos a tus repasos primero.'}
        </div>
      ) : (
        <>
          <div className="flex gap-3 text-xs">
            <button onClick={() => setSelected(new Set(lessons.map(l => l.key)))} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {lang === 'en' ? 'Select all' : lang === 'ca' ? 'Selecciona-ho tot' : 'Seleccionar todas'}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline">
              {lang === 'en' ? 'Clear' : lang === 'ca' ? 'Cap' : 'Ninguna'}
            </button>
          </div>

          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto custom-scroll pr-1">
            {lessons.map(l => {
              const on = selected.has(l.key)
              return (
                <label key={l.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                  on ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                }`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(l.key)} className="w-4 h-4 rounded accent-indigo-600 shrink-0" />
                  <span className="flex-1 min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {bookLabel(l.book)} · {t(lang as any, 'grammar_lesson').replace('{n}', String(l.lesson))}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{l.points.length}</span>
                </label>
              )
            })}
          </div>

          <button
            disabled={queue.length === 0}
            onClick={() => onStart(queue)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-sm"
          >
            🎲 {lang === 'en' ? `Start free review (${queue.length})` : lang === 'ca' ? `Comença el repàs lliure (${queue.length})` : `Empezar repaso libre (${queue.length})`}
          </button>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GrammarClient
// ─────────────────────────────────────────────────────────────────────────────

export default function GrammarClient() {
  const { state, addXP } = useStore()
  const lang = state.lang

  const [bookFilter, setBookFilter] = useState<BookFilter>('all')
  const [search, setSearch] = useState('')
  const [jlptFilter, setJlptFilter] = useState<JlptFilter>('all')
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set())
  const [hideKnown, setHideKnown] = useState(true)
  const [showOnlyStudying, setShowOnlyStudying] = useState(false)
  const [view, setView] = useState<View>({ kind: 'list' })
  const [sessionToken, setSessionToken] = useState('')
  const [loadingKnown, setLoadingKnown] = useState(true)
  const [srsStats, setSrsStats] = useState<Map<string, GrammarSrsStat>>(new Map())
  const [scrollToId, setScrollToId] = useState<string | null>(null)

  function handleSrsUpdate(stat: GrammarSrsStat) {
    setSrsStats(prev => new Map([...prev, [stat.grammar_id, stat]]))
  }

  async function handleAddToSrs(grammarId: string) {
    const result = await markGrammarAsStudying(grammarId)
    if (result) handleSrsUpdate(result)
    else {
      // Already exists — fetch the current stat
      const stats = await fetchAllGrammarSrsStats()
      const found = stats.find(s => s.grammar_id === grammarId)
      if (found) handleSrsUpdate(found)
    }
  }

  async function handleRemoveFromSrs(grammarId: string) {
    await removeGrammarFromSrs(grammarId)
    setSrsStats(prev => { const m = new Map(prev); m.delete(grammarId); return m })
  }

  useEffect(() => {
    if (!state.user) { setLoadingKnown(false); return }

    fetchKnownGrammar().then(ids => { setKnownIds(ids); setLoadingKnown(false) })
    fetchAllGrammarSrsStats().then(stats => {
      setSrsStats(new Map(stats.map(s => [s.grammar_id, s])))
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionToken(session?.access_token ?? '')
    })
  }, [state.user])

  useEffect(() => {
    if (view.kind !== 'list' || !scrollToId) return
    const el = document.getElementById(`grammar-${scrollToId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setScrollToId(null)
  }, [view, scrollToId])

  async function toggleKnown(id: string, val: boolean) {
    setKnownIds(prev => {
      const next = new Set(prev)
      val ? next.add(id) : next.delete(id)
      return next
    })
    if (val) {
      setHideKnown(true)
      addXP({ grammarXp: 50 })
      // Set SRS to Enlightened (level 8) — item returns for one last check in 4 months
      const enlightenedDue = Date.now() + GRAMMAR_SRS_INTERVALS[8]
      const enlightenedStat: GrammarSrsStat = { grammar_id: id, level: 8, next_review: enlightenedDue }
      setSrsStats(prev => new Map([...prev, [id, enlightenedStat]]))
      if (state.user) {
        void saveGrammarSrsResult(id, 8, enlightenedDue)
      }
    } else {
      // Unmarking "known" must NOT leave it at the Enlightened level — reset the
      // SRS to Apprentice 1, due now, so it goes back into the learning queue.
      const due = Date.now()
      const stat: GrammarSrsStat = { grammar_id: id, level: 1, next_review: due }
      setSrsStats(prev => new Map([...prev, [id, stat]]))
      if (state.user) void saveGrammarSrsResult(id, 1, due)
    }
    if (state.user) await setGrammarKnown(id, val)
  }

  const bookPoints = useMemo(() => {
    if (bookFilter === 'all') return ALL_GRAMMAR_POINTS
    return ALL_GRAMMAR_POINTS.filter(p => p.book === bookFilter)
  }, [bookFilter])

  const filtered = useMemo(() => {
    let list = bookFilter === 'all'
      ? ALL_GRAMMAR_POINTS
      : ALL_GRAMMAR_POINTS.filter(p => p.book === bookFilter)
    if (jlptFilter !== 'all') list = list.filter(g => g.jlpt === jlptFilter)
    if (hideKnown) list = list.filter(g => !knownIds.has(g.id))
    if (showOnlyStudying) list = list.filter(g => srsStats.has(g.id) && !knownIds.has(g.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        g.pattern.toLowerCase().includes(q) ||
        g.name_es.toLowerCase().includes(q) ||
        g.name_ca.toLowerCase().includes(q) ||
        g.name_en.toLowerCase().includes(q)
      )
    }
    return list
  }, [search, jlptFilter, bookFilter, hideKnown, showOnlyStudying, knownIds, srsStats])

  const byLesson = useMemo(() => {
    const map = new Map<string, { lesson: number; book: BookKey; points: GrammarPointWithBook[] }>()
    for (const g of filtered) {
      const key = `${g.book}-${g.lesson}`
      if (!map.has(key)) map.set(key, { lesson: g.lesson, book: g.book, points: [] })
      map.get(key)!.points.push(g)
    }
    return Array.from(map.values()).sort((a, b) =>
      a.book !== b.book ? (a.book < b.book ? -1 : 1) : a.lesson - b.lesson
    )
  }, [filtered])

  // Lessons of grammars the user is studying (in SRS or known), grouped by
  // book+lesson — candidates for the free review.
  const studyingLessons = useMemo(() => {
    const studying = ALL_GRAMMAR_POINTS.filter(g => srsStats.has(g.id) || knownIds.has(g.id))
    const map = new Map<string, { key: string; book: BookKey; lesson: number; points: GrammarPointWithBook[] }>()
    for (const g of studying) {
      const key = `${g.book}-${g.lesson}`
      if (!map.has(key)) map.set(key, { key, book: g.book, lesson: g.lesson, points: [] })
      map.get(key)!.points.push(g)
    }
    return Array.from(map.values()).sort((a, b) =>
      a.book !== b.book ? (a.book < b.book ? -1 : 1) : a.lesson - b.lesson
    )
  }, [srsStats, knownIds])

  // Grammar points with SRS due today — known (mastered) points are excluded
  const dueGrammarPoints = useMemo(() => {
    const now = Date.now()
    return ALL_GRAMMAR_POINTS.filter(g => {
      if (knownIds.has(g.id)) return false
      const stat = srsStats.get(g.id)
      return stat && stat.next_review <= now
    })
  }, [srsStats, knownIds])


  // Grammar forecast for next 7 days — exclude mastered points
  const grammarForecast = useMemo(() => {
    const filteredStats = new Map(
      Array.from(srsStats.entries()).filter(([id]) => !knownIds.has(id))
    )
    return getGrammarForecast(filteredStats, lang, 7)
  }, [srsStats, knownIds, lang])

  const totalInBook    = bookPoints.length
  const totalKnownInBook = bookPoints.filter(p => knownIds.has(p.id)).length

  // "Load more grammar" suggestion: most studied points mastered + low upcoming load.
  const grammarStudyingCount = useMemo(
    () => ALL_GRAMMAR_POINTS.filter(g => srsStats.has(g.id) || knownIds.has(g.id)).length,
    [srsStats, knownIds],
  )
  const grammarMastered = useMemo(
    () => ALL_GRAMMAR_POINTS.filter(g => knownIds.has(g.id) || (srsStats.get(g.id)?.level ?? 0) >= 5).length,
    [srsStats, knownIds],
  )
  const grammarAvgDaily = useMemo(
    () => Math.round(grammarForecast.reduce((s, d) => s + d.newDue, 0) / Math.max(1, grammarForecast.length)),
    [grammarForecast],
  )
  const [grammarLoadMoreDismissed, setGrammarLoadMoreDismissed] = useState(() => {
    try { return Date.now() - Number(localStorage.getItem('grammar_load_more_dismissed') ?? 0) < 7 * 864e5 }
    catch { return false }
  })
  const showGrammarLoadMore = !grammarLoadMoreDismissed
    && grammarStudyingCount >= 10
    && grammarStudyingCount < ALL_GRAMMAR_POINTS.length  // still room to add
    && grammarMastered / grammarStudyingCount >= 0.70
    && grammarAvgDaily <= 5
  const dismissGrammarLoadMore = () => {
    try { localStorage.setItem('grammar_load_more_dismissed', String(Date.now())) } catch { /* incognito */ }
    setGrammarLoadMoreDismissed(true)
  }

  const activeVocab = state.db.filter(i => i.status === 'active')
  const currentBookInfo = bookFilter !== 'all' ? BOOKS.find(b => b.key === bookFilter) : null
  const effectiveRole = state.simulatedRole ?? state.role
  const canEdit = effectiveRole === 'admin' || effectiveRole === 'contributor'

  // ── Sub-views ────────────────────────────────────────────────────────────

  if (view.kind === 'detail') {
    const currentIndex = filtered.findIndex(g => g.id === view.grammar.id)
    const prevGrammar = currentIndex > 0 ? filtered[currentIndex - 1] : null
    const nextGrammar = currentIndex < filtered.length - 1 ? filtered[currentIndex + 1] : null
    return (
      <GrammarDetail
        grammar={view.grammar}
        lang={lang}
        geminiKey={state.geminiApiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        onBack={() => { setScrollToId(view.grammar.id); setView({ kind: 'list' }) }}
        canEdit={canEdit}
        srsStat={srsStats.get(view.grammar.id) ?? null}
        onAddToSrs={() => handleAddToSrs(view.grammar.id)}
        onRemoveFromSrs={() => handleRemoveFromSrs(view.grammar.id)}
        prevGrammar={prevGrammar}
        nextGrammar={nextGrammar}
        onNavigate={g => setView({ kind: 'detail', grammar: g as GrammarPointWithBook })}
      />
    )
  }

  if (view.kind === 'practice') {
    return (
      <GrammarPractice
        grammar={view.grammar}
        lang={lang}
        geminiKey={state.geminiApiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        showSharedSentences={state.showSharedSentences}
        onBack={() => setView({ kind: 'list' })}
        onSrsUpdate={handleSrsUpdate}
        canEdit={canEdit}
      />
    )
  }

  if (view.kind === 'srs_queue') {
    return (
      <GrammarReviewSession
        queue={view.queue}
        lang={lang}
        sessionToken={sessionToken}
        srsStats={srsStats}
        showSharedSentences={view.showShared}
        onBack={() => setView({ kind: 'list' })}
        onSrsUpdate={view.free ? undefined : handleSrsUpdate}
        free={view.free}
        sentencesPerGrammar={view.free ? 3 : 1}
      />
    )
  }

  if (view.kind === 'free_select') {
    return (
      <FreeReviewSelect
        lessons={studyingLessons}
        lang={lang}
        onStart={queue => setView({ kind: 'srs_queue', queue, showShared: state.showSharedSentences, free: true })}
        onCancel={() => setView({ kind: 'list' })}
      />
    )
  }

  if (view.kind === 'queue_select') {
    return (
      <QueueSelect
        candidates={view.candidates}
        lang={lang}
        srsStats={srsStats}
        geminiKey={state.geminiApiKey}
        geminiModel={state.geminiModel}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        hasWaniKani={Boolean(state.waniKaniApiKey)}
        onStart={(queue, opts) => setView({ kind: 'srs_queue', queue, showShared: opts.showShared })}
        onCancel={() => setView({ kind: 'list' })}
      />
    )
  }

  // ── Main list view ────────────────────────────────────────────────────────

  const subtitleText = currentBookInfo
    ? `${currentBookInfo.subtitle} · ${t(lang, 'grammar_n_points').replace('{n}', String(totalInBook))}`
    : `${t(lang, 'grammar_all_books')} · ${t(lang, 'grammar_n_points').replace('{n}', String(totalInBook))}`

  return (
    <div className="space-y-4">
      {/* Back to dashboard */}
      <Link href="/review" className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
        ← Dashboard
      </Link>

      {/* API Key banner */}
      {!state.geminiApiKey && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">🔑 {t(lang, 'api_missing_banner')}</p>
          </div>
          <Link
            href="/stats"
            className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
          >
            {t(lang, 'api_go_settings')}
          </Link>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t(lang, 'grammar_title')}</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{subtitleText}</p>
      </div>

      {/* ── Grammar SRS Review banner ─────────────────────────────────────── */}
      {state.user && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${
          dueGrammarPoints.length > 0
            ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="text-2xl shrink-0">
            {dueGrammarPoints.length > 0 ? '⏰' : '🏋️'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t(lang, 'gp_srs_review_title')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {dueGrammarPoints.length > 0
                ? t(lang, 'gp_srs_due_count').replace('{n}', String(dueGrammarPoints.length))
                : t(lang, 'gp_srs_all_clear')}
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-1.5 items-end">
            <button
              disabled={dueGrammarPoints.length === 0}
              onClick={() => setView({ kind: 'queue_select', candidates: dueGrammarPoints })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                dueGrammarPoints.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {dueGrammarPoints.length > 0
                ? `▶ ${t(lang, 'gp_start_review')}`
                : t(lang, 'gp_up_to_date')}
            </button>
            {/* Free review: pick lessons, no SRS, full-sentence challenge */}
            <button
              disabled={studyingLessons.length === 0}
              onClick={() => setView({ kind: 'free_select' })}
              title={lang === 'en' ? 'Free review without affecting levels' : lang === 'ca' ? 'Repàs lliure sense afectar els nivells' : 'Repaso libre sin afectar a los niveles'}
              className="px-4 py-2 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🎲 {lang === 'en' ? 'Free review' : lang === 'ca' ? 'Repàs lliure' : 'Repaso libre'}
            </button>
          </div>
        </div>
      )}

      {/* ── "Load more grammar" suggestion ──────────────────────────────── */}
      {showGrammarLoadMore && (
        <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 shadow-sm">
          <span className="text-xl shrink-0">🌱</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              {lang === 'en' ? "You're ahead! A good time to add grammar" : lang === 'ca' ? 'Vas sobrat! Bon moment per afegir gramàtica' : '¡Vas sobrado! Buen momento para añadir gramática'}
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              {lang === 'en'
                ? `You've mastered ${grammarMastered} of ${grammarStudyingCount} grammar points with few upcoming reviews (~${grammarAvgDaily}/day). Add more points from the list below.`
                : lang === 'ca'
                ? `Domines ${grammarMastered} de ${grammarStudyingCount} punts de gramàtica i tens pocs repassos propers (~${grammarAvgDaily}/dia). Afegeix-ne més des de la llista de sota.`
                : `Dominas ${grammarMastered} de ${grammarStudyingCount} puntos de gramática y tienes pocos repasos próximos (~${grammarAvgDaily}/día). Añade más desde la lista de abajo.`}
            </p>
          </div>
          <button
            onClick={dismissGrammarLoadMore}
            aria-label="Descartar"
            className="shrink-0 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 font-bold text-lg leading-none transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grammar Forecast */}
      {state.user && srsStats.size > 0 && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-amber-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              📅 {t(lang, 'grammar_forecast_title')}
            </p>
            <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300 leading-none">
              {grammarForecast[0]?.cumulative ?? 0}
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {grammarForecast.map(day => {
              const isEmpty = day.newDue === 0
              const todayLabel = lang === 'ca' ? 'Avui' : lang === 'en' ? 'Today' : lang === 'ja' ? '今日' : 'Hoy'
              return (
                <div
                  key={day.date.toISOString()}
                  className={`flex flex-col items-center min-w-[2.5rem] ${
                    day.isToday ? 'rounded-lg bg-amber-100/70 dark:bg-amber-900/30 px-1.5 py-0.5' : ''
                  }`}
                >
                  <span className={`text-[10px] font-medium capitalize ${day.isToday ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'}`}>
                    {day.isToday ? todayLabel : day.dayLabel}
                  </span>
                  <span className="text-xs font-bold tabular-nums mt-0.5">
                    {isEmpty
                      ? <span className="text-slate-300 dark:text-slate-600">—</span>
                      : <span className="text-amber-600 dark:text-amber-400">{day.isToday ? day.newDue : `+${day.newDue}`}</span>
                    }
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Book selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 mr-1">📚 {t(lang, 'grammar_book')}:</span>
        <button
          onClick={() => setBookFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            bookFilter === 'all'
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
          }`}
        >
          {t(lang, 'grammar_all')}
        </button>
        {BOOKS.map(b => (
          <button
            key={b.key}
            onClick={() => setBookFilter(b.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              bookFilter === b.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t(lang, 'grammar_progress')}</span>
          <span className="text-sm font-bold text-emerald-600">
            {t(lang, 'grammar_mastered_count')
              .replace('{done}', String(totalKnownInBook))
              .replace('{total}', String(totalInBook))}
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: totalInBook > 0 ? `${(totalKnownInBook / totalInBook) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(lang, 'grammar_search_ph')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'N5', 'N4', 'N3'] as JlptFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setJlptFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                jlptFilter === f
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              {f === 'all' ? t(lang, 'grammar_filter_all') : f}
            </button>
          ))}

          {/* Studying filter */}
          {state.user && srsStats.size > 0 && (
            <button
              onClick={() => setShowOnlyStudying(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                showOnlyStudying
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
              }`}
            >
              📚 {t(lang, 'grammar_filter_studying')}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                showOnlyStudying ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
              }`}>
                {srsStats.size}
              </span>
            </button>
          )}

          <button
            onClick={() => setHideKnown(v => !v)}
            disabled={knownIds.size === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ml-auto ${
              hideKnown && knownIds.size > 0
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {hideKnown && knownIds.size > 0 ? t(lang, 'grammar_hiding_known') : t(lang, 'grammar_hide_known')}
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-400">
        {t(lang, 'grammar_points_count')
          .replace('{n}', String(filtered.length))
          .replace('{done}', String(totalKnownInBook))}
        {loadingKnown && !state.user && t(lang, 'grammar_login_save')}
      </p>

      {/* Grammar list grouped by lesson */}
      {byLesson.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-2">🔍</p>
          <p>{t(lang, 'grammar_no_results')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {byLesson.map(({ lesson, book, points }) => (
            <div key={`${book}-${lesson}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {bookFilter === 'all' ? `${book === 'mnn1' ? 'MNN1' : 'MNN2'} · ` : ''}
                  {t(lang, 'grammar_lesson').replace('{n}', String(lesson))}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400">
                  {points.filter(g => knownIds.has(g.id)).length}/{points.length}
                </span>
              </div>
              <div className="space-y-2">
                {points.map(g => (
                  <div key={g.id} id={`grammar-${g.id}`}>
                    <GrammarCard
                      grammar={g}
                      known={knownIds.has(g.id)}
                      srsStat={srsStats.get(g.id)}
                      onToggleKnown={toggleKnown}
                      onAddToSrs={handleAddToSrs}
                      onSelect={g => setView({ kind: 'detail', grammar: g })}
                      lang={lang}
                      showBook={bookFilter === 'all'}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
