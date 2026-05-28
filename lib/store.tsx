'use client'
import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react'
import { VocabItem, migrateItem, ReviewMode, applyResult, getModeLevelAndDue, setSrsIntervals, masterItem } from './srs'
import type { ContextText } from './progress'
import {
  supabase,
  downloadAccountData,
  upsertVocabItem,
  upsertVocabItems,
  saveReviewResult,
  deleteAllUserVocab,
  createManualSnapshot,
  getUserRole,
  saveGeminiKey,
  savePexelsKey,
  saveContextTexts,
  saveLanguage,
  fetchSrsIntervalsConfig,
} from './supabase'
import type { Lang } from './i18n'
import { showToast } from '@/components/ui/Toast'

export type { ContextText }

interface State {
  db: VocabItem[]
  user: { email: string; id: string } | null
  role: 'admin' | 'contributor' | 'user'
  simulatedRole: 'admin' | 'contributor' | 'user' | null
  syncing: boolean
  loaded: boolean
  geminiApiKey: string
  pexelsApiKey: string
  contextTexts: ContextText[]
  lang: Lang
}

type Action =
  | { type: 'SET_DB'; payload: VocabItem[] }
  | { type: 'SET_USER'; payload: { email: string; id: string } | null }
  | { type: 'SET_ROLE'; payload: 'admin' | 'contributor' | 'user' }
  | { type: 'SET_SIMULATED_ROLE'; payload: 'admin' | 'contributor' | 'user' | null }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_LOADED' }
  | { type: 'ADD_ITEMS'; payload: VocabItem[] }
  | { type: 'APPLY_RESULT'; payload: { jp: string; mode: ReviewMode; isCorrect: boolean } }
  | { type: 'SET_GEMINI_KEY'; payload: string }
  | { type: 'SET_PEXELS_KEY'; payload: string }
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
    case 'SET_SIMULATED_ROLE': return { ...state, simulatedRole: action.payload }
    case 'SET_SYNCING': return { ...state, syncing: action.payload }
    case 'SET_LOADED': return { ...state, loaded: true }
    case 'SET_GEMINI_KEY': return { ...state, geminiApiKey: action.payload }
    case 'SET_PEXELS_KEY': return { ...state, pexelsApiKey: action.payload }
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
    case 'RESET': return { ...state, db: [], contextTexts: [], geminiApiKey: '', pexelsApiKey: '' }
    default: return state
  }
}

function canPersist(userRef: React.RefObject<{ email: string; id: string } | null>, hydratingRef: React.RefObject<boolean>) {
  return Boolean(userRef.current) && !hydratingRef.current
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
      }, nextDb)
      break
    }
    case 'ADD_ITEMS': {
      const existing = new Set(prevDb.map(i => i.jp))
      const newItems = action.payload.filter(i => !existing.has(i.jp))
      if (newItems.length > 0) await upsertVocabItems(newItems, nextDb)
      break
    }
    case 'SET_DB': {
      if (nextDb.length > 0) await upsertVocabItems(nextDb, nextDb)
      break
    }
    default:
      break
  }
}

function reportPersistError(e: unknown) {
  console.error('Persist failed:', e)
  const msg = e instanceof Error ? e.message : 'Error guardando en la nube'
  showToast(msg.includes('autenticado') ? 'Inicia sesión para guardar' : `No se pudo guardar: ${msg}`, 'error')
}

