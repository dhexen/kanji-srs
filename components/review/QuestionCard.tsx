'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { toHiragana } from 'wanakana'
import { useStore } from '@/lib/store'
import { VocabItem, ReviewMode, MODE_CONFIG, getModeLevelAndDue, getMeaningForLang, VocabWordType } from '@/lib/srs'
import { t, getStageName } from '@/lib/i18n'
import { submitImageVote } from '@/lib/supabase'
import type { SessionItem } from './ReviewClient'

interface Props {
  sessionItem: SessionItem
  allItems: VocabItem[]
  index: number
  total: number
  isPractice: boolean
  onNext: () => void
  onQuit: () => void
}

type AnswerState = 'waiting' | 'correct' | 'incorrect'

function normalizeJP(str: string) {
  return str.trim().replace(/\s/g, '').replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

export default function QuestionCard({ sessionItem, allItems, index, total, isPractice, onNext, onQuit }: Props) {
  const { applyReviewResult, masterVocabItem, state } = useStore()
  const { item, mode } = sessionItem
  const cfg = MODE_CONFIG[mode]
  const { level } = getModeLevelAndDue(item, mode)
  const lang = state.lang

  const [answerState, setAnswerState] = useState<AnswerState>('waiting')
  const [showAnswer, setShowAnswer] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [imgError, setImgError] = useState(false)
  const [imgVote, setImgVote] = useState<1 | -1 | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  const handleImgError = useCallback(() => setImgError(true), [])

  // Reset image state when the word changes
  useEffect(() => { setImgError(false); setImgVote(null) }, [item.jp])

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

  // Enter para pasar al siguiente cuando ya hay respuesta
  useEffect(() => {
    if (answerState === 'waiting') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answerState, onNext])

  const buildOptions = (field: 'reading' | 'meaning', count: number) => {
    const correct = field === 'meaning' ? meaning : item[field]
    const others = allItems
      .filter(w => w[field] !== item[field])
      .map(w => field === 'meaning' ? getMeaningForLang(w, lang) : w[field])
      .sort(() => Math.random() - 0.5)
      .slice(0, count - 1)
    return [correct, ...others].sort(() => Math.random() - 0.5)
  }

  const handleResult = (isCorrect: boolean) => {
    setAnswerState(isCorrect ? 'correct' : 'incorrect')
    if (!isPractice) {
      applyReviewResult(item.jp, mode, isCorrect)
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
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
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

        {/* Image banner — full width, all screen sizes */}
        {hasImage && (
          <div className="relative w-full">
            <img
              src={item.image_url!}
              alt={meaning}
              onError={handleImgError}
              className="w-full h-36 sm:h-44 object-cover"
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

        <div className={`pb-6 px-4 ${hasImage ? 'pt-5' : 'pt-12'}`}>
          <div className="kanji-font text-5xl md:text-6xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-wide">
            {mode === 'kanji' ? `「${item.reading}」` : mode === 'reverse' ? meaning : item.jp}
          </div>

          {/* Furigana — visible en meaning (lectura del kanji como pista) */}
          {mode === 'meaning' && item.reading && (
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
              await masterVocabItem(item.jp)
              onNext()
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
          {buildOptions(mode === 'meaning' ? 'meaning' : 'reading', mode === 'meaning' ? 4 : 3).map(opt => (
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
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-5 text-center space-y-1">
              <p className="kanji-font text-4xl font-bold text-slate-800 dark:text-slate-100">{item.jp}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.reading} — {meaning}</p>
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
        </div>
      )}

      {/* Tarjeta de detalles al revelar respuesta */}
      {answerState !== 'waiting' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
          {/* Foto */}
          {hasImage && (
            <img
              src={item.image_url!}
              alt={meaning}
              onError={handleImgError}
              className="w-full h-36 sm:h-44 object-cover"
            />
          )}
          <div className="p-4 space-y-2 text-center">
            {/* Kanji + lectura */}
            <p className="kanji-font text-3xl font-bold text-slate-800 dark:text-slate-100">{item.jp}</p>
            {item.reading && item.reading !== item.jp && (
              <p className="text-sm text-slate-400 dark:text-slate-500 tracking-widest">{item.reading}</p>
            )}
            {/* Significado */}
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{meaning}</p>
            {/* Badges: tipo, categoría, curso */}
            {(item.word_type || item.category || item.grade) && (
              <div className="flex flex-wrap justify-center gap-1.5 pt-1">
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
      )}

      {answerState !== 'waiting' && (
        <button onClick={onNext} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md">
          {t(lang, 'review_next')} <span className="opacity-60 text-sm font-normal ml-1">↵</span>
        </button>
      )}
    </div>
  )
}
