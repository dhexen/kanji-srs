import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  listAdminUsers,
  createAdminUser,
  adminJsonError,
} from '@/lib/admin-server'

export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const q    = searchParams.get('q')    ?? undefined
    const role = searchParams.get('role') ?? undefined
    if (!q && (!role || role === 'all')) {
      return NextResponse.json({ users: [] })
    }
    const users = await listAdminUsers(service, { q, role })
    return NextResponse.json({ users })
  } catch (e) {
    return adminJsonError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const { email, password, role = 'user' } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(String(email))) {
      return NextResponse.json({ error: 'El email no tiene un formato válido' }, { status: 400 })
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    const validRole = role === 'admin' ? 'admin' : role === 'contributor' ? 'contributor' : 'user'
    const user = await createAdminUser(service, email, password, validRole)
    return NextResponse.json(user)
  } catch (e) {
    return adminJsonError(e)
  }
}
