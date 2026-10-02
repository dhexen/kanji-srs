'use client'
import { useState, useEffect } from 'react'
import type { GrammarPoint, GrammarRole } from '@/lib/grammar-test-mnn1'
import { ROLE_COLORS } from '@/lib/grammar-test-mnn1'
import type { Lang } from '@/lib/i18n'
import {
  // Pool COMPARTIDO/público de ejemplos (migración 044): el admin los siembra y
  // todos los ven sin clave. Reapuntamos por alias sin tocar el cuerpo.
  fetchSharedGrammarExamples as fetchUserGrammarExamples,
  updateSharedGrammarExample as updateUserGrammarExample,
  deleteSharedGrammarExample as deleteUserGrammarExample,
} from '@/lib/grammar-test-db'

interface AiToken {
  text: string
  furigana?: string
  role: GrammarRole
  gloss?: string
}

interface AiSentence {
  id?: string
  jp: AiToken[]
  translation: AiToken[]
}

interface Props {
  grammar: GrammarPoint
  lang: Lang
  canEdit?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────

function AiSentenceCard({
  sentence,
  lang,
  canEdit,
  onUpdate,
  onDelete,
}: {
  sentence: AiSentence
  lang: Lang
  canEdit?: boolean
  onUpdate?: (id: string, jp: AiToken[], translation: AiToken[]) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [showFurigana, setShowFurigana]       = useState(false)
  const [editing, setEditing]                 = useState(false)
  const [editJp, setEditJp]                   = useState('')
  const [editTranslation, setEditTranslation] = useState('')
  const [saving, setSaving]                   = useState(false)
  const [saveError, setSaveError]             = useState('')
  const [deleting, setDeleting]               = useState(false)

  async function handleDelete() {
    if (!onDelete || !sentence.id) return
    const msg =
      lang === 'en' ? 'Delete this sentence permanently? This cannot be undone.' :
      lang === 'ca' ? 'Eliminar aquesta frase per sempre? No es pot desfer.' :
      '¿Eliminar esta frase para siempre? No se puede deshacer.'
    if (!confirm(msg)) return
    setDeleting(true)
    try {
      await onDelete(sentence.id)
    } catch {
      setDeleting(false)
    }
  }

  const furiganaLabel =
    lang === 'en' ? (showFurigana ? 'Hide furigana' : 'Show furigana') :
    lang === 'ca' ? (showFurigana ? 'Amaga furigana' : 'Mostra furigana') :
    lang === 'ja' ? (showFurigana ? 'ふりがなを隠す' : 'ふりがなを表示') :
    (showFurigana ? 'Ocultar furigana' : 'Mostrar furigana')

  const translationLabel =
    lang === 'en' ? (showTranslation ? 'Hide translation' : 'Show translation') :
    lang === 'ca' ? (showTranslation ? 'Amaga traducció' : 'Mostra traducció') :
    lang === 'ja' ? (showTranslation ? '訳を隠す' : '訳を表示') :
    (showTranslation ? 'Ocultar traducción' : 'Mostrar traducción')

  function startEdit() {
    setEditJp(sentence.jp.map(t => t.text).join(''))
    setEditTranslation(sentence.translation.map(t => t.text).join(''))
    setSaveError('')
    setEditing(true)
  }

  async function handleSave() {
    if (!onUpdate || !sentence.id) return
    const trimJp = editJp.trim()
    const trimTr = editTranslation.trim()
    if (!trimJp) { setSaveError('La frase en japonés no puede estar vacía.'); return }
    if (!trimTr) { setSaveError('La traducción no puede estar vacía.'); return }

    const newJp: AiToken[] = [{ text: trimJp, role: 'noun' as GrammarRole }]
    const newTr: AiToken[] = [{ text: trimTr, role: 'noun' as GrammarRole }]
    setSaving(true)
    setSaveError('')
    try {
      await onUpdate(sentence.id, newJp, newTr)
      setEditing(false)
    } catch {
      setSaveError('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit mode ────────────────────────────────────────────────────────────
  if (editing) {
    const jpLabel =
      lang === 'en' ? 'Japanese sentence' :
      lang === 'ca' ? 'Frase en japonès' :
      'Frase en japonés'
    const trLabel =
      lang === 'en' ? 'Translation' :
      lang === 'ca' ? 'Traducció' :
      'Traducción'
    const saveLabel =
      lang === 'en' ? 'Save' :
      lang === 'ca' ? 'Desar' :
      'Guardar'
    const cancelLabel =
      lang === 'en' ? 'Cancel' :
      lang === 'ca' ? 'Cancel·lar' :
      'Cancelar'

    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-300 dark:border-amber-800 p-4 space-y-3">
        {/* Edit header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">✏️{' '}
            {lang === 'en' ? 'Edit sentence' : lang === 'ca' ? 'Editar frase' : 'Editar frase'}
          </span>
        </div>

        {/* JP input */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{jpLabel}</label>
          <input
            type="text"
            value={editJp}
            onChange={e => setEditJp(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-400 focus:outline-none text-base font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
            dir="ltr"
            lang="ja"
          />
        </div>

        {/* Translation input */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{trLabel}</label>
          <input
            type="text"
            value={editTranslation}
            onChange={e => setEditTranslation(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-400 focus:outline-none text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
          />
        </div>

        {saveError && (
          <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold transition"
          >
            {saving && (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
            )}
            💾 {saveLabel}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    )
  }

  // ── Normal view ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 space-y-1.5">
      {/* Japanese tokens */}
      <div className="flex flex-wrap items-end gap-1">
        {sentence.jp.map((t, i) => {
          const c = ROLE_COLORS[t.role] ?? ROLE_COLORS['noun']
          return (
            <div key={i} className="inline-flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 min-h-[12px] leading-none">
                {showFurigana ? (t.furigana || '') : ''}
              </span>
              <span className={`${c.bg} ${c.text} border ${c.border} font-bold rounded px-1.5 py-0.5 text-sm whitespace-nowrap`}>
                {t.text}
              </span>
            </div>
          )
        })}
      </div>

      {/* Translation tokens */}
      {showTranslation && sentence.translation.length > 0 && (
        <div className="flex flex-wrap items-end gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-700">
          {sentence.translation.map((t, i) => {
            const c = ROLE_COLORS[t.role] ?? ROLE_COLORS['noun']
            return (
              <span key={i} className={`${c.bg} ${c.text} border ${c.border} font-medium rounded px-1.5 py-0.5 text-xs whitespace-nowrap`}>
                {t.text}
              </span>
            )
          })}
        </div>
      )}

      {/* Footer: toggles + edit/delete (admin) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFurigana(v => !v)}
          className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
        >
          {furiganaLabel}
        </button>
        <span className="text-slate-200 dark:text-slate-600 text-[10px]">|</span>
        <button
          onClick={() => setShowTranslation(v => !v)}
          className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
        >
          {translationLabel}
        </button>

        {canEdit && sentence.id && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={startEdit}
              title={lang === 'en' ? 'Edit sentence' : lang === 'ca' ? 'Editar frase' : 'Editar frase'}
              className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title={lang === 'en' ? 'Delete permanently' : lang === 'ca' ? 'Eliminar per sempre' : 'Eliminar para siempre'}
              className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition"
            >
              {deleting ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: cast raw DB rows to AiSentence[]
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ROLES: GrammarRole[] = [
  'topic', 'subject', 'object', 'location', 'direction', 'time',
  'verb', 'key', 'copula', 'particle', 'noun', 'adjective', 'conjunction', 'auxiliary',
]

function castSentences(rows: { id?: string; jp: unknown[]; translation: unknown[] }[]): AiSentence[] {
  return rows.map(row => ({
    id: row.id as string | undefined,
    jp: (row.jp ?? []).map((t: any) => ({
      text:     String(t.text ?? ''),
      furigana: t.furigana ?? undefined,
      role:     VALID_ROLES.includes(t.role) ? t.role as GrammarRole : 'noun',
    })),
    translation: (row.translation ?? []).map((t: any) => ({
      text: String(t.text ?? ''),
      role: VALID_ROLES.includes(t.role) ? t.role as GrammarRole : 'noun',
    })),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function GrammarExamples({ grammar, lang, canEdit }: Props) {
  const [sentences, setSentences]   = useState<AiSentence[]>([])
  const [dbLoading, setDbLoading]   = useState(true)   // initial DB fetch

  const hasSaved = sentences.length > 0

  // ── Load from DB on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchUserGrammarExamples(grammar.id)
      .then(rows => setSentences(castSentences(rows)))
      .finally(() => setDbLoading(false))
  }, [grammar.id])

  // ── Handle inline edit update ─────────────────────────────────────────────
  async function handleUpdate(id: string, jp: AiToken[], translation: AiToken[]) {
    await updateUserGrammarExample(id, jp, translation)
    setSentences(prev => prev.map(s =>
      s.id === id ? { ...s, jp, translation } : s
    ))
  }

  // ── Handle permanent delete (admin/contributor only) ──────────────────────
  async function handleDelete(id: string) {
    await deleteUserGrammarExample(id)
    setSentences(prev => prev.filter(s => s.id !== id))
  }

  // ── Labels ────────────────────────────────────────────────────────────────
  const poolLabel =
    lang === 'en' ? `${sentences.length} saved` :
    lang === 'ca' ? `${sentences.length} desades` :
    `${sentences.length} guardadas`

  // ── Render ────────────────────────────────────────────────────────────────
  // Ya no se generan frases nuevas: solo se enseñan las que estaban guardadas.
  if (!dbLoading && !hasSaved) return null

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            ✨{' '}
            {lang === 'en' ? 'AI Examples' : lang === 'ca' ? 'Exemples amb IA' : 'Ejemplos con IA'}
            <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 font-normal">
              {lang === 'en' ? 'using your vocabulary' : lang === 'ca' ? 'amb el teu vocabulari' : 'usando tu vocabulario'}
            </span>
          </h3>
          {hasSaved && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{poolLabel}</p>
          )}
        </div>
      </div>

      {/* Initial DB load spinner */}
      {dbLoading && (
        <div className="flex justify-center py-6">
          <svg className="w-5 h-5 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Sentence cards */}
      {sentences.map((s, i) => (
        <AiSentenceCard
          key={s.id ?? i}
          sentence={s}
          lang={lang}
          canEdit={canEdit}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
