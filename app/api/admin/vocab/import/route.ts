import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const VALID_CATEGORIES = [
  'animals','nature','colors','weather','time','food','transport','family',
  'body','school','home','work','places','numbers','emotions','actions','sports','culture','other',
]
const VALID_WORD_TYPES = [
  'noun','verb_transitive','verb_intransitive','verb',
  'adj_i','adj_na','adverb','particle','expression',
]

interface ImportRow {
  word: string
  kanji: string
  reading: string
  meaning_es: string
  grade: number
  meaning_ca?: string
  meaning_en?: string
  sort_order?: number
  category?: string
  word_type?: string
}

/**
 * POST /api/admin/vocab/import
 * Body: { rows: ImportRow[], is_official?: boolean }
 * Upserts vocabulary rows. Skips rows that already exist (by 'word').
 */
export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const body = await request.json()
    const rows: ImportRow[] = body.rows ?? []
    const is_official: boolean = body.is_official !== false  // default true

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AdminApiError('No se proporcionaron filas', 400)
    }
    if (rows.length > 500) {
      throw new AdminApiError('Máximo 500 palabras por importación', 400)
    }

    const errors: string[] = []
    const valid: Record<string, unknown>[] = []

    rows.forEach((row, i) => {
      const n = i + 1
      if (!row.word?.trim())      { errors.push(`Fila ${n}: 'word' es obligatorio`);      return }
      if (!row.kanji?.trim())     { errors.push(`Fila ${n}: 'kanji' es obligatorio`);     return }
      if (!row.reading?.trim())   { errors.push(`Fila ${n}: 'reading' es obligatorio`);   return }
      if (!row.meaning_es?.trim()){ errors.push(`Fila ${n}: 'meaning_es' es obligatorio`); return }
      const grade = Number(row.grade)
      if (!grade || grade < 1 || grade > 9) { errors.push(`Fila ${n}: 'grade' debe ser 1-9`); return }

      const cat = row.category?.trim() || null
      const wt  = row.word_type?.trim() || null
      if (cat && !VALID_CATEGORIES.includes(cat)) { errors.push(`Fila ${n}: categoría '${cat}' no válida`); return }
      if (wt  && !VALID_WORD_TYPES.includes(wt))  { errors.push(`Fila ${n}: tipo '${wt}' no válido`);       return }

      valid.push({
        word:       row.word.trim(),
        kanji:      row.kanji.trim(),
        reading:    row.reading.trim(),
        meaning_es: row.meaning_es.trim(),
        grade,
        meaning_ca:  row.meaning_ca?.trim()  || null,
        meaning_en:  row.meaning_en?.trim()  || null,
        sort_order:  row.sort_order != null ? Number(row.sort_order) : 99999,
        category:    cat,
        word_type:   wt,
        is_official,
      })
    })

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 422 })
    }

    // Deduplicate within the submitted batch (keep first occurrence of each word)
    const dedupedMap = new Map<string, Record<string, unknown>>()
    for (const row of valid) dedupedMap.set(row.word as string, row)
    const deduped = Array.from(dedupedMap.values())

    // Check which words already exist (in chunks of 150 to avoid URL limits)
    const allWords = deduped.map(r => r.word as string)
    const existingSet = new Set<string>()
    const CHECK_CHUNK = 150
    for (let i = 0; i < allWords.length; i += CHECK_CHUNK) {
      const slice = allWords.slice(i, i + CHECK_CHUNK)
      const { data: existing, error: checkErr } = await service
        .from('vocabulary')
        .select('word')
        .in('word', slice)
      if (checkErr) throw new AdminApiError(checkErr.message, 500)
      for (const row of existing ?? []) existingSet.add(row.word as string)
    }

    const newRows = deduped.filter(r => !existingSet.has(r.word as string))
    const skipped_in_file = valid.length - deduped.length   // same word appeared multiple times in the CSV
    const skipped_in_db   = deduped.length - newRows.length // word already existed in DB
    let inserted = 0

    // Insert new rows in chunks of 100
    const INSERT_CHUNK = 100
    for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
      const chunk = newRows.slice(i, i + INSERT_CHUNK)
      const { error: insertErr } = await service
        .from('vocabulary')
        .insert(chunk)
      if (insertErr) throw new AdminApiError(insertErr.message, 500)
      inserted += chunk.length
    }

    return NextResponse.json({
      ok: true,
      inserted,
      skipped: skipped_in_file + skipped_in_db,
      skipped_in_file,
      skipped_in_db,
      total: valid.length,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
