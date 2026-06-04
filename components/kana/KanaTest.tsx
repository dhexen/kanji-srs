'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { toHiragana, toKatakana, toRomaji } from 'wanakana'
import type { KanaScript, KanaTestItem } from '@/lib/kana-data'
import { getSyllableItems, getWordItems, normalizeRomaji } from '@/lib/kana-data'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type TestType = 'kana-to-romaji' | 'romaji-to-kana'
type ContentMix = 'mixed' | 'syllables' | 'words'

interface Question {
  item: KanaTestItem
}

type QuizState =
  | { phase: 'unanswered' }
  | { phase: 'answered'; given: string; isCorrect: boolean }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateQuestions(
  script: KanaScript,
  mix: ContentMix,
  count: number,
): Question[] {
  const syllables = getSyllableItems(script)
  const words = getWordItems(script)

  let pool: KanaTestItem[]
  if (mix === 'syllables') {
    pool = shuffle(syllables)
  } else if (mix === 'words') {
    pool = shuffle(words)
  } else {
    // Mixed: roughly 40% syllables, 60% words, interleaved
    const nSyll = Math.round(count * 0.4)
    const nWord = count - nSyll
    pool = shuffle([
      ...shuffle(syllables).slice(0, nSyll),
      ...shuffle(words).slice(0, nWord),
    ])
  }

  return pool.slice(0, count).map(item => ({ item }))
}

// Compare two Japanese kana strings at the romaji level (tolerant to ー, etc.)
function kanaMatches(userKana: string, targetKana: string): boolean {
  return normalizeRomaji(toRomaji(userKana)) === normalizeRomaji(toRomaji(targetKana))
}

// Compare a romaji answer against the target reading
function romajiMatches(input: string, targetRomaji: string): boolean {
  return normalizeRomaji(input) === normalizeRomaji(targetRomaji)
}

