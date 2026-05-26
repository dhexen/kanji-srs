'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarCtx {
  collapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} })

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  // Read persisted state after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true)
    } catch { /* ignore */ }
  }, [])

  const toggle = () =>
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch { /* ignore */ }
      return next
    })

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
