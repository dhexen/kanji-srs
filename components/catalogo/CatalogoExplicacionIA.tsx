'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import {
  fetchCatalogoExplicacion, parseSecciones, promptExplicacion, saveCatalogoExplicacion,
  type CatalogTopic, type ExplicacionIA,
} from '@/lib/catalogo'

// La explicación de Gemini, para las fichas que no traen una propia (240 de
// las 676 solo tienen el reclamo de la web). Se genera una vez, a petición, y
// se guarda en catalog_explanations para no volver a pedirla.
//
// Va por /api/gemini como el resto de la app: con la clave de Gemini del
// usuario si la tiene, o con la del servidor (limitada a 10 por hora).

export default function CatalogoExplicacionIA({ topic }: { topic: CatalogTopic }) {
  const { state } = useStore()
  const [guardada, setGuardada] = useState<ExplicacionIA | null>(null)
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetchCatalogoExplicacion(topic.id)
      .then(e => { if (vivo) setGuardada(e) })
      .catch(e => { if (vivo) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [topic.id])

  async function generar() {
    setGenerando(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          prompt: promptExplicacion(topic),
          model: state.geminiModel,
          userApiKey: state.geminiApiKey,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`)
      const texto = String(data.text ?? '').trim()
      if (!texto) throw new Error('Gemini no ha devuelto nada. Inténtalo de nuevo.')
      const modelo = typeof data.model === 'string' ? data.model : null
      await saveCatalogoExplicacion(topic.id, texto, modelo)
      setGuardada({ explanation_es: texto, model: modelo, updated_at: new Date().toISOString() })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerando(false)
    }
  }

  if (cargando) return <p className="text-sm text-slate-400">Cargando…</p>

  const secciones = guardada ? parseSecciones(guardada.explanation_es) : []

  return (
    <div className="flex flex-col gap-3">
      {guardada ? (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
              title="La ficha original no trae explicación. Esta la ha escrito Gemini."
            >
              ✨ Generada con Gemini{guardada.model ? ` · ${guardada.model}` : ''}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={generar}
              disabled={generando}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 disabled:opacity-50 transition"
            >
              ↺ {generando ? 'Regenerando…' : 'Regenerar'}
            </button>
          </div>
          {secciones.length ? (
            <div className="flex flex-col gap-3">
              {secciones.map(s => (
                <div key={s.title}>
                  <p className="text-[11px] font-bold text-violet-500 dark:text-violet-400 tracking-wide mb-0.5">{s.title}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">{s.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">{guardada.explanation_es}</p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            La ficha original no trae explicación propia, solo el significado.
          </p>
          <button
            type="button"
            onClick={generar}
            disabled={generando}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-sm"
          >
            {generando ? 'Generando…' : '✨ Explicar con Gemini'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
