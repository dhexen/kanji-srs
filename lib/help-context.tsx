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

// localStorage key: once set, tutorials never auto-open on this device again.
const HELP_DONE_KEY = 'help_done_v1'

function isHelpDoneLocally(): boolean {
  try { return localStorage.getItem(HELP_DONE_KEY) === '1' } catch { return false }
}
function setHelpDoneLocally() {
  try { localStorage.setItem(HELP_DONE_KEY, '1') } catch { /* incognito */ }
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

  // Auto-open once per lifetime (not once per section, not once per device).
  // Guard order (first match wins):
  //   1. localStorage HELP_DONE_KEY — set after the FIRST auto-open on any device.
  //      Prevents any further auto-opens on this device regardless of DB state.
  //   2. state.helpSeen.length > 0 — DB told us tutorials have been seen on another device.
  //      Works cross-device when the DB write succeeded.
  //   3. Neither set → first time ever. Auto-open, then persist to both storages.
  useEffect(() => {
    if (!section) return
    if (!state.loaded) return

    // Same-device guard (most reliable — always works)
    if (isHelpDoneLocally()) return

    // Cross-device guard (requires successful DB write on the first device)
    if (state.helpSeen.length > 0) {
      // DB says seen — also set the local flag so future checks are instant
      setHelpDoneLocally()
      return
    }

    // First time ever on this account: show the tutorial.
    markHelpSeen(section)  // persists ALL sections to DB in one write
    setHelpDoneLocally()   // suppress all future auto-opens on this device

    const timer = setTimeout(() => setIsOpen(true), 600)
    return () => clearTimeout(timer)
  }, [section, state.loaded, state.helpSeen.length]) // eslint-disable-line react-hooks/exhaustive-deps

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
