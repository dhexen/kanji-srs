'use client'
import { useState, useEffect } from 'react'
import type { KanaChar, KanaScript } from '@/lib/kana-data'
import { getAllKana, getKanaByGroup, GOJUUON_ORDER, DAKUTEN_ORDER, BASIC_GROUPS, DAKUTEN_GROUPS, strokeOrderUrl } from '@/lib/kana-data'
import type { OnLearned } from './KanaClient'

// ─────────────────────────────────────────────────────────────────────────────
// Stroke-order animation (Wikimedia). Hides itself gracefully if it can't load.
// ─────────────────────────────────────────────────────────────────────────────
function StrokeOrder({ kana }: { kana: KanaChar }) {
  const [failed, setFailed] = useState(false)
  // Reset error state when the kana changes
  useEffect(() => { setFailed(false) }, [kana.kana])

  if (failed) {
    return (
      <div className="w-28 h-28 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700">
        <span className="text-6xl kanji-font text-slate-300 dark:text-slate-600 select-none">{kana.kana}</span>
      </div>
    )
  }
  return (
    <div className="w-28 h-28 flex items-center justify-center rounded-xl bg-white border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={strokeOrderUrl(kana)}
        alt={`Orden de trazos de ${kana.kana}`}
        className="w-full h-full object-contain p-1"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mnemonic detail panel (shown when a kana is clicked in the reference table)
// ─────────────────────────────────────────────────────────────────────────────
function MnemonicPanel({ kana, onClose }: { kana: KanaChar; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
         onClick={onClose}>
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-violet-200 dark:border-slate-700 p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none"
          aria-label="Cerrar"
        >×</button>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-center shrink-0">
            <div className="text-7xl leading-none kanji-font text-violet-700 dark:text-violet-300 mb-1 select-none">
              {kana.kana}
            </div>
            <div className="text-lg font-bold text-slate-700 dark:text-slate-200 font-mono">{kana.romaji}</div>
          </div>
          <StrokeOrder kana={kana} />
        </div>

        <div className="text-center text-3xl mb-3">{kana.emoji}</div>

        <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 p-4 space-y-2">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">💡 {kana.mnemonic}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{kana.story}</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Guided learning: flashcards in gojūon order (a,i,u,e,o → ka,ki,ku…)
// ─────────────────────────────────────────────────────────────────────────────
function GuidedLearn({ script, includeDakuten, onExit, onLearned }: {
  script: KanaScript
  includeDakuten: boolean
  onExit: () => void
  onLearned?: OnLearned
}) {
  // Build ordered deck following the gojūon table order
  const groupsInOrder = includeDakuten ? [...BASIC_GROUPS, ...DAKUTEN_GROUPS] : BASIC_GROUPS
  const deck: KanaChar[] = groupsInOrder.flatMap(g => getKanaByGroup(script, [g]))

  const [idx, setIdx] = useState(0)
  const [showStory, setShowStory] = useState(false)

  const kana = deck[idx]
  const isFirst = idx === 0
  const isLast = idx === deck.length - 1

  useEffect(() => { setShowStory(false) }, [idx])

  // Mark the character as learned once the user views it in the guided flow.
  useEffect(() => {
    if (kana) onLearned?.([{ kana: kana.kana, script }])
  }, [kana, script, onLearned])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' && !isLast) setIdx(i => i + 1)
      if (e.key === 'ArrowLeft' && !isFirst) setIdx(i => i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFirst, isLast])

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="text-xs text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1"
        >
          ← Salir
        </button>
        <span className="text-xs text-slate-400 tabular-nums">{idx + 1} / {deck.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-violet-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-300"
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-violet-100 dark:border-slate-700 shadow-sm p-6 space-y-5">
        {/* Kana + stroke order side by side */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-8xl leading-none kanji-font text-violet-700 dark:text-violet-300 select-none">
              {kana.kana}
            </div>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 font-mono mt-2">{kana.romaji}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <StrokeOrder kana={kana} />
            <span className="text-[10px] text-slate-400">orden de trazos</span>
          </div>
        </div>

        {/* Emoji + mnemonic */}
        <div className="text-center">
          <div className="text-4xl mb-2">{kana.emoji}</div>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">💡 {kana.mnemonic}</p>
        </div>

        {/* Story (collapsible) */}
        {showStory ? (
          <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{kana.story}</p>
          </div>
        ) : (
          <button
            onClick={() => setShowStory(true)}
            className="w-full text-xs text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 py-1"
          >
            Ver historia completa ↓
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setIdx(i => i - 1)}
          disabled={isFirst}
          className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-slate-700 text-violet-700 dark:text-violet-300 text-sm font-medium transition-all hover:bg-violet-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        {isLast ? (
          <button
            onClick={onExit}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all"
          >
            ¡Terminado! 🎉
          </button>
        ) : (
          <button
            onClick={() => setIdx(i => i + 1)}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
          >
            Siguiente →
          </button>
        )}
      </div>

      <p className="text-center text-[11px] text-slate-400">
        Usa las flechas ← → del teclado para navegar
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference table cell + table
// ─────────────────────────────────────────────────────────────────────────────
function KanaCell({ kana, onClick }: { kana: KanaChar | null; onClick?: () => void }) {
  if (!kana) return <div className="h-14 w-14" />
  return (
    <button
      onClick={onClick}
      title={`${kana.kana} → ${kana.romaji}`}
      className="h-14 w-14 flex flex-col items-center justify-center rounded-xl border border-violet-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 dark:hover:border-violet-600 transition-all group shadow-sm cursor-pointer select-none"
    >
      <span className="text-xl kanji-font text-slate-800 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors leading-none">
        {kana.kana}
      </span>
      <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{kana.romaji}</span>
    </button>
  )
}

const VOWEL_ORDER = ['a','i','u','e','o'] as const
const SPECIAL_GROUPS = new Set(['y','w','n_particle'])

function KanaTable({ chars, order, onSelect }: {
  chars: KanaChar[]
  order: Array<{ group: string; label: string }>
  onSelect: (k: KanaChar) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-xs text-slate-400 dark:text-slate-500 font-medium w-14 text-left px-1">行</th>
            {VOWEL_ORDER.map(v => (
              <th key={v} className="text-xs text-slate-400 dark:text-slate-500 font-mono w-14 text-center">{v}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.map(({ group, label }) => {
            const row = chars.filter(k => k.group === group)
            const byVowel: Record<string, KanaChar | undefined> = {}
            row.forEach(k => {
              const vowel = k.romaji.slice(-1)
              const key = vowel === 'n' || k.romaji === 'n' ? 'a' : vowel
              if (SPECIAL_GROUPS.has(group)) {
                if (k.romaji === 'ya') byVowel['a'] = k
                else if (k.romaji === 'yu') byVowel['u'] = k
                else if (k.romaji === 'yo') byVowel['o'] = k
                else if (k.romaji === 'wa') byVowel['a'] = k
                else if (k.romaji === 'wo') byVowel['e'] = k
                else if (k.romaji === 'n')  byVowel['a'] = k
              } else {
                byVowel[key] = k
              }
            })
            return (
              <tr key={group}>
                <td className="text-[10px] text-slate-400 dark:text-slate-500 font-medium pr-1 align-middle">{label}</td>
                {VOWEL_ORDER.map(v => (
                  <td key={v} className="align-middle">
                    <KanaCell kana={byVowel[v] ?? null} onClick={byVowel[v] ? () => onSelect(byVowel[v]!) : undefined} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main KanaLearn component
// ─────────────────────────────────────────────────────────────────────────────
export default function KanaLearn({ script, onLearned }: { script: KanaScript; onLearned?: OnLearned }) {
  const [selected, setSelected] = useState<KanaChar | null>(null)
  const [showDakuten, setShowDakuten] = useState(false)
  const [guided, setGuided] = useState<null | { includeDakuten: boolean }>(null)

  const allChars = getAllKana(script)
  const scriptLabel = script === 'hiragana' ? 'Hiragana' : 'Katakana'

  // ── Guided learning mode ────────────────────────────────────────────────────
  if (guided) {
    return <GuidedLearn script={script} includeDakuten={guided.includeDakuten} onExit={() => setGuided(null)} onLearned={onLearned} />
  }

  // ── Reference + start CTA ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Start learning CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">Aprende el {scriptLabel} paso a paso</h2>
            <p className="text-sm text-violet-100 mt-0.5">
              Tarjetas en orden あいうえお → かきくけこ… con mnemónica y orden de trazos.
            </p>
          </div>
          <button
            onClick={() => setGuided({ includeDakuten: false })}
            className="px-5 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-bold hover:bg-violet-50 transition-all shadow-sm shrink-0"
          >
            ▶ Empezar a aprender
          </button>
        </div>
        <button
          onClick={() => setGuided({ includeDakuten: true })}
          className="mt-3 text-xs text-violet-200 hover:text-white underline transition-colors"
        >
          O empezar incluyendo dakuten/handakuten (が, ざ, ぱ…)
        </button>
      </div>

      {/* Reference table hint */}
      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
        <span>👆</span> O consulta la tabla de referencia: haz clic en cualquier kana para ver su historia y trazos
      </p>

      {/* Basic gojuuon */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 text-xs">1</span>
          Silabario básico
          <span className="text-xs text-slate-400 font-normal">(46 caracteres)</span>
        </h2>
        <KanaTable chars={allChars} order={GOJUUON_ORDER} onSelect={setSelected} />
      </div>

      {/* Dakuten toggle */}
      <div>
        <button
          onClick={() => setShowDakuten(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors group"
        >
          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs">2</span>
          Dakuten / Handakuten
          <span className="text-xs text-slate-400 font-normal">(sonidos voiced: g, z, d, b, p)</span>
          <svg className={`w-3.5 h-3.5 shrink-0 transition-transform text-slate-400 opacity-60 ${showDakuten ? 'rotate-180' : ''}`}
               fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDakuten && (
          <div className="mt-3">
            <KanaTable chars={allChars} order={DAKUTEN_ORDER} onSelect={setSelected} />
          </div>
        )}
      </div>

      {/* Tip card */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-4 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-semibold mb-1">💡 Consejo de estudio</p>
        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          Aprende el hiragana primero (46 caracteres básicos). Una vez los domines, el katakana es mucho más fácil porque los sonidos son idénticos — solo cambia la forma visual.
          Usa el modo <strong>Test</strong> para practicar con palabras.
        </p>
      </div>

      {/* Modal */}
      {selected && <MnemonicPanel kana={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
