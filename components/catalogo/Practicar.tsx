'use client'
import { useMemo, useState, type ReactNode } from 'react'
import { diffSides, plain, sameText } from '@/lib/catalogo-diff'

// Las cuatro maneras de practicar una frase del catálogo (copiado de Hellotalk).
// No guarda nada: ni puntuación, ni racha, ni SRS. Al recargar vuelve a estar
// todo tapado.
//
// El ejercicio se elige con dos preguntas:
//   Dirección  日本語 → Español, o al revés.
//   Cómo       Ver · Tapado · Piezas · Escribir.

export type Dir = 'ja-es' | 'es-ja'
export type Como = 'ver' | 'tapado' | 'piezas' | 'escribir'

const DIRS: Record<Dir, string> = {
  'ja-es': '日本語 → Español',
  'es-ja': 'Español → 日本語',
}

const COMOS: Record<Como, string> = {
  ver: 'Ver',
  tapado: 'Tapado',
  piezas: 'Piezas',
  escribir: 'Escribir',
}

function Interruptor<T extends string>({
  opciones, valor, onChange, borde,
}: {
  opciones: Record<T, string>
  valor: T
  onChange: (v: T) => void
  /** La dirección se marca con un borde y no con relleno, para no confundirla con el «cómo». */
  borde?: boolean
}) {
  return (
    <span className="inline-flex flex-wrap rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5">
      {(Object.keys(opciones) as T[]).map(k => {
        const on = valor === k
        const estilo = !on
          ? 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
          : borde
            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ring-1 ring-violet-500'
            : 'bg-violet-600 text-white shadow-sm'
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(k)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${estilo}`}
          >
            {opciones[k]}
          </button>
        )
      })}
    </span>
  )
}

/** Los dos interruptores: en qué dirección y de qué manera. */
export function Ejes({
  dir, setDir, como, setComo,
}: {
  dir: Dir
  setDir: (d: Dir) => void
  como: Como
  setComo: (c: Como) => void
}) {
  const etiqueta = 'w-20 shrink-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wide'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={etiqueta}>Dirección</span>
        <Interruptor opciones={DIRS} valor={dir} onChange={setDir} borde />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={etiqueta}>Cómo</span>
        <Interruptor opciones={COMOS} valor={como} onChange={setComo} />
      </div>
    </div>
  )
}

// ── Tapado: la respuesta está puesta, pero borrosa ───────────────────────────
export function Borrosa({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const [visto, setVisto] = useState(false)
  return (
    <button
      type="button"
      aria-expanded={visto}
      aria-label={visto ? undefined : etiqueta}
      title={visto ? undefined : etiqueta}
      onClick={() => setVisto(v => !v)}
      className="group block w-full text-left"
    >
      <span
        className={`block transition-[filter] ${
          visto ? '' : 'blur-[5px] group-hover:blur-[3.5px] select-none'
        }`}
      >
        {children}
      </span>
    </button>
  )
}

const PIEZA =
  'rounded-lg border px-2.5 py-1 text-[15px] leading-snug transition ' +
  'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 ' +
  'hover:border-violet-400 dark:hover:border-violet-500'

// ── Piezas: montar la frase pulsándolas en orden ─────────────────────────────
export function Piezas({ piezas, correcta, modo }: { piezas: string[]; correcta: string; modo: 'word' | 'char' }) {
  // Se barajan una vez: si no, al colocar una pieza las demás se moverían.
  const banco = useMemo(() => baraja(piezas), [piezas])
  const [puestas, setPuestas] = useState<number[]>([])

  const completa = puestas.length === banco.length
  const tuya = puestas.map(i => banco[i]).join(modo === 'word' ? ' ' : '')

  return (
    <>
      <div className="min-h-[44px] flex flex-wrap items-center gap-1.5 rounded-xl border-2 border-dashed border-violet-200 dark:border-slate-600 bg-violet-50/40 dark:bg-slate-900/30 p-2">
        {puestas.length === 0 && <span className="text-xs text-slate-400 px-1">Pulsa las piezas en orden</span>}
        {puestas.map((i, n) => (
          <button
            key={`${i}-${n}`}
            type="button"
            className={PIEZA}
            onClick={() => setPuestas(p => p.filter((_, k) => k !== n))}
          >
            {banco[i]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {banco.map((pieza, i) => (
          <button
            key={i}
            type="button"
            className={`${PIEZA} disabled:opacity-25 disabled:pointer-events-none`}
            disabled={puestas.includes(i)}
            onClick={() => setPuestas(p => [...p, i])}
          >
            {pieza}
          </button>
        ))}
      </div>

      {completa && <Resultado tuya={tuya} correcta={correcta} modo={modo} />}
    </>
  )
}

// ── Escribir: la frase entera a mano ─────────────────────────────────────────
export function Escribe({ correcta, modo, pista }: { correcta: string; modo: 'word' | 'char'; pista: string }) {
  const [texto, setTexto] = useState('')
  // Lo comprobado, no lo que estás escribiendo: si no, la corrección iría
  // apareciendo letra a letra y te cantaría la respuesta.
  const [enviado, setEnviado] = useState<string | null>(null)

  const comprobar = () => {
    const v = texto.trim()
    if (v) setEnviado(v)
  }

  const fallada = enviado !== null && !sameText(enviado, correcta)

  return (
    <>
      <div className="flex gap-2 items-start flex-wrap">
        <textarea
          rows={1}
          value={texto}
          placeholder={pista}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return
            // Al escribir en japonés el primer Enter confirma los kanji del IME:
            // mientras esté componiendo, solo vale con Ctrl.
            const conTecla = e.ctrlKey || e.metaKey
            if (e.nativeEvent.isComposing && !conTecla) return
            e.preventDefault()
            comprobar()
          }}
          className="flex-1 min-w-[200px] min-h-[40px] resize-y rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <button
          type="button"
          onClick={comprobar}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition shadow-sm"
        >
          Comprobar
        </button>
      </div>

      {enviado !== null && <Resultado tuya={enviado} correcta={correcta} modo={modo} />}
      {fallada && <p className="text-[11px] text-slate-400">Corrígela y vuelve a comprobar.</p>}
    </>
  )
}

// Lo tuyo y la frase de la ficha, enteras y con lo que cambia marcado. La
// puntuación y las mayúsculas no cuentan como error; los acentos sí.
function Resultado({ tuya, correcta, modo }: { tuya: string; correcta: string; modo: 'word' | 'char' }) {
  const lados = useMemo(() => diffSides(tuya, correcta, modo), [tuya, correcta, modo])
  const bien = plain(correcta) !== '' && sameText(tuya, correcta)

  return (
    <div className="flex flex-col gap-1.5">
      <p
        className={`self-start text-xs font-bold px-2.5 py-1 rounded-lg border ${
          bien
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
        }`}
      >
        {bien ? '✓ Igual que la ficha' : 'Hay un error'}
      </p>
      {bien ? (
        <Linea quien="La ficha" lado="suyo" partes={[{ type: 'same', text: correcta }]} />
      ) : (
        <>
          <Linea quien="La tuya" lado="tu" partes={lados.tuya} />
          <Linea quien="La ficha" lado="suyo" partes={lados.suya} />
        </>
      )}
    </div>
  )
}

function Linea({
  quien, lado, partes,
}: {
  quien: string
  lado: 'tu' | 'suyo'
  partes: { type: 'same' | 'del' | 'ins'; text: string }[]
}) {
  const marca =
    lado === 'tu'
      ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2.5">
      <span
        className={`sm:w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
          lado === 'tu' ? 'text-slate-400' : 'text-violet-500'
        }`}
      >
        {quien}
      </span>
      <span className="min-w-0 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
        {partes.map((p, i) =>
          p.type === 'same' ? (
            <span key={i}>{p.text}</span>
          ) : (
            <span key={i} className={`${marca} rounded px-0.5`}>{p.text}</span>
          ),
        )}
      </span>
    </div>
  )
}

/** El español en piezas: por espacios, con los signos pegados a su palabra. */
export function piezasEs(texto: string | null) {
  return (texto ?? '').split(/\s+/).filter(Boolean)
}

// Baraja la lista entera: las piezas repetidas (dos «の») se pulsan por separado
// porque el estado guarda índices, no textos.
function baraja(piezas: string[]) {
  const out = [...piezas]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
