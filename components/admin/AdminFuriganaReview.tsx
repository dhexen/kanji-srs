'use client'
import { useEffect, useMemo, useState } from 'react'
import { showToast } from '@/components/ui/Toast'
import { fetchAllVocab, fetchWordsWithReadingSegments, type FullVocabEntry } from '@/lib/supabase'
import { saveVocabReadingSegments } from '@/lib/admin-client'
import { buildFurigana, hasKanji, type FuriSegment } from '@/lib/furigana'

const isKanji = (ch: string) => {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0xf900 && cp <= 0xfaff)
}

export default function AdminFuriganaReview() {
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<FullVocabEntry[]>([])
  const [idx, setIdx] = useState(0)
  const [readings, setReadings] = useState<Record<number, string>>({})
  const [joint, setJoint] = useState(false)
  const [jointReading, setJointReading] = useState('')
  const [saving, setSaving] = useState(false)

  // Build the review queue: words whose per-kanji furigana isn't reliable and
  // that don't already have curated readings. Deduped by word.
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchAllVocab(), fetchWordsWithReadingSegments()])
      .then(([all, curated]) => {
        if (cancelled) return
        const seen = new Set<string>()
        const q: FullVocabEntry[] = []
        for (const w of all) {
          if (seen.has(w.word) || curated.has(w.word)) continue
          if (!hasKanji(w.word)) continue
          if (buildFurigana(w.word, w.reading).perKanjiReliable) continue
          seen.add(w.word)
          q.push(w)
        }
        setQueue(q)
      })
      .catch(() => showToast('Error cargando vocabulario', 'error'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const current = queue[idx] ?? null

  // Prefill the editor when the current word changes.
  useEffect(() => {
    if (!current) return
    const { tokens } = buildFurigana(current.word, current.reading)
    const guess: Record<number, string> = {}
    let charPos = 0
    for (const tk of tokens) {
      const chars = Array.from(tk.text)
      // Single-kanji token with a reading → use it as a per-kanji guess.
      if (chars.length === 1 && isKanji(chars[0]) && tk.ruby) guess[charPos] = tk.ruby
      charPos += chars.length
    }
    setReadings(guess)
    setJoint(false)
    setJointReading(current.reading)
  }, [current])

  const chars = useMemo(() => (current ? Array.from(current.word) : []), [current])

  function buildSegments(): FuriSegment[] {
    if (joint) return [{ t: current!.word, f: jointReading.trim() }]
    return chars.map((ch, i) => isKanji(ch) ? { t: ch, f: (readings[i] ?? '').trim() } : { t: ch })
  }

  const canSave = current && (
    joint ? jointReading.trim().length > 0
          : chars.every((ch, i) => !isKanji(ch) || (readings[i] ?? '').trim().length > 0)
  )

  async function save() {
    if (!current || !canSave) return
    setSaving(true)
    try {
      await saveVocabReadingSegments(current.word, buildSegments())
      showToast(`✓ ${current.word}`, 'success')
      // Drop the word from the queue and stay on the same index.
      setQueue(prev => prev.filter((_, i) => i !== idx))
      setIdx(i => Math.min(i, queue.length - 2 < 0 ? 0 : queue.length - 2))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  function skip() {
    setIdx(i => i + 1)
  }

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Cargando vocabulario…</p>
  }

  if (queue.length === 0) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        ✓ No hay palabras con furigana impreciso pendientes de revisar.
      </p>
    )
  }

  if (!current) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">Has llegado al final de la cola.</p>
        <button onClick={() => setIdx(0)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">↩ Volver al principio</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {idx + 1} / {queue.length} pendientes
        </p>
        <button onClick={skip} disabled={saving} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40">Saltar →</button>
      </div>

      {/* Word + full reading (authoritative) */}
      <div className="text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="kanji-font text-4xl font-bold text-slate-800 dark:text-slate-100">{current.word}</div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 tracking-wider">{current.reading}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{current.meaning_es}</p>
      </div>

      {/* Joint (jukujikun) toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={joint} onChange={e => setJoint(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
        <span className="text-xs text-slate-600 dark:text-slate-300">
          Lectura conjunta (熟字訓 — no se puede dividir por kanji, p. ej. 大人 = おとな)
        </span>
      </label>

      {joint ? (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lectura de toda la palabra</label>
          <input
            value={jointReading}
            onChange={e => setJointReading(e.target.value)}
            lang="ja"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:border-indigo-400 focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {chars.map((ch, i) => isKanji(ch) ? (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="kanji-font text-2xl font-bold text-slate-800 dark:text-slate-100">{ch}</span>
              <input
                value={readings[i] ?? ''}
                onChange={e => setReadings(prev => ({ ...prev, [i]: e.target.value }))}
                lang="ja"
                placeholder="かな"
                className="w-16 px-1.5 py-1 text-center text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          ) : (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-2xl text-slate-400 dark:text-slate-500">{ch}</span>
              <span className="text-[10px] text-slate-300 dark:text-slate-600 h-7 flex items-center">kana</span>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      <div className="text-center">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Vista previa</p>
        <div className="kanji-font text-3xl font-bold text-slate-800 dark:text-slate-100">
          {buildSegments().map((s, i) => s.f
            ? <ruby key={i}>{s.t}<rt className="text-xs font-normal text-indigo-400">{s.f}</rt></ruby>
            : <span key={i}>{s.t}</span>)}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={skip} disabled={saving} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm disabled:opacity-40">Saltar</button>
        <button onClick={save} disabled={!canSave || saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-40 min-w-[6rem]">
          {saving ? '…' : 'Guardar y siguiente'}
        </button>
      </div>
    </div>
  )
}
