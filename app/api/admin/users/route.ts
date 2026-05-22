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
    const users = await listAdminUsers(service)
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
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }
    const user = await createAdminUser(service, email, password, role === 'admin' ? 'admin' : 'user')
    return NextResponse.json(user)
  } catch (e) {
    return adminJsonError(e)
  }
}
