'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { MODE_CONFIG, ReviewMode, VocabItem, getPendingCount, getModeLevelAndDue } from '@/lib/srs'
import ModeSelector from './ModeSelector'
import QuestionCard from './QuestionCard'
import SessionComplete from './SessionComplete'

export type SessionItem = { item: VocabItem; mode: ReviewMode }

type Phase = 'select' | 'playing' | 'done'

export default function ReviewClient() {
  const { state } = useStore()
  const [selectedModes, setSelectedModes] = useState<ReviewMode[]>(['multi'])
  const [phase, setPhase] = useState<Phase>('select')
  const [sequence, setSequence] = useState<SessionItem[]>([])
  const [index, setIndex] = useState(0)
  const [isPractice, setIsPractice] = useState(false)

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

  function start(practice: boolean) {
    if (activeWords.length === 0) return
    const seq = buildSequence(practice)
    if (!practice && seq.length === 0) {
      setPhase('done')
      return
    }
    setIsPractice(practice)
    setSequence(seq)
    setIndex(0)
    setPhase('playing')
  }

  function onNext() {
    if (index + 1 >= sequence.length) {
      setPhase('done')
    } else {
      setIndex(i => i + 1)
    }
  }

  if (phase === 'select') {
    return (
      <ModeSelector
        selectedModes={selectedModes}
        onToggle={(m) => setSelectedModes(prev =>
          prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m]
        )}
        pendingCount={pendingCount}
        onStart={start}
        hasWords={activeWords.length > 0}
      />
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
    />
  )
}
