'use client'
import { useEffect, useMemo, useState } from 'react'
import { showToast } from '@/components/ui/Toast'
import { fetchFullWordReviewList } from '@/lib/supabase'
import { saveVocabFullWord } from '@/lib/admin-client'
import { buildFurigana } from '@/lib/furigana'

type Row = { word: string; kanji: string; reading: string; meaning_es: string; full_word: string }

export default function FullWordReview() {
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<Row[]>([])
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchFullWordReviewList()
      .then(rows => { if (!cancelled) setQueue(rows) })
      .catch(() => showToast('Error cargando palabras', 'error'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const current = queue[idx] ?? null
  useEffect(() => { if (current) setValue(current.full_word) }, [current])

  const tokens = useMemo(
    () => (current && value.trim() ? buildFurigana(value.trim(), current.reading).tokens : []),
    [value, current],
  )

  async function save() {
    if (!current) return
    setSaving(true)
    try {
      // Saving the same value as `word` clears the "extra spelling" (UI hides it).
      const v = value.trim()
      await saveVocabFullWord(current.word, v || current.word)
      showToast(`✓ ${current.word}`, 'success')
      setQueue(prev => prev.filter((_, i) => i !== idx))
      setIdx(i => Math.min(i, queue.length - 2 < 0 ? 0 : queue.length - 2))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
  if (queue.length === 0) {
    return <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ No hay escrituras completas pendientes de revisar.</p>
  }
  if (!current) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">Fin de la cola.</p>
        <button onClick={() => setIdx(0)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">↩ Volver al principio</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">{idx + 1} / {queue.length} pendientes</p>
        <button onClick={() => setIdx(i => i + 1)} disabled={saving} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40">Saltar →</button>
      </div>

      <div className="text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Palabra (como se estudia)</p>
        <div className="kanji-font text-2xl font-bold text-slate-800 dark:text-slate-100">{current.word}</div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 tracking-wider">{current.reading}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{current.meaning_es}</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Escritura completa (todos los kanji)</label>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          lang="ja"
          className="w-full px-3 py-2 text-center text-lg kanji-font font-bold border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:border-indigo-400 focus:outline-none"
        />
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Déjala igual a la palabra de estudio si no debe llevar kanji extra. Enter para guardar.
        </p>
      </div>

      {/* Live furigana preview */}
      <div className="text-center">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Vista previa</p>
        <div className="kanji-font text-2xl font-bold text-slate-800 dark:text-slate-100">
          {tokens.map((tk, i) => tk.ruby
            ? <ruby key={i}>{tk.text}<rt className="text-xs font-normal text-indigo-400">{tk.ruby}</rt></ruby>
            : <span key={i}>{tk.text}</span>)}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={() => setIdx(i => i + 1)} disabled={saving} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm disabled:opacity-40">Saltar</button>
        <button onClick={save} disabled={saving || !value.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-40 min-w-[6rem]">
          {saving ? '…' : 'Guardar y siguiente'}
        </button>
      </div>
    </div>
  )
}
