'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toHiragana } from 'wanakana'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import type { Lang } from '@/lib/i18n'
import { t, getMeaning } from '@/lib/i18n'
import {
  type GrammarSentence,
  type GrammarSrsStat,
  applyGrammarResult,
  checkAnswer,
  formatNextReview,
  getSrsLevelLabel,
  GRAMMAR_SRS_INTERVALS,
} from '@/lib/grammar-srs'
import {
  fetchGrammarSentences,
  saveGrammarSentences,
  fetchGrammarSrsStat,
  saveGrammarSrsResult,
} from '@/lib/supabase'

// How many sentences to show per practice session
const SESSION_SIZE = 5
// Minimum sentences needed to start; generate more if below this
const MIN_POOL = 5
// Target pool size when generating
const TARGET_POOL = 25

type Phase =
  | 'loading'      // fetching from DB
  | 'generating'   // calling Gemini
  | 'ready'        // loaded, not started
  | 'asking'       // showing a blank question
  | 'answered'     // showing result for current question
  | 'complete'     // session end

interface Props {
  grammar: GrammarPoint
  lang: Lang
  geminiKey: string
  sessionToken: string
  activeVocab: { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }[]
  onBack: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny sub-components
// ─────────────────────────────────────────────────────────────────────────────

function LevelDots({ level, max = 7 }: { level: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max + 1 }, (_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${
            i <= level
              ? level >= 7
                ? 'bg-emerald-400'
                : level >= 5
                  ? 'bg-indigo-400'
                  : level >= 3
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
              : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function SpinnerScreen({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center space-y-3">
        <svg className="w-9 h-9 animate-spin text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        <p className="text-sm text-slate-500 font-medium">{msg}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function GrammarPractice({
  grammar,
  lang,
  geminiKey,
  sessionToken,
  activeVocab,
  onBack,
}: Props) {
  const [phase, setPhase]                   = useState<Phase>('loading')
  const [sentences, setSentences]           = useState<GrammarSentence[]>([])
  const [srsStat, setSrsStat]               = useState<GrammarSrsStat | null>(null)
  const [sessionQueue, setSessionQueue]     = useState<number[]>([])
  const [currentPos, setCurrentPos]         = useState(0)
  const [userInput, setUserInput]           = useState('')
  const [isCorrect, setIsCorrect]           = useState(false)
  const [showReading, setShowReading]       = useState(false)
  const [sessionResults, setSessionResults] = useState<boolean[]>([])
  const [genError, setGenError]             = useState('')
  const [newSrsStat, setNewSrsStat]         = useState<GrammarSrsStat | null>(null)

  const inputRef    = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    load()
  }, [grammar.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setPhase('loading')
    try {
      const [storedSentences, stat] = await Promise.all([
        fetchGrammarSentences(grammar.id),
        fetchGrammarSrsStat(grammar.id),
      ])
      setSentences(storedSentences)
      setSrsStat(stat)
    } catch {
      // table might not exist yet — stay in 'ready' with empty pool
    }
    setPhase('ready')
  }

  // ── Sentence generation ───────────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!sessionToken) { setGenError(t(lang, 'gp_need_login')); return }

    setPhase('generating')
    setGenError('')

    const targetLang =
      lang === 'ca' ? 'catalán' :
      lang === 'en' ? 'inglés'  :
      'español'

    const vocabSample = activeVocab
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)
      .map(w => `${w.jp}(${w.reading}): ${getMeaning(w, lang)}`)
      .join(', ')

    const prompt = `Eres un profesor de japonés experto. Genera exactamente ${TARGET_POOL} frases de práctica para el patrón gramatical "${grammar.pattern}" (${grammar.name_es}).

Formato: el alumno ve la frase con UN HUECO y debe completarlo con la gramática estudiada.

Vocabulario disponible (intenta usarlo): ${vocabSample || 'vocabulario básico N5'}

Responde ÚNICAMENTE con este JSON (sin backticks ni texto extra):
{
  "sentences": [
    {
      "before_jp": "texto antes del hueco (usa kanji donde corresponda)",
      "before_reading": "lectura del before solo en kana/ASCII",
      "answer": "la gramática exacta que va en el hueco",
      "answer_alts": ["variante1"],
      "after_jp": "texto después del hueco",
      "after_reading": "lectura del after en kana/ASCII",
      "translation_es": "traducción en español",
      "translation_ca": "traducció en català",
      "translation_en": "English translation"
    }
  ]
}

Reglas:
- El "answer" debe ser EXACTAMENTE el patrón "${grammar.pattern}" o la parte clave del mismo
- Frases naturales y correctas en japonés, nivel ${grammar.jlpt}
- Varía los sujetos, contextos y vocabulario; usa el vocabulario disponible cuando sea posible
- before_reading y after_reading son solo kana (sin kanji) para mostrar furigana
- answer_alts: incluye variantes válidas (tiempo pasado, forma informal, etc.) o deja el array vacío
- Genera exactamente ${TARGET_POOL} frases distintas`

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ prompt, userApiKey: geminiKey }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Error ${res.status}`)
      }
      const data  = await res.json()
      const clean = data.text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      if (!parsed.sentences?.length) throw new Error(t(lang, 'gp_no_sentences'))

      const newSentences: GrammarSentence[] = (parsed.sentences as any[]).slice(0, TARGET_POOL).map(s => ({
        grammar_id:               grammar.id,
        sentence_before:          String(s.before_jp          ?? ''),
        sentence_before_reading:  String(s.before_reading     ?? ''),
        sentence_after:           String(s.after_jp           ?? ''),
        sentence_after_reading:   String(s.after_reading      ?? ''),
        answer:                   String(s.answer             ?? grammar.pattern),
        answer_alts:              Array.isArray(s.answer_alts) ? (s.answer_alts as unknown[]).map(String) : [],
        translation_es:           String(s.translation_es     ?? ''),
        translation_ca:           String(s.translation_ca     ?? ''),
        translation_en:           String(s.translation_en     ?? ''),
      }))

      await saveGrammarSentences(grammar.id, newSentences)
      setSentences(prev => [...prev, ...newSentences])
      setPhase('ready')
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : t(lang, 'gp_gen_error'))
      setPhase('ready')
    }
  }, [grammar, lang, geminiKey, sessionToken, activeVocab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session start ─────────────────────────────────────────────────────────
  function startSession() {
    if (sentences.length === 0) return
    const count   = Math.min(SESSION_SIZE, sentences.length)
    const indices = Array.from({ length: sentences.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
    setSessionQueue(indices)
    setCurrentPos(0)
    setSessionResults([])
    setUserInput('')
    setNewSrsStat(null)
    setPhase('asking')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Input handling ────────────────────────────────────────────────────────
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (!isComposing.current) {
      setUserInput(toHiragana(raw, { IMEMode: true }))
    } else {
      setUserInput(raw)
    }
  }

  function submitAnswer() {
    if (!userInput.trim() || phase !== 'asking') return
    const sentence = sentences[sessionQueue[currentPos]]
    if (!sentence) return
    const correct = checkAnswer(userInput, sentence.answer, sentence.answer_alts)
    setIsCorrect(correct)
    setSessionResults(prev => [...prev, correct])
    setPhase('answered')
  }

  // ── Next question / complete ───────────────────────────────────────────────
  async function nextQuestion() {
    const isLast = currentPos + 1 >= sessionQueue.length

    if (isLast) {
      // Calculate SRS update based on full session results
      // (sessionResults already has the last answer at this point)
      const allResults     = sessionResults
      const correctCount   = allResults.filter(Boolean).length
      const sessionPassed  = correctCount >= Math.ceil(allResults.length * 0.6)
      const currentLevel   = srsStat?.level ?? 0
      const { newLevel, nextReview } = applyGrammarResult(currentLevel, sessionPassed)
      const updated: GrammarSrsStat = { grammar_id: grammar.id, level: newLevel, next_review: nextReview }
      setNewSrsStat(updated)
      setSrsStat(updated)
      try { await saveGrammarSrsResult(grammar.id, newLevel, nextReview) } catch { /* offline */ }
      setPhase('complete')
    } else {
      setCurrentPos(p => p + 1)
      setUserInput('')
      setPhase('asking')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const currentSentence = (phase === 'asking' || phase === 'answered')
    ? sentences[sessionQueue[currentPos]]
    : null

  const getTranslation = (s: GrammarSentence) =>
    lang === 'ca' ? (s.translation_ca || s.translation_es) :
    lang === 'en' ? (s.translation_en || s.translation_es) :
    s.translation_es

  const isDue = (srsStat?.next_review ?? 0) <= Date.now()

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (phase === 'loading') return <SpinnerScreen msg={t(lang, 'gp_loading')} />

  // ── Render: Generating ────────────────────────────────────────────────────
  if (phase === 'generating') return <SpinnerScreen msg={t(lang, 'gp_generating')} />

  // ── Render: Session Complete ──────────────────────────────────────────────
  if (phase === 'complete') {
    const allResults   = sessionResults
    const correct      = allResults.filter(Boolean).length
    const sessionPassed = correct >= Math.ceil(allResults.length * 0.6)
    const oldLevel     = sessionPassed ? (newSrsStat?.level ?? 1) - 1 : (newSrsStat?.level ?? 0) + 1
    const finalLevel   = newSrsStat?.level ?? 0
    const nr           = newSrsStat?.next_review ?? 0

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-slate-800">{t(lang, 'gp_complete_title')}</h2>
        </div>

        {/* Score card */}
        <div className={`rounded-2xl p-6 text-center space-y-4 ${
          sessionPassed
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <p className="text-4xl">{sessionPassed ? '🎉' : '📚'}</p>
          <div>
            <p className="text-3xl font-bold text-slate-800">{correct} / {allResults.length}</p>
            <p className="text-sm text-slate-500 mt-0.5">{t(lang, 'gp_correct_answers')}</p>
          </div>

          {/* Result dots */}
          <div className="flex items-center justify-center gap-1.5">
            {allResults.map((r, i) => (
              <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                r ? 'bg-emerald-400 text-white' : 'bg-rose-400 text-white'
              }`}>
                {r ? '✓' : '✗'}
              </div>
            ))}
          </div>

          {/* SRS level change */}
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t(lang, 'gp_srs_level')}
            </p>
            <LevelDots level={finalLevel} />
            <p className={`text-sm font-bold ${sessionPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
              {getSrsLevelLabel(finalLevel, lang)}
              {sessionPassed
                ? ` ↑ (+1 ${t(lang, 'gp_level')})`
                : oldLevel > 0 ? ` ↓ (-1 ${t(lang, 'gp_level')})` : ''}
            </p>
            {nr > 0 && (
              <p className="text-xs text-slate-400">
                {t(lang, 'gp_next_review')}: {formatNextReview(nr, lang)}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={startSession}
            className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition"
          >
            🔄 {t(lang, 'gp_again')}
          </button>
          <button
            onClick={onBack}
            className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
          >
            ← {t(lang, 'gp_back')}
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Ready (no sentences yet) ─────────────────────────────────────
  if (phase === 'ready' && sentences.length < MIN_POOL) {
    return (
      <div className="space-y-5">
        <BackHeader onBack={onBack} label={`🏋️ ${t(lang, 'gp_practice')}: ${grammar.pattern}`} />

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-4xl">📝</p>
          <p className="text-base font-semibold text-slate-700">{t(lang, 'gp_no_sentences')}</p>
          <p className="text-sm text-slate-500">{t(lang, 'gp_generate_hint')}</p>
          {!sessionToken && (
            <p className="text-xs text-amber-600 font-medium">
              💡 {t(lang, 'gp_need_login')}
            </p>
          )}
          {genError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {genError}
            </div>
          )}
        </div>

        <button
          onClick={generate}
          disabled={!sessionToken}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl transition shadow-sm"
        >
          ✨ {t(lang, 'gp_generate_btn').replace('{n}', String(TARGET_POOL))}
        </button>

        <button onClick={onBack} className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm transition">
          ← {t(lang, 'gp_back_detail')}
        </button>
      </div>
    )
  }

  // ── Render: Ready (has sentences) ─────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="space-y-5">
        <BackHeader onBack={onBack} label={`🏋️ ${t(lang, 'gp_practice')}`} sublabel={grammar.pattern} />

        {/* SRS status card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">{t(lang, 'gp_srs_status')}</span>
            {srsStat ? (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isDue
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isDue ? `⏰ ${t(lang, 'gp_due')}` : `✓ ${t(lang, 'gp_up_to_date')}`}
              </span>
            ) : (
              <span className="text-xs text-slate-400">{t(lang, 'gp_not_studied')}</span>
            )}
          </div>
          <LevelDots level={srsStat?.level ?? 0} />
          <p className="text-xs text-slate-500">
            {getSrsLevelLabel(srsStat?.level ?? 0, lang)}
            {srsStat && !isDue && (
              <span className="ml-2 text-slate-400">
                · {t(lang, 'gp_next_review')}: {formatNextReview(srsStat.next_review, lang)}
              </span>
            )}
          </p>
        </div>

        {/* Pool info */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <span className="text-xs text-slate-500">
            📦 {t(lang, 'gp_pool_count').replace('{n}', String(sentences.length))}
          </span>
          {sessionToken && (
            <button
              onClick={generate}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              + {t(lang, 'gp_gen_more')}
            </button>
          )}
        </div>

        {genError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {genError}
          </div>
        )}

        {/* Start button */}
        <button
          onClick={startSession}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl transition shadow-md"
        >
          🏋️ {t(lang, 'gp_start_session').replace('{n}', String(Math.min(SESSION_SIZE, sentences.length)))}
        </button>

        <button onClick={onBack} className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm transition">
          ← {t(lang, 'gp_back_detail')}
        </button>
      </div>
    )
  }

  // ── Render: Asking / Answered ─────────────────────────────────────────────
  if (!currentSentence) return null

  const displayBefore = showReading ? currentSentence.sentence_before_reading : currentSentence.sentence_before
  const displayAfter  = showReading ? currentSentence.sentence_after_reading  : currentSentence.sentence_after
  const translation   = getTranslation(currentSentence)
  const progress      = ((currentPos + (phase === 'answered' ? 1 : 0)) / sessionQueue.length) * 100

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-700 truncate">{grammar.pattern}</span>
        </div>
        <span className="shrink-0 text-sm font-bold text-indigo-600 ml-2">
          {currentPos + 1} / {sessionQueue.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Sentence card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {t(lang, 'gp_fill_blank')}
          </span>
          <button
            onClick={() => setShowReading(v => !v)}
            className={`text-xs px-2.5 py-0.5 rounded-full border transition ${
              showReading
                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                : 'border-slate-300 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {showReading ? '🈶 かな' : '漢字'}
          </button>
        </div>

        {/* Sentence body */}
        <div className="px-5 pt-5 pb-4 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 leading-relaxed select-none">
            {displayBefore && <span>{displayBefore}</span>}

            {phase === 'answered' ? (
              <span className={`mx-1 px-2.5 py-1 rounded-xl ${
                isCorrect
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-rose-100 text-rose-700 border border-rose-300'
              }`}>
                {currentSentence.answer}
              </span>
            ) : (
              <span className="mx-1 inline-flex items-center px-3 py-1 rounded-xl bg-indigo-50 border-2 border-dashed border-indigo-300 text-indigo-200 select-none">
                ＿＿＿
              </span>
            )}

            {displayAfter && <span>{displayAfter}</span>}
          </div>

          {/* Translation — always visible so the user knows what to complete */}
          {translation && (
            <p className={`mt-3 text-sm italic ${
              phase === 'answered' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {translation}
            </p>
          )}
        </div>
      </div>

      {/* Input area (asking phase) */}
      {phase === 'asking' && (
        <div className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInput}
              onCompositionStart={() => { isComposing.current = true }}
              onCompositionEnd={e => {
                isComposing.current = false
                setUserInput(toHiragana((e.target as HTMLInputElement).value, { IMEMode: true }))
              }}
              onKeyDown={e => e.key === 'Enter' && submitAnswer()}
              placeholder={t(lang, 'gp_input_ph')}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              className="w-full px-4 py-3.5 text-center text-xl font-bold border-2 border-slate-200 focus:border-indigo-400 rounded-xl focus:outline-none transition tracking-widest"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 select-none pointer-events-none">
              ローマ字OK
            </span>
          </div>
          <button
            onClick={submitAnswer}
            disabled={!userInput.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl transition shadow-sm"
          >
            {t(lang, 'gp_check')}
          </button>
        </div>
      )}

      {/* Feedback banner (answered phase) */}
      {phase === 'answered' && (
        <>
          <div className={`rounded-xl p-4 flex items-start gap-3 ${
            isCorrect
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-rose-50 border border-rose-200'
          }`}>
            <span className="text-xl shrink-0">{isCorrect ? '✅' : '❌'}</span>
            <div className="min-w-0">
              <p className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isCorrect ? t(lang, 'gp_correct') : t(lang, 'gp_wrong')}
              </p>
              {!isCorrect && (
                <p className="text-sm text-rose-600 mt-0.5">
                  {t(lang, 'gp_answer_was')}:{' '}
                  <span className="font-bold">{currentSentence.answer}</span>
                  {currentSentence.answer_alts.length > 0 && (
                    <span className="text-rose-400 font-normal">
                      {' '}({t(lang, 'gp_also_valid')}: {currentSentence.answer_alts.join(', ')})
                    </span>
                  )}
                </p>
              )}
              {isCorrect && userInput.trim() !== currentSentence.answer && (
                <p className="text-xs text-emerald-500 mt-0.5">
                  ({t(lang, 'gp_canonical')}: {currentSentence.answer})
                </p>
              )}
            </div>
          </div>

          <button
            onClick={nextQuestion}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm"
          >
            {currentPos + 1 >= sessionQueue.length
              ? `🏁 ${t(lang, 'gp_see_results')}`
              : `${t(lang, 'gp_next')} →`}
          </button>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Back header helper
// ─────────────────────────────────────────────────────────────────────────────
function BackHeader({ onBack, label, sublabel }: { onBack: () => void; label: string; sublabel?: string }) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={onBack}
        className="mt-0.5 p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition shrink-0"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-800 leading-tight">{label}</h2>
        {sublabel && <p className="text-sm text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  )
}
