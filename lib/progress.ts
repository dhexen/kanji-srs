import type { VocabItem } from './srs'

export interface ContextText {
  id: number
  topic: string
  emoji: string
  level: string
  japanese: string
  spanish: string
  catalan: string
  english: string
  words_used: string[]
}

export interface VocabProgressRow {
  user_id: string
  jp: string
  kanji: string
  reading: string
  meaning: string
  status: 'locked' | 'active'
  srs_level: number
  due: number
  srs_multi_level: number | null
  srs_multi_due: number | null
  srs_meaning_level: number | null
  srs_meaning_due: number | null
  srs_kanji_level: number | null
  srs_kanji_due: number | null
  srs_reading_level: number | null
  srs_reading_due: number | null
  srs_reverse_level: number | null
  srs_reverse_due: number | null
  updated_at?: string
}

export interface UserSettingsRow {
  user_id: string
  gemini_api_key: string | null
  context_texts: unknown[]
  language: string
  reviews_since_snapshot: number
  updated_at?: string
}

export function vocabItemToRow(userId: string, item: VocabItem): VocabProgressRow {
  return {
    user_id: userId,
    jp: item.jp,
    kanji: item.kanji,
    reading: item.reading,
    meaning: item.meaning,
    status: item.status,
    srs_level: item.srsLevel ?? 0,
    due: item.due ?? 0,
    srs_multi_level: item.srs_multi_level ?? null,
    srs_multi_due: item.srs_multi_due ?? null,
    srs_meaning_level: item.srs_meaning_level ?? null,
    srs_meaning_due: item.srs_meaning_due ?? null,
    srs_kanji_level: item.srs_kanji_level ?? null,
    srs_kanji_due: item.srs_kanji_due ?? null,
    srs_reading_level: item.srs_reading_level ?? null,
    srs_reading_due: item.srs_reading_due ?? null,
    srs_reverse_level: item.srs_reverse_level ?? null,
    srs_reverse_due: item.srs_reverse_due ?? null,
    updated_at: new Date().toISOString(),
  }
}

export function rowToVocabItem(row: VocabProgressRow): VocabItem {
  return {
    kanji: row.kanji,
    jp: row.jp,
    reading: row.reading,
    meaning: row.meaning,
    srsLevel: row.srs_level,
    due: row.due,
    status: row.status,
    srs_multi_level: row.srs_multi_level ?? undefined,
    srs_multi_due: row.srs_multi_due ?? undefined,
    srs_meaning_level: row.srs_meaning_level ?? undefined,
    srs_meaning_due: row.srs_meaning_due ?? undefined,
    srs_kanji_level: row.srs_kanji_level ?? undefined,
    srs_kanji_due: row.srs_kanji_due ?? undefined,
    srs_reading_level: row.srs_reading_level ?? undefined,
    srs_reading_due: row.srs_reading_due ?? undefined,
    srs_reverse_level: row.srs_reverse_level ?? undefined,
    srs_reverse_due: row.srs_reverse_due ?? undefined,
  }
}

export const UPSERT_CHUNK_SIZE = 200
export const SNAPSHOT_EVERY_N_REVIEWS = 25
