'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import type { ContextText } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'
import { supabase, fetchKnownGrammar, fetchAllGrammarSrsStats } from '@/lib/supabase'
import { BUNPRO_GRAMMAR } from '@/lib/grammar-bunpro'

const TOPICS = [
  { v: 'vida cotidiana', e: '🏠' }, { v: 'viajes y transporte', e: '✈️' },
  { v: 'comida y restaurantes', e: '🍜' }, { v: 'naturaleza y estaciones', e: '🌸' },
  { v: 'escuela y estudio', e: '📚' }, { v: 'trabajo y negocios', e: '💼' },
  { v: 'familia y amigos', e: '👨‍👩‍👧' }, { v: 'ciudad y compras', e: '🏙️' },
  { v: 'salud y cuerpo', e: '🏥' }, { v: 'ocio y entretenimiento', e: '🎮' },
  { v: 'clima y tiempo', e: '⛅' }, { v: 'historia y cultura japonesa', e: '⛩️' },
]

const JLPT_LEVELS = [
  { v: 'N5', l: '🟢 Hasta N5', d: 'partículas, です, ます, verbos simples, adjetivos básicos' },
  { v: 'N4', l: '🔵 Hasta N4', d: 'forma て, たい, condicional ば/たら, potencial, ている' },
  { v: 'N3', l: '🟡 Hasta N3', d: 'ように, ながら, てしまう, ために, てみる, てほしい' },
  { v: 'N2', l: '🟠 Hasta N2', d: 'によって, において, わけ, ものの, にもかかわらず' },
  { v: 'N1', l: '🔴 Hasta N1', d: 'toda la gramática JLPT, nivel nativo/avanzado' },
]

function buildAutoPrompt(
  topic: string,
  jlptLevel: string,
  useMyGrammar: boolean,
  grammarPatternsText: string,
  vocab: string,
): string {
  const levelInfo = JLPT_LEVELS.find(l => l.v === jlptLevel)
  const grammarSection = useMyGrammar
    ? `Prioriza el uso de estas estructuras gramaticales que el usuario está aprendiendo: ${grammarPatternsText || 'gramática básica'}.`
    : `Nivel gramatical JLPT: hasta ${jlptLevel} (${levelInfo?.d ?? ''}). Usa únicamente estructuras gramaticales de ese nivel o inferiores.`

  return `Eres profesor de japonés experto. Genera un texto narrativo en japonés sobre "${topic}" con exactamente 4-5 frases.
${grammarSection}
Usa el mayor número posible de estas palabras de vocabulario: ${vocab}.

Control de calidad obligatorio:
- El texto debe ser narrativamente coherente: las frases se conectan formando una historia o descripción continua con sentido.
- El nivel gramatical debe ser consistente en todo el texto, sin mezclar estructuras de niveles incompatibles.
- El vocabulario debe integrarse de forma natural, sin forzar palabras que no encajen en el contexto.
Sé creativo y diferente cada vez.

Responde ÚNICAMENTE con este JSON (sin backticks, sin texto extra):
{
  "japanese": "texto completo en japonés con furigana en formato ruby HTML: <ruby>漢字<rt>かんじ</rt></ruby>",
  "spanish": "traducción al español de España",
  "catalan": "traducció al català",
  "english": "English translation",
  "words_used": ["palabra1", "palabra2"]
}`
}

