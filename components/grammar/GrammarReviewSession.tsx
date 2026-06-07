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
  checkFullSentence,
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
  /** Free review: no SRS/XP, several sentences per grammar, and a full-sentence
   *  writing challenge after each correct fill-in. */
  free?: boolean
  /** How many sentences to show per grammar (free mode). Default 1. */
  sentencesPerGrammar?: number
}

type Phase = 'loading' | 'asking' | 'writing' | 'answered' | 'done'

function ui(lang: string, es: string, ca: string, en: string) {
  if (lang === 'ca') return ca
  if (lang === 'en') return en
  return es
}

const hasKanji = (s: string) => /[一-鿿㐀-䶿]/.test(s)
const stripForDiff = (s: string) => s.replace(/[。、！？\s]/g, '')

// Build the full kanji form of a sentence: before + answer + after.
function kanjiForm(s: GrammarSentence): string {
  return s.sentence_before + s.answer + s.sentence_after
}

// Build a best-effort full reading (hiragana) form: before_reading + answer
// reading + after_reading. The answer reading is the answer itself if it's
// already kana, else the first all-kana alternative, else the answer as-is.
function readingForm(s: GrammarSentence): string {
  const answerKana = !hasKanji(s.answer)
    ? s.answer
    : (s.answer_alts ?? []).find(a => a && !hasKanji(a)) ?? s.answer
  return (s.sentence_before_reading || s.sentence_before) + answerKana + (s.sentence_after_reading || s.sentence_after)
}

// Common prefix/suffix diff between the user's input and a reference string.
// Returns the matched prefix/suffix and the differing middle of each, so the
// UI can highlight where the error is.
function splitDiff(a: string, b: string) {
  let p = 0
  while (p < a.length && p < b.length && a[p] === b[p]) p++
  let ea = a.length, eb = b.length
  while (ea > p && eb > p && a[ea - 1] === b[eb - 1]) { ea--; eb-- }
  return {
    pre: a.slice(0, p),
    aMid: a.slice(p, ea), aSuf: a.slice(ea),
    bMid: b.slice(p, eb), bSuf: b.slice(eb),
  }
}

// Pick the reference (kanji or reading form) closest to what the user typed, so
// the error highlight makes sense whether they wrote kanji or hiragana.
function closestRef(input: string, s: GrammarSentence): string {
  const inp = stripForDiff(input)
  const candidates = [kanjiForm(s), readingForm(s)].map(stripForDiff)
  let best = candidates[0], bestScore = -1
  for (const c of candidates) {
    const d = splitDiff(inp, c)
    const score = d.pre.length + Math.min(d.aSuf.length, d.bSuf.length)
    if (score > bestScore) { bestScore = score; best = c }
  }
  return best
}

