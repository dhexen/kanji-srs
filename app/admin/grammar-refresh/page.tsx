import GrammarRefreshMonitor from '@/components/admin/GrammarRefreshMonitor'

export const metadata = { title: 'Renovación de frases de gramática' }

export default function GrammarRefreshPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin" className="text-slate-400 hover:text-slate-600 text-sm">← Admin</a>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Renovación semanal de frases</h1>
        </div>
        <GrammarRefreshMonitor />
      </div>
    </div>
  )
}
