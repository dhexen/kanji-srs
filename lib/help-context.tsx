'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'

function getSectionFromPath(pathname: string): string {
  if (pathname.startsWith('/review'))    return 'review'
  if (pathname.startsWith('/vocabulary'))return 'vocabulary'
  if (pathname.startsWith('/grammar'))   return 'grammar'
  if (pathname.startsWith('/kana'))      return 'kana'
  if (pathname.startsWith('/context'))   return 'context'
  if (pathname.startsWith('/stats'))     return 'stats'
  if (pathname.startsWith('/progress'))  return 'progress'
  if (pathname.startsWith('/study'))     return 'study'
  if (pathname.startsWith('/import'))    return 'import'
  return ''
}

interface HelpCtx {
  isOpen: boolean
  section: string
  open: () => void
  close: () => void
  toggle: () => void
}

const HelpContext = createContext<HelpCtx>({
  isOpen: false, section: '', open: () => {}, close: () => {}, toggle: () => {},
})

export function HelpProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { state, markHelpSeen } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const section = getSectionFromPath(pathname)

  // Auto-open once per section. We check two sources:
  //   1. state.helpSeen — persisted in the DB → works across browsers (per-account)
  //   2. localStorage    — immediate fallback → avoids repeats in the SAME browser
  //      even if the DB column (migration 018) isn't applied yet.
  // We wait for state.loaded so helpSeen has been hydrated before deciding.
  useEffect(() => {
    if (!section) return
    if (!state.loaded) return

    let localSeen: string[] = []
    try { localSeen = JSON.parse(localStorage.getItem('help_seen_v1') || '[]') } catch { /* ignore */ }

    if (state.helpSeen.includes(section) || localSeen.includes(section)) return

    // Mark as seen in both the DB (cross-browser) and localStorage (same-browser)
    markHelpSeen(section)
    try {
      if (!localSeen.includes(section)) {
        localStorage.setItem('help_seen_v1', JSON.stringify([...localSeen, section]))
      }
    } catch { /* ignore */ }

    const timer = setTimeout(() => setIsOpen(true), 600)
    return () => clearTimeout(timer)
  }, [section, state.loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close when navigating away
  useEffect(() => { setIsOpen(false) }, [pathname])

  const open   = useCallback(() => setIsOpen(true), [])
  const close  = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])

  return (
    <HelpContext.Provider value={{ isOpen, section, open, close, toggle }}>
      {children}
    </HelpContext.Provider>
  )
}

export function useHelp() { return useContext(HelpContext) }
