'use client'
import { useState, useRef } from 'react'
import { showToast } from '@/components/ui/Toast'
import { searchVocabulary } from '@/lib/supabase'
import AdminFuriganaReview from './AdminFuriganaReview'
import AdminFillFullWord from './AdminFillFullWord'
import {
  deleteVocabWord,
  deleteVocabByGrade,
  resetAllVocabulary,
  importVocabBatch,
  fetchVocabReports,
  updateVocabReportStatus,
  updateVocabWord,
  type VocabImportRow,
  type VocabImportResult,
  type VocabReport,
} from '@/lib/admin-client'

// ─── CSV parser ───────────────────────────────────────────────────────────────
const REQUIRED = ['word', 'kanji', 'reading', 'meaning_es', 'grade'] as const
const OPTIONAL  = ['meaning_ca', 'meaning_en', 'sort_order', 'category', 'word_type'] as const
const ALL_COLS  = [...REQUIRED, ...OPTIONAL]

/**
 * RFC-4180 compliant CSV line parser.
 * Handles quoted fields that contain commas or embedded double-quotes ("").
 */
function splitCSVLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }  // escaped quote
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function parseCSV(text: string): { rows: VocabImportRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const errors: string[] = []
  if (lines.length < 2) { errors.push('El archivo debe tener cabecera + al menos una fila de datos'); return { rows: [], errors } }

  const header = splitCSVLine(lines[0]).map(h => h.toLowerCase())
  const missing = REQUIRED.filter(col => !header.includes(col))
  if (missing.length) { errors.push(`Columnas obligatorias que faltan: ${missing.join(', ')}`); return { rows: [], errors } }

  const rows: VocabImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i])
    if (cells.every(c => !c)) continue   // skip blank lines
    const obj: Record<string, string> = {}
    header.forEach((col, j) => { if (ALL_COLS.includes(col as any)) obj[col] = cells[j] ?? '' })

    const row: VocabImportRow = {
      word:       obj.word       ?? '',
      kanji:      obj.kanji      ?? '',
      reading:    obj.reading    ?? '',
      meaning_es: obj.meaning_es ?? '',
      grade:      Number(obj.grade),
    }
    if (obj.meaning_ca)  row.meaning_ca  = obj.meaning_ca
    if (obj.meaning_en)  row.meaning_en  = obj.meaning_en
    if (obj.sort_order)  row.sort_order  = Number(obj.sort_order)
    if (obj.category)    row.category    = obj.category
    if (obj.word_type)   row.word_type   = obj.word_type
    rows.push(row)
  }
  return { rows, errors }
}

