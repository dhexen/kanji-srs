'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

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
}

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
          ja: 'ひらがな読み・意味・漢字書き取りを選択、または組み合わせ可能。各モードは単語ごとに独自のレベルを持ちます。',
        },
      },
      {
        icon: '📊',
        title: { es: 'Sistema de niveles', ca: 'Sistema de nivells', en: 'Level system', ja: 'レベルシステム' },
        body: {
          es: 'Cada palabra sube de nivel al acertar y baja al fallar. Nivel alto = más días hasta el próximo repaso. El objetivo es llegar a Maestro (nivel 7).',
          ca: 'Cada paraula puja de nivell en encertar i baixa en fallar. Nivell alt = més dies fins al proper repàs. L\'objectiu és arribar a Mestre (nivell 7).',
          en: 'Each word levels up when correct and down when wrong. Higher level = more days until next review. The goal is to reach Master (level 7).',
          ja: '正解でレベルアップ、不正解でダウン。レベルが高いほど次の復習まで日数が増えます。目標はマスター（レベル7）に到達することです。',
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
          ja: 'SRSレベルに影響せずに練習できます。スケジュールシステムを変えずに既習単語を復習するのに便利です。',
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
      ja: '日本の公式カリキュラムから語彙をインポートします。学年と数量を選んで単語を読み込み、復習に追加しましょう。',
    },
    points: [
      {
        icon: '🏫',
        title: { es: 'Selecciona el curso', ca: 'Selecciona el curs', en: 'Select the grade', ja: '学年を選ぶ' },
        body: {
          es: 'Elige entre 1.º, 2.º y 3.º de primaria. Puedes ver cuántos kanjis y palabras tiene cada curso y cuántos te quedan por aprender.',
          ca: 'Tria entre 1r, 2n i 3r de primària. Pots veure quants kanjis i paraules té cada curs i quants et queden per aprendre.',
          en: 'Choose from 1st, 2nd, or 3rd grade. You can see how many kanji and words each grade has and how many you have left to learn.',
          ja: '1・2・3年生から選択。各学年の漢字と単語数、残りの学習数を確認できます。',
        },
      },
      {
        icon: '📦',
        title: { es: 'Cantidad', ca: 'Quantitat', en: 'Amount', ja: '数量' },
        body: {
          es: '3 kanjis (sesión rápida), 5 kanjis (sesión normal) o 15 kanjis (sesión completa). Empieza por poco si estás empezando.',
          ca: '3 kanjis (sessió ràpida), 5 kanjis (sessió normal) o 15 kanjis (sessió completa). Comença per poc si estàs començant.',
          en: '3 kanji (quick session), 5 kanji (normal session), or 15 kanji (full session). Start small if you\'re just beginning.',
          ja: '3漢字（クイックセッション）、5漢字（通常）、15漢字（フルセッション）。初めての方は少なめから始めましょう。',
        },
      },
      {
        icon: '✓',
        title: { es: 'Ya me la sé', ca: 'Ja me la sé', en: 'I already know it', ja: 'もう知っている' },
        body: {
          es: 'Tras cargar, puedes excluir palabras que ya conoces. También puedes dominar un kanji completo de golpe.',
          ca: 'Després de carregar, pots excloure paraules que ja coneixes. També pots dominar un kanji complet d\'una vegada.',
          en: 'After loading, you can exclude words you already know. You can also master an entire kanji at once.',
          ja: '読み込み後、すでに知っている単語を除外できます。漢字全体を一度に習得することも可能です。',
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
    title: { es: 'Gramática', ca: 'Gramàtica', en: 'Grammar', ja: '文法' },
    intro: {
      es: 'Explora los puntos gramaticales de Minna no Nihongo 1, organizados por lección y nivel JLPT. Marca los que ya dominas y consulta explicaciones con IA.',
      ca: 'Explora els punts gramaticals de Minna no Nihongo 1, organitzats per lliçó i nivell JLPT. Marca els que ja domines i consulta explicacions amb IA.',
      en: 'Explore grammar points from Minna no Nihongo 1, organized by lesson and JLPT level. Mark the ones you master and get AI explanations.',
      ja: 'Minna no Nihongo 1の文法ポイントを課とJLPTレベル別に探索。習得済みをマークして、AI解説を参照できます。',
    },
    points: [
      {
        icon: '🏷️',
        title: { es: 'Filtros y búsqueda', ca: 'Filtres i cerca', en: 'Filters and search', ja: 'フィルターと検索' },
        body: {
          es: 'Filtra por nivel JLPT (N5/N4), oculta los puntos ya dominados o busca por patrón o nombre en cualquier idioma.',
          ca: 'Filtra per nivell JLPT (N5/N4), amaga els punts ja dominats o cerca per patró o nom en qualsevol idioma.',
          en: 'Filter by JLPT level (N5/N4), hide already mastered points, or search by pattern or name in any language.',
          ja: 'JLPTレベル（N5/N4）でフィルタリング、習得済みを非表示、または任意の言語でパターンや名前で検索できます。',
        },
      },
      {
        icon: '✓',
        title: { es: 'Marcar como dominada', ca: 'Marcar com a dominada', en: 'Mark as mastered', ja: '習得済みとしてマーク' },
        body: {
          es: 'Pulsa el botón verde en cada tarjeta para marcar el punto como dominado. Tu progreso se guarda en la nube.',
          ca: 'Prem el botó verd a cada targeta per marcar el punt com a dominat. El teu progrés es guarda al núvol.',
          en: 'Press the green button on each card to mark the point as mastered. Your progress is saved to the cloud.',
          ja: '各カードの緑のボタンを押してポイントを習得済みにマーク。進捗はクラウドに保存されます。',
        },
      },
      {
        icon: '🤖',
        title: { es: 'Explicación con IA', ca: 'Explicació amb IA', en: 'AI explanation', ja: 'AI解説' },
        body: {
          es: 'Haz clic en cualquier punto gramatical para ver una explicación detallada con ejemplos generada por IA. Necesitas la API key de Gemini (configúrala en Mi Perfil).',
          ca: 'Fes clic en qualsevol punt gramatical per veure una explicació detallada amb exemples generada per IA. Necessites la API key de Gemini (configura-la a El meu Perfil).',
          en: 'Click any grammar point to see a detailed AI-generated explanation with examples. You need the Gemini API key (set it up in My Profile).',
          ja: '任意の文法ポイントをクリックしてAI生成の詳細解説と例文を表示。Gemini APIキーが必要です（マイプロフィールで設定）。',
        },
      },
      {
        icon: '📊',
        title: { es: 'Progreso', ca: 'Progrés', en: 'Progress', ja: '進捗' },
        body: {
          es: 'La barra superior muestra cuántos puntos has dominado del total. Cada lección también muestra tu progreso individual.',
          ca: 'La barra superior mostra quants punts has dominat del total. Cada lliçó també mostra el teu progrés individual.',
          en: 'The top bar shows how many points you\'ve mastered out of the total. Each lesson also shows your individual progress.',
          ja: '上部バーで全体の習得ポイント数を確認できます。各課でも個別の進捗が表示されます。',
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
          ja: 'テーマ（日常生活・旅行・食べ物など）と難易度（N5-N4・N4-N3・N3-N2）を選択。システムがあなたのアクティブ語彙を使ってテキストを作成します。',
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
          es: 'Novato (0) → Aprendiz → Iniciado → Experto → Avanzado → Veterano → Maestro (7). Cuando llegas a Maestro, el repaso se programa para dentro de 30 días.',
          ca: 'Novell (0) → Aprenent → Iniciat → Expert → Avançat → Veterà → Mestre (7). Quan arribes a Mestre, el repàs es programa per d\'aquí a 30 dies.',
          en: 'Novice (0) → Apprentice → Initiate → Expert → Advanced → Veteran → Master (7). When you reach Master, the review is scheduled 30 days out.',
          ja: '初心者(0)→見習い→入門→専門家→上級→熟練→マスター(7)。マスターに到達すると、次の復習は30日後にスケジュールされます。',
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

  useEffect(() => { setMounted(true) }, [])

  const content = HELP[section]
  if (!content) return null

  const txt = (ml: ML) => ml[lang] ?? ml['es'] ?? ''

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
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-base">{txt(content.title)}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition text-lg leading-none"
                aria-label={closeLabel}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Intro */}
              <p className="text-slate-500 text-sm leading-relaxed">{txt(content.intro)}</p>

              {/* Points */}
              <div className="space-y-4">
                {content.points.map((point, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-xl shrink-0 mt-0.5">{point.icon}</span>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">{txt(point.title)}</p>
                      <p className="text-slate-500 text-xs leading-relaxed mt-0.5">{txt(point.body)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
