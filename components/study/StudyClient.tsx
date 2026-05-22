'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, SRS_INTERVALS, migrateItem } from '@/lib/srs'
import { showToast } from '@/components/ui/Toast'

export default function StudyClient() {
  const { state, dispatch } = useStore()
  const [form, setForm] = useState({ kanji: '', jp: '', reading: '', meaning: '' })

  const locked = state.db.filter(i => i.status === 'locked')

  // Group by kanji
  const groups: Record<string, VocabItem[]> = {}
  locked.forEach(item => {
    if (!groups[item.kanji]) groups[item.kanji] = []
    groups[item.kanji].push(item)
  })

  function addManual() {
    const { kanji, jp, reading, meaning } = form
    if (!kanji || !jp || !reading || !meaning) { showToast('Rellena todos los campos', 'error'); return }
    if (state.db.some(d => d.jp === jp)) { showToast('Esa palabra ya existe', 'error'); return }
    const newItem: VocabItem = { kanji, jp, reading, meaning, srsLevel: 0, due: 0, status: 'locked' }
    dispatch({ type: 'ADD_ITEMS', payload: [newItem] })
    
    setForm({ kanji: '', jp: '', reading: '', meaning: '' })
    showToast('Palabra añadida', 'success')
  }

  function activateAll() {
    const now = Date.now()
    const activated = state.db.map(item => {
      if (item.status !== 'locked') return item
      const activated: VocabItem = { ...item, status: 'active', srsLevel: 1, due: now }
      Object.values(MODE_CONFIG).forEach(cfg => {
        ;(activated as any)[cfg.key + '_level'] = 1
        ;(activated as any)[cfg.key + '_due'] = now
      })
      return migrateItem(activated)
    })
    dispatch({ type: 'SET_DB', payload: activated })
    
    showToast(`${locked.length} palabras activadas`, 'success')
  }

  function skipKanji(kanjiChar: string) {
    const far = Date.now() + 365 * 10 * 24 * 60 * 60 * 1000
    const updated = state.db.map(item => {
      if (item.kanji !== kanjiChar || item.status !== 'locked') return item
      const upd: VocabItem = { ...item, status: 'active', srsLevel: 7, due: far }
      Object.values(MODE_CONFIG).forEach(cfg => {
        ;(upd as any)[cfg.key + '_level'] = 7
        ;(upd as any)[cfg.key + '_due'] = far
      })
      return upd
    })
    dispatch({ type: 'SET_DB', payload: updated })
    
    showToast(`Kanji ${kanjiChar} marcado como dominado`, 'success')
  }

  return (
    <div className="space-y-6">
      {/* Manual add */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-3">✍️ Añadir Palabra Manualmente</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {(['kanji', 'jp', 'reading', 'meaning'] as const).map(field => (
            <input key={field} type="text" autoComplete="off" value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={{ kanji: 'Kanji (日)', jp: 'Palabra (三日)', reading: 'Lectura (みっか)', meaning: 'Significado' }[field]}
              className="px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          ))}
        </div>
        <button onClick={addManual} className="mt-3 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition">
          ＋ Añadir
        </button>
      </div>

      {/* Locked words list */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">📖 Palabras Pendientes de Estudio</h2>
        <p className="text-slate-500 text-sm mb-6">Estudia estas palabras antes de activarlas en el ciclo SRS.</p>

        <div className="space-y-6 max-h-[500px] overflow-y-auto custom-scroll pr-2">
          {Object.keys(groups).length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-4xl mb-2">🎓</p>
              <p className="font-bold text-slate-700">No hay palabras bloqueadas</p>
              <p className="text-slate-500 text-sm">Usa el Importador IA o añade palabras manualmente.</p>
            </div>
          ) : Object.entries(groups).map(([kanjiChar, words]) => (
            <div key={kanjiChar} className="border border-slate-100 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="kanji-font text-3xl font-bold text-slate-700">{kanjiChar}</span>
                  <span className="text-xs text-slate-400">{words.length} palabras</span>
                </div>
                <button onClick={() => skipKanji(kanjiChar)} className="text-xs text-slate-400 hover:text-indigo-600 transition">
                  Marcar como dominado →
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {words.map(w => (
                  <div key={w.jp} className="px-4 py-3 flex items-center gap-4">
                    <span className="kanji-font text-xl font-bold text-slate-800 w-20">{w.jp}</span>
                    <span className="text-indigo-600 font-semibold text-sm w-24">{w.reading}</span>
                    <span className="text-slate-500 text-sm">{w.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {locked.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button onClick={activateAll} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl transition shadow-md flex items-center justify-center gap-2">
              📥 Activar todas las palabras en el ciclo SRS ({locked.length})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
