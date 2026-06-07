'use client'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { toHiragana } from 'wanakana'
import { useStore } from '@/lib/store'
import { VocabItem, ReviewMode, MODE_CONFIG, getModeLevelAndDue, getMeaningForLang, VocabWordType, SRS_MAX_LEVEL } from '@/lib/srs'
import { t, getStageName } from '@/lib/i18n'
import { submitImageVote, submitVocabReport } from '@/lib/supabase'
import { upgradeVocabImage } from '@/lib/image'
import type { SessionItem } from './ReviewClient'
import { vocabXpForResult } from '@/lib/progression'
import XpToast from '@/components/progression/XpToast'
import KanjiStrokeOrder from './KanjiStrokeOrder'

interface Props {
  sessionItem: SessionItem
  allItems: VocabItem[]
  index: number
  total: number
  isPractice: boolean
  /** How many times this item has been failed in the current session BEFORE this encounter. */
  priorWrongCount: number
  onAnswer: (sessionItem: SessionItem, isCorrect: boolean) => void
  onMaster: (sessionItem: SessionItem) => void
  onQuit: () => void
}

type AnswerState = 'waiting' | 'correct' | 'incorrect'

function normalizeJP(str: string) {
  return str.trim().replace(/\s/g, '').replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

// Extract the kanji (CJK) characters of a word, used to find distractors that
// share a kanji with the target word.
function kanjiChars(s: string): string[] {
  return Array.from(s).filter(c => /[一-龯㐀-䶿々]/.test(c))
}

// Rough phonetic-similarity score between two readings (in kana). Rewards a
// shared prefix (same onset), shared kana anywhere, and equal length — so
// similar-sounding words score higher and make tougher distractors.
function readingSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const na = normalizeJP(a), nb = normalizeJP(b)
  if (na === nb) return 0 // identical reading isn't a useful distractor here
  let prefix = 0
  const min = Math.min(na.length, nb.length)
  for (let i = 0; i < min; i++) { if (na[i] === nb[i]) prefix++; else break }
  const setB = new Set(Array.from(nb))
  let shared = 0
  for (const ch of new Set(Array.from(na))) if (setB.has(ch)) shared++
  return prefix * 2 + shared + (na.length === nb.length ? 1 : 0)
}

function LevelChangeToast({ dir, newLevel, lang }: { dir: 'up' | 'down'; newLevel: number; lang: string }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1400)
    return () => clearTimeout(t)
  }, [])
  if (!visible) return null
  return (
    <div className={[
      'pointer-events-none select-none',
      'absolute top-11 left-3 z-20',
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg',
      'text-sm font-bold animate-xp-float',
      dir === 'up' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white',
    ].join(' ')}>
      <span>{dir === 'up' ? '↑' : '↓'}</span>
      <span>{getStageName(newLevel, lang as Parameters<typeof getStageName>[1])}</span>
    </div>
  )
}

