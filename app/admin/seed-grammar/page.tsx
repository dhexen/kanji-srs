import { Suspense } from 'react'
import GrammarSeedClient from '@/components/admin/GrammarSeedClient'

export const metadata = { title: 'Generar frases de gramática' }

export default function GrammarSeedPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin" className="text-slate-400 hover:text-slate-600 text-sm">← Admin</a>
          <h1 className="text-xl font-semibold text-slate-800">Generación de frases de gramática</h1>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <Suspense fallback={<div className="p-8 text-slate-400">Cargando…</div>}>
            <GrammarSeedClient />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
