'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ConfirmCtx { confirm: (text: string) => Promise<boolean> }
const Ctx = createContext<ConfirmCtx | null>(null)
export const useConfirm = () => useContext(Ctx)!

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null)

  const confirm = useCallback((text: string) => new Promise<boolean>(resolve => {
    setState({ text, resolve })
  }), [])

  const handle = (val: boolean) => { state?.resolve(val); setState(null) }

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl mx-4 relative border border-slate-100">
            <button onClick={() => handle(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">⚠️ Confirmar</h3>
            <p className="text-sm text-slate-500 mb-6">{state.text}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => handle(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition">Cancelar</button>
              <button onClick={() => handle(true)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
