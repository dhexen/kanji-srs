'use client'
import { useEffect, useState } from 'react'

interface XpToastProps {
  xp: number
  type: 'vocab' | 'grammar'
  key?: number
}

// Floating "+N XP" badge that fades out after 1.5s.
// Usage: remount with a new key each time XP is gained.
export default function XpToast({ xp, type }: XpToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1400)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  const positive = xp > 0
  const label    = type === 'vocab' ? 'Vocab' : '文法'

  return (
    <div
      className={[
        'pointer-events-none select-none',
        'fixed bottom-24 right-4 z-50',
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg',
        'text-sm font-bold',
        'animate-xp-float',
        positive
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-500 text-white',
      ].join(' ')}
    >
      <span>{positive ? '+' : ''}{xp} XP</span>
      <span className="text-[10px] opacity-80 font-semibold">{label}</span>
    </div>
  )
}
