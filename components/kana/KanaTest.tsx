'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { KanaChar, KanaGroup, KanaScript, KanaWord } from '@/lib/kana-data'
import {
  getAllKana, getKanaByGroup, getWords,
  BASIC_GROUPS, DAKUTEN_GROUPS, GROUP_LABELS, isCorrectRomaji,
} from '@/lib/kana-data'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type TestType = 'kana-to-romaji' | 'romaji-to-kana' | 'free-input' | 'word-recognition'

interface KanaQuestion {
  type: 'kana-to-romaji' | 'romaji-to-kana' | 'free-input'
  kana: KanaChar
  options: string[]        // for multiple choice
  correct: string          // for free-input & answer check
}

interface WordQuestion {
  type: 'word-recognition'
  word: KanaWord
  options: string[]        // 4 meanings
  correct: string          // correct meaning
}

type Question = KanaQuestion | WordQuestion

type QuizState =
  | { phase: 'unanswered' }
  | { phase: 'answered'; selected: string; isCorrect: boolean }

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

function pickRandom<T>(arr: T[], n: number, exclude: T[] = []): T[] {
  const pool = arr.filter(x => !exclude.includes(x))
  return shuffle(pool).slice(0, n)
}

function buildMultipleChoiceOptions(correct: string, pool: string[]): string[] {
  const distractors = pickRandom(pool.filter(x => x !== correct), 3)
  return shuffle([correct, ...distractors])
}

function buildKanaQuestion(
  kana: KanaChar,
  allRomaji: string[],
  allKana: string[],
  type: 'kana-to-romaji' | 'romaji-to-kana' | 'free-input',
): KanaQuestion {
  if (type === 'kana-to-romaji') {
    const options = buildMultipleChoiceOptions(kana.romaji, allRomaji)
    return { type, kana, options, correct: kana.romaji }
  }
  if (type === 'romaji-to-kana') {
    const options = buildMultipleChoiceOptions(kana.kana, allKana)
    return { type, kana, options, correct: kana.kana }
  }
  // free-input
  return { type, kana, options: [], correct: kana.romaji }
}

function buildWordQuestion(
  word: KanaWord,
  allMeanings: string[],
): WordQuestion {
  const options = buildMultipleChoiceOptions(word.meaning, allMeanings)
  return { type: 'word-recognition', word, options, correct: word.meaning }
}

function generateQuestions(
  script: KanaScript,
  groups: KanaGroup[],
  testType: TestType,
  count: number,
): Question[] {
  const allChars = getAllKana(script)
  const allRomaji  = [...new Set(allChars.map(k => k.romaji))]
  const allKana    = allChars.map(k => k.kana)

  if (testType === 'word-recognition') {
    const words = getWords(script)
    const allMeanings = words.map(w => w.meaning)
    const pool = shuffle(words).slice(0, count)
    return pool.map(w => buildWordQuestion(w, allMeanings))
  }

  const selectedChars = getKanaByGroup(script, groups)
  // Deduplicate by kana (dakuten may have overlapping romaji)
  const unique = shuffle(selectedChars)
  const pool = unique.slice(0, count)

  return pool.map(kana => buildKanaQuestion(kana, allRomaji, allKana, testType as 'kana-to-romaji' | 'romaji-to-kana' | 'free-input'))
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Selector
// ─────────────────────────────────────────────────────────────────────────────
function GroupSelector({
  groups,
  selected,
  onChange,
}: {
  groups: KanaGroup[]
  selected: Set<KanaGroup>
  onChange: (g: KanaGroup) => void
}) {
  const isAll = groups.every(g => selected.has(g))
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => groups.forEach(g => { if (!selected.has(g)) onChange(g) })}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          isAll
            ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400'
        }`}
      >
        Todos
      </button>
      {groups.map(g => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
            selected.has(g)
              ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400'
          }`}
        >
          {GROUP_LABELS[g]}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Question card — multiple choice