// ─────────────────────────────────────────────────────────────────────────────
// Question card
// ─────────────────────────────────────────────────────────────────────────────
function QuestionCard({
  question,
  testType,
  script,
  state,
  onAnswer,
}: {
  question: Question
  testType: TestType
  script: KanaScript
  state: QuizState
  onAnswer: (given: string) => void
}) {
  const [value, setValue] = useState('')
  const [liveKana, setLiveKana] = useState('')   // live preview for romaji→kana
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  const { item } = question
  const isKanaToRomaji = testType === 'kana-to-romaji'

  useEffect(() => {
    setValue('')
    setLiveKana('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [item.kana, testType])

  const handleChange = (raw: string) => {
    if (state.phase !== 'unanswered') return
    setValue(raw)
    if (!isKanaToRomaji && !isComposing.current) {
      // Convert romaji → kana in the chosen script
      setLiveKana(script === 'hiragana' ? toHiragana(raw) : toKatakana(raw))
    }
  }

  const submit = () => {
    if (state.phase !== 'unanswered') return
    if (isKanaToRomaji) {
      if (!value.trim()) return
      onAnswer(value.trim())
    } else {
      const produced = script === 'hiragana' ? toHiragana(value) : toKatakana(value)
      if (!produced.trim()) return
      onAnswer(produced)
    }
  }

  const answered = state.phase === 'answered'
  const correct = answered && state.isCorrect

  // What to show as prompt
  const promptLabel = isKanaToRomaji
    ? 'Escribe la lectura en romaji'
    : 'Escribe en romaji para formar el kana'
  const promptText = isKanaToRomaji ? item.kana : item.romaji

  const kindBadge = item.kind === 'syllable'
    ? { label: 'Sílaba', color: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' }
    : { label: 'Palabra', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' }

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div className="text-center py-6 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-800/30 relative">
        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${kindBadge.color}`}>
          {kindBadge.label}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{promptLabel}</p>
        <div className={`font-bold text-slate-800 dark:text-slate-100 select-none ${
          isKanaToRomaji
            ? 'kanji-font ' + (promptText.length > 3 ? 'text-5xl' : 'text-7xl')
            : 'text-4xl font-mono tracking-widest lowercase'
        }`}>
          {promptText}
        </div>
      </div>

      {/* Live kana preview (romaji→kana only) */}
      {!isKanaToRomaji && (
        <div className="text-center min-h-[3rem] flex items-center justify-center">
          {liveKana ? (
            <span className={`kanji-font text-4xl select-none ${
              answered ? (correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400') : 'text-violet-700 dark:text-violet-300'
            }`}>
              {liveKana}
            </span>
          ) : (
            <span className="text-sm text-slate-300 dark:text-slate-600">tu kana aparecerá aquí…</span>
          )}
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          onCompositionStart={() => { isComposing.current = true }}
          onCompositionEnd={e => { isComposing.current = false; handleChange((e.target as HTMLInputElement).value) }}
          placeholder={isKanaToRomaji ? 'p.ej. ka, shi, tsukue…' : 'p.ej. tsukue → つくえ'}
          className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
            bg-white dark:bg-slate-800 dark:text-slate-100 placeholder-slate-400
            ${state.phase === 'unanswered'
              ? 'border-slate-200 dark:border-slate-700 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30'
              : correct
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
            }`}
          disabled={answered}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Correct-answer hint on wrong */}
        {answered && !correct && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span>✓</span>
            La respuesta correcta era:{' '}
            <strong className={isKanaToRomaji ? 'font-mono' : 'kanji-font text-base'}>
              {isKanaToRomaji ? item.romaji : item.kana}
            </strong>
          </p>
        )}

        {state.phase === 'unanswered' && (
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Comprobar ✓
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz session
// ─────────────────────────────────────────────────────────────────────────────
function QuizSession({
  questions,
  testType,
  script,
  onFinish,
}: {
  questions: Question[]
  testType: TestType
  script: KanaScript
  onFinish: (correct: number, total: number) => void
}) {
  const [idx, setIdx] = useState(0)
  const [quizState, setQuizState] = useState<QuizState>({ phase: 'unanswered' })
  const [score, setScore] = useState(0)

  const question = questions[idx]
  const isLast = idx === questions.length - 1

  const handleAnswer = useCallback((given: string) => {
    const target = question.item
    const isCorrect = testType === 'kana-to-romaji'
      ? romajiMatches(given, target.romaji)
      : kanaMatches(given, target.kana)
    if (isCorrect) setScore(s => s + 1)
    setQuizState({ phase: 'answered', given, isCorrect })
  }, [question, testType])

  const handleNext = () => {
    if (isLast) {
      onFinish(score, questions.length)
    } else {
      setIdx(i => i + 1)
      setQuizState({ phase: 'unanswered' })
    }
  }

  // Enter to advance once answered
  useEffect(() => {
    if (quizState.phase !== 'answered') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') handleNext() }
    // small delay so the same Enter that submitted doesn't skip feedback
    const t = setTimeout(() => window.addEventListener('keydown', onKey), 300)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [quizState.phase, idx])

  const answered = quizState.phase === 'answered'
  const correct = answered && quizState.isCorrect

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-violet-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs text-slate-400 tabular-nums shrink-0">{idx + 1} / {questions.length}</span>
      </div>

      <div className="flex justify-end">
        <span className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium border border-emerald-200 dark:border-emerald-800/30">
          ✓ {score} correctas
        </span>
      </div>

      <QuestionCard
        question={question}
        testType={testType}
        script={script}
        state={quizState}
        onAnswer={handleAnswer}
      />

      {answered && (
        <div className="space-y-3">
          <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            correct
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800/40 text-rose-700 dark:text-rose-400'
          }`}>
            {correct ? '¡Excelente! 🎉 Respuesta correcta.' : '😢 Incorrecto. ¡Sigue practicando!'}
          </div>
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
          >
            {isLast ? 'Ver resultados 🏁' : 'Siguiente ➡️'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Results screen
// ─────────────────────────────────────────────────────────────────────────────
function ResultsScreen({ correct, total, onRetry, onBack }: {
  correct: number; total: number; onRetry: () => void; onBack: () => void
}) {
  const pct = Math.round((correct / total) * 100)
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '💪' : '📚'
  const msg = pct >= 90 ? '¡Excelente dominio!' : pct >= 70 ? '¡Muy bien!' : pct >= 50 ? 'Buen trabajo, sigue así' : 'Sigue practicando'

  return (
    <div className="max-w-sm mx-auto text-center space-y-6 py-8">
      <div className="text-6xl">{emoji}</div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{msg}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sesión completada</p>
      </div>
      <div className="relative mx-auto w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="#e9d5ff" strokeWidth="2.5" />
          <circle cx="16" cy="16" r="14" fill="none"
            stroke={pct >= 70 ? '#10b981' : pct >= 50 ? '#8b5cf6' : '#f59e0b'}
            strokeWidth="2.5" strokeDasharray={`${pct * 87.96 / 100} 87.96`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pct}%</span>
          <span className="text-xs text-slate-400">{correct}/{total}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button onClick={onRetry} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all">
          🔁 Repetir test
        </button>
        <button onClick={onBack} className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-slate-700 text-violet-700 dark:text-violet-300 text-sm font-medium transition-all border border-violet-200 dark:border-slate-700">
          ← Volver a la configuración
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main KanaTest component
// ─────────────────────────────────────────────────────────────────────────────
const TEST_TYPES: Array<{ type: TestType; icon: string; title: string; desc: string }> = [
  { type: 'kana-to-romaji', icon: 'あ→a', title: 'Kana → Romaji', desc: 'Lee el kana o palabra y escribe su lectura en romaji' },
  { type: 'romaji-to-kana', icon: 'a→あ', title: 'Romaji → Kana', desc: 'Lee el romaji y escríbelo para formar el kana (se convierte solo)' },
]

const CONTENT_MIXES: Array<{ mix: ContentMix; label: string; desc: string }> = [
  { mix: 'mixed',     label: 'Mezcla', desc: 'Sílabas y palabras' },
  { mix: 'syllables', label: 'Solo sílabas', desc: 'Incluye が, ぐ, ぱ…' },
  { mix: 'words',     label: 'Solo palabras', desc: 'つくえ, みず…' },
]

export default function KanaTest({ script }: { script: KanaScript }) {
  const [testType, setTestType] = useState<TestType>('kana-to-romaji')
  const [contentMix, setContentMix] = useState<ContentMix>('mixed')
  const [questionCount, setCount] = useState(20)
  const [phase, setPhase] = useState<'config' | 'quiz' | 'results'>('config')
  const [questions, setQuestions] = useState<Question[]>([])
  const [finalScore, setFinalScore] = useState({ correct: 0, total: 0 })

  const startQuiz = () => {
    const qs = generateQuestions(script, contentMix, questionCount)
    if (qs.length === 0) return
    setQuestions(qs)
    setPhase('quiz')
  }

  const handleFinish = (correct: number, total: number) => {
    setFinalScore({ correct, total })
    setPhase('results')
  }

  // ── Config ────────────────────────────────────────────────────────────────
  if (phase === 'config') {
    return (
      <div className="space-y-6 max-w-2xl">
        {/* Test type */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Tipo de test</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEST_TYPES.map(({ type, icon, title, desc }) => (
              <button
                key={type}
                onClick={() => setTestType(type)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  testType === type
                    ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-slate-600'
                }`}
              >
                <span className="text-xl w-12 text-center shrink-0 kanji-font">{icon}</span>
                <div>
                  <div className={`text-sm font-semibold ${testType === type ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200'}`}>{title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content mix */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Contenido</h3>
          <div className="grid grid-cols-3 gap-2">
            {CONTENT_MIXES.map(({ mix, label, desc }) => (
              <button
                key={mix}
                onClick={() => setContentMix(mix)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  contentMix === mix
                    ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-slate-600'
                }`}
              >
                <div className={`text-sm font-semibold ${contentMix === mix ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200'}`}>{label}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Number of questions */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Número de preguntas</h3>
          <div className="flex gap-2">
            {[10, 20, 30, 50].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  questionCount === n
                    ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startQuiz}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all shadow-sm"
        >
          ▶ Iniciar Test
        </button>
      </div>
    )
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    return (
      <div>
        <button
          onClick={() => setPhase('config')}
          className="text-xs text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-4 flex items-center gap-1"
        >
          ← Salir del test
        </button>
        <QuizSession questions={questions} testType={testType} script={script} onFinish={handleFinish} />
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  return (
    <ResultsScreen
      correct={finalScore.correct}
      total={finalScore.total}
      onRetry={startQuiz}
      onBack={() => setPhase('config')}
    />
  )
}
