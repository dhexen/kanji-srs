'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lang } from '@/lib/i18n'
import type { GrammarSentence } from '@/lib/grammar-srs'

const INITIAL_SHOW = 5

interface Props {
  grammarId: string
  lang: Lang
}

export default function GrammarSentenceExamples({ grammarId, lang }: Props) {
  const [sentences, setSentences] = useState<GrammarSentence[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showFurigana, setShowFurigana] = useState(false)

  useEffect(() => {
    supabase
      .from('grammar_sentences')
      .select('*')
      .eq('grammar_id', grammarId)
      .eq('is_private', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setSentences((data ?? []) as GrammarSentence[])
        setLoading(false)
      })
  }, [grammarId])

  if (loading || sentences.length === 0) return null

  const label =
    lang === 'ca' ? 'Frases de pràctica' :
    lang === 'en' ? 'Practice sentences' :
    'Frases de práctica'

  const furiganaLabel =
    lang === 'ca' ? (showFurigana ? 'Amaga furigana' : 'Mostra furigana') :
    lang === 'en' ? (showFurigana ? 'Hide furigana' : 'Show furigana') :
    (showFurigana ? 'Ocultar furigana' : 'Mostrar furigana')

  const moreLabel = expanded
    ? (lang === 'ca' ? 'Mostrar menys' : lang === 'en' ? 'Show less' : 'Mostrar menos')
    : (lang === 'ca' ? `Mostrar totes (${sentences.length})` : lang === 'en' ? `Show all (${sentences.length})` : `Mostrar todas (${sentences.length})`)

  const getTranslation = (s: GrammarSentence) =>
    lang === 'ca' ? s.translation_ca : lang === 'en' ? s.translation_en : s.translation_es

  const visible = expanded ? sentences : sentences.slice(0, INITIAL_SHOW)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-2 group"
      >
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label} ({sentences.length})
        </span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              onClick={() => setShowFurigana(v => !v)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {furiganaLabel}
            </button>
          </div>

          <div className="space-y-2">
            {visible.map((s, i) => (
              <div
                key={s.id ?? i}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 space-y-1.5"
              >
                {showFurigana ? (
                  <div className="flex flex-wrap items-end gap-0.5 leading-none">
                    {s.sentence_before && (
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-400 min-h-[14px] leading-none">{s.sentence_before_reading}</span>
                        <span className="text-base font-medium text-slate-800 dark:text-slate-100">{s.sentence_before}</span>
                      </span>
                    )}
                    <span className="inline-flex flex-col items-center gap-0.5 mx-0.5">
                      <span className="text-[10px] text-indigo-400 min-h-[14px] leading-none">{s.answer}</span>
                      <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{s.answer}</span>
                    </span>
                    {s.sentence_after && (
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-400 min-h-[14px] leading-none">{s.sentence_after_reading}</span>
                        <span className="text-base font-medium text-slate-800 dark:text-slate-100">{s.sentence_after}</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                    {s.sentence_before}
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 rounded mx-0.5">{s.answer}</span>
                    {s.sentence_after}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{getTranslation(s)}</p>
              </div>
            ))}
          </div>

          {sentences.length > INITIAL_SHOW && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {moreLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
