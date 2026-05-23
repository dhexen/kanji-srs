'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useStore } from '@/lib/store'

export const TUTORIAL_DONE_KEY = 'kanji_tutorial_v1_done'
const TUTORIAL_STEP_KEY = 'kanji_tutorial_v1_step'

type ML = Record<string, string>

type StepDef = {
  id: string
  targetId: string | null
  route?: string           // must be on this route to show spotlight
  navigateOnNext?: string  // auto-navigate here when next() is called
  waitFor?: string         // custom event action name to auto-advance
  pos: 'center' | 'top' | 'bottom' | 'right' | 'left'
  title: ML
  body: ML
}

const STEPS: StepDef[] = [
  {
    id: 'welcome',
    targetId: null,
    navigateOnNext: '/vocabulary',
    pos: 'center',
    title: {
      es: '¡Bienvenido! 🌸',
      ca: 'Benvingut! 🌸',
      en: 'Welcome! 🌸',
      ja: 'ようこそ！🌸',
    },
    body: {
      es: 'Aprende kanji con repetición espaciada e inteligencia artificial. Te guiaremos por los primeros pasos para que puedas empezar a estudiar.',
      ca: 'Aprèn kanji amb repetició espaïda i intel·ligència artificial. Et guiarem pels primers passos perquè puguis començar a estudiar.',
      en: 'Learn kanji with spaced repetition and AI. We\'ll guide you through the first steps so you can start studying.',
      ja: '間隔反復とAIで漢字を学びましょう。最初のステップをご案内します。',
    },
  },
  {
    id: 'load-vocab',
    targetId: 'vocab-load-controls',
    route: '/vocabulary',
    waitFor: 'vocab-loaded',
    pos: 'bottom',
    title: {
      es: '1 · Carga tu vocabulario 📥',
      ca: '1 · Carrega el teu vocabulari 📥',
      en: '1 · Load your vocabulary 📥',
      ja: '1 · 語彙を読み込む 📥',
    },
    body: {
      es: 'Selecciona el curso escolar y cuántos kanjis quieres aprender hoy. Luego pulsa el botón azul "Cargar" para ver las palabras disponibles.',
      ca: 'Selecciona el curs escolar i quants kanjis vols aprendre avui. Després prem el botó blau "Carregar" per veure les paraules disponibles.',
      en: 'Select the school grade and how many kanji you want to learn today. Then press the blue "Load" button to see the available words.',
      ja: '学年と今日学習する漢字数を選んでください。青い「読み込む」ボタンを押すと単語が表示されます。',
    },
  },
  {
    id: 'vocab-preview',
    targetId: 'vocab-activate-btn',
    route: '/vocabulary',
    waitFor: 'vocab-activated',
    navigateOnNext: '/review',
    pos: 'top',
    title: {
      es: '2 · Revisa y añade a repasos 🚀',
      ca: '2 · Revisa i afegeix als repasos 🚀',
      en: '2 · Review and add to reviews 🚀',
      ja: '2 · 確認して復習に追加 🚀',
    },
    body: {
      es: 'Estas son las palabras cargadas. Puedes marcar "Ya me la sé" en las que ya conozcas para excluirlas. Cuando estés listo, pulsa "Añadir a repasos" para empezar a aprenderlas.',
      ca: 'Aquestes són les paraules carregades. Pots marcar "Ja me la sé" a les que ja coneguis per excloure-les. Quan estiguis llest, prem "Afegir als repasos" per començar.',
      en: 'These are the loaded words. You can mark "I already know it" on words to exclude them. When ready, press "Add to reviews" to start learning them.',
      ja: '読み込んだ単語が表示されています。知っている単語に「もう知っている」をつけて除外できます。準備ができたら「復習に追加」を押して学習を始めましょう。',
    },
  },
  {
    id: 'mode-select',
    targetId: 'review-mode-selector',
    route: '/review',
    pos: 'bottom',
    title: {
      es: '3 · Elige el tipo de repaso 🎯',
      ca: '3 · Tria el tipus de repàs 🎯',
      en: '3 · Choose the review type 🎯',
      ja: '3 · 復習タイプを選ぶ 🎯',
    },
    body: {
      es: 'Elige cómo practicar: lectura en hiragana, significado, escritura de kanji... Puedes combinar varios modos. Luego pulsa "Iniciar Repaso" para empezar a estudiar.',
      ca: 'Tria com practicar: lectura en hiragana, significat, escriptura de kanji... Pots combinar diversos modes. Prem "Iniciar Repàs" per començar.',
      en: 'Choose how to practice: hiragana reading, meaning, kanji writing... You can combine modes. Press "Start Review" to begin.',
      ja: '練習方法を選びましょう：ひらがな読み・意味・漢字書き取りなど。複数組み合わせ可能。「復習を開始」を押してください。',
    },
  },
  {
    id: 'calendar',
    targetId: 'header-forecast',
    route: '/review',
    navigateOnNext: '/stats',
    pos: 'bottom',
    title: {
      es: '4 · Tu calendario de repasos 📅',
      ca: '4 · El teu calendari de repasos 📅',
      en: '4 · Your review calendar 📅',
      ja: '4 · 復習カレンダー 📅',
    },
    body: {
      es: 'Cada vez que estudias, el sistema programa cuándo volver a repasar cada palabra para que no se te olvide a largo plazo. Aquí ves los repasos de hoy y los próximos días.',
      ca: 'Cada vegada que estudies, el sistema programa quan tornar a repassar cada paraula perquè no se\'t oblidi a llarg termini. Aquí veus els repasos d\'avui i els propers dies.',
      en: 'Each time you study, the system schedules when to review each word again so you don\'t forget it. Here you see today\'s and upcoming reviews.',
      ja: '学習するたびに、システムが各単語の次の復習日程を自動設定します。今日と今後の復習数がここで確認できます。',
    },
  },
  {
    id: 'profile',
    targetId: 'profile-api-section',
    route: '/stats',
    pos: 'top',
    title: {
      es: '5 · Mi Perfil ⚙️',
      ca: '5 · El Meu Perfil ⚙️',
      en: '5 · My Profile ⚙️',
      ja: '5 · マイプロフィール ⚙️',
    },
    body: {
      es: 'Aquí están los ajustes de tu cuenta: la API de Google Gemini para las funciones de IA, el idioma de la interfaz y las copias de seguridad. ¡Ya estás listo para empezar!',
      ca: 'Aquí estan els ajustos del teu compte: l\'API de Google Gemini per a funcions d\'IA, l\'idioma de la interfície i les còpies de seguretat. Ja estàs a punt per començar!',
      en: 'Here are your account settings: Google Gemini API for AI features, interface language, and backups of your progress. You\'re all set!',
      ja: 'アカウント設定がここにあります：AI機能用Google Gemini API、インターフェース言語、バックアップ。準備完了です！',
    },
  },
]

