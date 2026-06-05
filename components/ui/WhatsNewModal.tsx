'use client'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CHANGELOG, markVersionSeen, LATEST_VERSION, type ChangeType } from '@/lib/changelog'

interface Props {
  onClose: () => void
}

const TYPE_CONFIG: Record<ChangeType, { label: string; color: string; icon: string }> = {
  new:         { label: 'Nuevo',   icon: '🆕', color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  improvement: { label: 'Mejora',  icon: '✨', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  fix:         { label: 'Arreglo', icon: '🔧', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
}

export default function WhatsNewModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    markVersionSeen(LATEST_VERSION)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const modal = (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-slate-700 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">🚀 Novedades</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Últimas mejoras y correcciones</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-xl font-bold leading-none shrink-0 mt-0.5"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          {CHANGELOG.map(version => (
            <div key={version.date}>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                {version.label}
              </p>
              <div className="space-y-3">
                {version.entries.map((entry, i) => {
                  const cfg = TYPE_CONFIG[entry.type]
                  return (
                    <div
                      key={i}
                      className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700"
                    >
                      <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {entry.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-sm"
          >
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modal, document.body)
}
