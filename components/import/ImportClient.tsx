'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem } from '@/lib/srs'
import { showToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const GRADES = [
  { label: '1.º Primaria (80)', value: '1.º de Primaria (小学1年生)' },
  { label: '2.º Primaria (160)', value: '2.º de Primaria (小学2年生)' },
  { label: '3.º Primaria (200)', value: '3.º de Primaria (小学3年生)' },
  { label: '4.º Primaria (202)', value: '4.º de Primaria (小学4年生)' },
  { label: '5.º Primaria (193)', value: '5.º de Primaria (小学5年生)' },
  { label: '6.º Primaria (191)', value: '6.º de Primaria (小学6年生)' },
  { label: '1.º Secundaria (316)', value: '1.º de Secundaria (中学1年生)' },
  { label: '2.º Secundaria (285)', value: '2.º de Secundaria (中学2年生)' },
  { label: '3.º Secundaria (333)', value: '3.º de Secundaria (中学3年生)' },
]

const MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro (Máxima precisión)' },
]

export default function ImportClient() {
  const { state, addVocabItems } = useStore()
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('kanji_srs_gemini_api_key') || '' } catch { return '' }
  })
  const effectiveKey = apiKey || state.geminiApiKey
  const [model, setModel] = useState('gemini-2.5-flash')
  const [grade, setGrade] = useState(GRADES[0].value)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState('')

  function saveKey(k: string) {
    setApiKey(k)
    try { localStorage.setItem('kanji_srs_gemini_api_key', k) } catch {}
  }

  async function callGemini(prompt: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ prompt, model, userApiKey: effectiveKey }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return JSON.parse(data.text)
  }

  async function addItems(items: any[]) {
    const newItems: VocabItem[] = items.map(i => ({
      kanji: i.kanji || i.jp?.substring(0, 1),
      jp: i.jp, reading: i.reading, meaning: i.meaning,
      srsLevel: 0, due: 0, status: 'locked',
    }))
    await addVocabItems(newItems)
    return newItems.length
  }

  async function importGrade() {
    if (!apiKey) { showToast('Introduce tu API Key de Gemini', 'error'); return }
    setLoading(true)
    setLog(`Extrayendo vocabulario de ${grade}...`)
    try {
      const prompt = `Eres un experto en japonés. Extrae 10 vocablos representativos del curso "${grade}" japonés. Para cada uno proporciona: kanji (un solo carácter), jp (palabra completa), reading (hiragana), meaning (español). Responde SOLO con JSON array.`
      const items = await callGemini(prompt)
      const added = await addItems(items)
      setLog(`✅ ${added} palabras añadidas`)
      showToast(`¡${added} palabras importadas de ${grade}!`, 'success')
    } catch (e: any) {
      setLog(`❌ Error: ${e.message}`)
      showToast('Error en la importación', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function importFromURL() {
    if (!apiKey || !url) { showToast('Introduce URL y API Key', 'error'); return }
    setLoading(true)
    setLog(`Extrayendo vocabulario de ${url}...`)
    try {
      const prompt = `Lee el contenido de ${url} y extrae 5-12 vocablos japoneses importantes con su traducción al español y lectura en hiragana. Responde SOLO con JSON array: [{kanji, jp, reading, meaning}]`
      const items = await callGemini(prompt)
      const added = await addItems(items)
      setLog(`✅ ${added} palabras añadidas desde la URL`)
      showToast(`¡${added} palabras importadas!`, 'success')
    } catch (e: any) {
      setLog(`❌ Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* API config */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-1">⚡ Configuración del Importador IA</h3>
        <p className="text-slate-500 text-xs mb-4">
          Necesitas una API Key de Gemini gratuita de{' '}
          <a href="https://aistudio.google.com/" target="_blank" className="text-indigo-600 underline">Google AI Studio</a>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">API Key de Gemini</label>
            <input type="password" value={apiKey} onChange={e => saveKey(e.target.value)} placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Modelo</label>
            <select value={model} onChange={e => setModel(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500">
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grade import */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg mb-3">🏫</div>
            <h3 className="text-lg font-bold text-slate-800">Kanjis Oficiales por Curso</h3>
            <p className="text-slate-500 text-xs mt-1">Importa vocabulario oficial del currículo japonés con IA.</p>
          </div>
          <select value={grade} onChange={e => setGrade(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white">
            {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <button onClick={importGrade} disabled={loading}
            className="py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition">
            {loading ? '⏳ Importando...' : '⚡ Importar con IA'}
          </button>
        </div>

        {/* URL import */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg mb-3">🌐</div>
            <h3 className="text-lg font-bold text-slate-800">Importar desde URL</h3>
            <p className="text-slate-500 text-xs mt-1">Extrae vocabulario de cualquier web japonesa.</p>
          </div>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
            className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" />
          <button onClick={importFromURL} disabled={loading}
            className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition">
            {loading ? '⏳ Extrayendo...' : '🌐 Extraer vocabulario'}
          </button>
        </div>
      </div>

      {log && (
        <div className="bg-slate-900 text-emerald-400 font-mono text-sm p-4 rounded-xl">
          {log}
        </div>
      )}
    </div>
  )
}
