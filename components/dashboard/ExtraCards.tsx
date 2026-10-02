'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { xpProgressInLevel, JLPT_COLORS, type JlptEstimate } from '@/lib/progression'
import { HIRAGANA, KATAKANA } from '@/lib/kana-data'
import RankingWidget from '@/components/stats/RankingWidget'
import { pick4 } from '@/lib/dashboard'
import DashCard from './DashCard'

// Tarjetas del dashboard que no dependen del estado del repaso. Todas van en el
// mismo marco (DashCard) que el resto.

type L4 = { es: string; en: string; ca: string; ja: string }

// ── Resumen en cifras (las cuatro casillas de antes) ────────────────────────
export function SummaryCard({ active, mastered, dueToday, toLearn }: {
  active: number; mastered: number; dueToday: number; toLearn: number
}) {
  const lang = useStore().state.lang
  const tiles: { n: number; label: L4; color: string }[] = [
    { n: active, label: { es: 'Activas', en: 'Active', ca: 'Actives', ja: '学習中' }, color: 'text-violet-600 dark:text-violet-400' },
    { n: mastered, label: { es: 'Dominadas', en: 'Mastered', ca: 'Dominades', ja: '習得' }, color: 'text-emerald-600 dark:text-emerald-400' },
    { n: dueToday, label: { es: 'Programadas hoy', en: 'Due today', ca: 'Programades avui', ja: '今日の予定' }, color: 'text-sky-600 dark:text-sky-400' },
    { n: toLearn, label: { es: 'Por aprender', en: 'To learn', ca: 'Per aprendre', ja: '未習得' }, color: 'text-amber-600 dark:text-amber-400' },
  ]
  return (
    <DashCard id="summary">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(t => (
          <div key={t.label.es} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5">
            <p className={`text-2xl font-bold tabular-nums leading-none ${t.color}`}>{t.n}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">{pick4(t.label, lang)}</p>
          </div>
        ))}
      </div>
    </DashCard>
  )
}

// ── Nivel y XP (vocabulario y total; la gramática queda fuera) ──────────────
export function XpCard() {
  const { state } = useStore()
  const lang = state.lang
  const p = state.progression
  const filas: { label: L4; level: number; xp: number; bar: string }[] = [
    { label: { es: 'Vocabulario', en: 'Vocabulary', ca: 'Vocabulari', ja: '語彙' }, level: p.vocab_level, xp: p.vocab_xp, bar: 'bg-violet-500' },
    { label: { es: 'Total', en: 'Total', ca: 'Total', ja: '総合' }, level: p.total_level, xp: p.total_xp, bar: 'bg-amber-500' },
  ]
  return (
    <DashCard id="xp">
      <ul className="space-y-3">
        {filas.map(f => {
          const prog = xpProgressInLevel(f.xp)
          return (
            <li key={f.label.es}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">{pick4(f.label, lang)}</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Nv. {f.level}
                  <span className="ml-1.5 font-medium text-slate-400 dark:text-slate-500 tabular-nums">{prog.current}/{prog.needed} XP</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full ${f.bar}`} style={{ width: `${prog.pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </DashCard>
  )
}

// ── Vocabulario JLPT: solo cuenta palabras dominadas ────────────────────────
const JLPT_VOCAB: { level: NonNullable<JlptEstimate>; min: number }[] = [
  { level: 'N5', min: 50 }, { level: 'N4', min: 200 }, { level: 'N3', min: 500 },
  { level: 'N2', min: 1000 }, { level: 'N1', min: 2000 },
]

export function JlptCard({ mastered }: { mastered: number }) {
  const lang = useStore().state.lang
  const alcanzado = [...JLPT_VOCAB].reverse().find(j => mastered >= j.min) ?? null
  const siguiente = JLPT_VOCAB.find(j => mastered < j.min) ?? null
  const desde = alcanzado?.min ?? 0
  const pct = siguiente ? Math.min(100, ((mastered - desde) / (siguiente.min - desde)) * 100) : 100
  return (
    <DashCard id="jlpt">
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1.5 rounded-xl text-lg font-bold ${alcanzado ? JLPT_COLORS[alcanzado.level] : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
          {alcanzado?.level ?? '—'}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {pick4({
            es: `${mastered} palabras dominadas`,
            en: `${mastered} words mastered`,
            ca: `${mastered} paraules dominades`,
            ja: `習得語彙 ${mastered}語`,
          }, lang)}
        </p>
      </div>
      {siguiente && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>{pick4({ es: `Hacia ${siguiente.level}`, en: `Towards ${siguiente.level}`, ca: `Cap a ${siguiente.level}`, ja: `${siguiente.level}まで` }, lang)}</span>
            <span className="tabular-nums">{mastered}/{siguiente.min}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
        {pick4({
          es: 'Orientativo: solo mira el vocabulario, no la gramática.',
          en: 'Rough guide: vocabulary only, not grammar.',
          ca: 'Orientatiu: només mira el vocabulari.',
          ja: '目安：語彙のみで判定しています。',
        }, lang)}
      </p>
    </DashCard>
  )
}

// ── Ranking semanal ────────────────────────────────────────────────────────
export function RankingCard() {
  return (
    <DashCard id="ranking">
      <RankingWidget showEmpty bare />
    </DashCard>
  )
}

// ── Progreso de kana ───────────────────────────────────────────────────────
export function KanaCard({ learned }: { learned: Set<string> }) {
  const lang = useStore().state.lang
  const filas = [
    { label: 'ひらがな', total: HIRAGANA.length, n: HIRAGANA.filter(k => learned.has(k.kana)).length, bar: 'bg-pink-500' },
    { label: 'カタカナ', total: KATAKANA.length, n: KATAKANA.filter(k => learned.has(k.kana)).length, bar: 'bg-sky-500' },
  ]
  return (
    <DashCard
      id="kana"
      right={<Link href="/kana" className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">→</Link>}
    >
      <ul className="space-y-3">
        {filas.map(f => (
          <li key={f.label}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">{f.label}</span>
              <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">{f.n}/{f.total}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div className={`h-full rounded-full ${f.bar}`} style={{ width: `${f.total ? (f.n / f.total) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </DashCard>
  )
}
