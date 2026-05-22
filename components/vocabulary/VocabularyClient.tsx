'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, migrateItem } from '@/lib/srs'
import { getRandomKanjis, getVocabularyByKanjis } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'

const PACK_SIZES = [
  { label: '3 kanjis', value: 3, desc: 'Ideal para empezar (9 palabras)' },
  { label: '5 kanjis', value: 5, desc: 'Sesión corta (15 palabras)' },
  { label: '15 kanjis', value: 15, desc: 'Sesión completa (45 palabras)' },
]

const GRADES = [
  { label: '1º Primaria', value: 1 },
]

export default function VocabularyClient() {
  const { state, dispatch } = useStore()
  const [packSize, setPackSize] = useState(3)
  const [grade, setGrade] = useState(1)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [previewKanjis, setPreviewKanjis] = useState<string[]>([])
  const [step, setStep] = useState<'select' | 'preview'>('select')

  const existingWords = new Set(state.db.map(i => i.jp))
  const activeKanjis = new Set(state.db.map(i => i.kanji))

  async function loadPreview() {
    if (!state.user) { showToast('Inicia sesión para importar vocabulario', 'error'); return }
    setLoading(true)
    try {
      // Get random kanjis not already fully in the user's db
      const kanjis = await getRandomKanjis(packSize * 3, grade) // get more to filter
      const newKanjis = kanjis.filter((k: string) => !activeKanjis.has(k)).slice(0, packSize)
      
      if (newKanjis.length === 0) {
        showToast('¡Ya tienes todos los kanjis de este nivel! Prueba con otro nivel.', 'info')
        setLoading(false)
        return
      }

      const vocab = await getVocabularyByKanjis(newKanjis)
      const newVocab = vocab.filter((v: any) => !existingWords.has(v.word))
      
      setPreview(newVocab)
      setPreviewKanjis(newKanjis)
      setStep('preview')
    } catch (e) {
      showToast('Error cargando vocabulario', 'error')
    } finally {
      setLoading(false)
    }
  }

  function addToStudy() {
    const now = Date.now()
    const newItems: VocabItem[] = preview
      .filter(v => !existingWords.has(v.word))
      .map(v => {
        const item: VocabItem = {
          kanji: v.kanji,
          jp: v.word,
          reading: v.reading,
          meaning: v.meaning_es,
          srsLevel: 0,
          due: 0,
          status: 'locked',
        }
        return item
      })

    dispatch({ type: 'ADD_ITEMS', payload: newItems })
    
    showToast(`✅ ${newItems.length} palabras añadidas a Estudiar Nuevos`, 'success')
    setStep('select')
    setPreview([])
  }

  // Group preview by kanji
  const grouped: Record<string, any[]> = {}
  preview.forEach(v => {
    if (!grouped[v.kanji]) grouped[v.kanji] = []
    grouped[v.kanji].push(v)
  })

  if (!state.user) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Inicia sesión para acceder</h2>
        <p className="text-slate-500 text-sm">Necesitas una cuenta para importar vocabulario y guardar tu progreso.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {step === 'select' && (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">📚 Importar Vocabulario Oficial</h2>
            <p className="text-slate-500 text-sm mb-6">
              Importa vocabulario del currículo japonés oficial. Solo se añadirán palabras que aún no tengas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Grade selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Curso</label>
                <div className="space-y-2">
                  {GRADES.map(g => (
                    <button key={g.value} onClick={() => setGrade(g.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 font-semibold text-sm text-left transition-all ${
                        grade === g.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}>
                      🏫 {g.label}
                      <span className="ml-2 opacity-70 font-normal text-xs">(80 kanjis · 240 palabras)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pack size selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cantidad</label>
                <div className="space-y-2">
                  {PACK_SIZES.map(p => (
                    <button key={p.value} onClick={() => setPackSize(p.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 font-semibold text-sm text-left transition-all ${
                        packSize === p.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                      }`}>
                      {p.label}
                      <span className="ml-2 opacity-70 font-normal text-xs">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{activeKanjis.size}</div>
                <div className="text-xs text-slate-400">Kanjis en tu lista</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{state.db.length}</div>
                <div className="text-xs text-slate-400">Palabras totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{80 - activeKanjis.size}</div>
                <div className="text-xs text-slate-400">Kanjis disponibles</div>
              </div>
            </div>

            <button onClick={loadPreview} disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition shadow-md flex items-center justify-center gap-2">
              {loading
                ? <><span className="animate-spin">⏳</span> Cargando...</>
                : <>📥 Cargar {packSize} kanjis nuevos</>}
            </button>
          </div>
        </>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Vista previa — {previewKanjis.length} kanjis nuevos</h3>
                <p className="text-slate-400 text-sm">{preview.filter(v => !existingWords.has(v.word)).length} palabras nuevas para añadir</p>
              </div>
              <button onClick={() => setStep('select')} className="text-slate-400 hover:text-slate-600 text-sm underline">
                ← Volver
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={addToStudy}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition">
                ✅ Añadir a Estudiar Nuevos
              </button>
              <button onClick={loadPreview} disabled={loading}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition text-sm">
                🔄 Otros kanjis
              </button>
            </div>
          </div>

          {/* Preview grouped by kanji */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scroll pr-1">
            {Object.entries(grouped).map(([kanji, words]) => (
              <div key={kanji} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-3 flex items-center gap-3">
                  <span className="kanji-font text-3xl font-bold text-slate-700">{kanji}</span>
                  <span className="text-xs text-slate-400">{words.length} palabras</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {words.map((w: any) => {
                    const alreadyHas = existingWords.has(w.word)
                    return (
                      <div key={w.word} className={`px-4 py-3 flex items-center gap-4 ${alreadyHas ? 'opacity-40' : ''}`}>
                        <span className="kanji-font text-xl font-bold text-slate-800 w-24">{w.word}</span>
                        <span className="text-indigo-600 font-semibold text-sm w-28">{w.reading}</span>
                        <span className="text-slate-500 text-sm flex-1">{w.meaning_es}</span>
                        {alreadyHas && <span className="text-xs text-slate-300 shrink-0">Ya la tienes</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
