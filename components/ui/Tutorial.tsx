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
  route?: string
  navigateTo?: string
  pos: 'center' | 'top' | 'bottom' | 'right' | 'left'
  title: ML
  body: ML
}

const STEPS: StepDef[] = [
  {
    id: 'welcome',
    targetId: null,
    pos: 'center',
    title: {
      es: '¡Bienvenido! 🌸',
      ca: 'Benvingut! 🌸',
      en: 'Welcome! 🌸',
      ja: 'ようこそ！🌸',
    },
    body: {
      es: 'Aprende kanji con repetición espaciada e inteligencia artificial. En unos pocos pasos te explicamos cómo funciona.',
      ca: 'Aprèn kanji amb repetició espaïda i intel·ligència artificial. En uns pocs passos t\'expliquem com funciona.',
      en: 'Learn kanji with spaced repetition and AI. In a few steps we\'ll show you how it works.',
      ja: '間隔反復とAIで漢字を学びましょう。数ステップで使い方を説明します。',
    },
  },
  {
    id: 'vocabulary-nav',
    targetId: 'nav-vocabulary',
    navigateTo: '/vocabulary',
    pos: 'right',
    title: {
      es: '1 · Ve a Vocabulario 📚',
      ca: '1 · Ves a Vocabulari 📚',
      en: '1 · Go to Vocabulary 📚',
      ja: '1 · 語彙へ移動 📚',
    },
    body: {
      es: 'Empieza por la sección Vocabulario. Aquí cargarás las palabras que vas a estudiar, organizadas por curso y kanji.',
      ca: 'Comença per la secció Vocabulari. Aquí carregaràs les paraules que estudiaràs, organitzades per curs i kanji.',
      en: 'Start with the Vocabulary section. Here you\'ll load the words you\'re going to study, organized by grade and kanji.',
      ja: '語彙セクションから始めましょう。学習する単語を学年・漢字別に読み込みます。',
    },
  },
  {
    id: 'load-vocab',
    targetId: 'vocab-load-controls',
    route: '/vocabulary',
    pos: 'bottom',
    title: {
      es: '2 · Elige el curso y la cantidad 📥',
      ca: '2 · Tria el curs i la quantitat 📥',
      en: '2 · Choose grade and amount 📥',
      ja: '2 · 学年と数量を選ぶ 📥',
    },
    body: {
      es: 'Selecciona el curso (nivel) y la cantidad de kanjis que quieres estudiar esta sesión. Luego pulsa el botón azul "Cargar" para ver las palabras.',
      ca: 'Selecciona el curs (nivell) i la quantitat de kanjis que vols estudiar aquesta sessió. Després prem el botó blau "Carregar" per veure les paraules.',
      en: 'Select the grade and the number of kanji for this session. Then press the blue "Load" button to see the words.',
      ja: '学年と今回学習する漢字数を選んでください。青い「読み込む」ボタンを押すと単語が表示されます。',
    },
  },
  {
    id: 'mark-known',
    targetId: 'vocab-load-controls',
    route: '/vocabulary',
    pos: 'bottom',
    title: {
      es: '3 · Opcional: descarta las que ya sabes ✓',
      ca: '3 · Opcional: descarta les que ja saps ✓',
      en: '3 · Optional: discard what you know ✓',
      ja: '3 · 任意：知っている単語をスキップ ✓',
    },
    body: {
      es: 'Después de cargar, puedes marcar con "Ya lo sé" las palabras que ya conoces para excluirlas. O usa "Dominar Kanji Completo" para saltarte todo un kanji de golpe.',
      ca: 'Després de carregar, pots marcar amb "Ja me la sé" les paraules que ja coneixes per excloure-les. O usa "Dominar Kanji Complet" per saltar-te tot un kanji d\'una vegada.',
      en: 'After loading, you can mark words you already know with "I already know it" to exclude them. Or use "Master Full Kanji" to skip an entire kanji at once.',
      ja: '読み込んだ後、知っている単語に「もう知っている」をつけて除外できます。「漢字を完全習得」で漢字全体を一度にスキップすることも可能です。',
    },
  },
  {
    id: 'activate',
    targetId: 'vocab-activate-btn',
    route: '/vocabulary',
    pos: 'top',
    title: {
      es: '4 · Añade las palabras a tus repasos 🚀',
      ca: '4 · Afegeix les paraules als teus repasos 🚀',
      en: '4 · Add words to your reviews 🚀',
      ja: '4 · 単語を復習に追加 🚀',
    },
    body: {
      es: 'Pulsa "Añadir a repasos" para activar el aprendizaje. El sistema programará automáticamente cuándo debes repasar cada palabra según tu progreso.',
      ca: 'Prem "Afegir als repasos" per activar l\'aprenentatge. El sistema programarà automàticament quan has de repassar cada paraula.',
      en: 'Press "Add to reviews" to start learning. The system will automatically schedule when to review each word based on your progress.',
      ja: '「復習に追加」を押して学習を開始しましょう。システムが進捗に応じて各単語の復習スケジュールを自動設定します。',
    },
  },
  {
    id: 'go-review',
    targetId: 'nav-review',
    navigateTo: '/review',
    pos: 'right',
    title: {
      es: '5 · Ir a Mis Repasos 📝',
      ca: '5 · Ves als Meus Repasos 📝',
      en: '5 · Go to My Reviews 📝',
      ja: '5 · 復習へ移動 📝',
    },
    body: {
      es: 'Ahora ve a "Mis Repasos" para empezar a estudiar. Aquí verás todas las palabras que tienes pendientes de repasar hoy.',
      ca: 'Ara ves als "Meus Repasos" per començar a estudiar. Aquí veuràs totes les paraules que tens pendents de repassar avui.',
      en: 'Now go to "My Reviews" to start studying. Here you\'ll see all the words pending review for today.',
      ja: '「復習」へ移動して学習を始めましょう。今日復習すべき単語がすべて表示されます。',
    },
  },
  {
    id: 'mode-select',
    targetId: 'review-mode-selector',
    route: '/review',
    pos: 'bottom',
    title: {
      es: '6 · Elige el tipo de repaso 🎯',
      ca: '6 · Tria el tipus de repàs 🎯',
      en: '6 · Choose the review type 🎯',
      ja: '6 · 復習タイプを選ぶ 🎯',
    },
    body: {
      es: 'Elige cómo practicar: lectura en hiragana, significado, escritura de kanji... Puedes combinar varios modos. Luego pulsa "Iniciar Repaso".',
      ca: 'Tria com practicar: lectura en hiragana, significat, escriptura de kanji... Pots combinar diversos modes. Després prem "Iniciar Repàs".',
      en: 'Choose how to practice: reading in hiragana, meaning, kanji writing... You can combine modes. Then press "Start Review".',
      ja: '練習方法を選びましょう：ひらがな読み・意味・漢字書き取りなど。複数組み合わせ可能。「復習を開始」を押してください。',
    },
  },
  {
    id: 'study',
    targetId: 'review-mode-selector',
    route: '/review',
    pos: 'top',
    title: {
      es: '7 · ¡A estudiar! 🧠',
      ca: '7 · A estudiar! 🧠',
      en: '7 · Time to study! 🧠',
      ja: '7 · 学習スタート！🧠',
    },
    body: {
      es: 'Responde las preguntas. Cuanto mejor respondas, más tiempo pasará hasta el próximo repaso. El sistema se adapta a ti para que memorices de forma eficiente a largo plazo.',
      ca: 'Respon les preguntes. Quant millor responguis, més temps fins al proper repàs. El sistema s\'adapta a tu perquè memoritzis de forma eficient a llarg termini.',
      en: 'Answer the questions. The better you respond, the longer until the next review. The system adapts to you for efficient long-term memorization.',
      ja: '問題に答えましょう。正確に答えるほど次の復習まで時間が延びます。効率的な長期記憶のためにシステムがあなたに適応します。',
    },
  },
  {
    id: 'calendar',
    targetId: 'header-forecast',
    pos: 'bottom',
    title: {
      es: '8 · Tu calendario de repasos 📅',
      ca: '8 · El teu calendari de repasos 📅',
      en: '8 · Your review calendar 📅',
      ja: '8 · 復習カレンダー 📅',
    },
    body: {
      es: 'Aquí puedes ver cuántos repasos tienes hoy y los próximos días. El sistema programa las palabras para que no se te olviden a largo plazo. ¡Ya estás listo para empezar!',
      ca: 'Aquí pots veure quants repasos tens avui i els propers dies. El sistema programa les paraules perquè no se\'t oblidin a llarg termini. Ja estàs a punt per començar!',
      en: 'Here you can see how many reviews you have today and upcoming days. The system schedules words so you don\'t forget them long-term. You\'re all set!',
      ja: '今日と今後の復習数がここで確認できます！システムが長期記憶のために単語をスケジューリングします。準備完了です！',
    },
  },
]

