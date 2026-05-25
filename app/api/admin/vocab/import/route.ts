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
      if (!grade || grade < 1 || grade > 6) { errors.push(`Fila ${n}: 'grade' debe ser 1-6`); return }

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

    // Upsert in chunks of 100
    let inserted = 0
    let skipped = 0
    const CHUNK = 100
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK)
      const { data, error } = await service
        .from('vocabulary')
        .upsert(chunk, { onConflict: 'word', ignoreDuplicates: true })
        .select('word')

      if (error) throw new AdminApiError(error.message, 500)
      inserted += data?.length ?? 0
      skipped  += chunk.length - (data?.length ?? 0)
    }

    return NextResponse.json({ ok: true, inserted, skipped, total: valid.length })
  } catch (e) {
    return adminJsonError(e)
  }
}
