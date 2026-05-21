'use client'
import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, ReviewMode, MODE_CONFIG, STAGE_NAMES, getModeLevelAndDue } from '@/lib/srs'
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
  return str.trim()
    .replace(/\s/g, '')
    .replace(/[\u30A1-\u30F6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

export default function QuestionCard({ sessionItem, allItems, index, total, isPractice, onNext, onQuit }: Props) {
  const { dispatch, syncUp } = useStore()
  const { item, mode } = sessionItem
  const cfg = MODE_CONFIG[mode]
  const { level } = getModeLevelAndDue(item, mode)

  const [answerState, setAnswerState] = useState<AnswerState>('waiting')
  const [showAnswer, setShowAnswer] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const pct = (index / total) * 100
  const isMultiChoice = mode === 'multi' || mode === 'meaning'
  const isTypingMode = mode === 'reading'
  const isPaperMode = mode === 'kanji' || mode === 'reverse'

  // Focus input when question loads
  useEffect(() => {
    if (isTypingMode && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isTypingMode])

  const buildOptions = (field: 'reading' | 'meaning', count: number) => {
    const correct = item[field]
    const others = allItems
      .filter(w => w[field] !== correct)
      .map(w => w[field])
      .sort(() => Math.random() - 0.5)
      .slice(0, count - 1)
    return [correct, ...others].sort(() => Math.random() - 0.5)
  }

  const handleResult = (isCorrect: boolean) => {
    setAnswerState(isCorrect ? 'correct' : 'incorrect')
    if (!isPractice) {
      dispatch({ type: 'APPLY_RESULT', payload: { jp: item.jp, mode, isCorrect } })
      syncUp(true)
    }
  }

  const checkTypingAnswer = () => {
    if (!inputValue.trim()) return
    const isCorrect = normalizeJP(inputValue) === normalizeJP(item.reading) ||
                      normalizeJP(inputValue) === normalizeJP(item.jp)
    handleResult(isCorrect)
  }

  const badgeColors: Record<ReviewMode, string> = {
    multi:   'bg-indigo-100 text-indigo-700',
    meaning: 'bg-purple-100 text-purple-700',
    kanji:   'bg-amber-100 text-amber-700',
    reading: 'bg-emerald-100 text-emerald-700',
    reverse: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
      {/* Progress + quit */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {isPractice ? 'Práctica libre' : 'Repaso SRS'}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-indigo-600">{index + 1} / {total}</span>
          <button
            onClick={onQuit}
            className="text-xs text-slate-400 hover:text-rose-500 font-semibold transition border border-slate-200 hover:border-rose-200 px-2.5 py-1 rounded-lg"
          >
            Dejar ya ✕
          </button>
        </div>
      </div>

      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {/* Question card */}
      <div className="text-center py-6 bg-slate-50 rounded-2xl relative border border-slate-100">
        <span className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-md ${badgeColors[mode]}`}>
          {cfg.label} <span className="opacity-60">Nv.{level}</span>
        </span>
        <div className="kanji-font text-5xl md:text-6xl font-bold text-slate-800 mb-4 tracking-wide">
          {mode === 'kanji'   ? `「${item.reading}」` :
           mode === 'reverse' ? item.meaning :
                                item.jp}
        </div>
        <p className="text-slate-500 text-sm">
          {mode === 'multi'   ? '¿Cuál es la lectura correcta?' :
           mode === 'meaning' ? '¿Cuál es el significado correcto?' :
           mode === 'kanji'   ? `Significado: "${item.meaning}" — Escribe el kanji en papel` :
           mode === 'reading' ? `Escribe la lectura en hiragana` :
                                'Escribe el kanji y su lectura en papel'}
        </p>
      </div>

      {/* MULTI CHOICE */}
      {isMultiChoice && answerState === 'waiting' && (
        <div className={`grid gap-3 ${mode === 'meaning' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
          {buildOptions(mode === 'meaning' ? 'meaning' : 'reading', mode === 'meaning' ? 4 : 3).map(opt => (
            <button key={opt}
              onClick={() => handleResult(opt === (mode === 'meaning' ? item.meaning : item.reading))}
              className="py-3 px-4 bg-slate-50 border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 font-semibold text-sm rounded-xl transition-all text-slate-700 text-left"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* TYPING MODE (reading) */}
      {isTypingMode && answerState === 'waiting' && (
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkTypingAnswer()}
            placeholder="Escribe en hiragana..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            className="w-full px-4 py-3 border-2 border-slate-200 focus:border-emerald-400 rounded-xl text-lg text-center font-medium tracking-wider focus:outline-none transition"
          />
          <button
            onClick={checkTypingAnswer}
            disabled={!inputValue.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl transition"
          >
            Comprobar ✓
          </button>
        </div>
      )}

      {/* PAPER MODE (kanji / reverse) */}
      {isPaperMode && answerState === 'waiting' && (
        <div className="space-y-3">
          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition">
              👁️ Mostrar respuesta
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-1">
              <p className="kanji-font text-4xl font-bold text-slate-800">{item.jp}</p>
              <p className="text-sm text-slate-500">{item.reading} — {item.meaning}</p>
            </div>
          )}
          {showAnswer && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleResult(false)}
                className="py-3 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-700 font-bold rounded-xl transition">
                ✗ Incorrecto
              </button>
              <button onClick={() => handleResult(true)}
                className="py-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 text-emerald-700 font-bold rounded-xl transition">
                ✓ Correcto
              </button>
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {answerState !== 'waiting' && (
        <div className={`p-4 rounded-xl text-center font-bold ${answerState === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
          {answerState === 'correct'
            ? '¡Excelente! 🎉 Respuesta correcta.'
            : isTypingMode
              ? `Incorrecto 😢 — La respuesta era: ${item.reading}`
              : isPaperMode
                ? 'Anotado. El algoritmo lo reprogramará pronto.'
                : `Incorrecto 😢 — La respuesta era: ${mode === 'meaning' ? item.meaning : item.reading}`}
        </div>
      )}

      {/* Next button */}
      {answerState !== 'waiting' && (
        <button onClick={onNext}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md">
          Siguiente ➡️
        </button>
      )}
    </div>
  )
}
