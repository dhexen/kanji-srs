'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

const SEEN_PREFIX = 'help_seen_v1_'

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
  const [isOpen, setIsOpen] = useState(false)
  const section = getSectionFromPath(pathname)

  // Auto-open once per section on first visit
  useEffect(() => {
    if (!section) return
    try {
      const key = SEEN_PREFIX + section
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        const timer = setTimeout(() => setIsOpen(true), 600)
        return () => clearTimeout(timer)
      }
    } catch { /* ignore */ }
  }, [section])

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
