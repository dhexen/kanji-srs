'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lang } from '@/lib/i18n'
import type { GrammarSentence } from '@/lib/grammar-srs'

const INITIAL_SHOW = 5

// Parche de edición admin sobre una frase de repaso (campos esenciales).
export type SentenceEditPatch = Partial<Pick<GrammarSentence,
  'sentence_before' | 'sentence_before_reading' | 'answer' |
  'sentence_after' | 'sentence_after_reading' |
  'translation_es' | 'translation_ca' | 'translation_en'>>

interface Props {
  grammarId: string
  lang: Lang
  // Fuente de las frases. Por defecto lee el pool de producción; el sandbox de
  // test pasa su propio fetcher (grammar_sentences_test) para no leer prod.
  fetcher?: (grammarId: string) => Promise<GrammarSentence[]>
  // Edición admin en línea (opcional): si se pasan, cada frase muestra botones
  // de editar y eliminar. Reutiliza las funciones de la capa de datos del pool.
  canEdit?: boolean
  onUpdate?: (id: string, patch: SentenceEditPatch) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export default function GrammarSentenceExamples({ grammarId, lang, fetcher, canEdit, onUpdate, onDelete }: Props) {
  const [sentences, setSentences] = useState<GrammarSentence[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showFurigana, setShowFurigana] = useState(false)

  // Estado de edición / borrado (admin)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eBefore, setEBefore] = useState('')
  const [eBeforeR, setEBeforeR] = useState('')
  const [eAnswer, setEAnswer] = useState('')
  const [eAfter, setEAfter] = useState('')
  const [eAfterR, setEAfterR] = useState('')
  const [eEs, setEEs] = useState('')
  const [eCa, setECa] = useState('')
  const [eEn, setEEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = fetcher
      ? fetcher(grammarId)
      : supabase
          .from('grammar_sentences')
          .select('*')
          .eq('grammar_id', grammarId)
          .eq('is_private', false)
          .order('created_at', { ascending: true })
          .then(({ data }) => (data ?? []) as GrammarSentence[])
    Promise.resolve(run)
      .then(rows => { if (!cancelled) { setSentences(rows); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [grammarId, fetcher])

  const editable = Boolean(canEdit && onUpdate && onDelete)

  function openEdit(s: GrammarSentence) {
    setEditingId(s.id ?? null)
    setEBefore(s.sentence_before ?? '')
    setEBeforeR(s.sentence_before_reading ?? '')
    setEAnswer(s.answer ?? '')
    setEAfter(s.sentence_after ?? '')
    setEAfterR(s.sentence_after_reading ?? '')
    setEEs(s.translation_es ?? '')
    setECa(s.translation_ca ?? '')
    setEEn(s.translation_en ?? '')
    setEditError('')
    setConfirmDeleteId(null)
  }
  function closeEdit() { setEditingId(null); setEditError('') }

  async function saveEdit() {
    if (!editingId || !onUpdate) return
    if (!eAnswer.trim()) { setEditError('La respuesta no puede estar vacía.'); return }
    if (!eBefore.trim() && !eAfter.trim()) { setEditError('La frase no puede estar vacía.'); return }
    const patch: SentenceEditPatch = {
      sentence_before: eBefore.trim(),
      sentence_before_reading: eBeforeR.trim(),
      answer: eAnswer.trim(),
      sentence_after: eAfter.trim(),
      sentence_after_reading: eAfterR.trim(),
      translation_es: eEs.trim(),
      translation_ca: eCa.trim(),
      translation_en: eEn.trim(),
    }
    setSaving(true)
    setEditError('')
    try {
      await onUpdate(editingId, patch)
      setSentences(prev => prev.map(s => (s.id === editingId ? { ...s, ...patch } : s)))
      closeEdit()
    } catch {
      setEditError('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!onDelete) return
    setBusyId(id)
    try {
      await onDelete(id)
      setSentences(prev => prev.filter(s => s.id !== id))
    } finally {
      setBusyId(null)
      setConfirmDeleteId(null)
    }
  }

  if (loading || sentences.length === 0) return null

  const label =
    lang === 'ca' ? 'Frases de pràctica' :
    lang === 'en' ? 'Practice sentences' :
    'Frases de práctica'

  const furiganaLabel =
    lang === 'ca' ? (showFurigana ? 'Amaga furigana' : 'Mostra furigana') :
    lang === 'en' ? (showFurigana ? 'Hide furigana' : 'Show furigana') :
    (showFurigana ? 'Ocultar furigana' : 'Mostrar furigana')

  const moreLabel = expanded
    ? (lang === 'ca' ? 'Mostrar menys' : lang === 'en' ? 'Show less' : 'Mostrar menos')
    : (lang === 'ca' ? `Mostrar totes (${sentences.length})` : lang === 'en' ? `Show all (${sentences.length})` : `Mostrar todas (${sentences.length})`)

  const getTranslation = (s: GrammarSentence) =>
    lang === 'ca' ? s.translation_ca : lang === 'en' ? s.translation_en : s.translation_es

  const visible = expanded ? sentences : sentences.slice(0, INITIAL_SHOW)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-2 group"
      >
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label} ({sentences.length})
        </span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              onClick={() => setShowFurigana(v => !v)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {furiganaLabel}
            </button>
          </div>

          <div className="space-y-2">
            {visible.map((s, i) => (
              editable && editingId === s.id ? (
                <SentenceEditForm
                  key={s.id ?? i}
                  before={eBefore} setBefore={setEBefore}
                  beforeR={eBeforeR} setBeforeR={setEBeforeR}
                  answer={eAnswer} setAnswer={setEAnswer}
                  after={eAfter} setAfter={setEAfter}
                  afterR={eAfterR} setAfterR={setEAfterR}
                  es={eEs} setEs={setEEs}
                  ca={eCa} setCa={setECa}
                  en={eEn} setEn={setEEn}
                  saving={saving} error={editError}
                  onSave={saveEdit} onCancel={closeEdit}
                />
              ) : (
                <div
                  key={s.id ?? i}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 space-y-1.5"
                >
                  {showFurigana ? (
                    <div className="flex flex-wrap items-end gap-0.5 leading-none">
                      {s.sentence_before && (
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-slate-400 min-h-[14px] leading-none">{s.sentence_before_reading}</span>
                          <span className="text-base font-medium text-slate-800 dark:text-slate-100">{s.sentence_before}</span>
                        </span>
                      )}
                      <span className="inline-flex flex-col items-center gap-0.5 mx-0.5">
                        <span className="text-[10px] text-indigo-400 min-h-[14px] leading-none">{s.answer}</span>
                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{s.answer}</span>
                      </span>
                      {s.sentence_after && (
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-slate-400 min-h-[14px] leading-none">{s.sentence_after_reading}</span>
                          <span className="text-base font-medium text-slate-800 dark:text-slate-100">{s.sentence_after}</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                      {s.sentence_before}
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 rounded mx-0.5">{s.answer}</span>
                      {s.sentence_after}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">{getTranslation(s)}</p>

                  {editable && s.id && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-500 transition"
                      >
                        ✏️ Editar
                      </button>
                      {confirmDeleteId === s.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(s.id!)}
                            disabled={busyId === s.id}
                            className="text-[10px] px-2 py-0.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
                          >
                            {busyId === s.id ? 'Borrando…' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(s.id!)}
                          className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:border-red-200 dark:hover:border-red-500 transition"
                        >
                          🗑 Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>

          {sentences.length > INITIAL_SHOW && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {moreLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Formulario de edición en línea (admin) ──────────────────────────────────
function SentenceEditForm(props: {
  before: string; setBefore: (v: string) => void
  beforeR: string; setBeforeR: (v: string) => void
  answer: string; setAnswer: (v: string) => void
  after: string; setAfter: (v: string) => void
  afterR: string; setAfterR: (v: string) => void
  es: string; setEs: (v: string) => void
  ca: string; setCa: (v: string) => void
  en: string; setEn: (v: string) => void
  saving: boolean; error: string
  onSave: () => void; onCancel: () => void
}) {
  const field = 'w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:border-indigo-400 focus:outline-none'
  const lbl = 'text-[10px] font-medium text-slate-500 dark:text-slate-400'
  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-300 dark:border-amber-700 rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className={lbl}>Antes (frase)</label>
          <input className={field} value={props.before} onChange={e => props.setBefore(e.target.value)} lang="ja" />
        </div>
        <div className="space-y-0.5">
          <label className={lbl}>Antes (lectura)</label>
          <input className={field} value={props.beforeR} onChange={e => props.setBeforeR(e.target.value)} lang="ja" />
        </div>
        <div className="space-y-0.5">
          <label className={lbl}>Respuesta (hueco)</label>
          <input className={field} value={props.answer} onChange={e => props.setAnswer(e.target.value)} lang="ja" />
        </div>
        <div />
        <div className="space-y-0.5">
          <label className={lbl}>Después (frase)</label>
          <input className={field} value={props.after} onChange={e => props.setAfter(e.target.value)} lang="ja" />
        </div>
        <div className="space-y-0.5">
          <label className={lbl}>Después (lectura)</label>
          <input className={field} value={props.afterR} onChange={e => props.setAfterR(e.target.value)} lang="ja" />
        </div>
      </div>
      <div className="space-y-0.5">
        <label className={lbl}>Traducción ES</label>
        <input className={field} value={props.es} onChange={e => props.setEs(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className={lbl}>Traducción CA</label>
          <input className={field} value={props.ca} onChange={e => props.setCa(e.target.value)} />
        </div>
        <div className="space-y-0.5">
          <label className={lbl}>Traducción EN</label>
          <input className={field} value={props.en} onChange={e => props.setEn(e.target.value)} />
        </div>
      </div>
      {props.error && <p className="text-xs text-red-600">{props.error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={props.onSave}
          disabled={props.saving}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold transition"
        >
          💾 {props.saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          onClick={props.onCancel}
          disabled={props.saving}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
