'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import type { ContextText } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'
import { supabase } from '@/lib/supabase'

const TOPICS = [
  { v: 'vida cotidiana', e: '🏠' }, { v: 'viajes y transporte', e: '✈️' },
  { v: 'comida y restaurantes', e: '🍜' }, { v: 'naturaleza y estaciones', e: '🌸' },
  { v: 'escuela y estudio', e: '📚' }, { v: 'trabajo y negocios', e: '💼' },
  { v: 'familia y amigos', e: '👨‍👩‍👧' }, { v: 'ciudad y compras', e: '🏙️' },
  { v: 'salud y cuerpo', e: '🏥' }, { v: 'ocio y entretenimiento', e: '🎮' },
  { v: 'clima y tiempo', e: '⛅' }, { v: 'historia y cultura japonesa', e: '⛩️' },
]
const LEVELS = [
  { v: 'simple', l: '🟢 Simple', d: 'N5-N4' },
  { v: 'normal', l: '🟡 Normal', d: 'N4-N3' },
  { v: 'complejo', l: '🔴 Complejo', d: 'N3-N2' },
]

export default function ContextClient() {
  const { state, addContextText, removeContextText } = useStore()
  const lang = state.lang
  const [topic, setTopic] = useState(TOPICS[0].v)
  const [level, setLevel] = useState('normal')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const activeWords = state.db.filter(i => i.status === 'active')
  const userKanjis = useMemo(() => new Set(state.db.map(i => i.kanji)), [state.db])

  async function generate() {
    const key = state.geminiApiKey
    if (!key) { showToast(t(lang, 'api_missing_banner'), 'error'); return }
    if (activeWords.length === 0) { showToast(t(lang, 'review_no_words'), 'error'); return }

    setLoading(true)
    setErrorMsg('')
    try {
      const selected = [...activeWords].sort(() => Math.random() - 0.5).slice(0, 20)
      const vocab = selected.map(w => `${w.jp}(${w.reading}): ${w.meaning}`).join(', ')
      const levelDesc = { simple: 'N5-N4 frases cortas', normal: 'N4-N3 mezcla natural', complejo: 'N3-N2 literario' }[level] || ''

      const prompt = `Eres profesor de japonés experto. Genera un texto narrativo en japonés sobre "${topic}" con exactamente 4-5 frases.
Nivel: ${levelDesc}.
Usa el mayor número posible de estas palabras: ${vocab}.
Sé creativo y diferente cada vez.

Responde ÚNICAMENTE con este JSON (sin backticks, sin texto extra):
{
  "japanese": "texto completo en japonés con furigana en formato ruby HTML: <ruby>漢字<rt>かんじ</rt></ruby>",
  "spanish": "traducción al español de España",
  "catalan": "traducció al català",
  "english": "English translation",
  "words_used": ["palabra1", "palabra2"]
}`

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

      const emoji = TOPICS.find(t => t.v === topic)?.e || '📖'
      const newText: ContextText = {
        id: Date.now(),
        topic, emoji, level,
        japanese: parsed.japanese,
        spanish: parsed.spanish || '',
        catalan: parsed.catalan || '',
        english: parsed.english || '',
        words_used: parsed.words_used || [],
      }

      await addContextText(newText)
      showToast('¡Texto generado!', 'success')
    } catch (e: any) {
      const msg = e.message || 'Error desconocido'
      setErrorMsg(msg)
      showToast('Error generando texto', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back to dashboard */}
      <Link href="/review" className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
        ← Dashboard
      </Link>

      {/* Config panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">💬 Textos en Contexto con IA</h2>
          <SectionHelp section="context" lang={lang} />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Genera textos en japonés usando tu vocabulario aprendido. Se guardan las últimas 10 frases.</p>

        {/* API Key banner */}
        {!state.geminiApiKey && (
          <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">🔑 {t(lang, 'api_missing_banner')}</p>
            </div>
            <Link
              href="/stats"
              className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
            >
              {t(lang, 'api_go_settings')}
            </Link>
          </div>
        )}

        {/* Topic + Level + Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tema</label>
            <select value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              {TOPICS.map(t => <option key={t.v} value={t.v}>{t.e} {t.v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Dificultad</label>
            <select value={level} onChange={e => setLevel(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              {LEVELS.map(l => <option key={l.v} value={l.v}>{l.l} ({l.d})</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generate} disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2">
              {loading
                ? <><span className="animate-spin inline-block">⏳</span> Generando...</>
                : '✨ Generar texto'}
            </button>
          </div>
        </div>

        {/* Error message */}
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
          <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500">
            <div className="text-5xl mb-3">📖</div>
            <p className="font-semibold text-slate-500 dark:text-slate-400">Elige un tema y pulsa Generar texto</p>
            <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">Se guardarán las últimas 10 frases generadas</p>
          </div>
        ) : state.contextTexts.map(t => (
          <TextCard
            key={t.id}
            text={t}
            userKanjis={userKanjis}
            onRemove={() => removeContextText(t.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TextCard({ text, userKanjis, onRemove }: { text: ContextText; userKanjis: Set<string>; onRemove: () => void }) {
  const [showTrans, setShowTrans] = useState<'es' | 'ca' | 'en' | null>(null)
  const [showFurigana, setShowFurigana] = useState(false)
  const [showOnlyUnknown, setShowOnlyUnknown] = useState(false)

  const badge: Record<string, string> = {
    simple: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    normal: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    complejo: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  }

  function processJapanese(html: string) {
    if (!html) return ''
    return html.replace(/<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g, (_, kanji, reading) => {
      const shouldShow = showFurigana && (!showOnlyUnknown || !userKanjis.has(kanji.trim()))
      if (shouldShow) {
        return `<ruby style="ruby-align:center">${kanji}<rt style="font-size:0.55em;color:#6366f1">${reading}</rt></ruby>`
      }
      return kanji
    })
  }

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
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${badge[text.level] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{text.level}</span>
        </div>
        <button onClick={onRemove} className="text-slate-300 dark:text-slate-600 hover:text-rose-400 dark:hover:text-rose-400 font-bold transition text-lg">✕</button>
      </div>

      {/* Furigana controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowFurigana(s => !s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showFurigana ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700'}`}
        >
          {showFurigana ? '🈶 Furigana visible' : '🈚 Furigana oculto'}
        </button>
        {showFurigana && (
          <button
            onClick={() => setShowOnlyUnknown(s => !s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showOnlyUnknown ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700'}`}
          >
            {showOnlyUnknown ? '👁️ Solo kanjis nuevos' : '👁️ Todos los kanjis'}
          </button>
        )}
      </div>

      {/* Japanese text with furigana */}
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
      <div className="flex flex-wrap gap-2">
        {translations.map(tr => (
          <button
            key={tr.key}
            onClick={() => setShowTrans(showTrans === tr.key ? null : tr.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showTrans === tr.key ? 'bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400'}`}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* Translation content */}
      {showTrans && (
        <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {translations.find(t => t.key === showTrans)?.content || '—'}
        </div>
      )}
    </div>
  )
}
