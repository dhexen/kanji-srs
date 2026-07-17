'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'

/** Blocks a route to non-staff roles (admin/contributor only), redirecting everyone else to /review. */
export default function RoleGate({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  const router = useRouter()
  const effectiveRole = state.simulatedRole ?? state.role
  const allowed = effectiveRole === 'admin' || effectiveRole === 'contributor'

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
