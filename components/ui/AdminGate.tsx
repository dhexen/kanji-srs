'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

/** Blocks a route to non-admin roles, redirecting everyone else to /review. Stricter than RoleGate (which also allows contributors). */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  const router = useRouter()
  const effectiveRole = state.simulatedRole ?? state.role
  const allowed = effectiveRole === 'admin'

  useEffect(() => {
    if (state.loaded && !allowed) router.replace('/review')
  }, [state.loaded, allowed, router])

  if (!state.loaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }
  if (!allowed) return null

  return <>{children}</>
}
