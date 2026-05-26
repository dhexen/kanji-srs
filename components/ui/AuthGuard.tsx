'use client'
/**
 * AuthGuard — ya no es necesario; toda la lógica de auth vive en AuthShell.
 * Se mantiene como pass-through por compatibilidad con imports existentes.
 */
import { ReactNode } from 'react'

export default function AuthGuard({ children }: { children: ReactNode }) {
  return <>{children}</>
}
