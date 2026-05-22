import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(url, key)

export async function uploadProgress(vocabDb: any[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('srs_progress').upsert({ user_id: user.id, vocab_db: vocabDb, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function downloadProgress() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('srs_progress').select('vocab_db, gemini_api_key, context_texts, language').eq('user_id', user.id).maybeSingle()
  if (error) { console.error('Supabase download error:', error); return null }
  return data ?? null
}

export async function saveGeminiKey(key: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('srs_progress').upsert({ user_id: user.id, gemini_api_key: key, vocab_db: [] }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function saveContextTexts(texts: any[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('srs_progress').upsert({ user_id: user.id, context_texts: texts.slice(0, 10), vocab_db: [] }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function saveLanguage(lang: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('srs_progress').upsert({ user_id: user.id, language: lang, vocab_db: [] }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function getUserRole(userId: string): Promise<'admin' | 'user'> {
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
  if (error || !data) return 'user'
  return data.role as 'admin' | 'user'
}

export async function setUserRole(userId: string, role: 'admin' | 'user') {
  const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function getVocabularyByKanjis(kanjis: string[]) {
  const { data, error } = await supabase.from('vocabulary').select('*').in('kanji', kanjis).eq('grade', 1)
  if (error) throw error
  return data
}

export async function getRandomKanjis(count: number, grade = 1) {
  const { data, error } = await supabase.from('vocabulary').select('kanji').eq('grade', grade)
  if (error) throw error
  const unique = Array.from(new Set((data || []).map((d: any) => d.kanji))) as string[]
  return unique.sort(() => Math.random() - 0.5).slice(0, count)
}