// ─── Grade selector shared ────────────────────────────────────────────────────
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminVocabTab() {
  // ── Search ──────────────────────────────────────────────────────────────────
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<any[]>([])
  const [searching, setSearching]   = useState(false)
  const [deletingWord, setDeletingWord] = useState<string | null>(null)

  // ── Delete by grade ──────────────────────────────────────────────────────────
  const [deleteGrade, setDeleteGrade]     = useState(1)
  const [deletingGrade, setDeletingGrade] = useState(false)

  // ── Reset all vocabulary ──────────────────────────────────────────────────────
  const [resettingAll, setResettingAll]   = useState(false)

  // ── Vocab reports ────────────────────────────────────────────────────────────
  const [vocabReports, setVocabReports]         = useState<VocabReport[] | null>(null)
  const [vocabReportsLoading, setVocabReportsLoading] = useState(false)
  const [reportExpanded, setReportExpanded]     = useState<string | null>(null)
  const [reportUpdating, setReportUpdating]     = useState<string | null>(null)
  const [editDraft, setEditDraft]               = useState<Record<string, { reading: string; meaning_es: string }>>({})
  const [editSaving, setEditSaving]             = useState<string | null>(null)

  // ── Import ───────────────────────────────────────────────────────────────────
  const fileRef                      = useRef<HTMLInputElement>(null)
  const [preview, setPreview]        = useState<VocabImportRow[] | null>(null)
  const [parseErrors, setParseErrors]= useState<string[]>([])
  const [isOfficial, setIsOfficial]  = useState(true)
  const [importing, setImporting]    = useState(false)
  const [importResult, setImportResult] = useState<VocabImportResult | null>(null)

  // ── Search handlers ──────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await searchVocabulary(query)
      setResults(data)
      if (data.length === 0) showToast('Sin resultados', 'info')
    } catch {
      showToast('Error en la búsqueda', 'error')
    } finally {
      setSearching(false)
    }
  }

  async function handleDeleteWord(word: string) {
    if (!confirm(`¿Eliminar "${word}" del vocabulario global? Todos los usuarios perderán esta palabra.`)) return
    setDeletingWord(word)
    try {
      await deleteVocabWord(word)
      setResults(prev => prev.filter(r => r.word !== word))
      showToast(`"${word}" eliminada`, 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setDeletingWord(null)
    }
  }

  // ── Reset all vocabulary handler ──────────────────────────────────────────────
  async function handleResetAll() {
    const confirmed = confirm(
      '⚠️ RESET COMPLETO DE VOCABULARIO\n\n' +
      'Esto eliminará:\n' +
      '• TODO el vocabulario global (todos los grados)\n' +
      '• Imágenes, categorías y tipos de palabra asociados\n' +
      '• Votos de imágenes y reportes de vocabulario\n' +
      '• El progreso SRS de vocabulario de TODOS los usuarios\n' +
      '• Los pares de antónimos\n' +
      '• El historial de repasos y snapshots\n' +
      '• El XP de vocabulario de todos los usuarios\n\n' +
      'El XP de gramática se conservará.\n\n' +
      '¿Continuar? Esta acción NO se puede deshacer.'
    )
    if (!confirmed) return
    setResettingAll(true)
    try {
      const result = await resetAllVocabulary()
      console.log('[reset-all] result:', result)
      alert(`✅ Reset completado:\n${JSON.stringify((result as any).results ?? result, null, 2)}\n\nLa página se recargará ahora.`)
      window.location.reload()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error en el reset', 'error')
    } finally {
      setResettingAll(false)
    }
  }

  // ── Delete by grade handler ───────────────────────────────────────────────────
  async function handleDeleteGrade() {
    const gradeLabel = deleteGrade <= 6 ? `${deleteGrade}º Primaria` : `${deleteGrade - 6}º Secundaria`
    if (!confirm(`¿Eliminar TODAS las palabras de ${gradeLabel} del vocabulario global?\n\nEsta acción no se puede deshacer.`)) return
    setDeletingGrade(true)
    try {
      const { deleted } = await deleteVocabByGrade(deleteGrade)
      showToast(`${deleted} palabras de ${gradeLabel} eliminadas`, 'success')
      // Clear search results that belonged to this grade
      setResults(prev => prev.filter(r => r.grade !== deleteGrade))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setDeletingGrade(false)
    }
  }

  // ── Import handlers ───────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setPreview(null)
    setParseErrors([])
    setImportResult(null)
    if (!file) return

    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const { rows, errors } = parseCSV(text)
      if (errors.length) { setParseErrors(errors); return }
      setPreview(rows)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    if (!preview?.length) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importVocabBatch(preview, isOfficial)
      setImportResult(result)
      if (result.ok) {
        showToast(`✓ ${result.inserted} palabras importadas · ${result.skipped} ya existían`, 'success')
        setPreview(null)
        if (fileRef.current) fileRef.current.value = ''
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error importando', 'error')
    } finally {
      setImporting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Revisión de furigana ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">🈁 Revisión de furigana</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          Palabras cuya lectura por kanji no es fiable automáticamente. Fija la lectura de cada kanji (o marca lectura conjunta para 熟字訓). Se aplica a todos los usuarios.
        </p>
        <AdminFuriganaReview />
      </div>

      {/* ── Rellenar escritura completa (full_word) ───────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">🈶 Escritura completa</h3>
        <AdminFillFullWord />
      </div>

      {/* ── Búsqueda y eliminación individual ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
        <h3 className="font-bold text-slate-800 mb-1">🔍 Buscar y eliminar palabras</h3>
        <p className="text-xs text-slate-400 mb-4">Busca por palabra, kanji, lectura o significado. Eliminar una palabra la borra para todos los usuarios.</p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ej: 行く, いく, 行, ir..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition"
          >
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {results.length > 0 && (
          <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3">Palabra</th>
                  <th className="py-2.5 px-3">Kanji</th>
                  <th className="py-2.5 px-3">Lectura</th>
                  <th className="py-2.5 px-3">Significado</th>
                  <th className="py-2.5 px-3">Grado</th>
                  <th className="py-2.5 px-3">Oficial</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {results.map(r => (
                  <tr key={r.word} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{r.word}</td>
                    <td className="py-2.5 px-3 text-slate-500 kanji-font text-lg">{r.kanji}</td>
                    <td className="py-2.5 px-3 text-indigo-600 font-medium">{r.reading}</td>
                    <td className="py-2.5 px-3 text-slate-500">{r.meaning_es}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">{r.grade}º</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {r.is_official
                        ? <span className="text-emerald-600 font-bold text-xs">✓</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        disabled={deletingWord === r.word}
                        onClick={() => handleDeleteWord(r.word)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50 transition"
                      >
                        {deletingWord === r.word ? '…' : '🗑️ Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Reset completo ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-5 md:p-6">
        <h3 className="font-bold text-rose-700 mb-1">🔴 Reset completo de vocabulario</h3>
        <p className="text-xs text-slate-500 mb-4">
          Borra <strong>todo el vocabulario</strong> de todos los grados, el progreso SRS de vocabulario de
          todos los usuarios, los antónimos y el XP de vocab. El XP de gramática se conserva.
          Úsalo antes de reimportar los CSVs desde cero.
        </p>
        <button
          type="button"
          disabled={resettingAll}
          onClick={handleResetAll}
          className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition"
        >
          {resettingAll ? '⏳ Reseteando…' : '🔴 Resetear todo el vocabulario'}
        </button>
      </div>

      {/* ── Eliminar por grado ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
        <h3 className="font-bold text-slate-800 mb-1">🗑️ Eliminar vocabulario por grado</h3>
        <p className="text-xs text-slate-400 mb-4">Elimina <strong>todas</strong> las palabras de un grado escolar del catálogo global. No se puede deshacer.</p>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={deleteGrade}
            onChange={e => setDeleteGrade(Number(e.target.value))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-rose-400 cursor-pointer"
          >
            {GRADES.map(g => (
              <option key={g} value={g}>
                {g <= 6 ? `${g}º Primaria` : `${g - 6}º Secundaria`}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={deletingGrade}
            onClick={handleDeleteGrade}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition"
          >
            {deletingGrade ? 'Eliminando…' : `Eliminar todo ${deleteGrade}º`}
          </button>
        </div>
      </div>

      {/* ── Importar CSV ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 space-y-5">
        <div>
          <h3 className="font-bold text-slate-800 mb-1">📥 Importar vocabulario (CSV)</h3>
          <p className="text-xs text-slate-400">Sube un archivo CSV para añadir palabras en masa. Máximo 500 por importación.</p>
        </div>

        {/* Formato esperado */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Formato del CSV</p>
          <div className="overflow-x-auto no-scrollbar">
            <code className="block text-[11px] text-slate-700 whitespace-pre font-mono leading-relaxed">
{`word,kanji,reading,meaning_es,grade,meaning_ca,meaning_en,sort_order,category,word_type
行く,行,いく,ir (a un lugar),1,anar,to go,10,actions,verb_intransitive
食べる,食,たべる,comer,1,menjar,to eat,20,food,verb_transitive
犬,犬,いぬ,perro,1,gos,dog,30,animals,noun`}
            </code>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Columnas obligatorias</p>
              <ul className="space-y-0.5">
                {[
                  ['word',       'Palabra/expresión japonesa'],
                  ['kanji',      'Carácter kanji principal'],
                  ['reading',    'Lectura en hiragana'],
                  ['meaning_es', 'Significado en español'],
                  ['grade',      'Grado escolar (1-9)'],
                ].map(([col, desc]) => (
                  <li key={col}><code className="bg-slate-200 px-1 rounded">{col}</code> — {desc}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Columnas opcionales</p>
              <ul className="space-y-0.5">
                {[
                  ['meaning_ca',  'Significado en catalán'],
                  ['meaning_en',  'Significado en inglés'],
                  ['sort_order',  'Orden dentro del grado (número)'],
                  ['category',    'animals, food, family… (19 valores)'],
                  ['word_type',   'noun, verb_transitive, adj_i…'],
                ].map(([col, desc]) => (
                  <li key={col}><code className="bg-slate-200 px-1 rounded">{col}</code> — {desc}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Codificación: <strong>UTF-8</strong>. Separador: <strong>coma</strong>. Si un valor contiene comas, rodéalo de comillas dobles.
            Los valores duplicados (mismo <code className="bg-slate-200 px-1 rounded">word</code> + <code className="bg-slate-200 px-1 rounded">kanji</code>) se omiten automáticamente. La misma palabra con diferente kanji sí se permite.
          </p>
        </div>

        {/* File input + oficial toggle */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex-1 min-w-[200px] cursor-pointer flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl transition group">
            <span className="text-2xl">📄</span>
            <span className="text-sm text-slate-500 group-hover:text-slate-700">
              {preview ? `${preview.length} filas cargadas` : 'Selecciona un archivo .csv'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isOfficial}
              onChange={e => setIsOfficial(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <span className="text-sm font-medium text-slate-700">Marcar como oficial</span>
          </label>
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <p className="font-semibold text-rose-700 text-sm mb-2">❌ Errores al leer el CSV</p>
            <ul className="space-y-1">
              {parseErrors.map((e, i) => <li key={i} className="text-xs text-rose-600">{e}</li>)}
            </ul>
          </div>
        )}

        {/* Preview table */}
        {preview && preview.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-600">
              Vista previa — {preview.length} palabras a importar{' '}
              <span className="font-normal text-slate-400">(mostrando primeras 10)</span>
            </p>
            <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="py-2 px-3">Word</th>
                    <th className="py-2 px-3">Kanji</th>
                    <th className="py-2 px-3">Reading</th>
                    <th className="py-2 px-3">Significado</th>
                    <th className="py-2 px-3">Grado</th>
                    <th className="py-2 px-3">Cat.</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 px-3 font-bold text-slate-800">{row.word}</td>
                      <td className="py-2 px-3 kanji-font text-base text-slate-500">{row.kanji}</td>
                      <td className="py-2 px-3 text-indigo-600 font-medium">{row.reading}</td>
                      <td className="py-2 px-3 text-slate-500">{row.meaning_es}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">{row.grade}º</span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{row.category || '—'}</td>
                    </tr>
                  ))}
                  {preview.length > 10 && (
                    <tr>
                      <td colSpan={6} className="py-2 px-3 text-center text-slate-400 text-xs">
                        … y {preview.length - 10} más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              disabled={importing}
              onClick={handleImport}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition"
            >
              {importing ? 'Importando…' : `✓ Importar ${preview.length} palabras`}
            </button>
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div className={`rounded-xl p-4 border ${importResult.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            {importResult.ok ? (
              <div className="text-sm text-emerald-800 space-y-1">
                <p className="font-bold">✓ Importación completada</p>
                <p>Insertadas: <strong>{importResult.inserted}</strong> de <strong>{importResult.total}</strong></p>
                {(importResult.skipped_in_file ?? 0) > 0 && (
                  <p className="text-xs text-emerald-700">
                    Duplicadas en el archivo: <strong>{importResult.skipped_in_file}</strong>{' '}
                    <span className="text-emerald-500">(mismo word + kanji repetido en el CSV)</span>
                  </p>
                )}
                {(importResult.skipped_in_db ?? 0) > 0 && (
                  <p className="text-xs text-emerald-700">
                    Ya existían en BD: <strong>{importResult.skipped_in_db}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-rose-800">
                <p className="font-bold mb-2">❌ Errores de validación</p>
                <ul className="space-y-1 text-xs">
                  {importResult.errors?.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Vocab reports ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">🚩 Errores reportados</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Lecturas o significados incorrectos reportados por usuarios. Edita y valida directamente.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setVocabReportsLoading(true)
              try { setVocabReports(await fetchVocabReports()) }
              catch (e: any) { showToast(e.message || 'Error', 'error') }
              finally { setVocabReportsLoading(false) }
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition"
          >
            {vocabReportsLoading ? 'Cargando…' : vocabReports === null ? 'Cargar reportes' : '🔄 Actualizar'}
          </button>
        </div>

        {vocabReports === null && !vocabReportsLoading && (
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">Pulsa «Cargar reportes» para ver los errores reportados.</p>
        )}
        {vocabReports !== null && vocabReports.length === 0 && (
          <p className="text-emerald-600 dark:text-emerald-400 text-sm text-center py-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">✓ No hay errores reportados — ¡todo correcto!</p>
        )}

        {vocabReports !== null && vocabReports.length > 0 && (() => {
          // Group by word
          const byWord = new Map<string, VocabReport[]>()
          for (const r of vocabReports) {
            if (!byWord.has(r.word)) byWord.set(r.word, [])
            byWord.get(r.word)!.push(r)
          }
          return (
            <div className="space-y-3">
              {Array.from(byWord.entries()).map(([word, reports]) => {
                const openCount = reports.filter(r => r.status === 'open').length
                const draft = editDraft[word]
                return (
                  <div key={word} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {/* Word header */}
                    <button
                      type="button"
                      onClick={() => {
                        const isOpen = reportExpanded === word
                        setReportExpanded(isOpen ? null : word)
                        if (!isOpen && !editDraft[word]) {
                          // Prefill from first report's context (word text only — real values come from search)
                          setEditDraft(d => ({ ...d, [word]: { reading: '', meaning_es: '' } }))
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-left"
                    >
                      <span className="kanji-font text-lg font-bold text-slate-800 dark:text-slate-100">{word}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300">{reports.length} reporte{reports.length !== 1 ? 's' : ''}</span>
                      {openCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">{openCount} abierto{openCount !== 1 ? 's' : ''}</span>
                      )}
                      <span className="ml-auto text-slate-300 dark:text-slate-600 text-xs">{reportExpanded === word ? '▲' : '▼'}</span>
                    </button>

                    {reportExpanded === word && (
                      <div className="p-4 space-y-4 bg-slate-50/50 dark:bg-slate-700/20">
                        {/* Reports list */}
                        <div className="space-y-2">
                          {reports.map(r => (
                            <div key={r.id} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                              <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                                r.field === 'reading'  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' :
                                r.field === 'meaning'  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' :
                                r.field === 'kanji'    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                         'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}>
                                {r.field === 'reading' ? 'Lectura' : r.field === 'meaning' ? 'Significado' : r.field === 'kanji' ? 'Kanji' : 'General'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{r.user_email} · {new Date(r.created_at).toLocaleDateString('es-ES')}</p>
                                {r.description && <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">{r.description}</p>}
                              </div>
                              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                                r.status === 'open'
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {r.status === 'open' ? 'Abierto' : 'Resuelto'}
                              </span>
                              <button
                                type="button"
                                disabled={reportUpdating === r.id}
                                onClick={async () => {
                                  const newStatus = r.status === 'open' ? 'resolved' : 'open'
                                  setReportUpdating(r.id)
                                  try {
                                    await updateVocabReportStatus(r.id, newStatus)
                                    setVocabReports(prev => prev ? prev.map(x => x.id === r.id ? { ...x, status: newStatus } : x) : prev)
                                  } catch (e: any) { showToast(e.message || 'Error', 'error') }
                                  finally { setReportUpdating(null) }
                                }}
                                className="shrink-0 text-xs text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition font-medium"
                              >
                                {reportUpdating === r.id ? '…' : r.status === 'open' ? '✓ Resolver' : '↩ Reabrir'}
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Inline edit */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">✏️ Corregir en vocabulario compartido (afecta a todos los usuarios)</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Lectura (hiragana)</label>
                              <input
                                type="text"
                                value={draft?.reading ?? ''}
                                onChange={e => setEditDraft(d => ({ ...d, [word]: { ...d[word], reading: e.target.value } }))}
                                placeholder="Lectura actual…"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Significado (español)</label>
                              <input
                                type="text"
                                value={draft?.meaning_es ?? ''}
                                onChange={e => setEditDraft(d => ({ ...d, [word]: { ...d[word], meaning_es: e.target.value } }))}
                                placeholder="Significado actual…"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              disabled={editSaving === word || (!draft?.reading && !draft?.meaning_es)}
                              onClick={async () => {
                                if (!draft?.reading && !draft?.meaning_es) return
                                setEditSaving(word)
                                try {
                                  const patch: Parameters<typeof updateVocabWord>[1] = {}
                                  if (draft.reading)    patch.reading    = draft.reading
                                  if (draft.meaning_es) patch.meaning_es = draft.meaning_es
                                  await updateVocabWord(word, patch)
                                  // Resolve all open reports for this word
                                  const openIds = reports.filter(r => r.status === 'open').map(r => r.id)
                                  await Promise.all(openIds.map(id => updateVocabReportStatus(id, 'resolved')))
                                  setVocabReports(prev => prev
                                    ? prev.map(r => r.word === word && r.status === 'open' ? { ...r, status: 'resolved' } : r)
                                    : prev)
                                  setEditDraft(d => ({ ...d, [word]: { reading: '', meaning_es: '' } }))
                                  showToast(`✓ "${word}" corregido y reportes resueltos`, 'success')
                                } catch (e: any) {
                                  showToast(e.message || 'Error guardando', 'error')
                                } finally {
                                  setEditSaving(null)
                                }
                              }}
                              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition"
                            >
                              {editSaving === word ? 'Guardando…' : '💾 Guardar y resolver'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
