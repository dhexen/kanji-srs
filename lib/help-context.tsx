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

  // Auto-open once per section per account. We wait for `state.loaded` so that
  // helpSeen has been hydrated from the DB before deciding — this prevents the
  // drawer from re-opening on a fresh browser where the section was already
  // seen on the user's account.
  useEffect(() => {
    if (!section) return
    if (!state.loaded) return        // wait until account data (helpSeen) is loaded
    if (state.helpSeen.includes(section)) return  // already seen on this account

    markHelpSeen(section)            // record locally + persist to DB
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
