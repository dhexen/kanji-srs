// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export async function uploadProgress(vocabDb: any[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('srs_progress').upsert({
    user_id: user.id,
    vocab_db: vocabDb,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function downloadProgress() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('srs_progress')
    .select('vocab_db')
    .eq('user_id', user.id)
    .single()
  if (error) return null
  return data?.vocab_db ?? null
}

export async function getUserRole(userId: string): Promise<'admin' | 'user'> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()
  if (error || !data) return 'user'
  return data.role as 'admin' | 'user'
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role, created_at')
  if (error) throw error
  return data
}

export async function setUserRole(userId: string, role: 'admin' | 'user') {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role })
  if (error) throw error
}

export async function getVocabularyByKanjis(kanjis: string[]) {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .in('kanji', kanjis)
    .eq('grade', 1)
  if (error) throw error
  return data
}

export async function getRandomKanjis(count: number, grade = 1) {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('kanji')
    .eq('grade', grade)
  if (error) throw error
  const unique = Array.from(new Set((data || []).map((d: any) => d.kanji))) as string[]
  const shuffled = unique.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
