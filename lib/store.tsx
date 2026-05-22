'use client'
import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react'
import { VocabItem, migrateItem, ReviewMode, applyResult } from './srs'
import { supabase, uploadProgress, downloadProgress, getUserRole } from './supabase'

interface State {
  db: VocabItem[]
  user: { email: string; id: string } | null
  role: 'admin' | 'user'
  syncing: boolean
  loaded: boolean  // true once we've attempted to load from Supabase
}

type Action =
  | { type: 'SET_DB'; payload: VocabItem[] }
  | { type: 'SET_USER'; payload: { email: string; id: string } | null }
  | { type: 'SET_ROLE'; payload: 'admin' | 'user' }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_LOADED' }
  | { type: 'ADD_ITEMS'; payload: VocabItem[] }
  | { type: 'APPLY_RESULT'; payload: { jp: string; mode: ReviewMode; isCorrect: boolean } }
  | { type: 'RESET' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DB': return { ...state, db: action.payload }
    case 'SET_USER': return { ...state, user: action.payload }
    case 'SET_ROLE': return { ...state, role: action.payload }
    case 'SET_SYNCING': return { ...state, syncing: action.payload }
    case 'SET_LOADED': return { ...state, loaded: true }
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
  syncUp: () => Promise<void>
  syncDown: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    db: [], user: null, role: 'user', syncing: false, loaded: false
  })

  // Ref always points to latest db — avoids stale closure in upload
  const dbRef = useRef<VocabItem[]>([])
  useEffect(() => { dbRef.current = state.db }, [state.db])

  // ── Upload current db to Supabase ──────────────────────────────────────────
  const syncUp = useCallback(async () => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      await uploadProgress(dbRef.current)
      console.log('✅ Progreso subido:', dbRef.current.length, 'palabras')
    } catch (e) {
      console.error('❌ Error subiendo progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [])

  // ── Download db from Supabase ──────────────────────────────────────────────
  const syncDown = useCallback(async () => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      const data = await downloadProgress()
      console.log('📥 Datos descargados de Supabase:', data ? (data as any[]).length : 0, 'palabras')
      if (data && Array.isArray(data) && data.length > 0) {
        const migrated = (data as VocabItem[]).map(migrateItem)
        dispatch({ type: 'SET_DB', payload: migrated })
        dbRef.current = migrated
      } else {
        // No data in Supabase yet — start empty
        dispatch({ type: 'SET_DB', payload: [] })
        dbRef.current = []
      }
    } catch (e) {
      console.error('❌ Error descargando progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
      dispatch({ type: 'SET_LOADED' })
    }
  }, [])

  // ── Auto-upload whenever db changes (debounced) ────────────────────────────
  // Only fires if user is logged in and data has been loaded
  const userRef = useRef<{ email: string; id: string } | null>(null)
  useEffect(() => { userRef.current = state.user }, [state.user])

  useEffect(() => {
    if (!state.loaded) return
    if (!userRef.current) return
    if (dbRef.current.length === 0) return

    const timer = setTimeout(async () => {
      try {
        await uploadProgress(dbRef.current)
        console.log('⬆️ Auto-sync:', dbRef.current.length, 'palabras')
      } catch (e) {
        console.error('❌ Auto-sync failed:', e)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [state.db, state.loaded])

  // ── On mount: check Supabase session ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const user = { email: session.user.email!, id: session.user.id }
        dispatch({ type: 'SET_USER', payload: user })
        userRef.current = user
        const role = await getUserRole(session.user.id)
        dispatch({ type: 'SET_ROLE', payload: role })
        await syncDown()
      } else {
        // No session → no data, just mark as loaded
        dispatch({ type: 'SET_DB', payload: [] })
        dispatch({ type: 'SET_LOADED' })
      }
    })
  }, [syncDown])

  // ── Auth functions ─────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const user = { email: data.user.email!, id: data.user.id }
    dispatch({ type: 'SET_USER', payload: user })
    userRef.current = user
    const role = await getUserRole(data.user.id)
    dispatch({ type: 'SET_ROLE', payload: role })
    await syncDown()
  }, [syncDown])

  const signup = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      const user = { email: data.user.email!, id: data.user.id }
      dispatch({ type: 'SET_USER', payload: user })
      userRef.current = user
      dispatch({ type: 'SET_ROLE', payload: 'user' })
      dispatch({ type: 'SET_LOADED' })
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SET_USER', payload: null })
    dispatch({ type: 'SET_ROLE', payload: 'user' })
    dispatch({ type: 'SET_DB', payload: [] })
    dispatch({ type: 'SET_LOADED' })
    userRef.current = null
    dbRef.current = []
  }, [])

  return (
    <StoreContext.Provider value={{ state, dispatch, syncUp, syncDown, login, signup, logout }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