export default function ContextClient() {
  const { state, addContextText, removeContextText } = useStore()
  const lang = state.lang
  const [topic, setTopic] = useState(TOPICS[0].v)
  const [jlptLevel, setJlptLevel] = useState('N4')
  const [useMyGrammar, setUseMyGrammar] = useState(false)
  const [promptOverride, setPromptOverride] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const activeWords = state.db.filter(i => i.status === 'active')
  const userVocabSet = useMemo(() => new Set(state.db.map(i => i.kanji)), [state.db])

  const previewPrompt = useMemo(() => {
    const example = activeWords[0]
    const vocabPlaceholder = activeWords.length > 0
      ? `${example?.jp}(${example?.reading}): ${example?.meaning}, … [hasta 20 palabras de tu vocabulario activo]`
      : '[tus palabras de vocabulario activo]'
    return buildAutoPrompt(topic, jlptLevel, useMyGrammar, '[tus gramáticas aprendidas]', vocabPlaceholder)
  }, [topic, jlptLevel, useMyGrammar, activeWords])

  async function generate() {
    const key = state.geminiApiKey
    if (!key) { showToast(t(lang, 'api_missing_banner'), 'error'); return }
    if (activeWords.length === 0) { showToast(t(lang, 'review_no_words'), 'error'); return }

    setLoading(true)
    setErrorMsg('')
    try {
      const selected = [...activeWords].sort(() => Math.random() - 0.5).slice(0, 20)
      const vocab = selected.map(w => `${w.jp}(${w.reading}): ${w.meaning}`).join(', ')

      let prompt: string
      if (promptOverride.trim()) {
        prompt = promptOverride.replace('{VOCABULARIO}', vocab)
      } else {
        let grammarPatternsText = ''
        if (useMyGrammar) {
          const [knownIds, srsStats] = await Promise.all([
            fetchKnownGrammar(),
            fetchAllGrammarSrsStats(),
          ])
          const allIds = new Set([...knownIds, ...srsStats.map(s => s.grammar_id)])
          const patterns = BUNPRO_GRAMMAR
            .filter(g => allIds.has(g.id))
            .map(g => g.pattern)
            .slice(0, 25)
          grammarPatternsText = patterns.length > 0 ? patterns.join(', ') : 'gramática básica'
        }
        prompt = buildAutoPrompt(topic, jlptLevel, useMyGrammar, grammarPatternsText, vocab)
      }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ prompt, userApiKey: key }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Error ${res.status}`)
      }

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      let parsed: any
      try {
        const clean = data.text.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        throw new Error('La IA devolvió un formato incorrecto. Inténtalo de nuevo.')
      }

      if (!parsed.japanese) throw new Error('El texto generado está vacío. Inténtalo de nuevo.')

      const emoji = TOPICS.find(tp => tp.v === topic)?.e || '📖'
      const newText: ContextText = {
        id: Date.now(),
        topic,
        emoji,
        level: useMyGrammar ? 'mis gramáticas' : jlptLevel,
        japanese: parsed.japanese,
        spanish: parsed.spanish || '',
        catalan: parsed.catalan || '',
        english: parsed.english || '',
        words_used: parsed.words_used || [],
        createdAt: Date.now(),
        promptUsed: prompt,
      }

      await addContextText(newText)
      showToast('¡Lectura generada!', 'success')
    } catch (e: any) {
      const msg = e.message || 'Error desconocido'
      setErrorMsg(msg)
      showToast('Error generando lectura', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/review" className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
        ← Dashboard
      </Link>

      {/* Config panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">📖 Lecturas IA</h2>
          <SectionHelp section="context" lang={lang} />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          Genera textos narrativos en japonés con tu vocabulario activo. Se guardan las últimas 10 lecturas.
        </p>

        {!state.geminiApiKey && (
          <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">🔑 {t(lang, 'api_missing_banner')}</p>
            </div>
            <Link href="/stats" className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
              {t(lang, 'api_go_settings')}
            </Link>
          </div>
        )}

        {/* Topic + Level + Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tema</label>
            <select value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              {TOPICS.map(tp => <option key={tp.v} value={tp.v}>{tp.e} {tp.v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Dificultad gramatical</label>
            <select
              value={jlptLevel}
              onChange={e => setJlptLevel(e.target.value)}
              disabled={useMyGrammar}
              className={`w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${useMyGrammar ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {JLPT_LEVELS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
            </select>
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={useMyGrammar}
                onChange={e => setUseMyGrammar(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition">
                Usar mis gramáticas
              </span>
            </label>
            {useMyGrammar && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Se usarán las gramáticas que tienes marcadas o en práctica.
              </p>
            )}
          </div>

          <div className="flex items-end">
            <button
              onClick={generate}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="animate-spin inline-block">⏳</span> Generando...</>
                : '✨ Generar lectura'}
            </button>
          </div>
        </div>

        {/* Prompt editor (collapsible) */}
        <details className="group mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 select-none flex items-center gap-1.5">
            <span className="group-open:rotate-90 transition-transform inline-block text-[10px]">▶</span>
            ⚙️ Prompt avanzado
            {promptOverride
              ? <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold">personalizado</span>
              : <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-[10px]">automático</span>
            }
          </summary>
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {promptOverride
                ? 'Usando prompt personalizado. Puedes usar {VOCABULARIO} como placeholder para tus palabras.'
                : 'Previsualización del prompt según la configuración actual. Edítalo para personalizar.'}
            </p>
            <textarea
              value={promptOverride || previewPrompt}
              onChange={e => setPromptOverride(e.target.value)}
              rows={12}
              className="w-full px-3 py-2.5 text-xs font-mono border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 resize-y focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(promptOverride || previewPrompt)
                  showToast('Prompt copiado', 'success')
                }}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
              >
                📋 Copiar
              </button>
              {promptOverride && (
                <button
                  onClick={() => setPromptOverride('')}
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold transition"
                >
                  ↩️ Restaurar automático
                </button>
              )}
            </div>
          </div>
        </details>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-sm text-rose-700 dark:text-rose-400 flex items-start gap-2">
            <span className="shrink-0">❌</span>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Texts list */}
      <div className="space-y-4">
        {state.contextTexts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <div className="text-5xl mb-3">📖</div>
            <p className="font-semibold text-slate-500 dark:text-slate-400">Elige un tema y pulsa Generar lectura</p>
            <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">Se guardarán las últimas 10 lecturas generadas</p>
          </div>
        ) : state.contextTexts.map(tx => (
          <TextCard
            key={tx.id}
            text={tx}
            userVocabSet={userVocabSet}
            onRemove={() => removeContextText(tx.id)}
          />
        ))}
      </div>
    </div>
  )
}

