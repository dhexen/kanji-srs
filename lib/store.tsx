'use client'
import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react'
import { VocabItem, migrateItem, ReviewMode, applyResult } from './srs'
import { supabase, uploadProgress, downloadProgress, getUserRole, saveGeminiKey, saveContextTexts } from './supabase'

export interface ContextText {
  id: number
  topic: string
  emoji: string
  level: string
  japanese: string
  spanish: string
  catalan: string
  english: string
  words_used: string[]
}

interface State {
  db: VocabItem[]
  user: { email: string; id: string } | null
  role: 'admin' | 'user'
  syncing: boolean
  loaded: boolean
  geminiApiKey: string
  contextTexts: ContextText[]
}

type Action =
  | { type: 'SET_DB'; payload: VocabItem[] }
  | { type: 'SET_USER'; payload: { email: string; id: string } | null }
  | { type: 'SET_ROLE'; payload: 'admin' | 'user' }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_LOADED' }
  | { type: 'ADD_ITEMS'; payload: VocabItem[] }
  | { type: 'APPLY_RESULT'; payload: { jp: string; mode: ReviewMode; isCorrect: boolean } }
  | { type: 'SET_GEMINI_KEY'; payload: string }
  | { type: 'SET_CONTEXT_TEXTS'; payload: ContextText[] }
  | { type: 'ADD_CONTEXT_TEXT'; payload: ContextText }
  | { type: 'REMOVE_CONTEXT_TEXT'; payload: number }
  | { type: 'RESET' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DB': return { ...state, db: action.payload }
    case 'SET_USER': return { ...state, user: action.payload }
    case 'SET_ROLE': return { ...state, role: action.payload }
    case 'SET_SYNCING': return { ...state, syncing: action.payload }
    case 'SET_LOADED': return { ...state, loaded: true }
    case 'SET_GEMINI_KEY': return { ...state, geminiApiKey: action.payload }
    case 'SET_CONTEXT_TEXTS': return { ...state, contextTexts: action.payload }
    case 'ADD_CONTEXT_TEXT': {
      const updated = [action.payload, ...state.contextTexts].slice(0, 10)
      return { ...state, contextTexts: updated }
    }
    case 'REMOVE_CONTEXT_TEXT': {
      const updated = state.contextTexts.filter(t => t.id !== action.payload)
      return { ...state, contextTexts: updated }
    }
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
    case 'RESET': return { ...state, db: [], contextTexts: [], geminiApiKey: '' }
    default: return state
  }
}

interface StoreContextType {
  state: State
  dispatch: React.Dispatch<Action>
  syncUp: () => Promise<void>
  syncDown: () => Promise<void>
  updateGeminiKey: (key: string) => Promise<void>
  addContextText: (text: ContextText) => Promise<void>
  removeContextText: (id: number) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    db: [], user: null, role: 'user', syncing: false, loaded: false,
    geminiApiKey: '', contextTexts: [],
  })

  const dbRef = useRef<VocabItem[]>([])
  const userRef = useRef<{ email: string; id: string } | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => { dbRef.current = state.db }, [state.db])
  useEffect(() => { userRef.current = state.user }, [state.user])
  useEffect(() => { loadedRef.current = state.loaded }, [state.loaded])

  const syncDown = useCallback(async () => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      const data = await downloadProgress()
      if (data) {
        if (data.vocab_db && Array.isArray(data.vocab_db) && data.vocab_db.length > 0) {
          const migrated = (data.vocab_db as VocabItem[]).map(migrateItem)
          dispatch({ type: 'SET_DB', payload: migrated })
          dbRef.current = migrated
        }
        if (data.gemini_api_key) dispatch({ type: 'SET_GEMINI_KEY', payload: data.gemini_api_key })
        if (data.context_texts && Array.isArray(data.context_texts)) {
          dispatch({ type: 'SET_CONTEXT_TEXTS', payload: data.context_texts })
        }
      } else {
        dispatch({ type: 'SET_DB', payload: [] })
        dbRef.current = []
      }
    } catch (e) {
      console.error('Error descargando progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
      dispatch({ type: 'SET_LOADED' })
    }
  }, [])

  const syncUp = useCallback(async () => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      await uploadProgress(dbRef.current)
    } catch (e) {
      console.error('Error subiendo progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [])

  // Auto-sync db changes
  useEffect(() => {
    if (!loadedRef.current || !userRef.current || dbRef.current.length === 0) return
    const timer = setTimeout(async () => {
      try { await uploadProgress(dbRef.current) } catch (e) { console.error('Auto-sync failed:', e) }
    }, 1500)
    return () => clearTimeout(timer)
  }, [state.db])

  const updateGeminiKey = useCallback(async (key: string) => {
    dispatch({ type: 'SET_GEMINI_KEY', payload: key })
    try { await saveGeminiKey(key) } catch (e) { console.error('Error guardando API key:', e) }
  }, [])

  const addContextText = useCallback(async (text: ContextText) => {
    dispatch({ type: 'ADD_CONTEXT_TEXT', payload: text })
    // Save updated list after state update - use timeout to get new state
    setTimeout(async () => {
      try {
        const { data } = await supabase.from('srs_progress').select('context_texts').eq('user_id', userRef.current?.id ?? '').maybeSingle()
        const existing = Array.isArray(data?.context_texts) ? data.context_texts : []
        const updated = [text, ...existing].slice(0, 10)
        await saveContextTexts(updated)
      } catch (e) { console.error('Error guardando textos:', e) }
    }, 100)
  }, [])

  const removeContextText = useCallback(async (id: number) => {
    dispatch({ type: 'REMOVE_CONTEXT_TEXT', payload: id })
    setTimeout(async () => {
      try {
        const { data } = await supabase.from('srs_progress').select('context_texts').eq('user_id', userRef.current?.id ?? '').maybeSingle()
        const existing = Array.isArray(data?.context_texts) ? data.context_texts : []
        const updated = existing.filter((t: any) => t.id !== id)
        await saveContextTexts(updated)
      } catch (e) { console.error('Error eliminando texto:', e) }
    }, 100)
  }, [])

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
        dispatch({ type: 'SET_DB', payload: [] })
        dispatch({ type: 'SET_LOADED' })
      }
    })
  }, [syncDown])

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
    dispatch({ type: 'SET_CONTEXT_TEXTS', payload: [] })
    dispatch({ type: 'SET_GEMINI_KEY', payload: '' })
    dispatch({ type: 'SET_LOADED' })
    userRef.current = null
    dbRef.current = []
  }, [])

  return (
    <StoreContext.Provider value={{
      state, dispatch, syncUp, syncDown,
      updateGeminiKey, addContextText, removeContextText,
      login, signup, logout,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
