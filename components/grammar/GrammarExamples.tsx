'use client'
import { useState, useEffect } from 'react'
import type { GrammarPoint, GrammarRole } from '@/lib/grammar-mnn1'
import { ROLE_COLORS } from '@/lib/grammar-mnn1'
import type { Lang } from '@/lib/i18n'
import { getMeaning } from '@/lib/i18n'
import GeminiApiTutorial from './GeminiApiTutorial'
import {
  fetchUserGrammarExamples,
  saveUserGrammarExamples,
} from '@/lib/supabase'

const MAX_POOL = 10

interface AiToken {
  text: string
  furigana?: string
  role: GrammarRole
  gloss?: string
}

interface AiSentence {
  jp: AiToken[]
  translation: AiToken[]
}

interface Props {
  grammar: GrammarPoint
  lang: Lang
  geminiKey: string
  sessionToken: string
  activeVocab: { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────

function AiSentenceCard({ sentence, lang }: { sentence: AiSentence; lang: Lang }) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [showFurigana, setShowFurigana]       = useState(false)

  const furiganaLabel =
    lang === 'en' ? (showFurigana ? 'Hide furigana' : 'Show furigana') :
    lang === 'ca' ? (showFurigana ? 'Amaga furigana' : 'Mostra furigana') :
    lang === 'ja' ? (showFurigana ? 'ふりがなを隠す' : 'ふりがなを表示') :
    (showFurigana ? 'Ocultar furigana' : 'Mostrar furigana')

  const translationLabel =
    lang === 'en' ? (showTranslation ? 'Hide translation' : 'Show translation') :
    lang === 'ca' ? (showTranslation ? 'Amaga traducció' : 'Mostra traducció') :
    lang === 'ja' ? (showTranslation ? '訳を隠す' : '訳を表示') :
    (showTranslation ? 'Ocultar traducción' : 'Mostrar traducción')

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      {/* Japanese tokens */}
      <div className="flex flex-wrap items-end gap-1.5">
        {sentence.jp.map((t, i) => {
          const c = ROLE_COLORS[t.role] ?? ROLE_COLORS['noun']
          return (
            <div key={i} className="inline-flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-slate-400 min-h-[14px]">
                {showFurigana ? (t.furigana || '') : ''}
              </span>
              <span className={`${c.bg} ${c.text} border ${c.border} font-bold rounded-md px-2 py-0.5 text-xl whitespace-nowrap`}>
                {t.text}
              </span>
            </div>
          )
        })}
      </div>

      {/* Translation tokens */}
      {showTranslation && sentence.translation.length > 0 && (
        <div className="flex flex-wrap items-end gap-1.5 pt-2 border-t border-slate-100">
          {sentence.translation.map((t, i) => {
            const c = ROLE_COLORS[t.role] ?? ROLE_COLORS['noun']
            return (
              <span key={i} className={`${c.bg} ${c.text} border ${c.border} font-medium rounded-md px-2 py-0.5 text-sm whitespace-nowrap`}>
                {t.text}
              </span>
            )
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFurigana(v => !v)}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition"
        >
          {furiganaLabel}
        </button>
        <span className="text-slate-200 text-[10px]">|</span>
        <button
          onClick={() => setShowTranslation(v => !v)}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition"
        >
          {translationLabel}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: cast raw DB rows to AiSentence[]
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ROLES: GrammarRole[] = [
  'topic', 'subject', 'object', 'location', 'direction', 'time',
  'verb', 'key', 'copula', 'particle', 'noun', 'adjective', 'conjunction', 'auxiliary',
]

function castSentences(rows: { jp: unknown[]; translation: unknown[] }[]): AiSentence[] {
  return rows.map(row => ({
    jp: (row.jp ?? []).map((t: any) => ({
      text:     String(t.text ?? ''),
      furigana: t.furigana ?? undefined,
      role:     VALID_ROLES.includes(t.role) ? t.role as GrammarRole : 'noun',
    })),
    translation: (row.translation ?? []).map((t: any) => ({
      text: String(t.text ?? ''),
      role: VALID_ROLES.includes(t.role) ? t.role as GrammarRole : 'noun',
    })),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function GrammarExamples({ grammar, lang, geminiKey, sessionToken, activeVocab }: Props) {
  const [sentences, setSentences]   = useState<AiSentence[]>([])
  const [dbLoading, setDbLoading]   = useState(true)   // initial DB fetch
  const [genLoading, setGenLoading] = useState(false)  // AI generation
  const [saving, setSaving]         = useState(false)  // saving to DB
  const [error, setError]           = useState('')

  const hasSaved = sentences.length > 0

  // ── Load from DB on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchUserGrammarExamples(grammar.id)
      .then(rows => setSentences(castSentences(rows)))
      .finally(() => setDbLoading(false))
  }, [grammar.id])

  // ── Generate ──────────────────────────────────────────────────────────────
  const targetLang =
    lang === 'ca' ? 'catalán' :
    lang === 'en' ? 'inglés' :
    'español'

  async function generate() {
    if (!geminiKey && !sessionToken) {
      setError('Necesitas una API Key de Gemini para generar ejemplos.')
      return
    }

    setGenLoading(true)
    setError('')

    // Use the student's studied vocabulary (falls back to basic vocab)
    const vocabSample = [...activeVocab]
      .sort(() => Math.random() - 0.5)
      .slice(0, 15)
      .map(w => `${w.jp}(${w.reading}): ${getMeaning(w, lang)}`)
      .join(', ')

    const prompt = `Eres un profesor de japonés experto. Genera EXACTAMENTE 5 frases cortas en japonés que usen el patrón gramatical "${grammar.pattern}" (${grammar.name_es}).

Vocabulario disponible (usa el mayor número posible): ${vocabSample || 'palabras básicas N5'}

Reglas:
- Cada frase debe ilustrar claramente el patrón "${grammar.pattern}"
- Frases cortas y claras, nivel JLPT ${grammar.jlpt}
- La traducción debe estar en ${targetLang}
- Asigna un "role" a cada token según su función gramatical. Roles disponibles: ${VALID_ROLES.join(', ')}
- Marca con role "key" la parte que corresponde exactamente al patrón gramatical estudiado
- Para el japonés incluye furigana de los kanjis
- Los tokens de traducción deben alinearse con los japoneses en color (mismo role = mismo color)

Responde ÚNICAMENTE con este JSON (sin backticks, sin texto extra):
{
  "sentences": [
    {
      "jp": [
        {"text": "私", "furigana": "わたし", "role": "topic"},
        {"text": "は", "role": "topic"},
        {"text": "学生", "furigana": "がくせい", "role": "noun"},
        {"text": "です", "role": "copula"}
      ],
      "translation": [
        {"text": "Yo", "role": "topic"},
        {"text": "soy", "role": "copula"},
        {"text": "estudiante", "role": "noun"}
      ]
    }
  ]
}`

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
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
      if (!parsed.sentences?.length) throw new Error('La IA no generó frases. Inténtalo de nuevo.')

      const newSentences = castSentences(parsed.sentences)

      // Save to DB (insert + trim to MAX_POOL) then reload
      setSaving(true)
      await saveUserGrammarExamples(grammar.id, newSentences)
      const fresh = await fetchUserGrammarExamples(grammar.id)
      setSentences(castSentences(fresh))
    } catch (e: any) {
      setError(e.message || 'Error al generar ejemplos.')
    } finally {
      setGenLoading(false)
      setSaving(false)
    }
  }

  // ── Labels ────────────────────────────────────────────────────────────────
  const genLabel =
    genLoading ? (
      lang === 'en' ? 'Generating…' : lang === 'ca' ? 'Generant…' : 'Generando…'
    ) : saving ? (
      lang === 'en' ? 'Saving…' : lang === 'ca' ? 'Desant…' : 'Guardando…'
    ) : hasSaved ? (
      lang === 'en' ? '🔄 Generate more' : lang === 'ca' ? '🔄 Generar més' : '🔄 Generar más'
    ) : (
      lang === 'en' ? '✨ Generate examples' : lang === 'ca' ? '✨ Generar exemples' : '✨ Generar ejemplos'
    )

  const poolLabel =
    lang === 'en' ? `${sentences.length}/${MAX_POOL} saved` :
    lang === 'ca' ? `${sentences.length}/${MAX_POOL} desades` :
    `${sentences.length}/${MAX_POOL} guardadas`

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            ✨{' '}
            {lang === 'en' ? 'AI Examples' : lang === 'ca' ? 'Exemples amb IA' : 'Ejemplos con IA'}
            <span className="ml-2 text-xs text-slate-400 font-normal">
              {lang === 'en' ? 'using your vocabulary' : lang === 'ca' ? 'amb el teu vocabulari' : 'usando tu vocabulario'}
            </span>
          </h3>
          {hasSaved && (
            <p className="text-[10px] text-slate-400 mt-0.5">{poolLabel}</p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={genLoading || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-medium transition"
        >
          {(genLoading || saving) && (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
          )}
          {genLabel}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Initial DB load spinner */}
      {dbLoading && (
        <div className="flex justify-center py-6">
          <svg className="w-5 h-5 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        </div>
      )}

      {/* No API key tutorial */}
      {!dbLoading && !hasSaved && !genLoading && !geminiKey && (
        <GeminiApiTutorial lang={lang} compact />
      )}

      {/* Empty state with API key */}
      {!dbLoading && !hasSaved && !genLoading && geminiKey && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-sm text-slate-500">
            {lang === 'en'
              ? 'Generate 5 example sentences with colour-coded grammar roles.'
              : lang === 'ca'
              ? 'Genera 5 frases d\'exemple amb colors que marquen cada funció gramatical.'
              : 'Genera 5 frases de ejemplo con colores que marcan cada función gramatical.'}
          </p>
        </div>
      )}

      {/* Sentence cards */}
      {sentences.map((s, i) => (
        <AiSentenceCard key={i} sentence={s} lang={lang} />
      ))}
    </div>
  )
}
