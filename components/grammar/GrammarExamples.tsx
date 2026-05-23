'use client'
import { useState } from 'react'
import type { GrammarPoint, GrammarRole } from '@/lib/grammar-mnn1'
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/grammar-mnn1'
import type { Lang } from '@/lib/i18n'
import { getMeaning } from '@/lib/i18n'

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

function AiSentenceCard({ sentence, lang }: { sentence: AiSentence; lang: Lang }) {
  const [showTranslation, setShowTranslation] = useState(true)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      {/* Japanese tokens */}
      <div className="flex flex-wrap items-end gap-1.5">
        {sentence.jp.map((t, i) => {
          const c = ROLE_COLORS[t.role] ?? ROLE_COLORS['noun']
          return (
            <div key={i} className="inline-flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-slate-400 min-h-[14px]">
                {t.furigana || ''}
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

      <button
        onClick={() => setShowTranslation(v => !v)}
        className="text-[10px] text-slate-400 hover:text-slate-600 transition"
      >
        {showTranslation ? 'Ocultar traducción' : 'Mostrar traducción'}
      </button>
    </div>
  )
}

export default function GrammarExamples({ grammar, lang, geminiKey, sessionToken, activeVocab }: Props) {
  const [sentences, setSentences] = useState<AiSentence[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState(false)

  const targetLang =
    lang === 'ca' ? 'catalán' :
    lang === 'en' ? 'inglés' :
    'español'

  async function generate() {
    const key = geminiKey
    if (!key && !sessionToken) { setError('Necesitas una API Key de Gemini para generar ejemplos.'); return }

    setLoading(true)
    setError('')

    const vocabSample = activeVocab
      .sort(() => Math.random() - 0.5)
      .slice(0, 15)
      .map(w => `${w.jp}(${w.reading}): ${getMeaning(w, lang)}`)
      .join(', ')

    const roles: GrammarRole[] = ['topic', 'subject', 'object', 'location', 'direction', 'time', 'verb', 'key', 'copula', 'particle', 'noun', 'adjective', 'conjunction', 'auxiliary']

    const prompt = `Eres un profesor de japonés experto. Genera EXACTAMENTE 5 frases cortas en japonés que usen el patrón gramatical "${grammar.pattern}" (${grammar.name_es}).

Vocabulario disponible (usa el mayor número posible): ${vocabSample || 'palabras básicas N5'}

Reglas:
- Cada frase debe ilustrar claramente el patrón "${grammar.pattern}"
- Frases cortas y claras, nivel JLPT ${grammar.jlpt}
- La traducción debe estar en ${targetLang}
- Asigna un "role" a cada token según su función gramatical. Roles disponibles: ${roles.join(', ')}
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
        body: JSON.stringify({ prompt, userApiKey: key }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Error ${res.status}`)
      }
      const data = await res.json()
      const clean = data.text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (!parsed.sentences?.length) throw new Error('La IA no generó frases. Inténtalo de nuevo.')

      const validated: AiSentence[] = parsed.sentences.map((s: any) => ({
        jp: (s.jp ?? []).map((t: any) => ({
          text: String(t.text ?? ''),
          furigana: t.furigana ?? undefined,
          role: roles.includes(t.role) ? t.role : 'noun',
        })),
        translation: (s.translation ?? []).map((t: any) => ({
          text: String(t.text ?? ''),
          role: roles.includes(t.role) ? t.role : 'noun',
        })),
      }))

      setSentences(validated)
      setGenerated(true)
    } catch (e: any) {
      setError(e.message || 'Error al generar ejemplos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          ✨ Ejemplos con IA
          <span className="ml-2 text-xs text-slate-400 font-normal">usando tu vocabulario</span>
        </h3>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-medium transition"
        >
          {loading ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              Generando...
            </>
          ) : generated ? '🔄 Regenerar' : '✨ Generar ejemplos'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!generated && !loading && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-sm text-slate-500">
            Genera 5 frases de ejemplo usando tu vocabulario activo, con colores que marcan la gramática.
          </p>
          {!geminiKey && (
            <p className="text-xs text-amber-600 mt-2">
              💡 Configura tu API Key de Gemini en la pestaña Contexto para uso ilimitado.
            </p>
          )}
        </div>
      )}

      {sentences.map((s, i) => (
        <AiSentenceCard key={i} sentence={s} lang={lang} />
      ))}
    </div>
  )
}
