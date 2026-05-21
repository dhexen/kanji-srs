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
