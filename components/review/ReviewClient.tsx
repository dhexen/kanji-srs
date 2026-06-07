'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useHelp } from '@/lib/help-context'
import { ReviewMode, VocabItem, MODE_CONFIG, getPendingCount, getModeLevelAndDue, getReviewForecast, getHourlyForecast } from '@/lib/srs'
import { fetchVocabMeta } from '@/lib/supabase'
import { t } from '@/lib/i18n'
import QuickAddPanel from './QuickAddPanel'
import QuestionCard from './QuestionCard'
import SessionComplete from './SessionComplete'
import LessonSession from './LessonSession'

export type SessionItem = { item: VocabItem; mode: ReviewMode }
type Phase = 'select' | 'lesson' | 'playing' | 'done'

// Canonical mode order for spaced-repetition learning progression
const CANONICAL_MODE_ORDER: ReviewMode[] = ['multi', 'meaning', 'reading', 'kanji', 'reverse']

// localStorage key for persisting the user's last review-mode selection
const SELECTED_MODES_KEY = 'review_selected_modes'

function orderByMode(items: SessionItem[]): SessionItem[] {
  const groups = new Map<ReviewMode, SessionItem[]>(CANONICAL_MODE_ORDER.map(m => [m, []]))
  for (const item of items) groups.get(item.mode)?.push(item)
  for (const group of groups.values()) group.sort(() => Math.random() - 0.5)
  return CANONICAL_MODE_ORDER.flatMap(m => groups.get(m) ?? [])
}

function strip(s: string) {
  return s.replace(/^\p{Emoji_Presentation}\s*/u, '').replace(/^[^\w　-鿿]/u, '').trim()
}

function IconMode() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}
function IconVocab() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
function IconGrammar() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}
function IconContext() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )
}

