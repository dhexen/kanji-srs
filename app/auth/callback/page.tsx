'use client'
/**
 * Auth callback page
 *
 * Supabase redirige aquí tras completar el flujo OAuth (Google) o al clickar
 * un magic link de email. El cliente Supabase detecta automáticamente el código
 * en la URL y establece la sesión. El store escucha el evento SIGNED_IN y carga
 * los datos del usuario; cuando `state.user` esté disponible redirigimos a /review.
 *
 * Si tras 8 segundos no hay sesión (e.g. enlace expirado), se redirige a /login.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function AuthCallback() {
  const { state } = useStore()
  const router = useRouter()

  // Redirigir a /review en cuanto la sesión esté disponible
  useEffect(() => {
    if (state.loaded && state.user) {
      router.replace('/review')
    }
  }, [state.loaded, state.user, router])

  // Fallback: si pasan 8 s sin sesión, volver al login (enlace expirado, etc.)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!state.user) router.replace('/login')
    }, 8000)
    return () => clearTimeout(timer)
  }, [state.user, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20">
      <div className="text-5xl select-none">🌸</div>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      <p className="text-slate-400 text-sm">Iniciando sesión…</p>
    </div>
  )
}
