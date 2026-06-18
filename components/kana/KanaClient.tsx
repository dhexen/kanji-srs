'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import KanaLearn from './KanaLearn'
import KanaTest from './KanaTest'
import KanaIntro from './KanaIntro'
import { useStore } from '@/lib/store'
import { fetchKanaProgress, markKanaLearned } from '@/lib/supabase'
import { getAllKana } from '@/lib/kana-data'

type Script = 'hiragana' | 'katakana'
type Tab = 'learn' | 'test'

export type OnLearned = (items: { kana: string; script: Script }[]) => void

export default function KanaClient() {
  const { state } = useStore()
  const [script, setScript] = useState<Script>('hiragana')
  const [tab, setTab] = useState<Tab>('learn')
  const [learned, setLearned] = useState<Set<string>>(new Set())

  // Load saved progress for the signed-in user.
  useEffect(() => {
    if (!state.user) { setLearned(new Set()); return }
    let cancelled = false
    fetchKanaProgress().then(set => { if (!cancelled) setLearned(set) })
    return () => { cancelled = true }
  }, [state.user])

  // Debounced batch persistence: newly-learned kana accumulate and flush together.
  const pendingRef = useRef<Map<string, Script>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // markKanaLearned validates the user itself (no-ops if signed out), so flush
  // only needs the stable pendingRef — safe to capture in memoised callbacks.
  const flush = () => {
    if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null }
    const items = [...pendingRef.current.entries()].map(([kana, sc]) => ({ kana, script: sc }))
    pendingRef.current.clear()
    if (items.length) void markKanaLearned(items)
  }
  useEffect(() => () => flush(), []) // flush on unmount

  const onLearned: OnLearned = useCallback((items) => {
    setLearned(prev => {
      const fresh = items.filter(i => !prev.has(i.kana))
      if (fresh.length === 0) return prev
      fresh.forEach(i => pendingRef.current.set(i.kana, i.script))
      if (flushTimer.current) clearTimeout(flushTimer.current)
      flushTimer.current = setTimeout(flush, 1500)
      const n = new Set(prev); fresh.forEach(i => n.add(i.kana)); return n
    })
  }, [])

  const counts = useMemo(() => {
    const count = (s: Script) => getAllKana(s).filter(k => learned.has(k.kana)).length
    return {
      hiragana: { learned: count('hiragana'), total: getAllKana('hiragana').length },
      katakana: { learned: count('katakana'), total: getAllKana('katakana').length },
    }
  }, [learned])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Back to dashboard */}
      <Link href="/review" className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
        ← Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-violet-700 dark:text-violet-400">
          Hiragana & Katakana
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Aprende los dos silabarios japoneses con nemotécnica visual y pon a prueba tus conocimientos.
        </p>
      </div>

      {/* Beginner intro to the writing system */}
      <KanaIntro />

      {/* Progress per script (saved for signed-in users) */}
      {state.user && (
        <div className="grid grid-cols-2 gap-3">
          {(['hiragana', 'katakana'] as Script[]).map(s => {
            const c = counts[s]
            const pct = c.total > 0 ? Math.round((c.learned / c.total) * 100) : 0
            return (
              <div key={s} className="bg-white dark:bg-slate-800 border border-violet-100 dark:border-slate-700 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {s === 'hiragana' ? 'あ Hiragana' : 'ア Katakana'}
                  </span>
                  <span className="text-xs tabular-nums text-violet-600 dark:text-violet-400 font-bold">{c.learned}/{c.total}</span>
                </div>
                <div className="h-1.5 bg-violet-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Script switcher */}
      <div className="flex gap-2">
        {(['hiragana', 'katakana'] as Script[]).map(s => (
          <button
            key={s}
            onClick={() => setScript(s)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all border ${
              script === s
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-violet-200 dark:border-slate-700 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-300'
            }`}
          >
            {s === 'hiragana' ? 'あ Hiragana' : 'ア Katakana'}
          </button>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-violet-50 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {([['learn','Aprender'],['test','Test']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'learn'
        ? <KanaLearn script={script} onLearned={onLearned} />
        : <KanaTest  script={script} onLearned={onLearned} />
      }
    </div>
  )
}