interface StoreContextType {
  state: State
  dispatch: React.Dispatch<Action>
  addVocabItems: (items: VocabItem[]) => Promise<void>
  saveVocabDb: (db: VocabItem[]) => Promise<void>
  applyReviewResult: (jp: string, mode: ReviewMode, isCorrect: boolean) => void
  masterVocabItem: (jp: string) => Promise<void>
  syncUp: () => Promise<void>
  syncDown: () => Promise<void>
  resetRemoteProgress: () => Promise<void>
  updateGeminiKey: (key: string) => Promise<void>
  updatePexelsKey: (key: string) => Promise<void>
  addContextText: (text: ContextText) => Promise<void>
  removeContextText: (id: number) => Promise<void>
  setLang: (lang: Lang) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<'ok' | 'needs_confirmation'>
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  logout: () => Promise<void>
  setSimulatedRole: (role: 'admin' | 'contributor' | 'user' | null) => void
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    db: [], user: null, role: 'user' as 'admin' | 'contributor' | 'user', simulatedRole: null, syncing: false, loaded: false,
    geminiApiKey: '', pexelsApiKey: '', contextTexts: [], lang: 'es',
  })

  const dbRef = useRef<VocabItem[]>([])
  const userRef = useRef<{ email: string; id: string } | null>(null)
  const loadedRef = useRef(false)
  const hydratingRef = useRef(false)
  const contextTextsRef = useRef<ContextText[]>([])

  useEffect(() => { dbRef.current = state.db }, [state.db])
  useEffect(() => { userRef.current = state.user }, [state.user])
  useEffect(() => { loadedRef.current = state.loaded }, [state.loaded])
  useEffect(() => { contextTextsRef.current = state.contextTexts }, [state.contextTexts])

  const runPersist = useCallback((action: Action, prevDb: VocabItem[], nextDb: VocabItem[]) => {
    if (!canPersist(userRef, hydratingRef)) return
    void persistForAction(action, prevDb, nextDb).catch(reportPersistError)
  }, [])

  const dispatchPersist = useCallback((action: Action) => {
    const prevDb = dbRef.current

    if (action.type === 'APPLY_RESULT') {
      const nextDb = prevDb.map(i =>
        i.jp !== action.payload.jp ? i : applyResult(i, action.payload.mode, action.payload.isCorrect),
      )
      dbRef.current = nextDb
      dispatch({ type: 'SET_DB', payload: nextDb })
      runPersist(action, prevDb, nextDb)
      return
    }

    const nextState = appReducer(state, action)
    if (action.type === 'ADD_ITEMS' || action.type === 'SET_DB' || action.type === 'RESET') {
      dbRef.current = nextState.db
    }
    dispatch(action)
    if (action.type !== 'RESET') {
      runPersist(action, prevDb, nextState.db)
    }
  }, [state, runPersist])

  const addVocabItems = useCallback(async (items: VocabItem[]) => {
    if (!userRef.current) {
      showToast('Inicia sesión para guardar el vocabulario', 'error')
      throw new Error('No autenticado')
    }
    const prevDb = dbRef.current
    const existing = new Set(prevDb.map(i => i.jp))
    const newItems = items.filter(i => !existing.has(i.jp))
    if (newItems.length === 0) return

    const nextDb = [...prevDb, ...newItems]
    dbRef.current = nextDb
    dispatch({ type: 'SET_DB', payload: nextDb })

    try {
      await upsertVocabItems(newItems, nextDb)
    } catch (e) {
      reportPersistError(e)
      throw e
    }
  }, [])

  const saveVocabDb = useCallback(async (db: VocabItem[]) => {
    if (!userRef.current) {
      showToast('Inicia sesión para guardar el vocabulario', 'error')
      throw new Error('No autenticado')
    }
    dbRef.current = db
    dispatch({ type: 'SET_DB', payload: db })
    try {
      await upsertVocabItems(db, db)
    } catch (e) {
      reportPersistError(e)
      throw e
    }
  }, [])

  const applyReviewResult = useCallback((jp: string, mode: ReviewMode, isCorrect: boolean) => {
    dispatchPersist({ type: 'APPLY_RESULT', payload: { jp, mode, isCorrect } })
  }, [dispatchPersist])

  /** Sets all SRS levels for a word to 7 (Maestro) across all modes, then persists. */
  const masterVocabItem = useCallback(async (jp: string) => {
    const prevDb = dbRef.current
    const item = prevDb.find(i => i.jp === jp)
    if (!item) return
    const mastered = masterItem(item)
    const nextDb = prevDb.map(i => i.jp === jp ? mastered : i)
    dbRef.current = nextDb
    dispatch({ type: 'SET_DB', payload: nextDb })
    if (canPersist(userRef, hydratingRef)) {
      void upsertVocabItem(mastered, nextDb).catch(reportPersistError)
    }
  }, [])

  const syncDown = useCallback(async () => {
    hydratingRef.current = true
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      const data = await downloadAccountData()
      if (data) {
        const migrated = data.vocab.length > 0 ? data.vocab.map(migrateItem) : []
        dispatch({ type: 'SET_DB', payload: migrated })
        dbRef.current = migrated
        if (data.gemini_api_key) dispatch({ type: 'SET_GEMINI_KEY', payload: data.gemini_api_key })
        if (data.pexels_api_key) dispatch({ type: 'SET_PEXELS_KEY', payload: data.pexels_api_key })
        if (data.context_texts?.length > 0) dispatch({ type: 'SET_CONTEXT_TEXTS', payload: data.context_texts })
        if (data.language) dispatch({ type: 'SET_LANG', payload: data.language as Lang })
      }
    } catch (e) {
      console.error('Error descargando progreso:', e)
      showToast('Error cargando tu progreso', 'error')
    } finally {
      hydratingRef.current = false
      loadedRef.current = true
      dispatch({ type: 'SET_SYNCING', payload: false })
      dispatch({ type: 'SET_LOADED' })
    }
  }, [])

  const syncUp = useCallback(async () => {
    if (!userRef.current) return
    try {
      dispatch({ type: 'SET_SYNCING', payload: true })
      await upsertVocabItems(dbRef.current, dbRef.current)
      await createManualSnapshot(dbRef.current, 'manual_sync')
      showToast('Progreso guardado en la nube', 'success')
    } catch (e) {
      reportPersistError(e)
      throw e
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

  const updatePexelsKey = useCallback(async (key: string) => {
    dispatch({ type: 'SET_PEXELS_KEY', payload: key })
    try { await savePexelsKey(key) } catch (e) { console.error('Error guardando Pexels API key:', e) }
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
    // Load global SRS intervals config (independent of user)
    fetchSrsIntervalsConfig().then(intervals => {
      if (intervals) setSrsIntervals(intervals)
    }).catch(e => console.warn('Could not load SRS intervals config:', e))

    // Aviso de conexión lenta (proyectos free tier de Supabase tardan ~20-30s en despertar)
    const slowConnTimeout = setTimeout(() => {
      if (!loadedRef.current) {
        showToast('Conectando con la base de datos…', 'info')
      }
    }, 5000)

    // Safety net: if SET_LOADED hasn't fired after 15s, force it to unblock the spinner
    const loadTimeout = setTimeout(() => {
      if (!loadedRef.current) {
        console.warn('[store] loading timeout — forcing SET_LOADED')
        loadedRef.current = true
        dispatch({ type: 'SET_LOADED' })
      }
    }, 15000)

    // Initial session check — getSession() lee de localStorage, es instantáneo
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Si onAuthStateChange SIGNED_IN ya procesó esta sesión, no repetir syncDown
        if (userRef.current) return
        const user = { email: session.user.email!, id: session.user.id }
        dispatch({ type: 'SET_USER', payload: user })
        userRef.current = user
        // Marcar como cargado INMEDIATAMENTE para evitar el spinner largo.
        // La app se renderiza al instante; syncDown carga los datos en background.
        loadedRef.current = true
        dispatch({ type: 'SET_LOADED' })
        getUserRole(session.user.id)
          .then(role => dispatch({ type: 'SET_ROLE', payload: role }))
          .catch(() => { /* rol queda como 'user' por defecto */ })
        void syncDown()
      } else {
        // Sin sesión: marcar como cargado para que AuthShell pueda redirigir a /login
        hydratingRef.current = false
        loadedRef.current = true
        dispatch({ type: 'SET_DB', payload: [] })
        dispatch({ type: 'SET_LOADED' })
      }
    }).catch((e) => {
      // Si getSession falla (p.ej. red caída), liberar el spinner igualmente
      console.error('[store] getSession error:', e)
      if (!loadedRef.current) {
        loadedRef.current = true
        dispatch({ type: 'SET_LOADED' })
      }
    })

    // Listener para magic links y OAuth PKCE: la sesión puede establecerse
    // de forma asíncrona DESPUÉS de que getSession() ya haya devuelto null.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !userRef.current) {
        const user = { email: session.user.email!, id: session.user.id }
        dispatch({ type: 'SET_USER', payload: user })
        userRef.current = user
        loadedRef.current = true
        dispatch({ type: 'SET_LOADED' })
        getUserRole(session.user.id)
          .then(role => dispatch({ type: 'SET_ROLE', payload: role }))
          .catch(() => {})
        void syncDown()
      }
    })

    return () => { subscription.unsubscribe(); clearTimeout(loadTimeout); clearTimeout(slowConnTimeout) }
  }, [syncDown])

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const user = { email: data.user.email!, id: data.user.id }
    dispatch({ type: 'SET_USER', payload: user })
    userRef.current = user
    getUserRole(data.user.id)
      .then(role => dispatch({ type: 'SET_ROLE', payload: role }))
      .catch(() => {})
    await syncDown()
  }, [syncDown])

  const signup = useCallback(async (email: string, password: string): Promise<'ok' | 'needs_confirmation'> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // No session means Supabase sent a confirmation email — account not active yet
    if (!data.session) return 'needs_confirmation'
    if (data.user) {
      const user = { email: data.user.email!, id: data.user.id }
      dispatch({ type: 'SET_USER', payload: user })
      userRef.current = user
      hydratingRef.current = false
      loadedRef.current = true
      dispatch({ type: 'SET_ROLE', payload: 'user' })
      dispatch({ type: 'SET_LOADED' })
    }
    return 'ok'
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : '/auth/callback',
      },
    })
    if (error) throw error
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : '/auth/callback',
      },
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    hydratingRef.current = false
    loadedRef.current = false
    dispatch({ type: 'SET_USER', payload: null })
    dispatch({ type: 'SET_ROLE', payload: 'user' })
    dispatch({ type: 'SET_DB', payload: [] })
    dispatch({ type: 'SET_CONTEXT_TEXTS', payload: [] })
    dispatch({ type: 'SET_GEMINI_KEY', payload: '' })
    dispatch({ type: 'SET_PEXELS_KEY', payload: '' })
    dispatch({ type: 'SET_LANG', payload: 'es' })
    dispatch({ type: 'SET_LOADED' })
    userRef.current = null
    dbRef.current = []
  }, [])

  const setSimulatedRole = useCallback((role: 'admin' | 'contributor' | 'user' | null) => {
    dispatch({ type: 'SET_SIMULATED_ROLE', payload: role })
  }, [])

  return (
    <StoreContext.Provider value={{
      state,
      dispatch: dispatchPersist,
      addVocabItems,
      saveVocabDb,
      applyReviewResult,
      masterVocabItem,
      syncUp,
      syncDown,
      resetRemoteProgress,
      updateGeminiKey,
      updatePexelsKey,
      addContextText,
      removeContextText,
      setLang,
      login,
      signup,
      signInWithGoogle,
      signInWithMagicLink,
      logout,
      setSimulatedRole,
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