type FuriganaMode = 'all' | 'unknown' | 'none'

const LEVEL_BADGE: Record<string, string> = {
  // legacy values
  simple: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  normal: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  complejo: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  // JLPT values
  N5: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  N4: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  N3: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  N2: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  N1: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  'mis gramáticas': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
}

const FURIGANA_OPTIONS: { mode: FuriganaMode; label: string; hint: string }[] = [
  { mode: 'all', label: '👁️ Todos', hint: 'Mostrando todos los furigana' },
  { mode: 'unknown', label: '❓ Solo nuevas', hint: 'Solo palabras fuera de tu vocabulario' },
  { mode: 'none', label: '🙈 Ninguno', hint: 'Sin furigana' },
]

function TextCard({ text, userVocabSet, onRemove }: { text: ContextText; userVocabSet: Set<string>; onRemove: () => void }) {
  const [showTrans, setShowTrans] = useState<'es' | 'ca' | 'en' | null>(null)
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('all')
  const [promptCopied, setPromptCopied] = useState(false)

  function processJapanese(html: string) {
    if (!html) return ''
    return html.replace(/<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g, (_, kanji, reading) => {
      if (furiganaMode === 'none') return kanji
      if (furiganaMode === 'unknown' && userVocabSet.has(kanji.trim())) {
        return `<ruby style="ruby-align:center">${kanji}<rt style="font-size:0.55em"> </rt></ruby>`
      }
      return `<ruby style="ruby-align:center">${kanji}<rt style="font-size:0.55em;color:#818cf8">${reading}</rt></ruby>`
    })
  }

  function copyPrompt() {
    if (!text.promptUsed) return
    navigator.clipboard.writeText(text.promptUsed)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const createdDate = text.createdAt
    ? new Date(text.createdAt).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const currentHint = FURIGANA_OPTIONS.find(o => o.mode === furiganaMode)?.hint ?? ''

  const translations: { key: 'es' | 'ca' | 'en'; label: string; content: string }[] = [
    { key: 'es', label: '🇪🇸 Español', content: text.spanish },
    { key: 'ca', label: '🏴󠁥󠁳󠁣󠁴󠁿 Català', content: text.catalan },
    { key: 'en', label: '🇬🇧 English', content: text.english },
  ]

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">{text.emoji}</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">{text.topic}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${LEVEL_BADGE[text.level] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {text.level}
          </span>
          {createdDate && (
            <span className="text-xs text-slate-400 dark:text-slate-500">· {createdDate}</span>
          )}
        </div>
        <button onClick={onRemove} className="text-slate-300 dark:text-slate-600 hover:text-rose-400 dark:hover:text-rose-400 font-bold transition text-lg">✕</button>
      </div>

      {/* Furigana mode */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FURIGANA_OPTIONS.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setFuriganaMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              furiganaMode === mode
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-slate-400 dark:text-slate-500">{currentHint}</span>
      </div>

      {/* Japanese text */}
      <p
        className="kanji-font text-xl md:text-2xl leading-loose text-slate-800 dark:text-slate-100 mb-3"
        dangerouslySetInnerHTML={{ __html: processJapanese(text.japanese) }}
      />

      {/* Words used */}
      {text.words_used?.length > 0 && (
        <p className="text-xs text-indigo-400 dark:text-indigo-400 mb-3">
          📝 Vocabulario: <span className="font-medium">{text.words_used.join(' · ')}</span>
        </p>
      )}

      {/* Translation buttons */}
      <div className="flex flex-wrap gap-2 mb-2">
        {translations.map(tr => (
          <button
            key={tr.key}
            onClick={() => setShowTrans(showTrans === tr.key ? null : tr.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              showTrans === tr.key
                ? 'bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400'
            }`}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {showTrans && (
        <div className="mb-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {translations.find(tr => tr.key === showTrans)?.content || '—'}
        </div>
      )}

      {/* Prompt used */}
      {text.promptUsed && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 select-none">
            🔍 Ver prompt usado
          </summary>
          <div className="mt-2">
            <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 whitespace-pre-wrap text-slate-600 dark:text-slate-400 max-h-40 overflow-y-auto">
              {text.promptUsed}
            </pre>
            <button
              onClick={copyPrompt}
              className="mt-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              {promptCopied ? '✅ Copiado' : '📋 Copiar prompt'}
            </button>
          </div>
        </details>
      )}
    </div>
  )
}
