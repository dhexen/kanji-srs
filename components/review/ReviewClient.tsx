'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { ReviewMode, VocabItem, getPendingCount, getModeLevelAndDue } from '@/lib/srs'
import { fetchVocabMeta } from '@/lib/supabase'
import ModeSelector from './ModeSelector'
import QuickAddPanel from './QuickAddPanel'
import QuestionCard from './QuestionCard'
import SessionComplete from './SessionComplete'

export type SessionItem = { item: VocabItem; mode: ReviewMode }
type Phase = 'select' | 'playing' | 'done'

export default function ReviewClient() {
  const { state } = useStore()
  const [selectedModes, setSelectedModes] = useState<ReviewMode[]>(['multi', 'meaning', 'kanji', 'reading', 'reverse'])
  const [phase, setPhase] = useState<Phase>('select')
  const [sequence, setSequence] = useState<SessionItem[]>([])
  const [index, setIndex] = useState(0)
  const [isPractice, setIsPractice] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const activeWords = useMemo(() => state.db.filter(i => i.status === 'active'), [state.db])
  const pendingCount = useMemo(() => getPendingCount(activeWords, selectedModes), [activeWords, selectedModes])

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
    return items.sort(() => Math.random() - 0.5)
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

      setIsPractice(practice)
      setSequence(finalSeq)
      setIndex(0)
      setPhase('playing')
    } finally {
      setIsStarting(false)
    }
  }

  /**
   * Start a review session with a specific set of newly-added items.
   * Called by QuickAddPanel after activating new kanjis.
   * The items already have full vocab metadata from the DB fetch.
   */
  async function startWithItems(newItems: VocabItem[]) {
    if (newItems.length === 0) return
    setIsStarting(true)
    try {
      const modesActive = selectedModes.length > 0 ? selectedModes : (['multi', 'meaning', 'kanji', 'reading', 'reverse'] as ReviewMode[])
      const seq: SessionItem[] = []
      newItems.forEach(item => {
        modesActive.forEach(mode => seq.push({ item, mode }))
      })
      const shuffled = seq.sort(() => Math.random() - 0.5)
      setIsPractice(false)
      setSequence(shuffled)
      setIndex(0)
      setPhase('playing')
    } finally {
      setIsStarting(false)
    }
  }

  function onNext() {
    if (index + 1 >= sequence.length) setPhase('done')
    else setIndex(i => i + 1)
  }

  function onQuit() {
    setPhase('select')
    setSequence([])
    setIndex(0)
  }

  if (phase === 'select') {
    return (
      <div className="space-y-4">
        <ModeSelector
          selectedModes={selectedModes}
          onToggle={m => setSelectedModes(prev =>
            prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
          )}
          pendingCount={pendingCount}
          onStart={start}
          hasWords={activeWords.length > 0}
          isStarting={isStarting}
        />
        <QuickAddPanel onAdded={startWithItems} />
      </div>
    )
  }

  if (phase === 'done') {
    return <SessionComplete onBack={() => setPhase('select')} isPractice={isPractice} total={sequence.length} />
  }

  const current = sequence[index]
  return (
    <QuestionCard
      key={`${current.item.jp}-${current.mode}-${index}`}
      sessionItem={current}
      allItems={state.db}
      index={index}
      total={sequence.length}
      isPractice={isPractice}
      onNext={onNext}
      onQuit={onQuit}
    />
  )
}
