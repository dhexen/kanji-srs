'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import type { ContextText } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'
import { supabase, fetchKnownGrammar, fetchAllGrammarSrsStats, fetchWaniKaniVocabSample } from '@/lib/supabase'
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
  ownVocab: string,
  wkVocab = '',
): string {
  const levelInfo = JLPT_LEVELS.find(l => l.v === jlptLevel)
  const grammarSection = useMyGrammar
    ? `Prioriza el uso de estas estructuras gramaticales que el usuario está aprendiendo: ${grammarPatternsText || 'gramática básica'}.`
    : `Nivel gramatical JLPT: hasta ${jlptLevel} (${levelInfo?.d ?? ''}). Usa únicamente estructuras gramaticales de ese nivel o inferiores.`

  const hasOwn = ownVocab.trim().length > 0
  const hasWk = wkVocab.trim().length > 0
  // WaniKani vocab can include very formal, technical, work-related or archaic
  // words; warn the model to only use them where the register fits.
  const wkRegisterNote = 'Ten en cuenta que parte del vocabulario de WaniKani puede ser muy formal, técnico, del ámbito laboral o arcaico: úsalo SOLO cuando encaje de forma natural en el contexto y el registro del texto; si no encaja, prioriza el resto de vocabulario.'

  let vocabSection: string
  if (hasOwn && hasWk) {
    vocabSection = `Usa el mayor número posible de estas palabras de vocabulario que el usuario está aprendiendo o ya ha aprendido:
- Vocabulario de la página (aprendiendo/aprendido): ${ownVocab}
- Vocabulario WaniKani del alumno (ya adquirido): ${wkVocab}
${wkRegisterNote}`
  } else if (hasWk) {
    vocabSection = `Usa el mayor número posible de estas palabras de vocabulario de WaniKani del alumno (ya adquirido): ${wkVocab}.
${wkRegisterNote}`
  } else {
    vocabSection = `Usa el mayor número posible de estas palabras de vocabulario: ${ownVocab}.`
  }

  return `Eres profesor de japonés experto. Genera un texto narrativo en japonés sobre "${topic}" con exactamente 4-5 frases.
${grammarSection}
${vocabSection}

Control de calidad obligatorio:
- El texto debe ser narrativamente coherente: las frases se conectan formando una historia o descripción continua con sentido.
- El nivel gramatical debe ser consistente en todo el texto, sin mezclar estructuras de niveles incompatibles.
- El vocabulario debe integrarse de forma natural, sin forzar palabras que no encajen en el contexto.
- ESCRITURA EN KANJI: escribe cada palabra con sus kanji habituales y completos. No la escribas en hiragana/katakana ni omitas kanji que normalmente se escriben (p. ej. escribe 食べる, no たべる; 学校, no がっこう). Añade furigana en formato ruby sobre TODOS los kanji, sin excepción.
Sé creativo y diferente cada vez.

Responde ÚNICAMENTE con este JSON (sin backticks, sin texto extra):
{
  "japanese": "texto completo en japonés; cada palabra escrita con sus kanji habituales y con furigana ruby en TODOS los kanji: <ruby>漢字<rt>かんじ</rt></ruby>",
  "spanish": "traducción al español de España",
  "catalan": "traducció al català",
  "english": "English translation",
  "words_used": ["palabra1", "palabra2"]
}`
}

