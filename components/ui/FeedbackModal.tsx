'use client'
import { useState, useEffect, useRef } from 'react'
import { submitFeedbackReport } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'

const SECTIONS = [
  'Dashboard / Repasos',
  'Vocabulario',
  'Gramática',
  'Kana',
  'Textos en Contexto',
  'Mi Perfil',
  'Admin',
  'General / Otro',
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function FeedbackModal({ open, onClose }: Props) {
  const [type, setType]         = useState<'bug' | 'mejora'>('mejora')
  const [section, setSection]   = useState(SECTIONS[0])
  const [description, setDescription] = useState('')
  const [sending, setSending]   = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setSending(true)
    try {
      await submitFeedbackReport({ type, section, description: description.trim() })
      showToast('¡Reporte enviado! Gracias.', 'success')
      setDescription('')
      setType('mejora')
      setSection(SECTIONS[0])
      onClose()
    } catch (err: any) {
      showToast(err.message || 'Error enviando el reporte', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">🐛 Reportar incidencia o mejora</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Tipo</label>
            <div className="flex gap-2">
              {([['bug', '🐛 Bug / Error'], ['mejora', '✨ Mejora']] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setType(v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    type === v
                      ? v === 'bug'
                        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-400 text-rose-700 dark:text-rose-400'
                        : 'bg-violet-50 dark:bg-violet-900/20 border-violet-400 text-violet-700 dark:text-violet-400'
                      : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Sección</label>
            <select
              value={section}
              onChange={e => setSection(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            >
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Descripción</label>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              required
              placeholder="Describe el problema o la mejora que propones…"
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending || !description.trim()}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition"
            >
              {sending ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
