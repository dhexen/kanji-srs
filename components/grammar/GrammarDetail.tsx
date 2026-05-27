'use client'
import { useState } from 'react'
import type { GrammarPoint, ExampleToken, StructurePart } from '@/lib/grammar-mnn1'
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/grammar-mnn1'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import GrammarExamples from './GrammarExamples'
import GrammarPractice from './GrammarPractice'

function getLang3<T extends { es: T[keyof T]; ca: T[keyof T]; en: T[keyof T] }>(obj: T, lang: Lang) {
  if (lang === 'ca') return obj.ca
  if (lang === 'en') return obj.en
  return obj.es
}

function TokenChip({ role, text, label, small = false }: {
  role: GrammarPoint['structure'][0]['role']
  text: string
  label?: string
  small?: boolean
}) {
  const c = ROLE_COLORS[role]
  return (
    <div className={`inline-flex flex-col items-center ${small ? 'gap-0' : 'gap-0.5'}`}>
      <span className={`${c.bg} ${c.text} border ${c.border} font-bold rounded-md px-2 py-0.5 whitespace-nowrap ${small ? 'text-sm' : 'text-base'}`}>
        {text}
      </span>
      {label && (
        <span className={`${c.text} font-medium opacity-70 ${small ? 'text-[9px]' : 'text-[10px]'}`}>{label}</span>
      )}
    </div>
  )
}

function StructureDisplay({ parts, lang }: { parts: StructurePart[]; lang: Lang }) {
  return (
    <div className="flex flex-wrap items-end gap-1.5 py-3 px-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      {parts.map((p, i) => {
        const label = p.isSlot
          ? (lang === 'ca' ? p.label_ca : lang === 'en' ? p.label_en : p.label_es)
          : undefined
        return <TokenChip key={i} role={p.role} text={p.text} label={label} />
      })}
    </div>
  )
}

function ExampleDisplay({ tokens, lang }: { tokens: ExampleToken[]; lang: Lang }) {
  const [showGloss, setShowGloss]       = useState(true)
  const [showFurigana, setShowFurigana] = useState(false)

  const furiganaLabel =
    lang === 'en' ? (showFurigana ? 'Hide furigana' : 'Show furigana') :
    lang === 'ca' ? (showFurigana ? 'Amaga furigana' : 'Mostra furigana') :
    lang === 'ja' ? (showFurigana ? 'ふりがなを隠す' : 'ふりがなを表示') :
    (showFurigana ? 'Ocultar furigana' : 'Mostrar furigana')

  const getGloss = (tk: ExampleToken) => {
    if (lang === 'ca') return tk.gloss_ca
    if (lang === 'en') return tk.gloss_en
    return tk.gloss_es
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {t(lang, 'gp_example')}
        </span>
        <button
          onClick={() => setShowFurigana(v => !v)}
          className="text-[10px] px-2 py-0.5 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 transition"
        >
          {furiganaLabel}
        </button>
        <button
          onClick={() => setShowGloss(v => !v)}
          className="text-[10px] px-2 py-0.5 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 transition"
        >
          {showGloss ? t(lang, 'gp_hide_gloss') : t(lang, 'gp_show_gloss')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-1.5 mb-3">
          {tokens.map((tk, i) => (
            <div key={i} className="inline-flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-slate-400 min-h-[14px]">
                {showFurigana ? (tk.furigana || '') : ''}
              </span>
              <span className={`${ROLE_COLORS[tk.role].bg} ${ROLE_COLORS[tk.role].text} border ${ROLE_COLORS[tk.role].border} font-bold rounded-md px-2 py-0.5 text-xl whitespace-nowrap`}>
                {tk.text}
              </span>
              {showGloss && (
                <span className={`text-[10px] font-medium ${ROLE_COLORS[tk.role].text} opacity-70 max-w-[60px] text-center leading-tight`}>
                  {getGloss(tk)}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
          {Array.from(new Set(tokens.map(tk => tk.role))).map(role => {
            const c = ROLE_COLORS[role]
            const lbl = getLang3(ROLE_LABELS[role], lang)
            return (
              <span key={role} className={`${c.bg} ${c.text} text-[10px] font-medium px-2 py-0.5 rounded-full border ${c.border}`}>
                {lbl}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface Props {
  grammar: GrammarPoint
  lang: Lang
  geminiKey: string
  sessionToken: string
  activeVocab: { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }[]
  onBack: () => void
  canEdit?: boolean
}

export default function GrammarDetail({ grammar, lang, geminiKey, sessionToken, activeVocab, onBack, canEdit }: Props) {
  const [practiceMode, setPracticeMode] = useState(false)

  // ── Practice mode: render GrammarPractice in place of the detail ──────────
  if (practiceMode) {
    return (
      <GrammarPractice
        grammar={grammar}
        lang={lang}
        geminiKey={geminiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        onBack={() => setPracticeMode(false)}
        canEdit={canEdit}
      />
    )
  }

  // ── Normal detail view ────────────────────────────────────────────────────
  const explanation =
    lang === 'ca' ? grammar.explanation_ca :
    lang === 'en' ? grammar.explanation_en :
    grammar.explanation_es

  const tip =
    lang === 'ca' ? grammar.tip_ca :
    lang === 'en' ? grammar.tip_en :
    grammar.tip_es

  const name =
    lang === 'ca' ? grammar.name_ca :
    lang === 'en' ? grammar.name_en :
    grammar.name_es

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-1 p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition shrink-0"
          aria-label={t(lang, 'gp_back')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              grammar.jlpt === 'N5' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {grammar.jlpt}
            </span>
            <span className="text-xs text-slate-400">
              {t(lang, 'grammar_lesson').replace('{n}', String(grammar.lesson))} · #{grammar.number}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 leading-tight">{name}</h2>
          <p className="text-base font-semibold text-slate-500 mt-0.5">{grammar.pattern}</p>
        </div>

        {/* Practice button */}
        <button
          onClick={() => setPracticeMode(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          title={t(lang, 'gp_practice')}
        >
          <span>🏋️</span>
          <span className="hidden sm:inline">{t(lang, 'gp_practice')}</span>
        </button>
      </div>

      {/* Practice CTA banner */}
      <button
        onClick={() => setPracticeMode(true)}
        className="w-full flex items-center gap-3 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition text-left group"
      >
        <span className="text-2xl">🏋️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-indigo-800">{t(lang, 'gp_cta_title')}</p>
          <p className="text-xs text-indigo-600 mt-0.5">{t(lang, 'gp_cta_sub')}</p>
        </div>
        <svg className="w-4 h-4 text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Structure visualization */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          {t(lang, 'gp_structure')}
        </p>
        <StructureDisplay parts={grammar.structure} lang={lang} />
      </div>

      {/* Explanation */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
      </div>

      {/* Built-in example */}
      <ExampleDisplay tokens={grammar.example} lang={lang} />

      {/* Tip */}
      {tip && (
        <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <span className="text-xl shrink-0">💡</span>
          <p className="text-sm text-amber-800 leading-relaxed">{tip}</p>
        </div>
      )}

      {/* AI-generated examples */}
      <GrammarExamples
        grammar={grammar}
        lang={lang}
        geminiKey={geminiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        canEdit={canEdit}
      />
    </div>
  )
}
