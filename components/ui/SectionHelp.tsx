'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TOUR_DONE_KEY } from '@/components/ui/ProductTour'

type ML = Record<string, string>

type HelpPoint = {
  icon: string
  title: ML
  body: ML
}

type SectionContent = {
  title: ML
  intro: ML
  points: HelpPoint[]
  /** Increment to force all users to re-see this section's tutorial. */
  version?: number
}

export const SECTION_SEEN_PREFIX = 'sectionhelp_v1_'

function getSectionSeenKey(section: string, version?: number) {
  const v = version && version > 1 ? `_v${version}` : ''
  return `${SECTION_SEEN_PREFIX}${section}${v}_seen`
}

const CARD_COLORS = [
  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800/30', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', title: 'text-indigo-900 dark:text-indigo-300', body: 'text-indigo-700 dark:text-indigo-400' },
  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', title: 'text-emerald-900 dark:text-emerald-300', body: 'text-emerald-700 dark:text-emerald-400' },
  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800/30', iconBg: 'bg-amber-100 dark:bg-amber-900/40', title: 'text-amber-900 dark:text-amber-300', body: 'text-amber-700 dark:text-amber-400' },
  { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-100 dark:border-rose-800/30', iconBg: 'bg-rose-100 dark:bg-rose-900/40', title: 'text-rose-900 dark:text-rose-300', body: 'text-rose-700 dark:text-rose-400' },
]

