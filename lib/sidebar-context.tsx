'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarCtx {
  collapsed: boolean
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarCtx>({ collapsed: true, toggle: () => {}, close: () => {} })

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Start closed — user opens with hamburger
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed')
      // Only restore if user explicitly set it; default is collapsed
      if (stored !== null) setCollapsed(stored === 'true')
    } catch { /* ignore */ }
  }, [])

  const toggle = () =>
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch { /* ignore */ }
      return next
    })

  const close = () =>
    setCollapsed(prev => {
      if (prev) return prev
      try { localStorage.setItem('sidebar-collapsed', 'true') } catch { /* ignore */ }
      return true
    })

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
