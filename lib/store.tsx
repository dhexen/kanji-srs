'use client'
import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react'
import { VocabItem, migrateItem, ReviewMode, applyResult, getModeLevelAndDue } from './srs'
import type { ContextText } from './progress'
import {
  supabase,
  downloadAccountData,
  upsertVocabItems,
  saveReviewResult,
  deleteAllUserVocab,
  createManualSnapshot,
  getUserRole,
  saveGeminiKey,
  saveContextTexts,
  saveLanguage,
} from './supabase'
import type { Lang } from './i18n'

export type { ContextText }

interface State {
  db: VocabItem[]
  user: { email: string; id: string } | null
  role: 'admin' | 'user'
  syncing: boolean
  loaded: boolean
  geminiApiKey: string
  contextTexts: ContextText[]
  lang: Lang
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
  | { type: 'SET_LANG'; payload: Lang }
  | { type: 'RESET' }

function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DB': return { ...state, db: action.payload }
    case 'SET_USER': return { ...state, user: action.payload }
    case 'SET_ROLE': return { ...state, role: action.payload }
    case 'SET_SYNCING': return { ...state, syncing: action.payload }
    case 'SET_LOADED': return { ...state, loaded: true }
    case 'SET_GEMINI_KEY': return { ...state, geminiApiKey: action.payload }
    case 'SET_LANG': return { ...state, lang: action.payload }
    case 'SET_CONTEXT_TEXTS': return { ...state, contextTexts: action.payload }
    case 'ADD_CONTEXT_TEXT': return { ...state, contextTexts: [action.payload, ...state.contextTexts].slice(0, 10) }
    case 'REMOVE_CONTEXT_TEXT': return { ...state, contextTexts: state.contextTexts.filter(t => t.id !== action.payload) }
    case 'ADD_ITEMS': {
      const existing = new Set(state.db.map(i => i.jp))
      const newItems = action.payload.filter(i => !existing.has(i.jp))
      return { ...state, db: [...state.db, ...newItems] }
    }
    case 'APPLY_RESULT': {
      return { ...state, db: state.db.map(i => i.jp !== action.payload.jp ? i : applyResult(i, action.payload.mode, action.payload.isCorrect)) }
    }
    case 'RESET': return { ...state, db: [], contextTexts: [], geminiApiKey: '' }
    default: return state
  }
}

async function persistForAction(action: Action, prevDb: VocabItem[], nextDb: VocabItem[]) {
  switch (action.type) {
    case 'APPLY_RESULT': {
      const item = nextDb.find(i => i.jp === action.payload.jp)
      const prev = prevDb.find(i => i.jp === action.payload.jp)
      if (!item || !prev) return
      const { level: levelBefore } = getModeLevelAndDue(prev, action.payload.mode)
      const { level: levelAfter, due: dueAfter } = getModeLevelAndDue(item, action.payload.mode)
      await saveReviewResult(item, {
        jp: action.payload.jp,
        mode: action.payload.mode,
        isCorrect: action.payload.isCorrect,
        levelBefore,
        levelAfter,
        dueAfter,
      })
      break
    }
    case 'ADD_ITEMS': {
      const existing = new Set(prevDb.map(i => i.jp))
      const newItems = action.payload.filter(i => !existing.has(i.jp))
      if (newItems.length > 0) await upsertVocabItems(newItems)
      break
    }
    case 'SET_DB': {
      if (nextDb.length > 0) await upsertVocabItems(nextDb)
      break
    }
    default:
      break
  }
}

