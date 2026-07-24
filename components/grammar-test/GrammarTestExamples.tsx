'use client'
import { useState, useEffect } from 'react'
import type { GrammarPoint, GrammarRole, StructurePart } from '@/lib/grammar-test-mnn1'
import { ROLE_COLORS } from '@/lib/grammar-test-mnn1'
import type { Lang } from '@/lib/i18n'
import { getMeaning } from '@/lib/i18n'
import GeminiApiTutorial from '@/components/grammar/GeminiApiTutorial'
import { useStore } from '@/lib/store'
import {
  fetchUserGrammarExamples,
  saveUserGrammarExamples,
  updateUserGrammarExample,
  fetchWaniKaniVocabSample,
} from '@/lib/grammar-test-db'

const MAX_POOL = 10

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
  geminiKey: string
  sessionToken: string
  activeVocab: { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }[]
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
}: {
  sentence: AiSentence
  lang: Lang
  canEdit?: boolean
  onUpdate?: (id: string, jp: AiToken[], translation: AiToken[]) => Promise<void>
}) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [showFurigana, setShowFurigana]       = useState(false)
  const [editing, setEditing]                 = useState(false)
  const [editJp, setEditJp]                   = useState('')
  const [editTranslation, setEditTranslation] = useState('')
  const [saving, setSaving]                   = useState(false)
  const [saveError, setSaveError]             = useState('')

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
      <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 space-y-3">
        {/* Edit header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-800">✏️{' '}
            {lang === 'en' ? 'Edit sentence' : lang === 'ca' ? 'Editar frase' : 'Editar frase'}
          </span>
        </div>

        {/* JP input */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">{jpLabel}</label>
          <input
            type="text"
            value={editJp}
            onChange={e => setEditJp(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-400 focus:outline-none text-base font-bold text-slate-800 bg-white"
            dir="ltr"
            lang="ja"
          />
        </div>

        {/* Translation input */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">{trLabel}</label>
          <input
            type="text"
            value={editTranslation}
            onChange={e => setEditTranslation(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-400 focus:outline-none text-sm text-slate-800 bg-white"
          />
        </div>

        {saveError && (
          <p className="text-xs text-red-600">{saveError}</p>
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
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    )
  }

  // ── Normal view ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      {/* Edit button (admin/contributor only) */}
      {canEdit && sentence.id && (
        <div className="flex justify-end">
          <button
            onClick={startEdit}
            title={lang === 'en' ? 'Edit sentence' : lang === 'ca' ? 'Editar frase' : 'Editar frase'}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {lang === 'en' ? 'Edit' : lang === 'ca' ? 'Editar' : 'Editar'}
          </button>
        </div>
      )}

      {/* Japanese tokens */}
      <div className="flex flex-wrap items-end gap-1.5">
        {sentence.jp.map((t, i) => {
          const c = ROLE_COLORS[t.role] ?? ROLE_COLORS['noun']
          return (
            <div key={i} className="inline-flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-slate-400 min-h-[14px]">
                {showFurigana ? (t.furigana || '') : ''}
              </span>
              <span className={`${c.bg} ${c.text} border ${c.border} font-bold rounded-md px-2 py-0.5 text-xl whitespace-nowrap`}>
                {t.text}
              </span>
            </div>
          )
        })}
      </div>

      {/* Translation tokens */}
      {showTranslation && sentence.translation.length > 0 && (
        <div className="flex flex-wrap items-end gap-1.5 pt-2 border-t border-slate-100">
          {sentence.translation.map((t, i) => {
            const c = ROLE_COLORS[t.role] ?? ROLE_COLORS['noun']
            return (
              <span key={i} className={`${c.bg} ${c.text} border ${c.border} font-medium rounded-md px-2 py-0.5 text-sm whitespace-nowrap`}>
                {t.text}
              </span>
            )
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFurigana(v => !v)}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition"
        >
          {furiganaLabel}
        </button>
        <span className="text-slate-200 text-[10px]">|</span>
        <button
          onClick={() => setShowTranslation(v => !v)}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition"
        >
          {translationLabel}
        </button>
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

// Deriva la "firma" gramatical desde la estructura del punto:
//  • fixedList: las piezas fijas (no-slot) en orden → lo que el alumno debe reconocer
//    (p.ej. は + です · て + も + いい + ですか · じゃ + ありません)
//  • checkLiteral: la última tirada CONTIGUA de piezas fijas en kana (sin kanji).
//    Sirve para verificar en runtime que la frase realmente contiene la gramática.
//    Es null cuando esa parte lleva kanji o no existe (conjugación variable).
function grammarSignature(structure: StructurePart[]): { fixedList: string[]; checkLiteral: string | null } {
  const fixedList = structure.filter(p => !p.isSlot).map(p => p.text)
  let run: string[] = []
  for (const p of structure) {
    if (!p.isSlot) run.push(p.text)
    else run = []
  }
  const literal = run.join('')
  const hasKanji = /[一-龯]/.test(literal)
  return { fixedList, checkLiteral: literal && !hasKanji ? literal : null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function GrammarExamples({ grammar, lang, geminiKey, sessionToken, activeVocab, canEdit }: Props) {
  const { state } = useStore()
  const hasWaniKani = Boolean(state.waniKaniApiKey)

  const [sentences, setSentences]   = useState<AiSentence[]>([])
  const [dbLoading, setDbLoading]   = useState(true)   // initial DB fetch
  const [genLoading, setGenLoading] = useState(false)  // AI generation
  const [saving, setSaving]         = useState(false)  // saving to DB
  const [error, setError]           = useState('')
  const [useWkVocab, setUseWkVocab] = useState(() => {
    try { return localStorage.getItem('ge_use_wk_vocab') === 'true' } catch { return false }
  })
  const [wkVocab, setWkVocab] = useState<{ jp: string; reading: string; meaning: string }[]>([])

  const hasSaved = sentences.length > 0

  // ── Load from DB on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchUserGrammarExamples(grammar.id)
      .then(rows => setSentences(castSentences(rows)))
      .finally(() => setDbLoading(false))
  }, [grammar.id])

  // ── Fetch WaniKani vocabulary when toggle is on ───────────────────────────
  useEffect(() => {
    if (!hasWaniKani || !useWkVocab) return
    fetchWaniKaniVocabSample(40).then(items => {
      setWkVocab(items.map(w => ({
        jp: w.word,
        reading: w.reading,
        meaning:
          lang === 'ca' ? (w.meaning_ca ?? w.meaning_en) :
          lang === 'en' ? w.meaning_en :
          (w.meaning_es ?? w.meaning_en),
      })))
    }).catch(() => {})
  }, [hasWaniKani, useWkVocab, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate ──────────────────────────────────────────────────────────────
  const targetLang =
    lang === 'ca' ? 'catalán' :
    lang === 'en' ? 'inglés' :
    'español'

  async function generate() {
    if (!geminiKey && !sessionToken) {
      setError('Necesitas una API Key de Gemini para generar ejemplos.')
      return
    }

    setGenLoading(true)
    setError('')

    // Base vocabulary from the student's active words
    const schoolSample = [...activeVocab]
      .sort(() => Math.random() - 0.5)
      .slice(0, useWkVocab && wkVocab.length > 0 ? 10 : 15)
      .map(w => `${w.jp}(${w.reading}): ${getMeaning(w, lang)}`)
      .join(', ')

    const wkSample = useWkVocab && wkVocab.length > 0
      ? [...wkVocab].sort(() => Math.random() - 0.5).slice(0, 10).map(w => `${w.jp}(${w.reading}): ${w.meaning}`).join(', ')
      : ''

    const vocabSection = wkSample
      ? `Vocabulario disponible:\n- Del currículo escolar japonés: ${schoolSample || 'palabras básicas N5'}\n- Vocabulario WaniKani del alumno (ya adquirido): ${wkSample}`
      : `Vocabulario disponible (usa el mayor número posible): ${schoolSample || 'palabras básicas N5'}`

    // Firma gramatical (piezas fijas + literal verificable) y frase de referencia curada
    const { fixedList, checkLiteral } = grammarSignature(grammar.structure)
    const grammarPieces = fixedList.length ? fixedList.join(' + ') : grammar.pattern
    const goldJp = grammar.example.map(tk => `${tk.text}${tk.furigana ? `(${tk.furigana})` : ''}`).join('')

    const prompt = `Eres un profesor de japonés NATIVO y experto en didáctica (nivel JLPT ${grammar.jlpt}).
Genera EXACTAMENTE 5 frases de ejemplo, naturales y correctas, que enseñen este punto gramatical:

• Patrón: "${grammar.pattern}"  (${grammar.name_es})
• Significado: ${grammar.explanation_es}
• La gramática que se estudia son estas piezas fijas: ${grammarPieces}. Deben aparecer TODAS, en ese orden, en cada frase.

FRASE DE REFERENCIA (una frase correcta de este punto; imita su naturalidad y nivel): ${goldJp}

${vocabSection}

REGLAS DE CALIDAD (obligatorias):
1. Cada frase debe ser japonés natural que un nativo diría de verdad. PROHIBIDO encadenar palabras sueltas sin sentido (ejemplos de lo que NO debes hacer: «次です番», «学生は本です犬»).
2. Cada frase debe usar el patrón "${grammar.pattern}" correctamente y contener las piezas fijas ${grammarPieces}.
3. Frases cortas y variadas entre sí (distinto sujeto y contexto), nivel ${grammar.jlpt}.
4. Prioriza el vocabulario de la lista; puedes añadir partículas o palabras muy básicas si hacen falta para que la frase sea natural.
5. La traducción debe estar en ${targetLang} y ser natural (no palabra por palabra).
Si una frase no te convence, descártala y escribe otra mejor. Mejor 5 frases perfectas que 5 forzadas.

FORMATO DE TOKENS:
- Asigna a cada token un "role" de esta lista: ${VALID_ROLES.join(', ')}
- Marca con role "key" EXACTAMENTE los tokens que forman la gramática estudiada (${grammarPieces}); a las palabras de contenido dales su role semántico (verb, noun, object, time, location…).
- Incluye furigana en todos los kanji.
- Los tokens de traducción deben usar el mismo role que su equivalente japonés (mismo role = mismo color).
- Añade "quality": entero 1-5 con tu valoración honesta de lo natural y correcta que es la frase (5 = perfecta y nativa). Sé estricto; si sería <4, reescríbela antes de enviarla.

Responde ÚNICAMENTE con este JSON (sin backticks, sin texto extra):
{
  "sentences": [
    {
      "quality": 5,
      "jp": [
        {"text": "私", "furigana": "わたし", "role": "topic"},
        {"text": "は", "role": "key"},
        {"text": "学生", "furigana": "がくせい", "role": "noun"},
        {"text": "です", "role": "key"}
      ],
      "translation": [
        {"text": "Yo", "role": "topic"},
        {"text": "soy", "role": "key"},
        {"text": "estudiante", "role": "noun"}
      ]
    }
  ]
}`

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ prompt, model: state.geminiModel, userApiKey: geminiKey }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Error ${res.status}`)
      }
      const data  = await res.json()
      const clean = data.text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (!parsed.sentences?.length) throw new Error('La IA no generó frases. Inténtalo de nuevo.')

      // Control de calidad: descarta malformadas, auto-valoración baja y las que
      // no contienen realmente la gramática (cuando es verificable literalmente).
      const rows = (parsed.sentences as any[]).filter(s => {
        if (!Array.isArray(s.jp) || !s.jp.length) return false
        if (!Array.isArray(s.translation) || !s.translation.length) return false
        if (typeof s.quality === 'number' && s.quality < 4) return false
        if (checkLiteral) {
          const joined = s.jp.map((t: any) => String(t?.text ?? '')).join('')
          if (!joined.includes(checkLiteral)) return false
        }
        return true
      })
      if (!rows.length) throw new Error('Las frases generadas no pasaron el control de calidad. Inténtalo de nuevo.')

      const newSentences = castSentences(rows)

      // Save to DB (insert + trim to MAX_POOL) then reload
      setSaving(true)
      await saveUserGrammarExamples(grammar.id, newSentences)
      const fresh = await fetchUserGrammarExamples(grammar.id)
      setSentences(castSentences(fresh))
    } catch (e: any) {
      setError(e.message || 'Error al generar ejemplos.')
    } finally {
      setGenLoading(false)
      setSaving(false)
    }
  }

  // ── Handle inline edit update ─────────────────────────────────────────────
  async function handleUpdate(id: string, jp: AiToken[], translation: AiToken[]) {
    await updateUserGrammarExample(id, jp, translation)
    setSentences(prev => prev.map(s =>
      s.id === id ? { ...s, jp, translation } : s
    ))
  }

  // ── Labels ────────────────────────────────────────────────────────────────
  const genLabel =
    genLoading ? (
      lang === 'en' ? 'Generating…' : lang === 'ca' ? 'Generant…' : 'Generando…'
    ) : saving ? (
      lang === 'en' ? 'Saving…' : lang === 'ca' ? 'Desant…' : 'Guardando…'
    ) : hasSaved ? (
      lang === 'en' ? '🔄 Generate more' : lang === 'ca' ? '🔄 Generar més' : '🔄 Generar más'
    ) : (
      lang === 'en' ? '✨ Generate examples' : lang === 'ca' ? '✨ Generar exemples' : '✨ Generar ejemplos'
    )

  const poolLabel =
    lang === 'en' ? `${sentences.length}/${MAX_POOL} saved` :
    lang === 'ca' ? `${sentences.length}/${MAX_POOL} desades` :
    `${sentences.length}/${MAX_POOL} guardadas`

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
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
          {/* WaniKani toggle */}
          {hasWaniKani && (
            <label className="flex items-center gap-1.5 mt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useWkVocab}
                onChange={e => {
                  const v = e.target.checked
                  setUseWkVocab(v)
                  try { localStorage.setItem('ge_use_wk_vocab', String(v)) } catch { /* incognito */ }
                }}
                className="w-3 h-3 rounded accent-pink-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'en' ? 'Use WaniKani vocabulary' : lang === 'ca' ? 'Usar vocabulari WaniKani' : 'Usar vocabulario WaniKani'}
              </span>
              {useWkVocab && wkVocab.length > 0 && (
                <span className="text-[10px] bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800 rounded-full px-1.5 py-0.5">
                  {wkVocab.length} palabras
                </span>
              )}
            </label>
          )}
        </div>
        <button
          onClick={generate}
          disabled={genLoading || saving}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-medium transition"
        >
          {(genLoading || saving) && (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
          )}
          {genLabel}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Initial DB load spinner */}
      {dbLoading && (
        <div className="flex justify-center py-6">
          <svg className="w-5 h-5 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        </div>
      )}

      {/* No API key tutorial */}
      {!dbLoading && !hasSaved && !genLoading && !geminiKey && (
        <GeminiApiTutorial lang={lang} compact />
      )}

      {/* Empty state with API key */}
      {!dbLoading && !hasSaved && !genLoading && geminiKey && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-sm text-slate-500">
            {lang === 'en'
              ? 'Generate 5 example sentences with colour-coded grammar roles.'
              : lang === 'ca'
              ? 'Genera 5 frases d\'exemple amb colors que marquen cada funció gramatical.'
              : 'Genera 5 frases de ejemplo con colores que marcan cada función gramatical.'}
          </p>
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
        />
      ))}
    </div>
  )
}
