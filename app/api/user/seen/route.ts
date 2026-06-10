export const dynamic = 'force-dynamic'

// Updates the caller's last_seen_at. Done server-side with the service-role
// client (validating the user's token) instead of an RPC, so it never depends
// on auth.uid() resolving or PostgREST's function cache. Only touches
// last_seen_at — never the user's role.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const userClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: { user }, error } = await userClient.auth.getUser(token)
  if (error || !user) return NextResponse.json({ ok: false }, { status: 401 })

  if (!serviceKey) return NextResponse.json({ ok: true, skipped: 'no service key' })

  const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  // Update only last_seen_at; never overwrite the role.
  const { error: updErr } = await service
    .from('user_roles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
