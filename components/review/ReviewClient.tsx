'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { ReviewMode, VocabItem, getPendingCount, getModeLevelAndDue } from '@/lib/srs'
import { fetchVocabImageUrls } from '@/lib/supabase'
import ModeSelector from './ModeSelector'
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
      // Inject image URLs for items that don't have one in the store.
      // Direct fetch from vocabulary table — always reflects latest images
      // regardless of whether the store merge worked correctly on login.
      const wordsWithoutImage = [...new Set(seq.filter(s => !s.item.image_url).map(s => s.item.jp))]
      let finalSeq = seq
      if (wordsWithoutImage.length > 0) {
        const imageMap = await fetchVocabImageUrls(wordsWithoutImage)
        if (imageMap.size > 0) {
          finalSeq = seq.map(s => {
            const url = s.item.image_url ?? imageMap.get(s.item.jp)
            return url ? { ...s, item: { ...s.item, image_url: url } } : s
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

  function onNext() {
    if (index + 1 >= sequence.length) setPhase('done')
    else setIndex(i => i + 1)
  }

  // Quit mid-session → back to selector
  function onQuit() {
    setPhase('select')
    setSequence([])
    setIndex(0)
  }

  if (phase === 'select') {
    return (
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
