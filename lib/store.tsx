'use client'
// lib/store.tsx  — global state via React context + useReducer

import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import { VocabItem, migrateItem, MODE_CONFIG, ReviewMode, applyResult, SRS_INTERVALS } from './srs'
import { supabase, uploadProgress, downloadProgress } from './supabase'

const LS_KEY = 'kanji_srs_official_db2'

interface State {
  db: VocabItem[]
  user: { email: string } | null
  syncing: boolean
}

type Action =
  | { type: 'SET_DB'; payload: VocabItem[] }
  | { type: 'SET_USER'; payload: { email: string } | null }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'ADD_ITEMS'; payload: VocabItem[] }
  | { type: 'UPDATE_ITEM'; payload: VocabItem }
  | { type: 'APPLY_RESULT'; payload: { jp: string; mode: ReviewMode; isCorrect: boolean } }
  | { type: 'RESET' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DB': return { ...state, db: action.payload }
    case 'SET_USER': return { ...state, user: action.payload }
    case 'SET_SYNCING': return { ...state, syncing: action.payload }
    case 'ADD_ITEMS': {
      const existing = new Set(state.db.map(i => i.jp))
      const newItems = action.payload.filter(i => !existing.has(i.jp))
      return { ...state, db: [...state.db, ...newItems] }
    }
    case 'UPDATE_ITEM': {
      return { ...state, db: state.db.map(i => i.jp === action.payload.jp ? action.payload : i) }
    }
    case 'APPLY_RESULT': {
      return {
        ...state,
        db: state.db.map(i => {
          if (i.jp !== action.payload.jp) return i
          return applyResult(i, action.payload.mode, action.payload.isCorrect)
        }),
      }
    }
    case 'RESET': return { ...state, db: [] }
    default: return state
  }
}

interface StoreContextType {
  state: State
  dispatch: React.Dispatch<Action>
  saveLocal: (db: VocabItem[]) => void
  syncUp: (silent?: boolean) => Promise<void>
  syncDown: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { db: [], user: null, syncing: false })

  const saveLocal = useCallback((db: VocabItem[]) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch {}
  }, [])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed: VocabItem[] = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatch({ type: 'SET_DB', payload: parsed.map(migrateItem) })
        }
      }
    } catch {}
  }, [])

  // Save to localStorage whenever db changes
  useEffect(() => {
    if (state.db.length > 0) saveLocal(state.db)
  }, [state.db, saveLocal])

  // Check Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch({ type: 'SET_USER', payload: { email: session.user.email! } })
        syncDown()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const syncUp = useCallback(async (silent = false) => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      await uploadProgress(state.db)
      if (!silent) console.log('✅ Progreso subido')
    } catch (e) {
      console.error('Error subiendo progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [state.db])

  const syncDown = useCallback(async () => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      const data = await downloadProgress()
      if (data && Array.isArray(data) && data.length > 0) {
        const migrated = data.map(migrateItem)
        dispatch({ type: 'SET_DB', payload: migrated })
        saveLocal(migrated)
      }
    } catch (e) {
      console.error('Error descargando progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [saveLocal])

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    dispatch({ type: 'SET_USER', payload: { email: data.user.email! } })
    await syncDown()
  }, [syncDown])

  const signup = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) dispatch({ type: 'SET_USER', payload: { email: data.user.email! } })
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SET_USER', payload: null })
  }, [])

  return (
    <StoreContext.Provider value={{ state, dispatch, saveLocal, syncUp, syncDown, login, signup, logout }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