// Maps each route to the first step index that requires being on that route
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

  // Auto-advance when the user navigates (manually or via button) to a section
  useEffect(() => {
    if (!active) return
    const targetStep = ROUTE_TO_STEP[pathname]
    if (targetStep !== undefined && targetStep > stepIdxRef.current) {
      setStepIdx(targetStep)
    }
  }, [pathname, active])

  useEffect(() => {
    if (!active) return
    const step = STEPS[stepIdx]
    if (!step?.targetId) { setSpotRect(null); return }

    const update = () => {
      const r = getSpotlightRect(step.targetId!)
      if (r) {
        // scroll target into view first if needed
        const el = document.querySelector(`[data-tutorial-id="${step.targetId}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      setSpotRect(r)
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
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
    if (stepIdx >= STEPS.length - 1) {
      close()
    } else {
      setStepIdx(s => s + 1)
    }
  }, [stepIdx, close])

  const prev = useCallback(() => {
    if (stepIdx > 0) setStepIdx(s => s - 1)
  }, [stepIdx])

  if (!mounted || !active) return null

  const step = STEPS[stepIdx]
  if (!step) return null

  const txt = (ml: ML) => ml[lang] ?? ml['es'] ?? ''
  const isLast = stepIdx === STEPS.length - 1
  const isMobile = window.innerWidth < 640

  const needsNavigation = !!step.route && pathname !== step.route

  // Labels
  const skipLabel = { es: 'Saltar tutorial', ca: 'Saltar tutorial', en: 'Skip tutorial', ja: 'スキップ' }[lang] ?? 'Saltar'
  const nextLabel = { es: 'Siguiente →', ca: 'Següent →', en: 'Next →', ja: '次へ →' }[lang] ?? 'Siguiente →'
  const backLabel = { es: '← Atrás', ca: '← Enrere', en: '← Back', ja: '← 戻る' }[lang] ?? '← Atrás'
  const finishLabel = { es: '🎉 ¡Empezar!', ca: '🎉 Endavant!', en: '🎉 Get started!', ja: '🎉 さあ始めよう！' }[lang] ?? '🎉 ¡Empezar!'
  const goLabel = { es: 'Ir ahí →', ca: 'Anar-hi →', en: 'Go there →', ja: 'そこへ →' }[lang] ?? 'Ir ahí →'
  const navHint = {
    es: '👆 Navega a esta sección para continuar',
    ca: '👆 Navega a aquesta secció per continuar',
    en: '👆 Navigate to this section to continue',
    ja: '👆 このセクションに移動してください',
  }[lang] ?? '👆 Navega a esta sección'

  // Spotlight padding
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

  // Tooltip positioning
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
          top: Math.min(vh - 280, spotRect.top + spotRect.height + PAD + M),
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
          top: Math.max(M, Math.min(vh - 280, spotRect.top + spotRect.height / 2 - 120)),
          left: Math.min(vw - TOOLTIP_W - M, spotRect.left + spotRect.width + PAD + M),
          width: TOOLTIP_W,
        }
        break
      case 'left':
        tooltipStyle = {
          position: 'fixed',
          top: Math.max(M, Math.min(vh - 280, spotRect.top + spotRect.height / 2 - 120)),
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

          {/* Navigation hint */}
          {needsNavigation && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
              {navHint}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button
                onClick={prev}
                className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 transition shrink-0"
              >
                {backLabel}
              </button>
            )}

            {needsNavigation && step.navigateTo ? (
              <button
                onClick={() => router.push(step.navigateTo!)}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
              >
                {goLabel}
              </button>
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
