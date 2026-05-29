'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'

const TYPE_LABELS = {
  vocab:   { icon: '📚', label: 'Vocabulario', color: 'from-violet-500 to-indigo-600' },
  grammar: { icon: '📖', label: 'Gramática',   color: 'from-emerald-500 to-teal-600' },
  total:   { icon: '⭐', label: 'Nivel global', color: 'from-amber-400 to-orange-500' },
}

export default function LevelUpOverlay() {
  const { state, clearLevelUp } = useStore()
  const ev = state.pendingLevelUp
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (ev) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(clearLevelUp, 400)
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [ev, clearLevelUp])

  if (!ev) return null

  const { icon, label, color } = TYPE_LABELS[ev.type]

  return (
    <div
      className={[
        'fixed inset-0 z-[100] flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        'transition-opacity duration-400',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
      onClick={() => { setVisible(false); setTimeout(clearLevelUp, 400) }}
    >
      <div
        className={[
          'flex flex-col items-center gap-4 px-10 py-8 rounded-3xl shadow-2xl',
          'bg-white dark:bg-slate-900',
          'border-4 border-transparent',
          'animate-level-up-pop',
          'max-w-xs w-full mx-4',
        ].join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient ring */}
        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <span className="text-4xl">{icon}</span>
        </div>

        <div className="text-center">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
            ¡Subida de nivel!
          </p>
          <p className="text-5xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
            {ev.level}
          </p>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
        </div>

        <button
          type="button"
          onClick={() => { setVisible(false); setTimeout(clearLevelUp, 400) }}
          className={`mt-1 px-6 py-2 rounded-xl bg-gradient-to-r ${color} text-white font-bold text-sm shadow transition hover:opacity-90 active:scale-95`}
        >
          ¡Adelante!
        </button>
      </div>
    </div>
  )
}
