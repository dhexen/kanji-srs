import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireEditorRole, adminJsonError, AdminApiError } from '@/lib/admin-server'

// Regex matching CJK Unified Ideographs (kanji)
const KANJI_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/gu

/**
 * POST /api/admin/vocab
 * Adds a new vocabulary word (marked non-official) to the shared vocabulary table.
 * The word is automatically associated with every kanji character it contains that
 * already exists in the vocabulary table.
 * Requires admin or contributor role (no AAL2 / 2FA needed).
 */
export async function POST(request: NextRequest) {
  try {
    const { service } = await requireEditorRole(request)
    const body = await request.json()

    const word     = (body.word     ?? '').trim()
    const reading  = (body.reading  ?? '').trim()
    const meaningEs = (body.meaning_es ?? '').trim()
    const meaningCa = (body.meaning_ca ?? '').trim() || null
    const meaningEn = (body.meaning_en ?? '').trim() || null

    if (!word)      throw new AdminApiError('La palabra (kanji) es obligatoria', 400)
    if (!reading)   throw new AdminApiError('La lectura en hiragana es obligatoria', 400)
    if (!meaningEs) throw new AdminApiError('El significado en español es obligatorio', 400)
    if (word.length > 20)    throw new AdminApiError('La palabra no puede superar 20 caracteres', 400)
    if (reading.length > 50) throw new AdminApiError('La lectura no puede superar 50 caracteres', 400)

    // 1. Extract unique kanji characters from the word
    const kanjiChars = Array.from(new Set(word.match(KANJI_RE) ?? []))
    if (kanjiChars.length === 0) {
      throw new AdminApiError('La palabra no contiene caracteres kanji reconocidos', 400)
    }

    // 2. Find which of those kanji already exist in vocabulary (to get their grade)
    const { data: existing, error: queryErr } = await service
      .from('vocabulary')
      .select('kanji, grade')
      .in('kanji', kanjiChars)
    if (queryErr) throw new AdminApiError(queryErr.message, 500)

    // Build a unique (kanji → grade) map (take highest grade in case of conflicts)
    const kanjiGradeMap = new Map<string, number>()
    for (const row of existing ?? []) {
      if (!kanjiGradeMap.has(row.kanji) || row.grade > (kanjiGradeMap.get(row.kanji) ?? 0)) {
        kanjiGradeMap.set(row.kanji, row.grade)
      }
    }

    if (kanjiGradeMap.size === 0) {
      throw new AdminApiError(
        `Ningún kanji de "${word}" existe en la base de datos (${kanjiChars.join(', ')}). ` +
        'Añade primero esos kanjis al vocabulario.',
        400,
      )
    }

    // 3. Insert one row per matching kanji (skip if duplicate word+kanji)
    const insertedKanjis: Array<{ kanji: string; grade: number }> = []
    for (const [kanji, grade] of kanjiGradeMap) {
      const { error: insErr } = await service.from('vocabulary').insert({
        word,
        kanji,
        reading,
        meaning_es: meaningEs,
        meaning_ca: meaningCa,
        meaning_en: meaningEn,
        grade,
        is_official: false,
        sort_order: 99999,
      })

      if (insErr?.code === '23505') {
        // Duplicate (word, kanji) — skip silently
        continue
      }
      if (insErr) throw new AdminApiError(insErr.message, 500)
      insertedKanjis.push({ kanji, grade })
    }

    if (insertedKanjis.length === 0) {
      throw new AdminApiError(
        'La palabra ya existe en todos los kanjis detectados.',
        409,
      )
    }

    return NextResponse.json({ ok: true, kanjis: insertedKanjis, count: insertedKanjis.length })
  } catch (e) {
    return adminJsonError(e)
  }
}

/**
 * DELETE /api/admin/vocab?grade=1
 * Removes ALL words of a given grade from the shared vocabulary table AND
 * from every user's SRS progress so they disappear from all profiles.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const grade = Number(request.nextUrl.searchParams.get('grade'))
    if (!grade || grade < 1 || grade > 9) throw new AdminApiError('Grado inválido (1-9)', 400)

    // 1. Delete from shared vocabulary — capture the words that were deleted
    const { data: deleted, error: vocabErr } = await service
      .from('vocabulary')
      .delete()
      .eq('grade', grade)
      .select('word')
    if (vocabErr) throw new AdminApiError(vocabErr.message, 500)

    const deletedWords = (deleted ?? []).map(r => r.word as string)

    // 2. Delete from every user's SRS progress in chunks (avoids URL limits)
    if (deletedWords.length > 0) {
      const CHUNK = 150
      for (let i = 0; i < deletedWords.length; i += CHUNK) {
        const chunk = deletedWords.slice(i, i + CHUNK)
        const { error: progressErr } = await service
          .from('user_vocab_progress')
          .delete()
          .in('jp', chunk)
        if (progressErr) throw new AdminApiError(progressErr.message, 500)
      }
    }

    return NextResponse.json({ ok: true, deleted: deletedWords.length })
  } catch (e) {
    return adminJsonError(e)
  }
}