// ─────────────────────────────────────────────────────────────────────────────
function MultipleChoiceCard({
  question,
  state,
  onAnswer,
}: {
  question: KanaQuestion | WordQuestion
  state: QuizState
  onAnswer: (opt: string) => void
}) {
  const isWord = question.type === 'word-recognition'
  const prompt = isWord
    ? (question as WordQuestion).word.word
    : question.type === 'kana-to-romaji'
      ? (question as KanaQuestion).kana.kana
      : (question as KanaQuestion).kana.romaji
  const promptLabel = isWord
    ? '¿Qué significa esta palabra?'
    : question.type === 'kana-to-romaji'
      ? '¿Cómo se lee este kana?'
      : '¿Cuál es este kana?'

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div className="text-center py-6 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-800/30">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{promptLabel}</p>
        <div className={`kanji-font font-bold text-slate-800 dark:text-slate-100 select-none ${
          isWord ? 'text-4xl' : question.type === 'kana-to-romaji' ? 'text-7xl' : 'text-3xl font-mono tracking-widest'
        }`}>
          {prompt}
        </div>
        {/* Extra info for word mode */}
        {isWord && (
          <p className="text-xs text-violet-400 mt-2 font-mono">
            {(question as WordQuestion).word.reading}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {question.options.map(opt => {
          const answered = state.phase === 'answered'
          const isCorrect = opt === question.correct
          const isSelected = answered && state.phase === 'answered' && (state as any).selected === opt
          let cls = 'px-4 py-3 rounded-xl text-sm font-medium border transition-all text-center cursor-pointer '
          if (!answered) {
            cls += 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300'
          } else if (isCorrect) {
            cls += 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 dark:text-emerald-300'
          } else if (isSelected) {
            cls += 'bg-rose-50 dark:bg-rose-900/20 border-rose-400 text-rose-600 dark:text-rose-400 line-through opacity-70'
          } else {
            cls += 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60'
          }
          return (
            <button key={opt} className={cls + (question.type === 'kana-to-romaji' || question.type === 'romaji-to-kana' ? ' kanji-font text-2xl' : '')}
              onClick={() => !answered && onAnswer(opt)}>
              {opt}
              {answered && isCorrect && ' ✓'}
              {answered && isSelected && !isCorrect && ' ✗'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Question card — free input
// ─────────────────────────────────────────────────────────────────────────────
function FreeInputCard({
  question,
  state,
  onAnswer,
}: {
  question: KanaQuestion
  state: QuizState
  onAnswer: (val: string) => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue('')
    inputRef.current?.focus()
  }, [question.kana.kana])

  const handleSubmit = () => {
    if (!value.trim() || state.phase !== 'unanswered') return
    onAnswer(value.trim())
  }

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div className="text-center py-6 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-800/30">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Escribe la lectura en romaji</p>
        <div className="kanji-font text-7xl font-bold text-slate-800 dark:text-slate-100 select-none">
          {question.kana.kana}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { if (state.phase === 'unanswered') setValue(e.target.value) }}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="Escribe en romaji (p.ej. ka, shi, tsu...)"
          className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
            bg-white dark:bg-slate-800 dark:text-slate-100 placeholder-slate-400
            ${state.phase === 'unanswered'
              ? 'border-slate-200 dark:border-slate-700 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30'
              : state.phase === 'answered' && (state as any).isCorrect
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
            }`}
          disabled={state.phase === 'answered'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

        {state.phase === 'answered' && !(state as any).isCorrect && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span>✓</span>
            La respuesta correcta era: <strong className="kanji-font">{question.correct}</strong>
          </p>
        )}

        {state.phase === 'unanswered' && (
          <button
            onClick={handleSubmit}
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
  onFinish,
}: {
  questions: Question[]
  onFinish: (correct: number, total: number) => void
}) {
  const [idx, setIdx] = useState(0)
  const [quizState, setQuizState] = useState<QuizState>({ phase: 'unanswered' })
  const [score, setScore] = useState(0)

  const question = questions[idx]
  const isLast = idx === questions.length - 1

  const handleAnswer = useCallback((answer: string) => {
    const isCorrect =
      question.type === 'free-input'
        ? isCorrectRomaji(answer, question.correct)
        : answer === question.correct
    if (isCorrect) setScore(s => s + 1)
    setQuizState({ phase: 'answered', selected: answer, isCorrect })
  }, [question])

  const handleNext = () => {
    if (isLast) {
      const finalScore = quizState.phase === 'answered' && (quizState as any).isCorrect
        ? score  // already incremented
        : score
      onFinish(finalScore, questions.length)
    } else {
      setIdx(i => i + 1)
      setQuizState({ phase: 'unanswered' })
    }
  }

  const isMulti = question.type !== 'free-input'
  const answered = quizState.phase === 'answered'
  const correct  = answered && (quizState as any).isCorrect

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-violet-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${((idx) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 tabular-nums shrink-0">
          {idx + 1} / {questions.length}
        </span>
      </div>

      {/* Score */}
      <div className="flex justify-end">
        <span className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium border border-emerald-200 dark:border-emerald-800/30">
          ✓ {score} correctas
        </span>
      </div>

      {/* Question */}
      {isMulti
        ? <MultipleChoiceCard
            question={question as KanaQuestion | WordQuestion}
            state={quizState}
            onAnswer={handleAnswer}
          />
        : <FreeInputCard
            question={question as KanaQuestion}
            state={quizState}
            onAnswer={handleAnswer}
          />
      }

      {/* Feedback + Next */}
      {answered && (
        <div className="space-y-3">
          <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            correct
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800/40 text-rose-700 dark:text-rose-400'
          }`}>
            {correct ? '¡Excelente! 🎉 Respuesta correcta.' : '😢 Incorrecto. ¡Sigue practicando!'}
          </div>

          {/* Mnemonic hint on wrong answers */}
          {!correct && question.type !== 'word-recognition' && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3 text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold">💡 Nemotécnica: </span>
              {(question as KanaQuestion).kana.mnemonic}
            </div>
          )}

          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
          >
            {isLast ? 'Ver resultados 🏁' : 'Siguiente ➡️'}
          </button>
        </div>
      )}

      {/* Auto-advance on correct multiple choice */}
      {answered && correct && isMulti && (
        <p className="text-center text-xs text-slate-400">
          Pulsa Siguiente o espera...
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Results screen
// ─────────────────────────────────────────────────────────────────────────────
function ResultsScreen({
  correct,
  total,
  onRetry,
  onBack,
}: {
  correct: number
  total: number
  onRetry: () => void
  onBack: () => void
}) {
  const pct = Math.round((correct / total) * 100)
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '💪' : '📚'
  const msg   = pct >= 90 ? '¡Excelente dominio!' : pct >= 70 ? '¡Muy bien!' : pct >= 50 ? 'Buen trabajo, sigue así' : 'Sigue practicando'

  return (
    <div className="max-w-sm mx-auto text-center space-y-6 py-8">
      <div className="text-6xl">{emoji}</div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{msg}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sesión completada</p>
      </div>

      {/* Score ring */}
      <div className="relative mx-auto w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="#e9d5ff" strokeWidth="2.5" />
          <circle
            cx="16" cy="16" r="14" fill="none"
            stroke={pct >= 70 ? '#10b981' : pct >= 50 ? '#8b5cf6' : '#f59e0b'}
            strokeWidth="2.5"
            strokeDasharray={`${pct * 87.96 / 100} 87.96`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pct}%</span>
          <span className="text-xs text-slate-400">{correct}/{total}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onRetry}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
        >
          🔁 Repetir test
        </button>
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-slate-700 text-violet-700 dark:text-violet-300 text-sm font-medium transition-all border border-violet-200 dark:border-slate-700"
        >
          ← Volver a la configuración
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST TYPE CARDS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_TYPES: Array<{ type: TestType; icon: string; title: string; desc: string }> = [
  { type: 'kana-to-romaji', icon: 'あ→a', title: 'Kana → Romaji', desc: 'Ve el kana y elige la lectura correcta entre 4 opciones' },
  { type: 'romaji-to-kana', icon: 'a→あ', title: 'Romaji → Kana', desc: 'Ve el romaji y elige el kana correcto entre 4 opciones' },
  { type: 'free-input',     icon: '✏️',  title: 'Escritura libre', desc: 'Ve el kana y escribe tú mismo el romaji en un campo de texto' },
  { type: 'word-recognition', icon: '📖', title: 'Palabras', desc: 'Lee palabras completas en kana y elige su significado' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main KanaTest component
// ─────────────────────────────────────────────────────────────────────────────
export default function KanaTest({ script }: { script: KanaScript }) {
  const [selectedGroups, setSelectedGroups] = useState<Set<KanaGroup>>(
    new Set(BASIC_GROUPS)
  )
  const [testType, setTestType]     = useState<TestType>('kana-to-romaji')
  const [questionCount, setCount]   = useState(20)
  const [phase, setPhase]           = useState<'config' | 'quiz' | 'results'>('config')
  const [questions, setQuestions]   = useState<Question[]>([])
  const [finalScore, setFinalScore] = useState({ correct: 0, total: 0 })

  const toggleGroup = (g: KanaGroup) => {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  const startQuiz = () => {
    const effectiveGroups = testType === 'word-recognition'
      ? BASIC_GROUPS  // words don't use group filter
      : Array.from(selectedGroups)
    if (effectiveGroups.length === 0) return
    const qs = generateQuestions(script, effectiveGroups, testType, questionCount)
    if (qs.length === 0) return
    setQuestions(qs)
    setPhase('quiz')
  }

  const handleFinish = (correct: number, total: number) => {
    setFinalScore({ correct, total })
    setPhase('results')
  }

  const handleRetry = () => {
    startQuiz()
  }

  const handleBack = () => {
    setPhase('config')
  }

  // ── Config ────────────────────────────────────────────────────────────────
  if (phase === 'config') {
    return (
      <div className="space-y-6 max-w-2xl">
        {/* Test type */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Tipo de test
          </h3>
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
                <span className="text-xl w-8 text-center shrink-0 kanji-font">{icon}</span>
                <div>
                  <div className={`text-sm font-semibold ${testType === type ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Group selector (not shown for word recognition) */}
        {testType !== 'word-recognition' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Grupos a practicar
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Silabario básico</p>
                <GroupSelector groups={BASIC_GROUPS}   selected={selectedGroups} onChange={toggleGroup} />
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Dakuten / voiced</p>
                <GroupSelector groups={DAKUTEN_GROUPS} selected={selectedGroups} onChange={toggleGroup} />
              </div>
            </div>
          </div>
        )}

        {/* Number of questions */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Número de preguntas
          </h3>
          <div className="flex gap-2">
            {[10, 20, 30, 46].map(n => (
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

        {/* Start button */}
        <button
          onClick={startQuiz}
          disabled={testType !== 'word-recognition' && selectedGroups.size === 0}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
          onClick={handleBack}
          className="text-xs text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-4 flex items-center gap-1"
        >
          ← Salir del test
        </button>
        <QuizSession
          questions={questions}
          onFinish={handleFinish}
        />
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  return (
    <ResultsScreen
      correct={finalScore.correct}
      total={finalScore.total}
      onRetry={handleRetry}
      onBack={handleBack}
    />
  )
}