export default function QuestionCard({ sessionItem, allItems, index, total, isPractice, priorWrongCount, onAnswer, onMaster, onQuit }: Props) {
  const { masterVocabItem, addXP, state } = useStore()
  const { item, mode } = sessionItem
  const cfg = MODE_CONFIG[mode]
  const { level } = getModeLevelAndDue(item, mode)
  const lang = state.lang

  const [answerState, setAnswerState] = useState<AnswerState>('waiting')
  const [xpGained, setXpGained] = useState<number | null>(null)
  const [xpToastKey, setXpToastKey] = useState(0)
  const [levelChange, setLevelChange] = useState<{ newLevel: number; dir: 'up' | 'down' } | null>(null)
  const [levelChangeKey, setLevelChangeKey] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [imgError, setImgError] = useState(false)
  const [imgVote, setImgVote] = useState<1 | -1 | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportField, setReportField] = useState<'reading' | 'meaning' | 'kanji' | 'general'>('general')
  const [reportDesc, setReportDesc] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)
  const submittedAtRef = useRef<number>(0)

  const handleImgError = useCallback(() => setImgError(true), [])

  // Reset per-card state when the word changes
  useEffect(() => {
    setImgError(false); setImgVote(null)
    setReportOpen(false); setReportDesc(''); setReportSent(false); setReportField('general')
  }, [item.jp])

  const handleImgVote = useCallback(async (vote: 1 | -1) => {
    setImgVote(vote)
    try { await submitImageVote(item.jp, vote) } catch { /* silencioso */ }
  }, [item.jp])

  const needsJapaneseInput = cfg.inputScript === 'hiragana'

  const pct = (index / total) * 100
  const isMultiChoice = mode === 'multi' || mode === 'meaning'
  const isTypingMode = mode === 'reading'
  const isPaperMode = mode === 'kanji' || mode === 'reverse'

  // Get meaning in current language
  const meaning = getMeaningForLang(item, lang)

  // Whether the word image is visible (to add extra top padding)
  const hasImage = !!(item.image_url && !imgError)

  useEffect(() => {
    if (isTypingMode) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isTypingMode])

  const goNext = useCallback(() => {
    onAnswer(sessionItem, answerState === 'correct')
  }, [onAnswer, sessionItem, answerState])

  // Enter para pasar al siguiente cuando ya hay respuesta.
  // El guard de 400 ms evita que el mismo Enter que comprueba la respuesta
  // salte también el feedback antes de que el usuario lo vea.
  useEffect(() => {
    if (answerState === 'waiting') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && Date.now() - submittedAtRef.current > 400) {
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answerState, goNext])

  // Build challenging multiple-choice options. Instead of random distractors,
  // prefer words that share a kanji with the target, sound similar, or are the
  // same word type — so the choice is a real test, not trivially eliminable.
  // Memoized by word + mode so options don't reshuffle on unrelated re-renders.
  const options = useMemo(() => {
    if (!isMultiChoice) return []
    const field: 'reading' | 'meaning' = mode === 'meaning' ? 'meaning' : 'reading'
    const count = mode === 'meaning' ? 4 : 3
    const correct = field === 'meaning' ? meaning : item[field]
    const optText = (w: VocabItem) => field === 'meaning' ? getMeaningForLang(w, lang) : w[field]

    const targetKanji = new Set(kanjiChars(item.jp))

    // Score every candidate by how confusable it is with the target.
    const score = (w: VocabItem): number => {
      let sharedKanji = 0
      for (const c of new Set(kanjiChars(w.jp))) if (targetKanji.has(c)) sharedKanji++
      const rSim = readingSimilarity(item.reading, w.reading)
      const typeBonus = w.word_type && item.word_type && w.word_type === item.word_type ? 1 : 0
      return sharedKanji * 10 + rSim + typeBonus
    }

    // Dedupe candidate option texts (keep the highest-scoring word per text).
    const byText = new Map<string, { text: string; score: number }>()
    for (const w of allItems) {
      if (w.jp === item.jp) continue
      const text = optText(w)
      if (!text || text === correct) continue
      const s = score(w)
      const existing = byText.get(text)
      if (!existing || s > existing.score) byText.set(text, { text, score: s })
    }

    const candidates = [...byText.values()]
    // Challenging pool: candidates related to the target (shared kanji / similar
    // sound / same type). Shuffle within the pool for variety across sessions.
    const related = candidates.filter(c => c.score > 0).sort((a, b) => b.score - a.score)
    const unrelated = candidates.filter(c => c.score === 0)
    const topRelated = related.slice(0, Math.max(count * 2, 8)).sort(() => Math.random() - 0.5)
    const filler = unrelated.sort(() => Math.random() - 0.5)

    const distractors = [...topRelated, ...filler].slice(0, count - 1).map(c => c.text)
    return [correct, ...distractors].sort(() => Math.random() - 0.5)
  }, [item.jp, mode, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleResult = (isCorrect: boolean) => {
    submittedAtRef.current = Date.now()
    setAnswerState(isCorrect ? 'correct' : 'incorrect')
    // XP feedback is immediate (for UX); SRS application is delegated to ReviewClient via onAnswer
    if (!isPractice) {
      const xp = vocabXpForResult(level, isCorrect)
      addXP({ vocabXp: xp })
      setXpGained(xp)
      setXpToastKey(k => k + 1)
      // Mirror applyResult logic for the visual toast.
      // priorWrongCount = failures before this encounter; +1 if this encounter itself is wrong.
      const totalWrong = isCorrect ? priorWrongCount : priorWrongCount + 1
      const newLevel = level === 0
        ? (isCorrect ? 1 : 0)  // unreviewed word: correct → Apprentice 1, wrong → stays 0
        : totalWrong === 0
          ? Math.min(level + 1, SRS_MAX_LEVEL)
          : Math.max(level - totalWrong, 1)
      if (newLevel !== level) {
        setLevelChange({ newLevel, dir: newLevel > level ? 'up' : 'down' })
        setLevelChangeKey(k => k + 1)
      }
    }
  }

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (needsJapaneseInput && !isComposing.current) {
      setInputValue(toHiragana(raw, { IMEMode: true }))
    } else {
      setInputValue(raw)
    }
  }

  const checkTypingAnswer = () => {
    if (!inputValue.trim()) return
    const isCorrect = normalizeJP(inputValue) === normalizeJP(item.reading) || normalizeJP(inputValue) === normalizeJP(item.jp)
    handleResult(isCorrect)
  }

  const wordTypeColors: Record<VocabWordType, string> = {
    noun: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    verb_transitive: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
    verb_intransitive: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    verb: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
    adj_i: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    adj_na: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
    adverb: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',
    particle: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
    expression: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  }

  const badgeColors: Record<ReviewMode, string> = {
    multi: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    meaning: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    kanji: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    reading: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    reverse: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  }

  const questionPrompt: Record<ReviewMode, string> = {
    multi: t(lang, 'q_multi'), meaning: t(lang, 'q_meaning'),
    kanji: `${t(lang, 'th_meaning')}: "${meaning}" — ${t(lang, 'q_kanji')}`,
    reading: `${t(lang, 'th_meaning')}: "${meaning}" — ${t(lang, 'q_reading')}`,
    reverse: t(lang, 'q_reverse'),
  }

  return (
    <>
      {xpGained !== null && (
        <XpToast key={xpToastKey} xp={xpGained} type="vocab" />
      )}
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {isPractice ? t(lang, 'review_practice') : t(lang, 'review_srs')}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{index + 1} / {total}</span>
          <button onClick={onQuit} className="text-xs text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 font-semibold transition border border-slate-200 dark:border-slate-600 hover:border-rose-200 dark:hover:border-rose-700 px-2.5 py-1 rounded-lg">
            {t(lang, 'review_quit')}
          </button>
        </div>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {/* Question area */}
      <div className="text-center bg-slate-50 dark:bg-slate-900 rounded-2xl relative border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Badge — always top-left, overlays image when present */}
        <span className={`absolute top-3 left-3 z-10 px-2.5 py-1 text-xs font-semibold rounded-md shadow-sm ${badgeColors[mode]}`}>
          {t(lang, cfg.label_key)} <span className="opacity-60">{getStageName(level, lang)}</span>
        </span>
        {levelChange !== null && (
          <LevelChangeToast key={levelChangeKey} dir={levelChange.dir} newLevel={levelChange.newLevel} lang={lang} />
        )}

        {/* Image — small, centered, shown whole (not cropped) */}
        {hasImage && (
          <div className="relative w-full flex justify-center bg-slate-50 dark:bg-slate-900/40 pt-4">
            <img
              src={upgradeVocabImage(item.image_url)}
              alt={meaning}
              onError={handleImgError}
              className="h-32 sm:h-40 w-auto max-w-[80%] object-contain rounded-xl"
            />
            <div className="absolute bottom-2 right-2 flex gap-1">
              <button type="button" onClick={() => handleImgVote(1)} title="Buena imagen"
                className={`text-[11px] px-2 py-1 rounded-md shadow transition ${
                  imgVote === 1 ? 'bg-emerald-500 text-white' : 'bg-white/90 dark:bg-slate-700/90 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-600 dark:text-slate-300'
                }`}>👍</button>
              <button type="button" onClick={() => handleImgVote(-1)} title="Imagen incorrecta"
                className={`text-[11px] px-2 py-1 rounded-md shadow transition ${
                  imgVote === -1 ? 'bg-rose-500 text-white' : 'bg-white/90 dark:bg-slate-700/90 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-600 dark:text-slate-300'
                }`}>👎</button>
            </div>
          </div>
        )}

        <div className={`pb-5 px-4 ${hasImage ? 'pt-4' : 'pt-8'}`}>
          {/* Main word display */}
          {mode === 'meaning' && answerState !== 'waiting' ? (
            // After answering meaning mode: show furigana above kanji
            <div className="mb-2">
              <ruby className="kanji-font text-5xl md:text-6xl font-bold text-slate-800 dark:text-slate-100 tracking-wide">
                {item.jp}
                <rt style={{ fontSize: '0.38em' }} className="font-normal tracking-widest text-slate-400 dark:text-slate-500">
                  {item.reading}
                </rt>
              </ruby>
            </div>
          ) : (
            <div className="kanji-font text-5xl md:text-6xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-wide">
              {mode === 'kanji' ? `「${item.reading}」` : mode === 'reverse' ? meaning : item.jp}
            </div>
          )}

          {/* Reading hint — visible in meaning mode only while waiting for answer */}
          {mode === 'meaning' && item.reading && answerState === 'waiting' && (
            <p className="text-slate-400 text-sm font-medium mb-1 tracking-widest">{item.reading}</p>
          )}

          {/* Significado — visible en multi (donde la pregunta es la lectura, no el significado) */}
          {mode === 'multi' && (
            <p className="text-slate-600 dark:text-slate-300 text-base font-medium mb-2">{meaning}</p>
          )}

          <p className="text-slate-500 dark:text-slate-400 text-sm">{questionPrompt[mode]}</p>

          {/* Badges: tipo de palabra, categoría y curso */}
          {(item.word_type || item.category || item.grade) && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {item.word_type && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wordTypeColors[item.word_type]}`}>
                  {t(lang, `wt_${item.word_type}`)}
                </span>
              )}
              {item.category && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
                  {t(lang, `cat_${item.category}`)}
                </span>
              )}
              {item.grade && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  📚 {lang === 'ja' ? `${item.grade}年` : lang === 'en' ? `Grade ${item.grade}` : lang === 'ca' ? `Curs ${item.grade}` : `Curso ${item.grade}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* "Ya me lo sé" — visible in waiting state for all modes */}
      {answerState === 'waiting' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={async () => {
              await masterVocabItem(item.jp, mode)
              onMaster(sessionItem)
            }}
            className="text-xs font-semibold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-lg transition"
          >
            {t(lang, 'review_i_know_it')}
          </button>
        </div>
      )}

      {/* Multi choice */}
      {isMultiChoice && answerState === 'waiting' && (
        <div className={`grid gap-3 ${mode === 'meaning' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
          {options.map(opt => (
            <button key={opt}
              onClick={() => handleResult(opt === (mode === 'meaning' ? meaning : item.reading))}
              className="py-3 px-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-semibold text-sm rounded-xl transition-all text-slate-700 dark:text-slate-200 text-left">
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Typing mode */}
      {isTypingMode && answerState === 'waiting' && (
        <div className="space-y-3">
          <div className="relative">
            <input ref={inputRef} type="text" value={inputValue}
              onChange={handleTypingInput}
              onCompositionStart={() => { isComposing.current = true }}
              onCompositionEnd={() => { isComposing.current = false }}
              onKeyDown={e => e.key === 'Enter' && checkTypingAnswer()}
              placeholder={t(lang, 'write_placeholder')}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              data-lpignore="true" data-1p-ignore="true"
              className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:border-emerald-400 dark:focus:border-emerald-500 rounded-xl text-lg text-center font-medium tracking-wider focus:outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500" />
            {needsJapaneseInput && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md pointer-events-none select-none">
                ローマ字
              </span>
            )}
          </div>
          <button onClick={checkTypingAnswer} disabled={!inputValue.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl transition">
            {t(lang, 'review_check')}
          </button>
        </div>
      )}

      {/* Paper mode */}
      {isPaperMode && answerState === 'waiting' && (
        <div className="space-y-3">
          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition">
              {t(lang, 'review_show_answer')}
            </button>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-5 text-center space-y-3">
              <div>
                <ruby className="kanji-font text-4xl font-bold text-slate-800 dark:text-slate-100">
                  {item.jp}
                  <rt style={{ fontSize: '0.45em' }} className="font-normal tracking-widest text-slate-500 dark:text-slate-400">
                    {item.reading}
                  </rt>
                </ruby>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{meaning}</p>
              <KanjiStrokeOrder kanji={item.jp} />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                ✏️ {t(lang, 'stroke_order_tip')}
              </p>
            </div>
          )}
          {showAnswer && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleResult(false)} className="py-3 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 border-2 border-rose-200 dark:border-rose-700/40 text-rose-700 dark:text-rose-400 font-bold rounded-xl transition">{t(lang, 'incorrect')}</button>
              <button onClick={() => handleResult(true)} className="py-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-2 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl transition">{t(lang, 'correct')}</button>
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {answerState !== 'waiting' && (
        <div className={`p-4 rounded-xl text-center font-bold ${answerState === 'correct' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300'}`}>
          {answerState === 'correct'
            ? (isPaperMode ? t(lang, 'review_paper_correct') : t(lang, 'review_correct'))
            : isPaperMode ? t(lang, 'review_paper_incorrect')
            : `${t(lang, 'review_wrong')} ${mode === 'meaning' ? meaning : item.reading}`}
          {isTypingMode && inputValue && (
            <div className="mt-2 text-sm font-normal opacity-80">
              <span className="opacity-70">{t(lang, 'gp_your_answer')}:</span>{' '}
              <span className="font-semibold tracking-wider">{inputValue}</span>
            </div>
          )}
        </div>
      )}

      {/* Report error */}
      {answerState !== 'waiting' && (
        <div className="text-right">
          {!reportOpen && !reportSent && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            >
              🚩 Reportar error en esta palabra
            </button>
          )}
          {reportSent && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Reporte enviado</span>
          )}
          {reportOpen && !reportSent && (
            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-left space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">¿Qué está mal?</p>
              <div className="flex flex-wrap gap-1.5">
                {([['reading','Lectura'],['meaning','Significado'],['kanji','Kanji'],['general','Otro']] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setReportField(v)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      reportField === v
                        ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
                placeholder="Describe el error (opcional)…"
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={reportSending}
                  onClick={async () => {
                    setReportSending(true)
                    try {
                      await submitVocabReport({ word: item.jp, field: reportField, description: reportDesc })
                      setReportSent(true)
                      setReportOpen(false)
                    } catch { /* ignore */ }
                    finally { setReportSending(false) }
                  }}
                  className="text-xs font-semibold px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {reportSending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {answerState !== 'waiting' && (
        <button onClick={goNext} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md">
          {t(lang, 'review_next')} <span className="opacity-60 text-sm font-normal ml-1">↵</span>
        </button>
      )}
    </div>
    </>
  )
}