function stripRubyHtml(html: string): string {
  return html
    .replace(/<ruby>([^<]*)<rt>[^<]*<\/rt><\/ruby>/g, '$1')
    .replace(/<[^>]*>/g, '')
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ─── Types for grammar analysis ───────────────────────────────────────────────

interface GrammarPoint {
  type: string
  pattern: string
  name: string
  color: string
  explanation: string
}

interface Segment {
  text: string
  type: string | null
}

interface SentenceAnalysis {
  text: string
  segments: Segment[]
  grammar_points: GrammarPoint[]
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ContextClient() {
  const { state, addContextText, removeContextText } = useStore()
  const lang = state.lang
  const [topic, setTopic] = useState(TOPICS[0].v)
  const [jlptLevel, setJlptLevel] = useState('N4')
  const [useMyGrammar, setUseMyGrammar] = useState(false)
  const [promptOverride, setPromptOverride] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [useOwnVocab, setUseOwnVocab] = useState(() => {
    // Default ON; only off if the user explicitly turned it off before.
    try { return localStorage.getItem('ctx_use_own_vocab') !== 'false' } catch { return true }
  })
  const [useWkVocab, setUseWkVocab] = useState(() => {
    try { return localStorage.getItem('ctx_use_wk_vocab') === 'true' } catch { return false }
  })
  const [wkVocab, setWkVocab] = useState<{ jp: string; reading: string; meaning: string }[]>([])

  const hasWaniKani = Boolean(state.waniKaniApiKey)
  const activeWords = state.db.filter(i => i.status === 'active')
  const userVocabSet = useMemo(() => new Set(state.db.map(i => i.kanji)), [state.db])

  // Load WaniKani vocabulary when the toggle is on
  useEffect(() => {
    if (!hasWaniKani || !useWkVocab) return
    fetchWaniKaniVocabSample(40).then(items => {
      setWkVocab(items.map(w => ({
        jp: w.word,
        reading: w.reading,
        meaning:
          lang === 'ca' ? (w.meaning_ca ?? w.meaning_en) :
          lang === 'en' ? w.meaning_en :
          (w.meaning_es ?? w.meaning_en),
      })))
    }).catch(() => {})
  }, [hasWaniKani, useWkVocab, lang])

  const previewPrompt = useMemo(() => {
    const example = activeWords[0]
    const ownPlaceholder = useOwnVocab
      ? (activeWords.length > 0
          ? `${example?.jp}(${example?.reading}): ${example?.meaning}, … [hasta 20 palabras de tu vocabulario activo]`
          : '[tus palabras de vocabulario activo]')
      : ''
    const wkPlaceholder = useWkVocab && wkVocab.length > 0
      ? `${wkVocab[0]?.jp}(${wkVocab[0]?.reading}): ${wkVocab[0]?.meaning}, … [hasta 15 palabras de WaniKani]`
      : ''
    return buildAutoPrompt(topic, jlptLevel, useMyGrammar, '[tus gramáticas aprendidas]', ownPlaceholder, wkPlaceholder)
  }, [topic, jlptLevel, useMyGrammar, activeWords, useOwnVocab, useWkVocab, wkVocab])

  async function generate() {
    const key = state.geminiApiKey
    if (!key) { showToast(t(lang, 'api_missing_banner'), 'error'); return }

    const wantOwn = useOwnVocab
    const wantWk = useWkVocab && hasWaniKani
    if (!wantOwn && !wantWk) {
      setErrorMsg('Marca al menos "Incluir vocabulario" o "Incluir vocabulario de WaniKani".')
      showToast('Selecciona un tipo de vocabulario', 'error')
      return
    }
    if (wantOwn && !wantWk && activeWords.length === 0) {
      showToast(t(lang, 'review_no_words'), 'error')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      // Collect words used in the last 5 texts to avoid repetition
      const recentlyUsed = new Set(
        state.contextTexts.slice(0, 5).flatMap(ct => ct.words_used ?? [])
      )

      // Own (page) vocabulary — only when that source is selected.
      let vocab = ''
      if (wantOwn) {
        const freshWords = activeWords.filter(w => !recentlyUsed.has(w.jp))
        const usedWords = activeWords.filter(w => recentlyUsed.has(w.jp))
        const selected = [...shuffleArray(freshWords), ...shuffleArray(usedWords)].slice(0, 20)
        vocab = selected.map(w => `${w.jp}(${w.reading}): ${w.meaning}`).join(', ')
      }

      const wkVocabText = wantWk && wkVocab.length > 0
        ? [...wkVocab].sort(() => Math.random() - 0.5).slice(0, 15).map(w => `${w.jp}(${w.reading}): ${w.meaning}`).join(', ')
        : ''

      if (!vocab && !wkVocabText) {
        throw new Error('No hay vocabulario disponible para generar el texto. Añade palabras o sincroniza WaniKani.')
      }

      let prompt: string
      if (promptOverride.trim()) {
        prompt = promptOverride
          .replace('{VOCABULARIO}', vocab)
          .replace('{WANIKANI}', wkVocabText)
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
        prompt = buildAutoPrompt(topic, jlptLevel, useMyGrammar, grammarPatternsText, vocab, wkVocabText)
      }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ prompt, model: state.geminiModel, userApiKey: key }),
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

        {/* Vocabulary source toggles */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
          {/* Own (page) vocabulary */}
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={useOwnVocab}
              onChange={e => {
                const v = e.target.checked
                setUseOwnVocab(v)
                try { localStorage.setItem('ctx_use_own_vocab', String(v)) } catch { /* incognito */ }
              }}
              className="w-4 h-4 rounded accent-indigo-500"
            />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition">
              Incluir vocabulario
            </span>
            {useOwnVocab && activeWords.length > 0 && (
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-full px-1.5 py-0.5">
                {activeWords.length} palabras
              </span>
            )}
          </label>

          {/* WaniKani vocabulary */}
          {hasWaniKani && (
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={useWkVocab}
                onChange={e => {
                  const v = e.target.checked
                  setUseWkVocab(v)
                  try { localStorage.setItem('ctx_use_wk_vocab', String(v)) } catch { /* incognito */ }
                }}
                className="w-4 h-4 rounded accent-pink-500"
              />
              <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 group-hover:text-pink-700 dark:group-hover:text-pink-300 transition">
                Incluir vocabulario de WaniKani
              </span>
              {useWkVocab && wkVocab.length > 0 && (
                <span className="text-[10px] bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800 rounded-full px-1.5 py-0.5">
                  {wkVocab.length} palabras
                </span>
              )}
            </label>
          )}
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
                ? 'Usando prompt personalizado. Placeholders: {VOCABULARIO} para tus palabras y {WANIKANI} para el vocabulario de WaniKani.'
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
            geminiApiKey={state.geminiApiKey}
            geminiModel={state.geminiModel}
            onRemove={() => removeContextText(tx.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Constants & helpers for TextCard ─────────────────────────────────────────

type FuriganaMode = 'all' | 'unknown' | 'none'

const LEVEL_BADGE: Record<string, string> = {
  simple: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  normal: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  complejo: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
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

function buildAnalysisPrompt(cleanJapanese: string): string {
  return `Eres un sensei de japonés experto enseñando a alumnos hispanohablantes de nivel principiante e intermedio.
Analiza gramaticalmente CADA frase del siguiente texto japonés.

Texto:
${cleanJapanese}

Para cada frase, divide el texto en segmentos individuales (partículas, morfemas verbales, expresiones gramaticales) y clasifica los elementos gramaticales clave.
Reglas importantes:
- Usa el mismo "type" para el mismo tipo de elemento (ej. todas las partículas de tema は = "particle_ha").
- Los segmentos de vocabulario puro sin función gramatical especial llevan type: null.
- Asigna un color hexadecimal vibrante y único a cada tipo gramatical (no repitas colores entre tipos distintos).
- Las explicaciones deben ser breves (1-2 frases), pedagógicas y en español, como las daría un sensei paciente.
- Céntrate en los puntos gramaticales más importantes de cada frase, no es necesario anotar cada partícula trivial.

Responde ÚNICAMENTE con este JSON (sin backticks, sin texto extra):
{
  "sentences": [
    {
      "text": "frase original completa sin HTML",
      "segments": [
        { "text": "segmento", "type": "tipo_o_null" }
      ],
      "grammar_points": [
        {
          "type": "tipo_identificador",
          "pattern": "elemento como aparece en la frase",
          "name": "nombre del punto gramatical en español",
          "color": "#hexcolor",
          "explanation": "explicación breve y pedagógica en español"
        }
      ]
    }
  ]
}`
}

// ─── TextCard ─────────────────────────────────────────────────────────────────

function TextCard({ text, userVocabSet, geminiApiKey, geminiModel, onRemove }: {
  text: ContextText
  userVocabSet: Set<string>
  geminiApiKey: string
  geminiModel: string
  onRemove: () => void
}) {
  const [showTrans, setShowTrans] = useState<'es' | 'ca' | 'en' | null>(null)
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('all')
  const [promptCopied, setPromptCopied] = useState(false)
  const [analysisData, setAnalysisData] = useState<SentenceAnalysis[] | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const analysisLoadedRef = useRef(false)

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

  async function loadAnalysis() {
    if (analysisLoadedRef.current || loadingAnalysis || !geminiApiKey) return
    analysisLoadedRef.current = true
    setLoadingAnalysis(true)
    setAnalysisError('')
    try {
      const cleanJapanese = stripRubyHtml(text.japanese)
      const prompt = buildAnalysisPrompt(cleanJapanese)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ prompt, model: geminiModel, userApiKey: geminiApiKey }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Error ${res.status}`)
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const clean = data.text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setAnalysisData(parsed.sentences as SentenceAnalysis[])
    } catch (e: any) {
      setAnalysisError(e.message || 'Error al analizar')
      analysisLoadedRef.current = false
    } finally {
      setLoadingAnalysis(false)
    }
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

      {/* Grammar analysis */}
      <details
        className="mt-3"
        onToggle={e => {
          if ((e.target as HTMLDetailsElement).open) loadAnalysis()
        }}
      >
        <summary className="cursor-pointer text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-violet-500 dark:hover:text-violet-400 select-none flex items-center gap-1.5">
          🎓 Análisis gramatical
          {!geminiApiKey && <span className="text-amber-500">(requiere API key)</span>}
        </summary>
        <div className="mt-3 space-y-4">
          {loadingAnalysis && (
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 p-3">
              <span className="animate-spin inline-block">⏳</span>
              El sensei está analizando la gramática...
            </div>
          )}
          {analysisError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              ❌ {analysisError}
              <button
                onClick={() => { analysisLoadedRef.current = false; loadAnalysis() }}
                className="ml-2 underline"
              >
                Reintentar
              </button>
            </div>
          )}
          {analysisData?.map((sentence, idx) => (
            <SentenceBlock key={idx} sentence={sentence} />
          ))}
        </div>
      </details>

      {/* Prompt used */}
      {text.promptUsed && (
        <details className="mt-3">
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

// ─── SentenceBlock ─────────────────────────────────────────────────────────────

function SentenceBlock({ sentence }: { sentence: SentenceAnalysis }) {
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Highlighted sentence */}
      <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3">
        <p className="kanji-font text-lg md:text-xl leading-loose text-slate-800 dark:text-slate-100">
          {sentence.segments.map((seg, i) => {
            if (!seg.type) return <span key={i}>{seg.text}</span>
            const gp = sentence.grammar_points.find(g => g.type === seg.type)
            if (!gp) return <span key={i}>{seg.text}</span>
            return (
              <span
                key={i}
                title={gp.name}
                style={{
                  backgroundColor: gp.color,
                  color: 'white',
                  padding: '1px 5px',
                  borderRadius: '5px',
                  margin: '0 1px',
                  fontWeight: 600,
                  cursor: 'default',
                }}
              >
                {seg.text}
              </span>
            )
          })}
        </p>
      </div>

      {/* Grammar legend */}
      {sentence.grammar_points.length > 0 && (
        <div className="px-4 py-3 space-y-2.5">
          {sentence.grammar_points.map((gp, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span
                className="shrink-0 mt-1 inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: gp.color }}
              />
              <div className="text-xs leading-relaxed">
                <span className="font-bold text-slate-700 dark:text-slate-200 mr-1">{gp.pattern}</span>
                <span className="text-slate-400 dark:text-slate-500">—</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300 ml-1">{gp.name}</span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{gp.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
