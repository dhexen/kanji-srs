'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Right-side sliding drawer for the admin control panel. Each tool card on the
 * dashboard opens its tool here instead of navigating to a full page.
 *
 * Children mount only while the drawer is open (so each tool's data fetching
 * stays lazy), yet both the enter and exit slides animate: on open we mount at
 * translateX(100%) and flip to 0 on the next frame; on close we slide out first
 * and unmount after the transition.
 */
export default function AdminDrawer({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  icon?: string
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Mount → next frame slide in; close → slide out then unmount.
  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 280)
    return () => clearTimeout(t)
  }, [open])

  // ESC to close + lock body scroll while open.
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mounted, onClose])

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (shown) panelRef.current?.focus()
  }, [shown])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`absolute top-0 right-0 h-full w-[min(760px,96vw)] bg-slate-50 dark:bg-slate-900 shadow-2xl outline-none flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          {icon && <span className="text-2xl leading-none">{icon}</span>}
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex-1 truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-xl"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
