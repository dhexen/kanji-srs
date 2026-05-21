'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'

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

interface GeneratedText { topic: string; emoji: string; level: string; japanese: string; spanish: string; words_used: string[] }

export default function ContextClient() {
  const { state } = useStore()
  const [topic, setTopic] = useState(TOPICS[0].v)
  const [level, setLevel] = useState('normal')
  const [loading, setLoading] = useState(false)
  const [texts, setTexts] = useState<GeneratedText[]>([])

  const activeWords = state.db.filter(i => i.status === 'active')

  async function generate() {
    const apiKey = (() => { try { return localStorage.getItem('kanji_srs_gemini_api_key') || '' } catch { return '' } })()
    if (!apiKey) { showToast('Configura tu API Key en el Importador IA', 'error'); return }
    if (activeWords.length === 0) { showToast('Activa palabras en el ciclo SRS primero', 'error'); return }

    setLoading(true)
    try {
      const selected = [...activeWords].sort(() => Math.random() - 0.5).slice(0, 20)
      const vocab = selected.map(w => `${w.jp}(${w.reading}): ${w.meaning}`).join(', ')
      const levelDesc = { simple: 'N5-N4 frases cortas', normal: 'N4-N3 mezcla natural', complejo: 'N3-N2 literario' }[level]

      const prompt = `Eres profesor de japonés. Genera un texto narrativo sobre "${topic}" con 4-5 frases, nivel ${levelDesc}, usando el mayor número posible de estas palabras: ${vocab}. Sé creativo y diferente cada vez. Responde SOLO con este JSON: {"japanese":"...","spanish":"...","words_used":["palabra1"]}`

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userApiKey: apiKey }),
      })
      const data = await res.json()
      const parsed = JSON.parse(data.text.replace(/```json|```/g, '').trim())
      const emoji = TOPICS.find(t => t.v === topic)?.e || '📖'
      setTexts(prev => [{ topic, emoji, level, ...parsed }, ...prev])
      showToast('¡Texto generado!', 'success')
    } catch (e) {
      showToast('Error generando texto', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">💬 Textos en Contexto con IA</h2>
        <p className="text-slate-500 text-sm mb-5">Genera textos en japonés usando tu vocabulario aprendido.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Tema</label>
            <select value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500">
              {TOPICS.map(t => <option key={t.v} value={t.v}>{t.e} {t.v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Dificultad</label>
            <select value={level} onChange={e => setLevel(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500">
              {LEVELS.map(l => <option key={l.v} value={l.v}>{l.l} ({l.d})</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generate} disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2">
              {loading ? <><span className="animate-spin">⏳</span> Generando...</> : '✨ Generar texto'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {texts.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-400">
            <div className="text-5xl mb-3">📖</div>
            <p className="font-semibold text-slate-500">Elige un tema y pulsa Generar texto</p>
          </div>
        ) : texts.map((t, i) => <TextCard key={i} text={t} onRemove={() => setTexts(prev => prev.filter((_, j) => j !== i))} />)}
      </div>
    </div>
  )
}

function TextCard({ text, onRemove }: { text: GeneratedText; onRemove: () => void }) {
  const [showTrans, setShowTrans] = useState(false)
  const badge = { simple: 'bg-emerald-100 text-emerald-700', normal: 'bg-amber-100 text-amber-700', complejo: 'bg-rose-100 text-rose-700' }[text.level] || ''
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{text.emoji}</span>
          <span className="text-sm font-bold text-slate-700 capitalize">{text.topic}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${badge}`}>{text.level}</span>
        </div>
        <button onClick={onRemove} className="text-slate-300 hover:text-rose-400 font-bold transition">✕</button>
      </div>
      <p className="kanji-font text-xl md:text-2xl leading-relaxed text-slate-800 mb-3">{text.japanese}</p>
      {text.words_used?.length > 0 && (
        <p className="text-xs text-indigo-400 mb-3">📝 Vocabulario: <span className="font-medium">{text.words_used.join(' · ')}</span></p>
      )}
      <button onClick={() => setShowTrans(s => !s)} className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition">
        👁️ {showTrans ? 'Ocultar' : 'Ver'} traducción
      </button>
      {showTrans && <p className="mt-3 pt-3 border-t border-dashed border-indigo-100 text-sm text-slate-600 leading-relaxed">{text.spanish}</p>}
    </div>
  )
}
