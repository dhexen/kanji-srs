'use client'
import { useState, useEffect, useCallback } from 'react'
import type { VocabItem, VocabWordType } from '@/lib/srs'
import { getMeaningForLang } from '@/lib/srs'
import { upgradeVocabImage } from '@/lib/image'

interface Props {
  items: VocabItem[]
  lang: string
  onComplete: () => void
  onSkip: () => void
}

const WORD_TYPE_LABEL: Record<VocabWordType, Record<string, string>> = {
  noun:             { es: 'Sustantivo',  ca: 'Substantiu',  en: 'Noun' },
  verb_transitive:  { es: 'V. transitivo', ca: 'V. transitiu', en: 'Trans. verb' },
  verb_intransitive:{ es: 'V. intransitivo', ca: 'V. intransitiu', en: 'Intrans. verb' },
  verb:             { es: 'Verbo',       ca: 'Verb',        en: 'Verb' },
  adj_i:            { es: 'Adj. -い',    ca: 'Adj. -い',    en: 'い-adj.' },
  adj_na:           { es: 'Adj. -な',    ca: 'Adj. -な',    en: 'な-adj.' },
  adverb:           { es: 'Adverbio',    ca: 'Adverbi',     en: 'Adverb' },
  particle:         { es: 'Partícula',   ca: 'Partícula',   en: 'Particle' },
  expression:       { es: 'Expresión',   ca: 'Expressió',   en: 'Expression' },
}

const WORD_TYPE_COLOR: Record<VocabWordType, string> = {
  noun:              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  verb_transitive:   'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  verb_intransitive: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  verb:              'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  adj_i:             'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  adj_na:            'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  adverb:            'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  particle:          'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  expression:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const GRADE_LABEL: Record<number, Record<string, string>> = {
  1: { es: '1º Primaria', ca: '1r Primària', en: '1st Grade' },
  2: { es: '2º Primaria', ca: '2n Primària', en: '2nd Grade' },
  3: { es: '3º Primaria', ca: '3r Primària', en: '3rd Grade' },
  4: { es: '4º Primaria', ca: '4t Primària', en: '4th Grade' },
  5: { es: '5º Primaria', ca: '5è Primària', en: '5th Grade' },
  6: { es: '6º Primaria', ca: '6è Primària', en: '6th Grade' },
  7: { es: '1º Sec.',     ca: '1r Sec.',     en: '7th Grade' },
  8: { es: '2º Sec.',     ca: '2n Sec.',     en: '8th Grade' },
  9: { es: '3º Sec.',     ca: '3r Sec.',     en: '9th Grade' },
}

function ui(lang: string, es: string, ca: string, en: string) {
  if (lang === 'ca') return ca
  if (lang === 'en') return en
  return es
}

export default function LessonSession({ items, lang, onComplete, onSkip }: Props) {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [imgError, setImgError] = useState(false)

  const item = items[index]
  const isFirst = index === 0
  const isLast = index === items.length - 1
  const progress = done ? 100 : ((index + 1) / items.length) * 100

  const goNext = useCallback(() => {
    if (isLast) { setDone(true) } else { setIndex(i => i + 1) }
  }, [isLast])

  const goPrev = useCallback(() => {
    if (done) { setDone(false) } else if (!isFirst) { setIndex(i => i - 1) }
  }, [done, isFirst])

  useEffect(() => {
    setImgError(false)
  }, [index])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  const meaning = item ? getMeaningForLang(item, lang) : ''
  const wordTypeLabel = item?.word_type ? (WORD_TYPE_LABEL[item.word_type]?.[lang] ?? WORD_TYPE_LABEL[item.word_type]?.es ?? '') : ''
  const wordTypeColor = item?.word_type ? WORD_TYPE_COLOR[item.word_type] : ''
  const gradeLabel = item?.grade ? (GRADE_LABEL[item.grade]?.[lang] ?? GRADE_LABEL[item.grade]?.es ?? '') : ''
  const hasImage = !!(item?.image_url && !imgError)

  if (done) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title={ui(lang, 'Ver última palabra', 'Veure última paraula', 'See last word')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
          </div>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {items.length}/{items.length}
          </span>
        </div>

        {/* Completion card */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center space-y-4">
          <p className="text-5xl">🎉</p>
          <div>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {ui(lang, '¡Palabras estudiadas!', 'Paraules estudiades!', 'Words studied!')}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {ui(lang,
                `Has visto las ${items.length} palabras nuevas. Ahora ponlas a prueba.`,
                `Has vist les ${items.length} paraules noves. Ara posa-les a prova.`,
                `You've seen all ${items.length} new words. Now put them to the test.`,
              )}
            </p>
          </div>

          {/* Word summary */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {items.map(w => (
              <span
                key={w.jp}
                className="kanji-font text-base font-bold px-3 py-1 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-xl text-slate-700 dark:text-slate-200"
              >
                {w.jp}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onComplete}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl transition shadow-md"
        >
          🏋️ {ui(lang, 'Empezar repaso', 'Començar repàs', 'Start review')}
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm transition"
        >
          {ui(lang, 'Más tarde', 'Més tard', 'Later')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSkip}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          title={ui(lang, 'Saltar lección', 'Saltar lliçó', 'Skip lesson')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex-1 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          {index + 1}/{items.length}
        </span>
      </div>

      {/* Title */}
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-center">
        {ui(lang, 'Palabras nuevas', 'Paraules noves', 'New words')}
      </p>

      {/* Word card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        {/* Image — small, centered, shown whole (not cropped) */}
        {hasImage && (
          <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900/40 py-4">
            <img
              src={upgradeVocabImage(item.image_url)}
              alt={item.jp}
              className="h-36 sm:h-44 w-auto max-w-[80%] object-contain rounded-xl"
              onError={() => setImgError(true)}
            />
          </div>
        )}

        <div className="px-6 py-6 space-y-4 text-center">
          {/* Kanji */}
          <div>
            <p className="kanji-font text-5xl sm:text-6xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
              {item.jp}
            </p>
            {item.jp !== item.reading && (
              <p className="text-xl text-slate-400 dark:text-slate-500 mt-2 font-medium">
                {item.reading}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* Meaning */}
          <p className="text-2xl sm:text-3xl font-bold text-indigo-700 dark:text-indigo-300 leading-snug">
            {meaning}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {item.word_type && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${wordTypeColor}`}>
                {wordTypeLabel}
              </span>
            )}
            {item.grade && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                {gradeLabel}
              </span>
            )}
            {item.kanji && item.kanji !== item.jp && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 kanji-font">
                {item.kanji}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          ← {ui(lang, 'Anterior', 'Anterior', 'Previous')}
        </button>
        <button
          onClick={goNext}
          className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
        >
          {isLast
            ? `✓ ${ui(lang, 'Listo', 'Llest', 'Done')}`
            : `${ui(lang, 'Siguiente', 'Següent', 'Next')} →`}
        </button>
      </div>

      {/* Dot indicators */}
      {items.length <= 15 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                i === index
                  ? 'w-4 h-2 bg-indigo-500'
                  : i < index
                    ? 'w-2 h-2 bg-indigo-300 dark:bg-indigo-700'
                    : 'w-2 h-2 bg-slate-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
