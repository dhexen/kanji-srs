'use client'
import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react'
import { VocabItem, migrateItem, MODE_CONFIG, ReviewMode, applyResult } from './srs'
import { supabase, uploadProgress, downloadProgress, getUserRole } from './supabase'

const LS_KEY = 'kanji_srs_official_db2'

interface State {
  db: VocabItem[]
  user: { email: string; id: string } | null
  role: 'admin' | 'user'
  syncing: boolean
}

type Action =
  | { type: 'SET_DB'; payload: VocabItem[] }
  | { type: 'SET_USER'; payload: { email: string; id: string } | null }
  | { type: 'SET_ROLE'; payload: 'admin' | 'user' }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'ADD_ITEMS'; payload: VocabItem[] }
  | { type: 'APPLY_RESULT'; payload: { jp: string; mode: ReviewMode; isCorrect: boolean } }
  | { type: 'RESET' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DB': return { ...state, db: action.payload }
    case 'SET_USER': return { ...state, user: action.payload }
    case 'SET_ROLE': return { ...state, role: action.payload }
    case 'SET_SYNCING': return { ...state, syncing: action.payload }
    case 'ADD_ITEMS': {
      const existing = new Set(state.db.map(i => i.jp))
      const newItems = action.payload.filter(i => !existing.has(i.jp))
      return { ...state, db: [...state.db, ...newItems] }
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
  saveAndSync: (db: VocabItem[]) => Promise<void>
  syncDown: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  // Keep syncUp for manual use in stats
  syncUp: (silent?: boolean) => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { db: [], user: null, role: 'user', syncing: false })
  
  // Use ref to always have latest db without stale closure
  const dbRef = useRef<VocabItem[]>([])
  const userRef = useRef<{ email: string; id: string } | null>(null)

  useEffect(() => { dbRef.current = state.db }, [state.db])
  useEffect(() => { userRef.current = state.user }, [state.user])

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
          const migrated = parsed.map(migrateItem)
          dispatch({ type: 'SET_DB', payload: migrated })
          dbRef.current = migrated
        }
      }
    } catch {}
  }, [])

  const syncDown = useCallback(async () => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      const data = await downloadProgress()
      if (data && Array.isArray(data) && data.length > 0) {
        const migrated = data.map(migrateItem)
        dispatch({ type: 'SET_DB', payload: migrated })
        dbRef.current = migrated
        saveLocal(migrated)
      }
    } catch (e) {
      console.error('Error descargando progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [saveLocal])

  // Upload a specific db snapshot — avoids stale closure problem
  const uploadDb = useCallback(async (db: VocabItem[]) => {
    if (!userRef.current) return
    try {
      await uploadProgress(db)
    } catch (e) {
      console.error('Error subiendo progreso:', e)
    }
  }, [])

  // Save local + sync to cloud atomically
  const saveAndSync = useCallback(async (db: VocabItem[]) => {
    saveLocal(db)
    await uploadDb(db)
  }, [saveLocal, uploadDb])

  // For manual sync button (uses current ref)
  const syncUp = useCallback(async (_silent = false) => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      await uploadProgress(dbRef.current)
    } catch (e) {
      console.error('Error subiendo progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [])

  // Auto-sync whenever db changes and user is logged in
  useEffect(() => {
    if (state.db.length === 0 || !state.user) return
    const timer = setTimeout(() => {
      uploadDb(state.db)
    }, 1500) // debounce 1.5s to batch rapid changes
    return () => clearTimeout(timer)
  }, [state.db, state.user, uploadDb])

  // Check Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        dispatch({ type: 'SET_USER', payload: { email: session.user.email!, id: session.user.id } })
        userRef.current = { email: session.user.email!, id: session.user.id }
        const role = await getUserRole(session.user.id)
        dispatch({ type: 'SET_ROLE', payload: role })
        await syncDown()
      }
    })
  }, [syncDown])

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    dispatch({ type: 'SET_USER', payload: { email: data.user.email!, id: data.user.id } })
    userRef.current = { email: data.user.email!, id: data.user.id }
    const role = await getUserRole(data.user.id)
    dispatch({ type: 'SET_ROLE', payload: role })
    await syncDown()
  }, [syncDown])

  const signup = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      dispatch({ type: 'SET_USER', payload: { email: data.user.email!, id: data.user.id } })
      userRef.current = { email: data.user.email!, id: data.user.id }
      dispatch({ type: 'SET_ROLE', payload: 'user' })
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SET_USER', payload: null })
    dispatch({ type: 'SET_ROLE', payload: 'user' })
    userRef.current = null
  }, [])

  return (
    <StoreContext.Provider value={{ state, dispatch, saveAndSync, syncDown, syncUp, login, signup, logout }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