// Maps route → first step index requiring that route (for manual navigation auto-advance)
const ROUTE_TO_STEP: Record<string, number> = {}
STEPS.forEach((step, i) => {
  if (step.route && !(step.route in ROUTE_TO_STEP)) {
    ROUTE_TO_STEP[step.route] = i
  }
})

type SpotlightRect = { top: number; left: number; width: number; height: number }

function getSpotlightRect(targetId: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tutorial-id="${targetId}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export default function Tutorial() {
  const { state } = useStore()
  const lang = state.lang
  const pathname = usePathname()
  const router = useRouter()

  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [spotRect, setSpotRect] = useState<SpotlightRect | null>(null)
  const [mounted, setMounted] = useState(false)

  const stepIdxRef = useRef(0)
  stepIdxRef.current = stepIdx

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!state.loaded) return
    if (!state.user) return
    if (localStorage.getItem(TUTORIAL_DONE_KEY)) return
    const saved = parseInt(localStorage.getItem(TUTORIAL_STEP_KEY) ?? '0', 10)
    setStepIdx(isNaN(saved) ? 0 : Math.min(saved, STEPS.length - 1))
    setActive(true)
  }, [state.loaded, state.user])

  useEffect(() => {
    if (!active) return
    localStorage.setItem(TUTORIAL_STEP_KEY, String(stepIdx))
  }, [stepIdx, active])

  // Auto-advance when user manually navigates to a relevant section (only forward)
  useEffect(() => {
    if (!active) return
    const targetStep = ROUTE_TO_STEP[pathname]
    if (targetStep !== undefined && targetStep > stepIdxRef.current) {
      setStepIdx(targetStep)
    }
  }, [pathname, active])

  // Spotlight update with retry for async-rendered elements
  useEffect(() => {
    if (!active) return
    const step = STEPS[stepIdx]
    if (!step?.targetId) { setSpotRect(null); return }

    let retries = 0
    let retryTimer: ReturnType<typeof setTimeout>

    const update = () => {
      const r = getSpotlightRect(step.targetId!)
      if (r) {
        const el = document.querySelector(`[data-tutorial-id="${step.targetId}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        setSpotRect(r)
      } else if (retries < 15) {
        retries++
        retryTimer = setTimeout(update, 80)
      } else {
        setSpotRect(null)
      }
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearTimeout(retryTimer)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, stepIdx, pathname])

  const close = useCallback(() => {
    localStorage.setItem(TUTORIAL_DONE_KEY, '1')
    localStorage.removeItem(TUTORIAL_STEP_KEY)
    setActive(false)
  }, [])

  const next = useCallback(() => {
    const currentStep = STEPS[stepIdxRef.current]
    if (stepIdxRef.current >= STEPS.length - 1) {
      close()
      return
    }
    if (currentStep?.navigateOnNext) {
      router.push(currentStep.navigateOnNext)
    }
    setStepIdx(s => s + 1)
  }, [close, router])

  const prev = useCallback(() => {
    if (stepIdxRef.current > 0) setStepIdx(s => s - 1)
  }, [])

  // Listen for custom tutorial-action events (vocab-loaded, vocab-activated, etc.)
  useEffect(() => {
    if (!active) return
    const step = STEPS[stepIdx]
    if (!step.waitFor) return

    function handler(e: Event) {
      const ce = e as CustomEvent
      if (ce.detail?.action === step.waitFor) {
        next()
      }
    }

    window.addEventListener('tutorial-action', handler)
    return () => window.removeEventListener('tutorial-action', handler)
  }, [active, stepIdx, next])

  if (!mounted || !active) return null

  const step = STEPS[stepIdx]
  if (!step) return null

  const txt = (ml: ML) => ml[lang] ?? ml['es'] ?? ''
  const isLast = stepIdx === STEPS.length - 1
  const isMobile = window.innerWidth < 640

  const skipLabel = { es: 'Saltar tutorial', ca: 'Saltar tutorial', en: 'Skip tutorial', ja: 'スキップ' }[lang] ?? 'Saltar'
  const nextLabel = { es: 'Siguiente →', ca: 'Següent →', en: 'Next →', ja: '次へ →' }[lang] ?? 'Siguiente →'
  const backLabel = { es: '← Atrás', ca: '← Enrere', en: '← Back', ja: '← 戻る' }[lang] ?? '← Atrás'
  const finishLabel = { es: '🎉 ¡Empezar!', ca: '🎉 Endavant!', en: '🎉 Get started!', ja: '🎉 さあ始めよう！' }[lang] ?? '🎉 ¡Empezar!'
  const waitLabel = {
    es: '⏳ Realiza la acción indicada para continuar...',
    ca: '⏳ Realitza l\'acció indicada per continuar...',
    en: '⏳ Perform the action above to continue...',
    ja: '⏳ 上記の操作をして続けてください...',
  }[lang] ?? '⏳ Realiza la acción...'

  const PAD = 8
  const spotlightStyle: React.CSSProperties = spotRect ? {
    position: 'fixed',
    top: spotRect.top - PAD,
    left: spotRect.left - PAD,
    width: spotRect.width + PAD * 2,
    height: spotRect.height + PAD * 2,
    borderRadius: 12,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.58), 0 0 0 3px #6366f1, 0 0 24px 8px rgba(99,102,241,0.35)',
    zIndex: 9998,
    pointerEvents: 'none',
  } : {}

  const TOOLTIP_W = isMobile ? Math.min(320, window.innerWidth - 32) : 340
  let tooltipStyle: React.CSSProperties

  if (!spotRect || step.pos === 'center') {
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: TOOLTIP_W,
    }
  } else if (isMobile) {
    tooltipStyle = {
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      width: TOOLTIP_W,
    }
  } else {
    const M = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    switch (step.pos) {
      case 'bottom':
        tooltipStyle = {
          position: 'fixed',
          top: Math.min(vh - 300, spotRect.top + spotRect.height + PAD + M),
          left: Math.max(M, Math.min(vw - TOOLTIP_W - M, spotRect.left + spotRect.width / 2 - TOOLTIP_W / 2)),
          width: TOOLTIP_W,
        }
        break
      case 'top':
        tooltipStyle = {
          position: 'fixed',
          bottom: Math.max(M, vh - (spotRect.top - PAD - M)),
          left: Math.max(M, Math.min(vw - TOOLTIP_W - M, spotRect.left + spotRect.width / 2 - TOOLTIP_W / 2)),
          width: TOOLTIP_W,
        }
        break
      case 'right':
        tooltipStyle = {
          position: 'fixed',
          top: Math.max(M, Math.min(vh - 300, spotRect.top + spotRect.height / 2 - 120)),
          left: Math.min(vw - TOOLTIP_W - M, spotRect.left + spotRect.width + PAD + M),
          width: TOOLTIP_W,
        }
        break
      case 'left':
        tooltipStyle = {
          position: 'fixed',
          top: Math.max(M, Math.min(vh - 300, spotRect.top + spotRect.height / 2 - 120)),
          right: Math.max(M, vw - (spotRect.left - PAD - M)),
          width: TOOLTIP_W,
        }
        break
      default:
        tooltipStyle = {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: TOOLTIP_W,
        }
    }
  }

  const progress = ((stepIdx + 1) / STEPS.length) * 100

  return createPortal(
    <>
      {/* Backdrop — click to skip */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9996, background: spotRect ? 'transparent' : 'rgba(0,0,0,0.58)' }}
        onClick={close}
      />

      {/* Spotlight ring */}
      {spotRect && <div style={spotlightStyle} />}

      {/* Tooltip card */}
      <div
        style={{ ...tooltipStyle, zIndex: 9999 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">
              {stepIdx + 1} / {STEPS.length}
            </span>
            <button
              onClick={close}
              className="text-xs text-slate-400 hover:text-slate-600 transition underline"
            >
              {skipLabel}
            </button>
          </div>

          {/* Title */}
          <h3 className="font-bold text-slate-800 text-base mb-2">{txt(step.title)}</h3>

          {/* Body */}
          <p className="text-slate-500 text-sm leading-relaxed mb-4">{txt(step.body)}</p>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {stepIdx > 0 && !step.waitFor && (
              <button
                onClick={prev}
                className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 transition shrink-0"
              >
                {backLabel}
              </button>
            )}

            {step.waitFor ? (
              <div className="flex-1 py-2 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                {waitLabel}
              </div>
            ) : (
              <button
                onClick={next}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
              >
                {isLast ? finishLabel : nextLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
