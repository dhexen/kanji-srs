// El dashboard personalizable: filas de 1 a 4 columnas, cada hueco con una
// tarjeta (o vacío). Se guarda en user_settings.dashboard_layout (migración 046)
// y, mientras no se personaliza, se usa DEFAULT_LAYOUT.

export const CARD_IDS = [
  'today', 'forecast', 'modes', 'sections', 'quickAdd', 'stages',
  'summary', 'xp', 'jlpt', 'ranking', 'kana',
] as const
export type CardId = (typeof CARD_IDS)[number]

export type Cols = 1 | 2 | 3 | 4
export type DashRow = { cols: Cols; cards: (CardId | null)[] }
export type DashLayout = { v: 1; rows: DashRow[] }

export const DEFAULT_LAYOUT: DashLayout = {
  v: 1,
  rows: [
    { cols: 3, cards: ['today', 'forecast', 'modes'] },
    { cols: 3, cards: ['sections', 'quickAdd', 'stages'] },
  ],
}

type L4 = { es: string; en: string; ca: string; ja: string }

/** Lo que se ve en el catálogo de tarjetas al añadir una. */
export const CARD_INFO: Record<CardId, { icon: string; title: L4; desc: L4 }> = {
  today: {
    icon: '📅',
    title: { es: 'Repasos de hoy', en: "Today's reviews", ca: "Repassos d'avui", ja: '今日の復習' },
    desc: { es: 'Pendientes, botones para empezar y previsión por horas', en: 'Pending, start buttons and hourly forecast', ca: 'Pendents, botons per començar i previsió per hores', ja: '残り・開始ボタン・時間別予報' },
  },
  forecast: {
    icon: '🗓️',
    title: { es: 'Próximos días', en: 'Next days', ca: 'Propers dies', ja: '今後の予定' },
    desc: { es: 'Cuántos repasos tendrás cada día de la semana', en: 'How many reviews each day of the week', ca: 'Quants repassos tindràs cada dia', ja: '一週間の復習数' },
  },
  modes: {
    icon: '🎛️',
    title: { es: 'Modos de repaso', en: 'Review modes', ca: 'Modes de repàs', ja: '復習モード' },
    desc: { es: 'Elige qué tipos de pregunta entran en el repaso', en: 'Pick which question types to review', ca: 'Tria quins tipus de pregunta entren', ja: '出題形式を選ぶ' },
  },
  sections: {
    icon: '🧭',
    title: { es: 'Secciones', en: 'Sections', ca: 'Seccions', ja: 'セクション' },
    desc: { es: 'Accesos directos a las partes de la app', en: 'Shortcuts to the app sections', ca: "Accessos directes a l'app", ja: '各セクションへのショートカット' },
  },
  quickAdd: {
    icon: '➕',
    title: { es: 'Añadir kanjis', en: 'Add kanji', ca: 'Afegir kanjis', ja: '漢字を追加' },
    desc: { es: 'Añade palabras nuevas a tus repasos', en: 'Add new words to your reviews', ca: 'Afegeix paraules noves', ja: '新しい単語を追加' },
  },
  stages: {
    icon: '📶',
    title: { es: 'Niveles de tus palabras', en: 'Your word levels', ca: 'Nivells de les paraules', ja: '単語のレベル' },
    desc: { es: 'Cuántas tienes en Aprendiz, Gurú, Maestro…', en: 'How many in Apprentice, Guru, Master…', ca: 'Quantes en Aprenent, Gurú, Mestre…', ja: '見習い・グル・マスター…の数' },
  },
  summary: {
    icon: '🔢',
    title: { es: 'Resumen en cifras', en: 'Summary', ca: 'Resum en xifres', ja: '数字で見る' },
    desc: { es: 'Activas, dominadas, programadas hoy y por aprender', en: 'Active, mastered, due today and to learn', ca: 'Actives, dominades, programades i per aprendre', ja: '学習中・習得・今日・未習得' },
  },
  xp: {
    icon: '⭐',
    title: { es: 'Nivel y XP', en: 'Level & XP', ca: 'Nivell i XP', ja: 'レベルとXP' },
    desc: { es: 'Tu nivel de vocabulario y total, con la barra de experiencia', en: 'Vocabulary and total level with XP bar', ca: 'El teu nivell de vocabulari i total', ja: '語彙と総合のレベル' },
  },
  jlpt: {
    icon: '🎌',
    title: { es: 'Vocabulario JLPT', en: 'JLPT vocabulary', ca: 'Vocabulari JLPT', ja: 'JLPT語彙' },
    desc: { es: 'A qué nivel JLPT llega tu vocabulario dominado', en: 'Which JLPT level your mastered vocabulary reaches', ca: 'A quin nivell JLPT arriba el vocabulari', ja: '習得語彙のJLPT目安' },
  },
  ranking: {
    icon: '🏆',
    title: { es: 'Ranking semanal', en: 'Weekly ranking', ca: 'Rànquing setmanal', ja: '週間ランキング' },
    desc: { es: 'Podio anónimo y tu posición esta semana', en: 'Anonymous podium and your position', ca: 'Podi anònim i la teva posició', ja: '匿名の表彰台とあなたの順位' },
  },
  kana: {
    icon: 'あ',
    title: { es: 'Progreso de kana', en: 'Kana progress', ca: 'Progrés de kana', ja: '仮名の進捗' },
    desc: { es: 'Hiragana y katakana aprendidos', en: 'Hiragana and katakana learned', ca: 'Hiragana i katakana apresos', ja: '覚えたひらがな・カタカナ' },
  },
}

export const pick4 = (l: L4, lang: string) => (l as Record<string, string>)[lang] ?? l.es

const esCard = (x: unknown): x is CardId => typeof x === 'string' && (CARD_IDS as readonly string[]).includes(x)

/**
 * Valida lo que viene de la base (o de localStorage): descarta tarjetas que ya
 * no existen y repetidas, y ajusta cada fila a su número de columnas. Devuelve
 * null si no hay nada aprovechable.
 */
export function sanitizeLayout(x: unknown): DashLayout | null {
  if (!x || typeof x !== 'object' || !Array.isArray((x as DashLayout).rows)) return null
  const vistas = new Set<CardId>()
  const rows: DashRow[] = []
  for (const r of (x as DashLayout).rows) {
    const cols = Number((r as DashRow)?.cols)
    if (![1, 2, 3, 4].includes(cols)) continue
    const raw = Array.isArray((r as DashRow).cards) ? (r as DashRow).cards : []
    const cards: (CardId | null)[] = []
    for (let i = 0; i < cols; i++) {
      const c = raw[i]
      if (esCard(c) && !vistas.has(c)) { vistas.add(c); cards.push(c) } else cards.push(null)
    }
    rows.push({ cols: cols as Cols, cards })
  }
  return rows.length ? { v: 1, rows } : null
}

/** Cambia las columnas de una fila: rellena con huecos o recorta por el final. */
export function setRowCols(row: DashRow, cols: Cols): DashRow {
  const cards = row.cards.slice(0, cols)
  while (cards.length < cols) cards.push(null)
  return { cols, cards }
}

export function usedCards(layout: DashLayout): Set<CardId> {
  return new Set(layout.rows.flatMap(r => r.cards).filter((c): c is CardId => c !== null))
}

/**
 * Las columnas que pide cada fila, según el ancho: en el móvil todo va en una
 * columna y en tablet como mucho dos; el diseño entero solo se aplica en xl.
 */
export const ROW_GRID: Record<Cols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
}
