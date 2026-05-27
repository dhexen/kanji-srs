'use client'
import { useState } from 'react'
import type { KanaChar, KanaScript } from '@/lib/kana-data'
import { getAllKana, GOJUUON_ORDER, DAKUTEN_ORDER } from '@/lib/kana-data'

// ─────────────────────────────────────────────────────────────────────────────
// Mnemonic detail panel (shown when a kana is selected)
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

        {/* Kana large */}
        <div className="text-center mb-4">
          <div className="text-8xl leading-none kanji-font text-violet-700 dark:text-violet-300 mb-2 select-none">
            {kana.kana}
          </div>
          <div className="text-xl font-bold text-slate-700 dark:text-slate-200">{kana.romaji}</div>
          <div className="text-sm text-violet-500 dark:text-violet-400 mt-0.5 capitalize">{kana.script}</div>
        </div>

        {/* Emoji hint */}
        <div className="text-center text-4xl mb-4">{kana.emoji}</div>

        {/* Mnemonic */}
        <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 p-4 space-y-2">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            💡 {kana.mnemonic}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {kana.story}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Single kana cell in the grid
// ─────────────────────────────────────────────────────────────────────────────
function KanaCell({ kana, onClick }: { kana: KanaChar | null; onClick?: () => void }) {
  if (!kana) {
    return <div className="h-14 w-14" />
  }
  return (
    <button
      onClick={onClick}
      title={`${kana.kana} → ${kana.romaji}`}
      className="h-14 w-14 flex flex-col items-center justify-center rounded-xl border border-violet-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 dark:hover:border-violet-600 transition-all group shadow-sm cursor-pointer select-none"
    >
      <span className="text-xl kanji-font text-slate-800 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors leading-none">
        {kana.kana}
      </span>
      <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
        {kana.romaji}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Gojuuon table (rows = groups, cols = a i u e o)
// ─────────────────────────────────────────────────────────────────────────────
const VOWEL_ORDER = ['a','i','u','e','o'] as const
// Special rows that don't follow 5-col pattern:
const SPECIAL_GROUPS = new Set(['y','w','n_particle'])

function KanaTable({
  chars,
  order,
  onSelect,
}: {
  chars: KanaChar[]
  order: Array<{ group: string; label: string }>
  onSelect: (k: KanaChar) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-xs text-slate-400 dark:text-slate-500 font-medium w-14 text-left px-1">
              行
            </th>
            {VOWEL_ORDER.map(v => (
              <th key={v} className="text-xs text-slate-400 dark:text-slate-500 font-mono w-14 text-center">
                {v}
              </th>
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
                // ya/yu/yo, wa/wo, n
                if (k.romaji === 'ya') byVowel['a'] = k
                else if (k.romaji === 'yu') byVowel['u'] = k
                else if (k.romaji === 'yo') byVowel['o'] = k
                else if (k.romaji === 'wa') byVowel['a'] = k
                else if (k.romaji === 'wo') byVowel['e'] = k  // put wo in 'e' slot for spacing
                else if (k.romaji === 'n')  byVowel['a'] = k
              } else {
                byVowel[key] = k
              }
            })
            return (
              <tr key={group}>
                <td className="text-[10px] text-slate-400 dark:text-slate-500 font-medium pr-1 align-middle">
                  {label}
                </td>
                {VOWEL_ORDER.map(v => {
                  const k = byVowel[v] ?? null
                  return (
                    <td key={v} className="align-middle">
                      <KanaCell kana={k} onClick={k ? () => onSelect(k) : undefined} />
                    </td>
                  )
                })}
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
export default function KanaLearn({ script }: { script: KanaScript }) {
  const [selected, setSelected] = useState<KanaChar | null>(null)
  const [showDakuten, setShowDakuten] = useState(false)

  const allChars = getAllKana(script)

  return (
    <div className="space-y-6">
      {/* Hint */}
      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
        <span>👆</span>
        Haz clic en cualquier kana para ver su historia nemotécnica
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
          Usa el modo <strong>Test</strong> para practicar grupo a grupo.
        </p>
      </div>

      {/* Modal */}
      {selected && <MnemonicPanel kana={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
