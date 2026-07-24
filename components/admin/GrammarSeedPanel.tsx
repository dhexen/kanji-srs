'use client'

import { useState } from 'react'
import GrammarSeedClient from './GrammarSeedClient'

// Envoltorio con conmutador Producción / TEST sobre el mismo generador de frases.
// `key={target}` remonta el cliente para que recargue el estado del destino elegido.
export default function GrammarSeedPanel() {
  const [target, setTarget] = useState<'prod' | 'test'>('prod')
  return (
    <div>
      <div className="flex gap-2 px-4 pt-4">
        <button
          onClick={() => setTarget('prod')}
          className={`px-3 py-1.5 text-sm rounded-lg border font-medium ${target === 'prod' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          Producción
        </button>
        <button
          onClick={() => setTarget('test')}
          className={`px-3 py-1.5 text-sm rounded-lg border font-medium ${target === 'test' ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          🧪 TEST (sandbox)
        </button>
      </div>
      <GrammarSeedClient key={target} target={target} />
    </div>
  )
}