const HELP: Record<string, SectionContent> = {
  review: {
    title: { es: 'Mis Repasos', ca: 'Els meus Repasos', en: 'My Reviews', ja: '復習' },
    intro: {
      es: 'Aquí estudias las palabras que el sistema ha programado para hoy. Cuanto más aciertes, más tiempo pasa hasta el próximo repaso.',
      ca: 'Aquí estudies les paraules que el sistema ha programat per avui. Com més encerti, més temps passa fins al proper repàs.',
      en: 'Here you study the words the system has scheduled for today. The more you get right, the longer until the next review.',
      ja: 'ここでは今日のためにシステムがスケジュールした単語を学習します。正解するほど次の復習まで時間が延びます。',
    },
    points: [
      {
        icon: '🎯',
        title: { es: 'Modos de repaso', ca: 'Modes de repàs', en: 'Review modes', ja: '復習モード' },
        body: {
          es: 'Elige entre lectura en hiragana, significado, escritura del kanji o combínalos. Cada modo tiene su propio nivel independiente por palabra.',
          ca: 'Tria entre lectura en hiragana, significat, escriptura del kanji o combina\'ls. Cada mode té el seu propi nivell independent per paraula.',
          en: 'Choose hiragana reading, meaning, kanji writing, or combine them. Each mode has its own independent level per word.',
          ja: 'ひらがな読み・意味・漢字書き取りを選択または組み合わせ。各モードは単語ごとに独自のレベルを持ちます。',
        },
      },
      {
        icon: '📊',
        title: { es: 'Sistema de niveles', ca: 'Sistema de nivells', en: 'Level system', ja: 'レベルシステム' },
        body: {
          es: 'Cada palabra sube de nivel al acertar y baja al fallar. Nivel alto = más días hasta el próximo repaso. El objetivo es llegar a Maestro (nivel 7).',
          ca: 'Cada paraula puja de nivell en encertar i baixa en fallar. Nivell alt = més dies fins al proper repàs. L\'objectiu és arribar a Mestre (nivell 7).',
          en: 'Each word levels up when correct and down when wrong. Higher level = more days until next review. The goal is Master (level 7).',
          ja: '正解でレベルアップ、不正解でダウン。レベルが高いほど次の復習まで日数が増えます。目標はマスター（レベル7）です。',
        },
      },
      {
        icon: '📅',
        title: { es: 'Cuándo estudiar', ca: 'Quan estudiar', en: 'When to study', ja: 'いつ学習するか' },
        body: {
          es: 'Estudia solo lo que toca hoy. La constancia diaria es más eficaz que sesiones largas esporádicas.',
          ca: 'Estudia només el que toca avui. La constància diària és més eficaç que sessions llargues esporàdiques.',
          en: 'Study only what\'s due today. Daily consistency is more effective than occasional long sessions.',
          ja: '今日の分だけ学習しましょう。毎日の継続が不定期な長時間学習より効果的です。',
        },
      },
      {
        icon: '🔄',
        title: { es: 'Práctica libre', ca: 'Pràctica lliure', en: 'Free practice', ja: '自由練習' },
        body: {
          es: 'Practica sin afectar los niveles SRS. Útil para repasar palabras ya conocidas sin alterar el sistema de programación.',
          ca: 'Practica sense afectar els nivells SRS. Útil per repassar paraules ja conegudes sense alterar el sistema de programació.',
          en: 'Practice without affecting SRS levels. Useful to review already-known words without altering the scheduling system.',
          ja: 'SRSレベルに影響せずに練習できます。スケジュールを変えずに既習単語を復習するのに便利です。',
        },
      },
    ],
  },

  vocabulary: {
    title: { es: 'Vocabulario', ca: 'Vocabulari', en: 'Vocabulary', ja: '語彙' },
    intro: {
      es: 'Importa vocabulario oficial del currículo japonés. Selecciona el curso y la cantidad, carga las palabras y añádelas a tus repasos.',
      ca: 'Importa vocabulari oficial del currículum japonès. Selecciona el curs i la quantitat, carrega les paraules i afegeix-les als teus repasos.',
      en: 'Import official vocabulary from the Japanese curriculum. Select grade and amount, load the words and add them to your reviews.',
      ja: '日本の公式カリキュラムから語彙をインポート。学年と数量を選んで単語を読み込み、復習に追加しましょう。',
    },
    points: [
      {
        icon: '🏫',
        title: { es: 'Selecciona el curso', ca: 'Selecciona el curs', en: 'Select the grade', ja: '学年を選ぶ' },
        body: {
          es: 'Elige entre 1.º, 2.º y 3.º de primaria. Puedes ver cuántos kanjis y palabras tiene cada curso y cuántos te quedan por aprender.',
          ca: 'Tria entre 1r, 2n i 3r de primària. Pots veure quants kanjis i paraules té cada curs i quants et queden per aprendre.',
          en: 'Choose from 1st, 2nd, or 3rd grade. See how many kanji and words each grade has and how many you have left to learn.',
          ja: '1・2・3年生から選択。各学年の漢字と単語数、残りの学習数を確認できます。',
        },
      },
      {
        icon: '📦',
        title: { es: 'Cantidad de kanjis', ca: 'Quantitat de kanjis', en: 'Number of kanji', ja: '漢字の数' },
        body: {
          es: '3 kanjis (sesión rápida), 5 kanjis (sesión normal) o 15 kanjis (sesión completa). Empieza por poco si estás empezando.',
          ca: '3 kanjis (sessió ràpida), 5 kanjis (sessió normal) o 15 kanjis (sessió completa). Comença per poc si estàs començant.',
          en: '3 kanji (quick session), 5 kanji (normal), or 15 kanji (full session). Start small if you\'re just beginning.',
          ja: '3漢字（クイック）・5漢字（通常）・15漢字（フルセッション）。初めての方は少なめから。',
        },
      },
      {
        icon: '✓',
        title: { es: 'Ya me la sé', ca: 'Ja me la sé', en: 'I already know it', ja: 'もう知っている' },
        body: {
          es: 'Tras cargar, excluye palabras que ya conoces pulsando "Ya me la sé". También puedes dominar un kanji completo de golpe.',
          ca: 'Després de carregar, exclou paraules que ja coneixes prement "Ja me la sé". També pots dominar un kanji complet d\'una vegada.',
          en: 'After loading, exclude words you know with "I already know it". You can also master an entire kanji at once.',
          ja: '読み込み後、「もう知っている」で知っている単語を除外。漢字全体を一度に習得することも可能です。',
        },
      },
      {
        icon: '🔍',
        title: { es: 'Buscar', ca: 'Cercar', en: 'Search', ja: '検索' },
        body: {
          es: 'Usa la barra de búsqueda para encontrar cualquier kanji, palabra o significado y añadirlo directamente a tus repasos.',
          ca: 'Usa la barra de cerca per trobar qualsevol kanji, paraula o significat i afegir-lo directament als teus repasos.',
          en: 'Use the search bar to find any kanji, word, or meaning and add it directly to your reviews.',
          ja: '検索バーで任意の漢字・単語・意味を探して直接復習に追加できます。',
        },
      },
    ],
  },

  grammar: {
    version: 2,
    title: { es: 'Gramática', ca: 'Gramàtica', en: 'Grammar', ja: '文法' },
    intro: {
      es: 'Explora los puntos gramaticales de Minna no Nihongo organizados por lección. Ahora incluye práctica tipo BunPro con IA y SRS propio para gramática.',
      ca: 'Explora els punts gramaticals de Minna no Nihongo organitzats per lliçó. Ara inclou pràctica estil BunPro amb IA i SRS propi per a gramàtica.',
      en: 'Explore grammar points from Minna no Nihongo by lesson. Now includes BunPro-style AI practice and a dedicated SRS for grammar.',
      ja: 'Minna no Nihongoの文法ポイントを課別に探索。BunProスタイルのAI練習と文法専用SRSを新搭載。',
    },
    points: [
      {
        icon: '🏋️',
        title: { es: 'Práctica fill-in-the-blank', ca: 'Pràctica d\'ompliment de buits', en: 'Fill-in-the-blank practice', ja: '穴埋め練習' },
        body: {
          es: 'Haz clic en un punto gramatical y pulsa 🏋️ para practicarlo. La IA genera frases con un hueco que debes completar con la gramática correcta. Puedes escribir en romaji y se convierte automáticamente a hiragana.',
          ca: 'Fes clic en un punt gramatical i prem 🏋️ per practicar-lo. La IA genera frases amb un buit que has d\'omplir amb la gramàtica correcta. Pots escriure en romaji i es converteix automàticament a hiragana.',
          en: 'Click a grammar point and tap 🏋️ to practice it. AI generates sentences with a blank you must fill with the correct grammar. You can type in romaji — it auto-converts to hiragana.',
          ja: '文法ポイントをクリックして🏋️を押して練習。AIが空欄のある文を生成し、正しい文法で埋めます。ローマ字入力でひらがなに自動変換されます。',
        },
      },
      {
        icon: '🤖',
        title: { es: 'Frases verificadas por IA', ca: 'Frases verificades per IA', en: 'AI-verified sentences', ja: 'AI検証済み文' },
        body: {
          es: 'Cada vez que generas frases, la IA produce 38 y filtra automáticamente las que no tienen coherencia o naturalidad (puntuación < 4/5). Solo las mejores se guardan en tu pool de práctica.',
          ca: 'Cada vegada que generates frases, la IA en produeix 38 i filtra automàticament les que no tenen coherència o naturalitat (puntuació < 4/5). Només les millors es guarden al teu pool de pràctica.',
          en: 'Each time you generate sentences, AI produces 38 and automatically filters out incoherent or unnatural ones (score < 4/5). Only the best ones are saved to your practice pool.',
          ja: '文を生成するたびに、AIは38文を作成し、一貫性や自然さのないもの（スコア＜4/5）を自動的にフィルタリング。最高品質のものだけが練習プールに保存されます。',
        },
      },
      {
        icon: '⏰',
        title: { es: 'SRS para gramática', ca: 'SRS per a gramàtica', en: 'Grammar SRS', ja: '文法SRS' },
        body: {
          es: 'Cada punto gramatical tiene su propio SRS (8 niveles). Acertar ≥60% en una sesión sube el nivel; fallar más baja el nivel. Un banner en la lista te avisa cuando tienes gramática pendiente de repaso.',
          ca: 'Cada punt gramatical té el seu propi SRS (8 nivells). Encertar ≥60% en una sessió puja el nivell; fallar més el baixa. Un bàner a la llista t\'avisa quan tens gramàtica pendent de repàs.',
          en: 'Each grammar point has its own SRS (8 levels). Getting ≥60% in a session levels up; failing more levels down. A banner in the list alerts you when grammar reviews are due.',
          ja: '各文法ポイントは独自のSRS（8レベル）を持ちます。セッションで60%以上正解するとレベルアップ、より多く失敗するとレベルダウン。リストのバナーが復習期限を知らせます。',
        },
      },
      {
        icon: '🏷️',
        title: { es: 'Filtros, búsqueda y progreso', ca: 'Filtres, cerca i progrés', en: 'Filters, search & progress', ja: 'フィルター・検索・進捗' },
        body: {
          es: 'Filtra por nivel JLPT (N5/N4), oculta los puntos dominados o busca por patrón. La barra superior muestra tu progreso global. Pulsa ✅ en cualquier tarjeta para marcar un punto como dominado.',
          ca: 'Filtra per nivell JLPT (N5/N4), amaga els punts dominats o cerca per patró. La barra superior mostra el teu progrés global. Prem ✅ a qualsevol targeta per marcar un punt com a dominat.',
          en: 'Filter by JLPT level (N5/N4), hide mastered points or search by pattern. The top bar shows your global progress. Tap ✅ on any card to mark a point as mastered.',
          ja: 'JLPTレベルでフィルタリング、習得済みを非表示、またはパターン検索。上部バーで全体の進捗を確認。✅を押してポイントを習得済みにマーク。',
        },
      },
    ],
  },

  context: {
    title: { es: 'Contexto IA', ca: 'Context IA', en: 'AI Context', ja: 'AI文脈' },
    intro: {
      es: 'Genera textos en japonés que usen tu vocabulario aprendido. Practica la lectura en contexto real con furigana y traducción.',
      ca: 'Genera textos en japonès que usin el teu vocabulari après. Practica la lectura en context real amb furigana i traducció.',
      en: 'Generate Japanese texts using your learned vocabulary. Practice reading in real context with furigana and translation.',
      ja: '学習した語彙を使った日本語テキストを生成。ふりがなと翻訳付きで実際のコンテキストでの読解を練習できます。',
    },
    points: [
      {
        icon: '✨',
        title: { es: 'Generar texto', ca: 'Generar text', en: 'Generate text', ja: 'テキスト生成' },
        body: {
          es: 'Elige un tema (vida cotidiana, viajes, comida...) y una dificultad (N5-N4, N4-N3, N3-N2). El sistema usará tu vocabulario activo para crear el texto.',
          ca: 'Tria un tema (vida quotidiana, viatges, menjar...) i una dificultat (N5-N4, N4-N3, N3-N2). El sistema usarà el teu vocabulari actiu per crear el text.',
          en: 'Choose a topic (daily life, travel, food...) and a difficulty (N5-N4, N4-N3, N3-N2). The system will use your active vocabulary to create the text.',
          ja: 'テーマと難易度（N5-N4・N4-N3・N3-N2）を選択。システムがあなたのアクティブ語彙を使ってテキストを作成します。',
        },
      },
      {
        icon: '🈶',
        title: { es: 'Furigana', ca: 'Furigana', en: 'Furigana', ja: 'ふりがな' },
        body: {
          es: 'Activa o desactiva el furigana. También puedes mostrar solo el furigana de los kanjis que aún no tienes en tu lista de estudio.',
          ca: 'Activa o desactiva el furigana. També pots mostrar només el furigana dels kanjis que encara no tens a la teva llista d\'estudi.',
          en: 'Toggle furigana on or off. You can also show furigana only for kanji not yet in your study list.',
          ja: 'ふりがなのオン/オフを切り替え。学習リストにまだない漢字のふりがなだけ表示することも可能です。',
        },
      },
      {
        icon: '🌐',
        title: { es: 'Traducciones', ca: 'Traduccions', en: 'Translations', ja: '翻訳' },
        body: {
          es: 'Consulta la traducción al español, catalán o inglés cuando quieras. Intenta leer primero sin mirar.',
          ca: 'Consulta la traducció al castellà, català o anglès quan vulguis. Intenta llegir primer sense mirar.',
          en: 'Check the Spanish, Catalan, or English translation whenever you want. Try to read first without looking.',
          ja: 'スペイン語・カタルーニャ語・英語の翻訳をいつでも確認できます。まず翻訳なしで読んでみましょう。',
        },
      },
      {
        icon: '🔑',
        title: { es: 'API key necesaria', ca: 'API key necessària', en: 'API key required', ja: 'APIキーが必要' },
        body: {
          es: 'Esta función requiere una API key gratuita de Google Gemini. Configúrala en Mi Perfil. El historial guarda las últimas 10 frases generadas.',
          ca: 'Aquesta funció requereix una API key gratuïta de Google Gemini. Configura-la a El meu Perfil. L\'historial guarda les últimes 10 frases generades.',
          en: 'This feature requires a free Google Gemini API key. Set it up in My Profile. The history saves the last 10 generated texts.',
          ja: 'この機能には無料のGoogle Gemini APIキーが必要です。マイプロフィールで設定してください。履歴は最後の10件を保存します。',
        },
      },
    ],
  },

  progress: {
    title: { es: 'Progreso', ca: 'Progrés', en: 'Progress', ja: '進捗' },
    intro: {
      es: 'Consulta el nivel de cada palabra en cada modo de repaso y cuándo tienes programado el próximo repaso.',
      ca: 'Consulta el nivell de cada paraula en cada mode de repàs i quan tens programat el proper repàs.',
      en: 'Check each word\'s level in each review mode and when the next review is scheduled.',
      ja: '各復習モードでの各単語のレベルと次の復習スケジュールを確認できます。',
    },
    points: [
      {
        icon: '📊',
        title: { es: 'Niveles por modo', ca: 'Nivells per mode', en: 'Levels by mode', ja: 'モード別レベル' },
        body: {
          es: 'Cada palabra tiene un nivel independiente para lectura, significado y escritura. Puedes ser experto en lectura y novato en escritura de la misma palabra.',
          ca: 'Cada paraula té un nivell independent per a lectura, significat i escriptura. Pots ser expert en lectura i novell en escriptura de la mateixa paraula.',
          en: 'Each word has an independent level for reading, meaning, and writing. You can be expert at reading and beginner at writing the same word.',
          ja: '各単語は読み・意味・書き取りで独立したレベルを持ちます。同じ単語で読みは上級、書き取りは初級ということが可能です。',
        },
      },
      {
        icon: '🔍',
        title: { es: 'Filtrar y ordenar', ca: 'Filtrar i ordenar', en: 'Filter and sort', ja: 'フィルターと並べ替え' },
        body: {
          es: 'Busca palabras concretas, filtra por modo de repaso u ordena por nivel o fecha del próximo repaso.',
          ca: 'Cerca paraules concretes, filtra per mode de repàs o ordena per nivell o data del proper repàs.',
          en: 'Search for specific words, filter by review mode, or sort by level or next review date.',
          ja: '特定の単語を検索、復習モードでフィルタリング、レベルや次回復習日でソートできます。',
        },
      },
      {
        icon: '🏆',
        title: { es: 'Etapas de aprendizaje', ca: 'Etapes d\'aprenentatge', en: 'Learning stages', ja: '学習ステージ' },
        body: {
          es: 'Novato (0) → Aprendiz → Iniciado → Experto → Avanzado → Veterano → Maestro (7). Al llegar a Maestro, el repaso se programa para dentro de 30 días.',
          ca: 'Novell (0) → Aprenent → Iniciat → Expert → Avançat → Veterà → Mestre (7). En arribar a Mestre, el repàs es programa per d\'aquí a 30 dies.',
          en: 'Novice (0) → Apprentice → Initiate → Expert → Advanced → Veteran → Master (7). At Master, the next review is scheduled 30 days out.',
          ja: '初心者(0)→見習い→入門→専門家→上級→熟練→マスター(7)。マスターに到達すると次の復習は30日後にスケジュールされます。',
        },
      },
    ],
  },

  profile: {
    title: { es: 'Mi Perfil', ca: 'El meu Perfil', en: 'My Profile', ja: 'マイプロフィール' },
    intro: {
      es: 'Gestiona tu cuenta, configura las funciones de IA, cambia el idioma y realiza copias de seguridad de tu progreso.',
      ca: 'Gestiona el teu compte, configura les funcions d\'IA, canvia l\'idioma i realitza còpies de seguretat del teu progrés.',
      en: 'Manage your account, configure AI features, change the language, and back up your progress.',
      ja: 'アカウントを管理し、AI機能を設定し、言語を変更し、進捗をバックアップします。',
    },
    points: [
      {
        icon: '☁️',
        title: { es: 'Cuenta y sincronización', ca: 'Compte i sincronització', en: 'Account & sync', ja: 'アカウントと同期' },
        body: {
          es: 'Inicia sesión para sincronizar tu progreso en todos tus dispositivos. Tu vocabulario y repasos se guardan automáticamente en la nube.',
          ca: 'Inicia sessió per sincronitzar el teu progrés en tots els teus dispositius. El teu vocabulari i repasos es guarden automàticament al núvol.',
          en: 'Sign in to sync your progress across all your devices. Your vocabulary and reviews are automatically saved to the cloud.',
          ja: 'ログインしてすべてのデバイスで進捗を同期。語彙と復習履歴は自動的にクラウドに保存されます。',
        },
      },
      {
        icon: '🔑',
        title: { es: 'API de Google Gemini', ca: 'API de Google Gemini', en: 'Google Gemini API', ja: 'Google Gemini API' },
        body: {
          es: 'Para usar las funciones de IA (textos en contexto y explicaciones de gramática) necesitas una API key gratuita de Google AI Studio.',
          ca: 'Per usar les funcions d\'IA (textos en context i explicacions de gramàtica) necessites una API key gratuïta de Google AI Studio.',
          en: 'To use AI features (context texts and grammar explanations) you need a free API key from Google AI Studio.',
          ja: 'AI機能（文脈テキストと文法解説）を使用するには、Google AI Studioの無料APIキーが必要です。',
        },
      },
      {
        icon: '🌐',
        title: { es: 'Idioma', ca: 'Idioma', en: 'Language', ja: '言語' },
        body: {
          es: 'Cambia el idioma de la interfaz entre español, catalán, inglés y japonés. Afecta a todos los textos de la aplicación.',
          ca: 'Canvia l\'idioma de la interfície entre castellà, català, anglès i japonès. Afecta tots els textos de l\'aplicació.',
          en: 'Change the interface language between Spanish, Catalan, English, and Japanese. Affects all text in the app.',
          ja: 'インターフェース言語をスペイン語・カタルーニャ語・英語・日本語に変更。アプリ全体のテキストに影響します。',
        },
      },
      {
        icon: '💾',
        title: { es: 'Copia de seguridad', ca: 'Còpia de seguretat', en: 'Backup', ja: 'バックアップ' },
        body: {
          es: 'Exporta tu progreso como archivo JSON o importa uno anterior para restaurarlo. Útil para migrar entre dispositivos.',
          ca: 'Exporta el teu progrés com a fitxer JSON o importa\'n un d\'anterior per restaurar-lo. Útil per migrar entre dispositius.',
          en: 'Export your progress as a JSON file or import a previous one to restore it. Useful for migrating between devices.',
          ja: '進捗をJSONファイルとしてエクスポート、または以前のものをインポートして復元できます。デバイス間の移行に便利です。',
        },
      },
    ],
  },
}