export default function ReviewClient() {
  const { state, applyReviewResult } = useStore()
  const help = useHelp()
  const lang = state.lang
  const [selectedModes, setSelectedModes] = useState<ReviewMode[]>(['multi', 'meaning', 'kanji', 'reading', 'reverse'])
  const [phase, setPhase] = useState<Phase>('select')
  const [sequence, setSequence] = useState<SessionItem[]>([])
  const [index, setIndex] = useState(0)
  const [isPractice, setIsPractice] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [lessonItems, setLessonItems] = useState<VocabItem[]>([])

  // Per-session wrong-count tracking (key = "jp:mode")
  const wrongCountsRef = useRef(new Map<string, number>())
  // Items that have been answered correctly at least once this session
  const completedRef = useRef(new Set<string>())
  const modes = Object.entries(MODE_CONFIG) as [ReviewMode, typeof MODE_CONFIG[ReviewMode]][]

  // Restore the last mode selection on mount, then persist on every change so it
  // stays until the user picks a different set.
  const modesLoadedRef = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SELECTED_MODES_KEY)
      if (raw) {
        const allModes = Object.keys(MODE_CONFIG) as ReviewMode[]
        const saved = (JSON.parse(raw) as ReviewMode[]).filter(m => allModes.includes(m))
        if (saved.length > 0) setSelectedModes(saved)
      }
    } catch { /* ignore corrupt/unavailable storage */ }
    modesLoadedRef.current = true
  }, [])
  useEffect(() => {
    if (!modesLoadedRef.current) return
    try { localStorage.setItem(SELECTED_MODES_KEY, JSON.stringify(selectedModes)) } catch { /* ignore */ }
  }, [selectedModes])

  // Ticker that updates every 60 s so due-count memos recompute when new items become due
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const activeWords = useMemo(() => state.db.filter(i => i.status === 'active'), [state.db])
  const pendingCount = useMemo(() => getPendingCount(activeWords, selectedModes), [activeWords, selectedModes, tick])
  const pendingPerMode = useMemo(() => {
    const result = {} as Record<ReviewMode, number>
    for (const mode of Object.keys(MODE_CONFIG) as ReviewMode[]) {
      result[mode] = getPendingCount(activeWords, [mode])
    }
    return result
  }, [activeWords, tick])

  const forecast = useMemo(() => getReviewForecast(state.db, lang, 7), [state.db, lang, tick])
  const hourlyForecast = useMemo(() => getHourlyForecast(state.db), [state.db, tick])
  const todayCount = forecast[0]?.newDue ?? 0
  const futureDays = forecast.slice(1)

  const localeTag = lang === 'ja' ? 'ja-JP' : lang === 'ca' ? 'ca-ES' : lang === 'en' ? 'en-GB' : 'es-ES'
  const todayStr = new Date().toLocaleDateString(localeTag, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Personal stats
  const masteredCount = useMemo(() => activeWords.filter(w => w.srsLevel >= 5).length, [activeWords])

  function buildSequence(practice: boolean): SessionItem[] {
    const now = Date.now()
    const items: SessionItem[] = []
    activeWords.forEach(item => {
      selectedModes.forEach(mode => {
        if (practice) {
          items.push({ item, mode })
        } else {
          const { due } = getModeLevelAndDue(item, mode)
          if (due <= now) items.push({ item, mode })
        }
      })
    })
    return orderByMode(items)
  }

  async function start(practice: boolean) {
    if (activeWords.length === 0) return
    const seq = buildSequence(practice)
    if (!practice && seq.length === 0) { setPhase('done'); return }

    setIsStarting(true)
    try {
      const wordsMissingMeta = [...new Set(
        seq.filter(s => !s.item.image_url || !s.item.grade).map(s => s.item.jp)
      )]
      let finalSeq = seq
      if (wordsMissingMeta.length > 0) {
        const metaMap = await fetchVocabMeta(wordsMissingMeta)
        if (metaMap.size > 0) {
          finalSeq = seq.map(s => {
            const meta = metaMap.get(s.item.jp)
            if (!meta) return s
            const updates: Partial<typeof s.item> = {}
            if (!s.item.image_url && meta.image_url) updates.image_url = meta.image_url
            if (!s.item.grade && meta.grade) updates.grade = meta.grade
            return Object.keys(updates).length > 0 ? { ...s, item: { ...s.item, ...updates } } : s
          })
        }
      }

      wrongCountsRef.current.clear()
      completedRef.current.clear()
      setIsPractice(practice)
      setSequence(finalSeq)
      setIndex(0)
      setPhase('playing')
    } finally {
      setIsStarting(false)
    }
  }

  async function startWithItems(newItems: VocabItem[]) {
    if (newItems.length === 0) return
    setIsStarting(true)
    try {
      const modesActive = selectedModes.length > 0 ? selectedModes : (['multi', 'meaning', 'kanji', 'reading', 'reverse'] as ReviewMode[])
      const seq: SessionItem[] = []
      newItems.forEach(item => {
        modesActive.forEach(mode => seq.push({ item, mode }))
      })
      wrongCountsRef.current.clear()
      completedRef.current.clear()
      setIsPractice(false)
      setSequence(orderByMode(seq))
      setIndex(0)
      setPhase('playing')
    } finally {
      setIsStarting(false)
    }
  }

  // When new words are added via +N, show a study (lesson) session first.
  function onNewWordsAdded(newItems: VocabItem[]) {
    if (newItems.length === 0) return
    setLessonItems(newItems)
    setPhase('lesson')
  }

  // Called by QuestionCard when the user submits an answer.
  // Handles SRS application, re-queuing, and end-of-session detection.
  function onAnswer(sessionItem: SessionItem, isCorrect: boolean) {
    if (isPractice) {
      if (index + 1 >= sequence.length) setPhase('done')
      else setIndex(i => i + 1)
      return
    }

    const key = `${sessionItem.item.jp}:${sessionItem.mode}`
    let didAppend = false

    if (isCorrect) {
      if (!completedRef.current.has(key)) {
        completedRef.current.add(key)
        const wc = wrongCountsRef.current.get(key) ?? 0
        applyReviewResult(sessionItem.item.jp, sessionItem.mode, wc)
      }
    } else {
      const cur = wrongCountsRef.current.get(key) ?? 0
      wrongCountsRef.current.set(key, cur + 1)
      if (!completedRef.current.has(key)) {
        // Append to end of queue so this item comes back before the session ends
        setSequence(seq => [...seq, { item: sessionItem.item, mode: sessionItem.mode }])
        didAppend = true
      }
    }

    // End the session only when nothing was appended and there are no more items.
    // (wrong answer on an already-completed item also needs to end if it was the last)
    if (!didAppend && index + 1 >= sequence.length) {
      setPhase('done')
    } else {
      setIndex(i => i + 1)
    }
  }

  // Called when "Ya me lo sé" is clicked. Masters ONLY the current mode of this
  // word (level 8) and removes future appearances of that same word+mode from
  // the queue. Other modes of the word stay in the pool.
  function onMaster(sessionItem: SessionItem) {
    const key = `${sessionItem.item.jp}:${sessionItem.mode}`
    completedRef.current.add(key)

    // Drop future copies of this exact word+mode (keep other modes)
    const newSeq = sequence.filter((si, i) =>
      i <= index || !(si.item.jp === sessionItem.item.jp && si.mode === sessionItem.mode)
    )
    setSequence(newSeq)

    if (index + 1 >= newSeq.length) {
      setPhase('done')
    } else {
      setIndex(i => i + 1)
    }
  }

  function onQuit() {
    setPhase('select')
    setSequence([])
    setIndex(0)
    wrongCountsRef.current.clear()
    completedRef.current.clear()
  }

  if (phase === 'select') {
    const sectionsLabel = ({ es: 'Secciones', ca: 'Seccions', en: 'Sections', ja: 'セクション' } as Record<string, string>)[lang] ?? 'Secciones'

    const SECTIONS = [
      {
        id: 'vocab',
        label: strip(t(lang, 'nav_vocabulary')),
        icon: <IconVocab />,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
        href: '/vocabulary',
      },
      {
        id: 'grammar',
        label: strip(t(lang, 'nav_grammar')),
        icon: <IconGrammar />,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
        href: '/grammar',
      },
      {
        id: 'kana',
        label: strip(t(lang, 'nav_kana')),
        icon: <IconMode />,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-violet-900/20',
        href: '/kana',
      },
      {
        id: 'context',
        label: strip(t(lang, 'nav_context')),
        icon: <IconContext />,
        color: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-pink-900/20',
        href: '/context',
      },
    ]

    return (
      <div className="space-y-4">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-snug">
              Dashboard
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5 capitalize">{todayStr}</p>
          </div>
          <button
            type="button"
            title={{ es: 'Ayuda', en: 'Help', ca: 'Ajuda', ja: 'ヘルプ' }[lang] ?? 'Ayuda'}
            onClick={help.open}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-violet-100 text-slate-400 hover:text-violet-600 text-sm font-bold flex items-center justify-center transition shrink-0 dark:bg-slate-700 dark:hover:bg-violet-900/40 dark:text-slate-500 dark:hover:text-violet-400"
          >
            ?
          </button>
        </div>

        {/* ── Forecast card ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-50 via-pink-50/60 to-rose-50/40 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-violet-100/80 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide">
                {t(lang, 'header_today')}
              </p>
              <p className="text-5xl font-bold tabular-nums leading-none mt-1 text-violet-700 dark:text-violet-300">
                {pendingCount}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => start(false)}
                disabled={pendingCount === 0 || activeWords.length === 0 || isStarting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition shadow-sm active:scale-95"
              >
                {isStarting
                  ? '⏳'
                  : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      {strip(t(lang, 'review_start'))}
                    </>
                  )}
              </button>
              {/* Free review: all active words, random, no SRS pressure */}
              <button
                onClick={() => start(true)}
                disabled={activeWords.length === 0 || selectedModes.length === 0 || isStarting}
                title={({ es: 'Repasa todo tu vocabulario activo sin afectar a los niveles', en: 'Review all your active vocabulary without affecting levels', ca: 'Repassa tot el teu vocabulari actiu sense afectar els nivells', ja: 'レベルに影響せず全語彙を復習' } as Record<string, string>)[lang]}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white dark:bg-slate-700 border border-violet-200 dark:border-slate-600 text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-xl text-xs transition active:scale-95"
              >
                🎲 {({ es: 'Repaso libre', en: 'Free review', ca: 'Repàs lliure', ja: '自由復習' } as Record<string, string>)[lang] ?? 'Repaso libre'}
              </button>
            </div>
          </div>

          {/* Hourly timeline */}
          {hourlyForecast.length > 0 && (
            <div className="overflow-x-auto no-scrollbar mt-4 -mx-1 px-1">
              <div className="flex gap-1.5 min-w-max pb-0.5">
                {hourlyForecast.map(h => (
                  <div
                    key={h.hour}
                    className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl text-xs min-w-[3rem] transition-all ${
                      h.isCurrent
                        ? 'bg-violet-100 dark:bg-violet-900/30 border border-violet-200/80 dark:border-violet-700/40 shadow-sm'
                        : 'bg-white/60 dark:bg-slate-700/40 border border-violet-100/60 dark:border-slate-600/40'
                    }`}
                  >
                    <span className={`tabular-nums font-medium ${h.isCurrent ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {h.label}
                    </span>
                    <span className={`tabular-nums font-bold text-sm mt-0.5 ${h.isCurrent ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      +{h.due}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly forecast */}
          {futureDays.length > 0 && (
            <div className="mt-4 pt-3 border-t border-violet-100/80 dark:border-slate-700">
              <p className="text-[10px] font-semibold text-violet-400 dark:text-violet-500 uppercase tracking-wide mb-2">
                {t(lang, 'header_forecast')}
              </p>
              <div className="flex gap-3 flex-wrap">
                {futureDays.map(day => {
                  const carried = day.cumulative - day.newDue
                  const hasCarried = carried > 0
                  const hasNew = day.newDue > 0
                  const isEmpty = day.cumulative === 0
                  return (
                    <div key={day.date.toISOString()} className="flex flex-col items-center min-w-[2.5rem]">
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-medium capitalize">{day.dayLabel}</span>
                      <span className="text-xs font-bold tabular-nums mt-0.5 leading-tight">
                        {isEmpty ? (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        ) : hasCarried && hasNew ? (
                          <span className="text-violet-600 dark:text-violet-400">
                            {carried} <span className="text-violet-400 dark:text-violet-500 font-semibold text-[10px]">(+{day.newDue})</span>
                          </span>
                        ) : hasCarried ? (
                          <span className="text-violet-600 dark:text-violet-400">{carried}</span>
                        ) : (
                          <span className="text-violet-600 dark:text-violet-400">+{day.newDue}</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Selector de modos (pills en fila) ─────────────────────── */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            {t(lang, 'review_subtitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {modes.map(([id, cfg]) => {
              const active = selectedModes.includes(id)
              const due = pendingPerMode[id] ?? 0
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedModes(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  )}
                  className={`relative px-3 py-2 rounded-xl border-2 transition-all active:scale-95 text-left ${
                    active
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 dark:hover:text-violet-400'
                  }`}
                >
                  <span className="block text-xs font-semibold leading-tight pr-6">{t(lang, cfg.label_key)}</span>
                  <span className={`block text-[10px] leading-tight mt-0.5 ${active ? 'text-violet-200' : 'text-slate-400 dark:text-slate-500'}`}>
                    {t(lang, cfg.desc_key)}
                  </span>
                  {due > 0 && (
                    <span className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      active ? 'bg-white/30 text-white' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                    }`}>
                      {due > 99 ? '99+' : due}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {selectedModes.length === 0 && (
            <p className="text-[11px] text-rose-500 dark:text-rose-400 mt-2">
              ⚠ {t(lang, 'review_no_modes_selected')}
            </p>
          )}
        </div>

        {/* ── Seccions + Nous Kanjis ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

          {/* Seccions */}
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">{sectionsLabel}</h3>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map(tile => (
                <Link
                  key={tile.id}
                  href={tile.href}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${tile.bg}`}
                >
                  <span className={tile.color}>{tile.icon}</span>
                  <span className={`text-xs font-semibold ${tile.color}`}>{tile.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Nous Kanjis */}
          <QuickAddPanel onAdded={onNewWordsAdded} />
        </div>

        {/* ── Dades totals ──────────────────────────────────────────── */}
        {activeWords.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Palabras activas', value: activeWords.length, color: 'text-violet-600 dark:text-violet-400' },
              { label: 'Dominadas', value: masteredCount, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Programados hoy', value: todayCount, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Por aprender', value: activeWords.length - masteredCount, color: 'text-pink-600 dark:text-pink-400' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 shadow-sm text-center">
                <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    )
  }

  if (phase === 'lesson') {
    return (
      <LessonSession
        items={lessonItems}
        lang={lang}
        onComplete={() => startWithItems(lessonItems)}
        onSkip={() => { setLessonItems([]); setPhase('select') }}
      />
    )
  }

  if (phase === 'done') {
    return <SessionComplete onBack={() => setPhase('select')} isPractice={isPractice} total={sequence.length} />
  }

  const current = sequence[index]
  const uniqueTotal = new Set(sequence.map(s => `${s.item.jp}:${s.mode}`)).size
  const currentKey = `${current.item.jp}:${current.mode}`
  return (
    <QuestionCard
      key={`${current.item.jp}-${current.mode}-${index}`}
      sessionItem={current}
      allItems={state.db}
      index={completedRef.current.size}
      total={uniqueTotal}
      isPractice={isPractice}
      priorWrongCount={wrongCountsRef.current.get(currentKey) ?? 0}
      onAnswer={onAnswer}
      onMaster={onMaster}
      onQuit={onQuit}
    />
  )
}
