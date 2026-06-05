'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { toHiragana } from 'wanakana'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import {
  type GrammarSentence,
  type GrammarSrsStat,
  applyGrammarResult,
  checkAnswer,
  getSrsLevelLabel,
} from '@/lib/grammar-srs'
import {
  fetchGrammarSentences,
  fetchUserSharedSentences,
  saveGrammarSrsResult,
  submitGrammarReport,
} from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { grammarXpForSession } from '@/lib/progression'
import XpToast from '@/components/progression/XpToast'
import { RubyText } from './RubyText'

interface Props {
  queue: GrammarPoint[]
  lang: Lang
  sessionToken: string
  srsStats: Map<string, GrammarSrsStat>
  showSharedSentences: boolean
  onBack: () => void
  onSrsUpdate?: (stat: GrammarSrsStat) => void
}

type Phase = 'loading' | 'asking' | 'answered' | 'done'

function ui(lang: string, es: string, ca: string, en: string) {
  if (lang === 'ca') return ca
  if (lang === 'en') return en
  return es
}

export default function GrammarReviewSession({
  queue,
  lang,
  sessionToken,
  srsStats,
  showSharedSentences,
  onBack,
  onSrsUpdate,
}: Props) {
  const { addXP } = useStore()

  const grammarById = useRef(new Map(queue.map(g => [g.id, g]))).current

  // Pools and per-grammar bookkeeping
  const poolsRef       = useRef(new Map<string, GrammarSentence[]>())
  const oldLevelsRef   = useRef(new Map<string, number>())
  const lastShownRef   = useRef(new Map<string, string>())
  const wrongCountsRef = useRef(new Map<string, number>())
  const completedRef   = useRef(new Set<string>())
  const queueRef       = useRef<string[]>([])

  const [phase, setPhase] = useState<Phase>('loading')
  const [idx, setIdx] = useState(0)
  const [queueLen, setQueueLen] = useState(0)
  const [currentSentence, setCurrentSentence] = useState<GrammarSentence | null>(null)
  const [emptyGrammars, setEmptyGrammars] = useState<string[]>([])
  const [results, setResults] = useState<Map<string, { oldLevel: number; newLevel: number }>>(new Map())

  // Per-question UI state
  const [userInput, setUserInput] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showFurigana, setShowFurigana] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportDesc, setReportDesc] = useState('')

  // End-of-session XP
  const [xpGained, setXpGained] = useState<number | null>(null)
  const [xpToastKey, setXpToastKey] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  const currentGrammar = grammarById.get(queueRef.current[idx])

  // ── Pick a random sentence for a grammar, avoiding an immediate repeat ──────
  const pickFor = useCallback((id: string): GrammarSentence | null => {
    const pool = poolsRef.current.get(id)
    if (!pool || pool.length === 0) return null
    if (pool.length === 1) return pool[0]
    const lastKey = lastShownRef.current.get(id)
    let pick = pool[Math.floor(Math.random() * pool.length)]
    let tries = 0
    while (lastKey && (pick.id ?? pick.sentence_before) === lastKey && tries < 6) {
      pick = pool[Math.floor(Math.random() * pool.length)]
      tries++
    }
    lastShownRef.current.set(id, pick.id ?? pick.sentence_before)
    return pick
  }, [])

  function resetQuestionState() {
    setUserInput('')
    setIsCorrect(false)
    setShowHint(false)
    setReportOpen(false)
    setReportSent(false)
    setReportDesc('')
  }

  const advanceTo = useCallback((nextIdx: number) => {
    const id = queueRef.current[nextIdx]
    if (!id) return
    setIdx(nextIdx)
    setCurrentSentence(pickFor(id))
    resetQuestionState()
    setPhase('asking')
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [pickFor])

  // ── Load all pools on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      const pools = new Map<string, GrammarSentence[]>()
      for (const g of queue) {
        const [own, shared] = await Promise.all([
          fetchGrammarSentences(g.id).catch(() => []),
          showSharedSentences ? fetchUserSharedSentences(g.id).catch(() => []) : Promise.resolve([]),
        ])
        const sharedMapped: GrammarSentence[] = shared.map(r => ({
          id: r.id,
          grammar_id: r.grammar_id,
          sentence_before: r.sentence_before,
          sentence_before_reading: r.sentence_before_reading,
          sentence_before_alts: r.sentence_before_alts,
          sentence_before_reading_alts: r.sentence_before_reading_alts,
          sentence_after: r.sentence_after,
          sentence_after_reading: r.sentence_after_reading,
          answer: r.answer,
          answer_alts: r.answer_alts,
          translation_es: r.translation_es,
          translation_ca: r.translation_ca,
          translation_en: r.translation_en,
          is_shared: true,
        }))
        const merged = [
          ...own,
          ...sharedMapped.filter(sh => !own.some(s => s.sentence_before === sh.sentence_before && s.answer === sh.answer)),
        ]
        if (merged.length > 0) pools.set(g.id, merged)
      }
      if (cancelled) return

      poolsRef.current = pools
      for (const g of queue) oldLevelsRef.current.set(g.id, srsStats.get(g.id)?.level ?? 0)

      const validIds = queue.filter(g => pools.has(g.id)).map(g => g.id)
      const empties  = queue.filter(g => !pools.has(g.id)).map(g => g.id)
      setEmptyGrammars(empties)
      queueRef.current = validIds
      setQueueLen(validIds.length)

      if (validIds.length === 0) setPhase('done')
      else advanceTo(0)
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (!isComposing.current) setUserInput(toHiragana(raw, { IMEMode: true }))
    else setUserInput(raw)
  }

  function submitAnswer() {
    if (!userInput.trim() || phase !== 'asking' || !currentSentence) return
    setIsCorrect(checkAnswer(userInput.trim(), currentSentence.answer, currentSentence.answer_alts))
    setPhase('answered')
  }

  function finish() {
    const correctFirstTry = [...completedRef.current].filter(id => (wrongCountsRef.current.get(id) ?? 0) === 0).length
    const withMistakes = completedRef.current.size - correctFirstTry
    const xp = grammarXpForSession(correctFirstTry, withMistakes, true)
    if (xp > 0) {
      addXP({ grammarXp: xp })
      setXpGained(xp)
      setXpToastKey(k => k + 1)
    }
    setPhase('done')
  }

  function next() {
    const id = queueRef.current[idx]
    let didAppend = false

    if (isCorrect) {
      if (!completedRef.current.has(id)) {
        completedRef.current.add(id)
        const oldLevel = oldLevelsRef.current.get(id) ?? 0
        const wc = wrongCountsRef.current.get(id) ?? 0
        const { newLevel, nextReview } = applyGrammarResult(oldLevel, wc)
        void saveGrammarSrsResult(id, newLevel, nextReview).catch(() => {})
        onSrsUpdate?.({ grammar_id: id, level: newLevel, next_review: nextReview })
        setResults(prev => new Map(prev).set(id, { oldLevel, newLevel }))
      }
    } else {
      wrongCountsRef.current.set(id, (wrongCountsRef.current.get(id) ?? 0) + 1)
      if (!completedRef.current.has(id)) {
        queueRef.current = [...queueRef.current, id]
        setQueueLen(queueRef.current.length)
        didAppend = true
      }
    }

    if (!didAppend && idx + 1 >= queueRef.current.length) finish()
    else advanceTo(idx + 1)
  }

  // Enter to advance once answered
  useEffect(() => {
    if (phase !== 'answered') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') next() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, idx, isCorrect]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render: loading ─────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(lang, 'gp_loading')}</p>
      </div>
    )
  }

  // ── Render: summary ─────────────────────────────────────────────────────────
  if (phase === 'done') {
    const reviewedIds = [...completedRef.current]
    const correctFirstTry = reviewedIds.filter(id => (wrongCountsRef.current.get(id) ?? 0) === 0).length
    const withMistakes = reviewedIds.length - correctFirstTry

    return (
      <>
        {xpGained !== null && <XpToast key={xpToastKey} xp={xpGained} type="grammar" />}
        <div className="space-y-5">
          <div className="text-center py-6 space-y-2">
            <p className="text-5xl">🎉</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {ui(lang, '¡Repaso completado!', 'Repàs completat!', 'Review complete!')}
            </p>
          </div>

          {/* Counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{correctFirstTry}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                {ui(lang, 'a la primera', 'a la primera', 'first try')}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{withMistakes}</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                {ui(lang, 'con fallos', 'amb errades', 'with mistakes')}
              </p>
            </div>
          </div>

          {/* Per-grammar level changes */}
          <div className="space-y-2">
            {reviewedIds.map(id => {
              const g = grammarById.get(id)
              const r = results.get(id)
              if (!g || !r) return null
              const dir = r.newLevel > r.oldLevel ? 'up' : r.newLevel < r.oldLevel ? 'down' : 'same'
              return (
                <div key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                  <span className="flex-1 min-w-0 text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{g.pattern}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{getSrsLevelLabel(r.newLevel, lang)}</span>
                  <span className={`text-sm font-bold ${
                    dir === 'up' ? 'text-emerald-600 dark:text-emerald-400'
                    : dir === 'down' ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {dir === 'up' ? '↑' : dir === 'down' ? '↓' : '='}
                  </span>
                </div>
              )
            })}

            {/* Grammars skipped for lack of sentences */}
            {emptyGrammars.map(id => {
              const g = grammarById.get(id)
              if (!g) return null
              return (
                <div key={id} className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <span className="flex-1 min-w-0 text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{g.pattern}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {ui(lang, 'sin frases', 'sense frases', 'no sentences')}
                  </span>
                </div>
              )
            })}
          </div>

          <button
            onClick={onBack}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition"
          >
            ← {t(lang, 'gp_back')}
          </button>
        </div>
      </>
    )
  }

  // ── Render: asking / answered ───────────────────────────────────────────────
  if (!currentSentence || !currentGrammar) return null

  const s = currentSentence
  const hasFurigana = !!(s.sentence_before_reading || s.sentence_after_reading)
  const translation =
    lang === 'ca' ? (s.translation_ca || s.translation_es) :
    lang === 'en' ? (s.translation_en || s.translation_es) :
    s.translation_es
  const progress = (idx / queueLen) * 100
  const explanation =
    lang === 'ca' ? currentGrammar.explanation_ca :
    lang === 'en' ? currentGrammar.explanation_en :
    currentGrammar.explanation_es

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title={t(lang, 'gp_quit')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
            {phase === 'answered'
              ? currentGrammar.pattern
              : ui(lang, 'Práctica de gramática', 'Pràctica de gramàtica', 'Grammar practice')}
          </span>
        </div>
        <span className="shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400 ml-2 tabular-nums">
          {idx + 1} / {queueLen}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* ── ASKING ─────────────────────────────────────────────────────────── */}
      {phase === 'asking' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {ui(lang, 'Rellena el hueco', 'Omple el buit', 'Fill in the blank')}
              </span>
              {hasFurigana && (
                <button
                  onClick={() => setShowFurigana(v => !v)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition ${
                    showFurigana
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  ふ
                </button>
              )}
            </div>

            <div className="px-5 py-6 text-center">
              <div className="kanji-font text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 leading-loose">
                {s.sentence_before && (
                  <span>{showFurigana && hasFurigana ? <RubyText text={s.sentence_before} reading={s.sentence_before_reading} /> : s.sentence_before}</span>
                )}
                <span className="mx-1 inline-flex items-center justify-center min-w-[4ch] px-2 border-b-4 border-indigo-400 dark:border-indigo-500 text-indigo-300 dark:text-indigo-600 select-none">　</span>
                {s.sentence_after && (
                  <span>{showFurigana && hasFurigana ? <RubyText text={s.sentence_after} reading={s.sentence_after_reading} /> : s.sentence_after}</span>
                )}
              </div>
            </div>

            {showHint && translation ? (
              <div className="px-5 pb-4 text-center">
                <p className="text-sm italic text-slate-400 dark:text-slate-500">{translation}</p>
              </div>
            ) : translation ? (
              <div className="flex justify-center pb-4">
                <button onClick={() => setShowHint(true)} className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center gap-1">
                  💡 {ui(lang, 'Ver traducción', 'Mostra traducció', 'Show translation')}
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInput}
                onCompositionStart={() => { isComposing.current = true }}
                onCompositionEnd={e => { isComposing.current = false; setUserInput(toHiragana((e.target as HTMLInputElement).value, { IMEMode: true })) }}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                placeholder={ui(lang, 'Escribe la gramática…', 'Escriu la gramàtica…', 'Type the grammar form…')}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                data-lpignore="true" data-1p-ignore="true"
                className="w-full px-4 py-3.5 text-center text-lg font-bold border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-xl focus:outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 select-none pointer-events-none">ローマ字OK</span>
            </div>
            <button onClick={submitAnswer} disabled={!userInput.trim()} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl transition shadow-sm">
              {t(lang, 'gp_check')}
            </button>
          </div>
        </>
      )}

      {/* ── ANSWERED ───────────────────────────────────────────────────────── */}
      {phase === 'answered' && (
        <>
          <div className={`rounded-2xl border overflow-hidden ${isCorrect ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'}`}>
            <div className={`flex items-center justify-between px-4 py-2 border-b ${
              isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{isCorrect ? '✅' : '❌'}</span>
                <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {isCorrect ? t(lang, 'gp_correct') : t(lang, 'gp_wrong')}
                </span>
              </div>
              {hasFurigana && (
                <button
                  onClick={() => setShowFurigana(v => !v)}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition ${
                    showFurigana ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {showFurigana ? t(lang, 'gp_hide_furigana') : t(lang, 'gp_show_furigana')}
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 px-5 py-4 space-y-4">
              {/* Correct full sentence */}
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">{t(lang, 'gp_correct_sentence')}</p>
                <div className="kanji-font text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 leading-loose">
                  {s.sentence_before && (
                    <span>{showFurigana && hasFurigana ? <RubyText text={s.sentence_before} reading={s.sentence_before_reading} /> : s.sentence_before}</span>
                  )}
                  <span className={`mx-0.5 px-1.5 py-0.5 rounded-lg ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'}`}>
                    {s.answer}
                  </span>
                  {s.sentence_after && (
                    <span>{showFurigana && hasFurigana ? <RubyText text={s.sentence_after} reading={s.sentence_after_reading} /> : s.sentence_after}</span>
                  )}
                </div>
                {translation && <p className="mt-2 text-sm italic text-slate-400 dark:text-slate-500">{translation}</p>}
              </div>

              {/* User answer */}
              <div className={`pt-3 border-t ${isCorrect ? 'border-emerald-100 dark:border-emerald-800/50' : 'border-rose-100 dark:border-rose-800/50'}`}>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{t(lang, 'gp_your_answer')}</p>
                    <p className={`text-xl font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{userInput}</p>
                  </div>
                  {!isCorrect && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600 text-lg">→</span>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{ui(lang, 'Correcto', 'Correcte', 'Correct')}</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{s.answer}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Grammar note on wrong answer */}
              {!isCorrect && explanation && (
                <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-left">
                  <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mb-1">
                    {ui(lang, 'Nota gramatical', 'Nota gramatical', 'Grammar note')} — {currentGrammar.pattern}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{explanation}</p>
                </div>
              )}
            </div>
          </div>

          {(() => {
            // Will the session finish on "next"? Only if this is the last queued item
            // and the current answer won't get requeued (i.e. it was correct).
            const willFinish = isCorrect && idx + 1 >= queueRef.current.length
            return (
              <button onClick={next} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm">
                {willFinish ? `🏁 ${t(lang, 'gp_see_results')}` : `${t(lang, 'gp_next')} →`}
              </button>
            )
          })()}

          {/* Report sentence */}
          {sessionToken && (
            reportSent ? (
              <div className="text-center text-xs text-emerald-600 dark:text-emerald-400">
                ✓ {ui(lang, 'Reporte enviado', 'Informe enviat', 'Report sent')}
              </div>
            ) : reportOpen ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {ui(lang, '¿Qué falla en esta frase?', 'Què falla en aquesta frase?', 'What is wrong with this sentence?')}
                </p>
                <textarea
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder={ui(lang, 'Describe el error (opcional)…', 'Descriu l\'error (opcional)…', 'Describe the error (optional)…')}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setReportOpen(false); setReportDesc('') }} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                    {ui(lang, 'Cancelar', 'Cancel·lar', 'Cancel')}
                  </button>
                  <button
                    disabled={reportSending}
                    onClick={async () => {
                      setReportSending(true)
                      try {
                        await submitGrammarReport({
                          grammar_id: currentGrammar.id,
                          grammar_pattern: currentGrammar.pattern,
                          sentence: s.sentence_before + s.answer + s.sentence_after,
                          description: reportDesc,
                        })
                        setReportSent(true)
                        setReportOpen(false)
                      } catch { /* ignore */ }
                      finally { setReportSending(false) }
                    }}
                    className="text-xs font-semibold px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg transition"
                  >
                    {reportSending ? '…' : ui(lang, 'Enviar', 'Enviar', 'Send')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <button onClick={() => setReportOpen(true)} className="text-xs text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                  🚩 {ui(lang, 'Reportar error en esta frase', 'Reportar error en la frase', 'Report sentence error')}
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