type Props = {
  section: keyof typeof HELP
  lang: string
}

export default function SectionHelp({ section, lang }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      const tutorialDone = localStorage.getItem(TOUR_DONE_KEY)
      const sectionSeen = localStorage.getItem(getSectionSeenKey(section, content?.version))
      // Don't show if ProductTour is still in progress (phase key present = not done yet)
      const tourInProgress = localStorage.getItem('kanji_tour_v3_phase') !== null
      if (tutorialDone && !sectionSeen && !tourInProgress) {
        const timer = setTimeout(() => setOpen(true), 500)
        return () => clearTimeout(timer)
      }
    } catch {}
  }, [mounted, section])

  const content = HELP[section]
  if (!content) return null

  const txt = (ml: ML) => ml[lang] ?? ml['es'] ?? ''

  function handleClose() {
    try {
      localStorage.setItem(getSectionSeenKey(section, content?.version), '1')
    } catch {}
    setOpen(false)
  }

  const helpLabel = { es: 'Ayuda', ca: 'Ajuda', en: 'Help', ja: 'ヘルプ' }[lang] ?? 'Ayuda'
  const closeLabel = { es: 'Cerrar', ca: 'Tancar', en: 'Close', ja: '閉じる' }[lang] ?? 'Cerrar'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={helpLabel}
        className="w-6 h-6 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 text-xs font-bold flex items-center justify-center transition shrink-0"
      >
        ?
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">{txt(content.title)}</h2>
              <button
                onClick={handleClose}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition text-lg leading-none"
                aria-label={closeLabel}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Intro */}
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{txt(content.intro)}</p>

              {/* Feature cards */}
              <div className="space-y-3">
                {content.points.map((point, i) => {
                  const c = CARD_COLORS[i % CARD_COLORS.length]
                  return (
                    <div key={i} className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${c.iconBg}`}>
                          {point.icon}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm mb-1 ${c.title}`}>{txt(point.title)}</p>
                          <p className={`text-xs leading-relaxed ${c.body}`}>{txt(point.body)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition mt-2"
              >
                {closeLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
