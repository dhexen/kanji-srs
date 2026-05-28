'use client'
import { useSidebar } from '@/lib/sidebar-context'
import { useStore } from '@/lib/store'
import Header from './Header'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const { state } = useStore()
  const effectiveRole = state.simulatedRole ?? state.role
  const isAdmin = effectiveRole === 'admin'

  return (
    <div
      className={[
        'min-h-screen flex flex-col',
        'bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
        'transition-[padding-left] duration-300 ease-in-out',
        isAdmin ? (collapsed ? 'lg:pl-0' : 'lg:pl-56') : '',
      ].join(' ')}
    >
      {isAdmin && <Header />}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-12">
        {children}
      </main>
    </div>
  )
}