export default function GrammarReviewSession({
  queue,
  lang,
  sessionToken,
  srsStats,
  showSharedSentences,
  onBack,
  onSrsUpdate,
  free = false,
  sentencesPerGrammar = 1,
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
  // Free-mode full-sentence writing step. `writingSentence` ≠ null means the
  // current 'writing'/'answered' screen is the full-sentence challenge (about a
  // sentence seen earlier), not the fill-in.
  const [fullInput, setFullInput] = useState('')
  const [fullCorrect, setFullCorrect] = useState(false)
  const [writingSentence, setWritingSentence] = useState<GrammarSentence | null>(null)
  const seenRef = useRef<GrammarSentence[]>([])        // sentences shown so far (for the writing challenge)
  const freeReviewedRef = useRef(0)
  const freeWrittenRef = useRef(0)
  const freeWrittenOkRef = useRef(0)
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
  // Timestamp of the last answer submission — guards against the same Enter
  // keypress (or its key-repeat) immediately advancing past the feedback.
  const submittedAtRef = useRef(0)

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
    setFullInput('')
    setFullCorrect(false)
    setShowHint(false)
    setReportOpen(false)
    setReportSent(false)
    setReportDesc('')
  }

  const advanceTo = useCallback((nextIdx: number) => {
    const id = queueRef.current[nextIdx]
    if (!id) return
    setIdx(nextIdx)
    const picked = pickFor(id)
    setCurrentSentence(picked)
    if (picked) seenRef.current.push(picked)  // remember for the writing challenge
    resetQuestionState()
    setWritingSentence(null)
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

      // Build the queue. SRS mode: one entry per grammar id. Free mode: several
      // entries per grammar (up to sentencesPerGrammar, capped by pool size).
      const seenIds = new Set<string>()
      const counts = new Map<string, number>()
      const empties: string[] = []
      for (const g of queue) {
        if (seenIds.has(g.id)) continue
        seenIds.add(g.id)
        const pool = pools.get(g.id)
        if (pool && pool.length > 0) {
          counts.set(g.id, free ? Math.min(sentencesPerGrammar, pool.length) : 1)
        } else {
          empties.push(g.id)
        }
      }
      setEmptyGrammars(empties)

      // Order the entries. Free mode: interleave so the same grammar never
      // appears twice in a row — greedily take the id with the most repetitions
      // remaining that isn't the previous one. SRS mode keeps insertion order.
      let validIds: string[]
      if (free) {
        validIds = []
        let last: string | null = null
        const total = [...counts.values()].reduce((a, b) => a + b, 0)
        for (let n = 0; n < total; n++) {
          let pool = [...counts.entries()].filter(([id, c]) => c > 0 && id !== last)
          if (pool.length === 0) pool = [...counts.entries()].filter(([, c]) => c > 0)
          pool.sort((a, b) => b[1] - a[1])
          const top = pool.filter(p => p[1] === pool[0][1])
          const pick = top[Math.floor(Math.random() * top.length)][0]
          validIds.push(pick)
          counts.set(pick, counts.get(pick)! - 1)
          last = pick
        }
      } else {
        validIds = [...counts.keys()]
      }

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
    submittedAtRef.current = Date.now()
    // Always show fill-in feedback (the writing challenge comes later, at random).
    setIsCorrect(checkAnswer(userInput.trim(), currentSentence.answer, currentSentence.answer_alts))
    setPhase('answered')
  }

  function submitFull() {
    if (!fullInput.trim() || phase !== 'writing' || !writingSentence) return
    submittedAtRef.current = Date.now()
    const ok = checkFullSentence(
      fullInput.trim(),
      writingSentence.sentence_before_reading,
      writingSentence.sentence_before,
      writingSentence.answer,
      writingSentence.sentence_after_reading,
      writingSentence.sentence_after,
      { beforeAlts: undefined, answerAlts: writingSentence.answer_alts },
    )
    freeWrittenRef.current += 1
    if (ok) freeWrittenOkRef.current += 1
    setFullCorrect(ok)
    setPhase('answered')
  }

  function finish() {
    if (!free) {
      const correctFirstTry = [...completedRef.current].filter(id => (wrongCountsRef.current.get(id) ?? 0) === 0).length
      const withMistakes = completedRef.current.size - correctFirstTry
      const xp = grammarXpForSession(correctFirstTry, withMistakes, true)
      if (xp > 0) {
        addXP({ grammarXp: xp })
        setXpGained(xp)
        setXpToastKey(k => k + 1)
      }
    }
    setPhase('done')
  }

  function next() {
    // Free mode: never touches SRS/XP and never re-queues.
    if (free) {
      // Leaving a writing-challenge screen → move on to the next grammar.
      if (writingSentence) {
        setWritingSentence(null)
        freeReviewedRef.current += 1
        if (idx + 1 >= queueRef.current.length) finish()
        else advanceTo(idx + 1)
        return
      }
      // Leaving a fill-in feedback screen: at random, inject a full-sentence
      // challenge about a sentence seen EARLIER (not the one just answered, and
      // never on the very first question).
      const earlier = seenRef.current.slice(0, -1)
      if (earlier.length > 0 && Math.random() < 0.6) {
        setWritingSentence(earlier[Math.floor(Math.random() * earlier.length)])
        setFullInput('')
        setFullCorrect(false)
        setPhase('writing')
        setTimeout(() => inputRef.current?.focus(), 100)
        return
      }
      freeReviewedRef.current += 1
      if (idx + 1 >= queueRef.current.length) finish()
      else advanceTo(idx + 1)
      return
    }

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

  // Enter to advance once answered — but ignore the Enter (or its key-repeat)
  // that submitted the answer, so the feedback stays visible for a moment.
  useEffect(() => {
    if (phase !== 'answered') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && Date.now() - submittedAtRef.current > 400) next()
    }
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
            <p className="text-5xl">{free ? '🎲' : '🎉'}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {free
                ? ui(lang, '¡Repaso libre completado!', 'Repàs lliure completat!', 'Free review complete!')
                : ui(lang, '¡Repaso completado!', 'Repàs completat!', 'Review complete!')}
            </p>
            {free && (
              <div className="text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>{ui(lang, `${freeReviewedRef.current} frases repasadas · no afecta a tus niveles`, `${freeReviewedRef.current} frases repassades · no afecta els teus nivells`, `${freeReviewedRef.current} sentences reviewed · doesn't affect your levels`)}</p>
                {freeWrittenRef.current > 0 && (
                  <p>✍️ {ui(lang,
                    `${freeWrittenOkRef.current}/${freeWrittenRef.current} frases escritas correctas`,
                    `${freeWrittenOkRef.current}/${freeWrittenRef.current} frases escrites correctes`,
                    `${freeWrittenOkRef.current}/${freeWrittenRef.current} sentences written correctly`)}</p>
                )}
              </div>
            )}
          </div>

          {/* Counters (SRS mode only — free review doesn't score) */}
          {!free && (
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
          )}

          {/* Per-grammar level changes (SRS mode) + skipped grammars */}
          <div className="space-y-2">
            {!free && reviewedIds.map(id => {
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

  // Full-sentence writing challenge (free mode): about a sentence seen earlier.
  const ws = writingSentence
  const wsTranslation = ws
    ? (lang === 'ca' ? (ws.translation_ca || ws.translation_es) : lang === 'en' ? (ws.translation_en || ws.translation_es) : ws.translation_es)
    : ''
  const wsGrammar = ws ? grammarById.get(ws.grammar_id) : null
  // The 'answered' screen shows the writing result when a writing challenge is active.
  const answeredCorrect = ws ? fullCorrect : isCorrect
  // Error highlight for a wrong full sentence: diff the input against the closest form.
  const diff = ws && !fullCorrect && fullInput ? splitDiff(stripForDiff(fullInput), closestRef(fullInput, ws)) : null

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
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 leading-loose">
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

      {/* ── WRITING (free mode: write a previously-seen sentence in full) ───── */}
      {phase === 'writing' && ws && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                ✍️ {ui(lang, 'Escribe esta frase entera en japonés', 'Escriu aquesta frase sencera en japonès', 'Write this whole sentence in Japanese')}
              </span>
            </div>
            <div className="px-5 py-6 text-center">
              <p className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                {wsTranslation || kanjiForm(ws)}
              </p>
              {wsGrammar && (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{wsGrammar.pattern}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={fullInput}
                onChange={e => { if (!isComposing.current) setFullInput(toHiragana(e.target.value, { IMEMode: true })); else setFullInput(e.target.value) }}
                onCompositionStart={() => { isComposing.current = true }}
                onCompositionEnd={e => { isComposing.current = false; setFullInput(toHiragana((e.target as HTMLInputElement).value, { IMEMode: true })) }}
                onKeyDown={e => e.key === 'Enter' && submitFull()}
                placeholder={t(lang, 'gp_input_ph')}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                data-lpignore="true" data-1p-ignore="true"
                className="w-full px-4 py-3.5 text-center text-lg font-bold border-2 border-slate-200 dark:border-slate-600 focus:border-emerald-400 dark:focus:border-emerald-500 rounded-xl focus:outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 select-none pointer-events-none">ローマ字OK</span>
            </div>
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
              {ui(lang, 'Puedes escribirla con kanji o toda en hiragana.', 'Pots escriure-la amb kanji o tota en hiragana.', 'Write it with kanji or fully in hiragana.')}
            </p>
            <button onClick={submitFull} disabled={!fullInput.trim()} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl transition shadow-sm">
              {t(lang, 'gp_check')}
            </button>
          </div>
        </>
      )}

      {/* ── ANSWERED ───────────────────────────────────────────────────────── */}
      {phase === 'answered' && (
        <>
          <div className={`rounded-2xl border overflow-hidden ${answeredCorrect ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'}`}>
            <div className={`flex items-center justify-between px-4 py-2 border-b ${
              answeredCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{answeredCorrect ? '✅' : '❌'}</span>
                <span className={`text-sm font-bold ${answeredCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {ws
                    ? (answeredCorrect ? ui(lang, '¡Frase correcta!', 'Frase correcta!', 'Sentence correct!') : ui(lang, 'Frase incorrecta', 'Frase incorrecta', 'Sentence incorrect'))
                    : (isCorrect ? t(lang, 'gp_correct') : t(lang, 'gp_wrong'))}
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
              {ws ? (
                <>
                  {/* Writing challenge: correct full sentence */}
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">{t(lang, 'gp_correct_sentence')}</p>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 leading-loose">
                      {ws.sentence_before && (
                        <span>{showFurigana && hasFurigana ? <RubyText text={ws.sentence_before} reading={ws.sentence_before_reading} /> : ws.sentence_before}</span>
                      )}
                      <span className="mx-0.5 px-1.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">{ws.answer}</span>
                      {ws.sentence_after && (
                        <span>{showFurigana && hasFurigana ? <RubyText text={ws.sentence_after} reading={ws.sentence_after_reading} /> : ws.sentence_after}</span>
                      )}
                    </div>
                    {wsTranslation && <p className="mt-2 text-sm italic text-slate-400 dark:text-slate-500">{wsTranslation}</p>}
                  </div>

                  {/* Your sentence (with error highlight when wrong) */}
                  <div className={`pt-3 border-t ${fullCorrect ? 'border-emerald-100 dark:border-emerald-800/50' : 'border-rose-100 dark:border-rose-800/50'}`}>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1 text-center">{t(lang, 'gp_your_answer')}</p>
                    <p className="text-lg font-bold text-center break-words">
                      {fullCorrect || !diff
                        ? <span className="text-emerald-700 dark:text-emerald-400">{fullInput}</span>
                        : <>
                            <span className="text-slate-700 dark:text-slate-200">{diff.pre}</span>
                            {diff.aMid && <span className="bg-rose-200 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded px-0.5">{diff.aMid}</span>}
                            <span className="text-slate-700 dark:text-slate-200">{diff.aSuf}</span>
                          </>}
                    </p>
                    {!fullCorrect && diff && diff.bMid && (
                      <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                        {ui(lang, 'Debería ser', 'Hauria de ser', 'Should be')}:{' '}
                        <span className="font-semibold">{diff.pre}</span>
                        <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded px-0.5 font-semibold">{diff.bMid}</span>
                        <span className="font-semibold">{diff.bSuf}</span>
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Fill-in: correct full sentence */}
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">{t(lang, 'gp_correct_sentence')}</p>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 leading-loose">
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
                </>
              )}
            </div>
          </div>

          {(() => {
            // Will the session finish on "next"? SRS: only if correct (wrong gets
            // requeued). Free: on the last item, unless a writing challenge may
            // still be injected (fill-in feedback with earlier sentences available).
            const willFinish = idx + 1 >= queueRef.current.length && (
              free ? (ws !== null || seenRef.current.length <= 1) : isCorrect
            )
            return (
              <button onClick={next} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm">
                {willFinish ? `🏁 ${t(lang, 'gp_see_results')}` : `${t(lang, 'gp_next')} →`}
              </button>
            )
          })()}

          {/* Report sentence (fill-in feedback only) */}
          {sessionToken && !ws && (
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