interface StoreContextType {
  state: State
  dispatch: React.Dispatch<Action>
  applyReviewResult: (jp: string, mode: ReviewMode, isCorrect: boolean) => void
  syncUp: () => Promise<void>
  syncDown: () => Promise<void>
  resetRemoteProgress: () => Promise<void>
  updateGeminiKey: (key: string) => Promise<void>
  addContextText: (text: ContextText) => Promise<void>
  removeContextText: (id: number) => Promise<void>
  setLang: (lang: Lang) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    db: [], user: null, role: 'user', syncing: false, loaded: false,
    geminiApiKey: '', contextTexts: [], lang: 'es',
  })

  const dbRef = useRef<VocabItem[]>([])
  const userRef = useRef<{ email: string; id: string } | null>(null)
  const loadedRef = useRef(false)
  const contextTextsRef = useRef<ContextText[]>([])

  useEffect(() => { dbRef.current = state.db }, [state.db])
  useEffect(() => { userRef.current = state.user }, [state.user])
  useEffect(() => { loadedRef.current = state.loaded }, [state.loaded])
  useEffect(() => { contextTextsRef.current = state.contextTexts }, [state.contextTexts])

  const dispatchPersist = useCallback((action: Action) => {
    const prevDb = dbRef.current

    if (action.type === 'APPLY_RESULT') {
      const nextDb = prevDb.map(i =>
        i.jp !== action.payload.jp ? i : applyResult(i, action.payload.mode, action.payload.isCorrect),
      )
      dbRef.current = nextDb
      dispatch({ type: 'SET_DB', payload: nextDb })
      if (userRef.current && loadedRef.current) {
        void persistForAction(action, prevDb, nextDb).catch(e =>
          console.error('Persist failed:', e),
        )
      }
      return
    }

    const nextState = appReducer(state, action)
    if (action.type === 'ADD_ITEMS' || action.type === 'SET_DB' || action.type === 'RESET') {
      dbRef.current = nextState.db
    }
    dispatch(action)
    if (userRef.current && loadedRef.current && action.type !== 'RESET') {
      void persistForAction(action, prevDb, nextState.db).catch(e =>
        console.error('Persist failed:', e),
      )
    }
  }, [state])

  const applyReviewResult = useCallback((jp: string, mode: ReviewMode, isCorrect: boolean) => {
    dispatchPersist({ type: 'APPLY_RESULT', payload: { jp, mode, isCorrect } })
  }, [dispatchPersist])

  const syncDown = useCallback(async () => {
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      const data = await downloadAccountData()
      if (data) {
        if (data.vocab.length > 0) {
          const migrated = data.vocab.map(migrateItem)
          dispatch({ type: 'SET_DB', payload: migrated })
          dbRef.current = migrated
        }
        if (data.gemini_api_key) dispatch({ type: 'SET_GEMINI_KEY', payload: data.gemini_api_key })
        if (data.context_texts?.length > 0) dispatch({ type: 'SET_CONTEXT_TEXTS', payload: data.context_texts })
        if (data.language) dispatch({ type: 'SET_LANG', payload: data.language as Lang })
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
      await upsertVocabItems(dbRef.current)
      await createManualSnapshot(dbRef.current, 'manual_sync')
    } catch (e) {
      console.error('Error subiendo progreso:', e)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [])

  const resetRemoteProgress = useCallback(async () => {
    await deleteAllUserVocab()
  }, [])

  const updateGeminiKey = useCallback(async (key: string) => {
    dispatch({ type: 'SET_GEMINI_KEY', payload: key })
    try { await saveGeminiKey(key) } catch (e) { console.error('Error guardando API key:', e) }
  }, [])

  const addContextText = useCallback(async (text: ContextText) => {
    dispatch({ type: 'ADD_CONTEXT_TEXT', payload: text })
    setTimeout(async () => {
      try {
        const updated = [text, ...contextTextsRef.current.filter(t => t.id !== text.id)].slice(0, 10)
        await saveContextTexts(updated)
      } catch (e) { console.error('Error guardando textos:', e) }
    }, 200)
  }, [])

  const removeContextText = useCallback(async (id: number) => {
    dispatch({ type: 'REMOVE_CONTEXT_TEXT', payload: id })
    setTimeout(async () => {
      try {
        const updated = contextTextsRef.current.filter(t => t.id !== id)
        await saveContextTexts(updated)
      } catch (e) { console.error('Error eliminando texto:', e) }
    }, 200)
  }, [])

  const setLang = useCallback(async (lang: Lang) => {
    dispatch({ type: 'SET_LANG', payload: lang })
    try { await saveLanguage(lang) } catch (e) { console.error('Error guardando idioma:', e) }
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
    dispatch({ type: 'SET_LANG', payload: 'es' })
    dispatch({ type: 'SET_LOADED' })
    userRef.current = null
    dbRef.current = []
  }, [])

  return (
    <StoreContext.Provider value={{
      state,
      dispatch: dispatchPersist,
      applyReviewResult,
      syncUp,
      syncDown,
      resetRemoteProgress,
      updateGeminiKey,
      addContextText,
      removeContextText,
      setLang,
      login,
      signup,
      logout,
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
