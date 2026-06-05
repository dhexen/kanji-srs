export type ChangeType = 'new' | 'fix' | 'improvement'

export interface ChangeEntry {
  type: ChangeType
  title: string
  description: string
}

export interface ChangelogVersion {
  /** ISO date string — used as the version identifier stored in localStorage. */
  date: string
  /** Short label shown in the header of the group (e.g. "Junio 2026"). */
  label: string
  entries: ChangeEntry[]
}

export const CHANGELOG: ChangelogVersion[] = [
  {
    date: '2026-06-05',
    label: 'Junio 2026',
    entries: [
      {
        type: 'improvement',
        title: 'Repaso de gramática continuo con resumen final',
        description: 'El repaso SRS de gramática ahora es una sola sesión continua: una frase por gramática, sin pantallas intermedias. Al terminar ves un único resumen con aciertos a la primera, fallos y el nivel final de cada gramática (con flecha de subida/bajada). La pantalla de inicio se simplifica: una sola lista con casillas (todas marcadas por defecto), un botón "generar más" por gramática y dos opciones globales (vocabulario WaniKani y frases de la comunidad).',
      },
      {
        type: 'new',
        title: 'Práctica de gramática estilo Bunpro',
        description: 'La práctica de gramática ahora muestra la frase completa en japonés con un hueco para rellenar solo la parte gramatical, en lugar de tener que escribir la frase entera. Al fallar se muestra la respuesta correcta y una nota gramatical con la explicación del patrón.',
      },
      {
        type: 'new',
        title: 'Botón "Añadir a repasos" en fichas de gramática',
        description: 'Cada ficha de gramática tiene ahora un botón "📚 Añadir a repasos" para incluirla en el SRS, y muestra su nivel actual. Para quitarla, al final de la ficha hay una opción "Quitar de repasos" que pide confirmación antes de hacerlo. En los repasos sale una sola frase por punto gramatical.',
      },
      {
        type: 'new',
        title: 'Vocabulario WaniKani en ejemplos de gramática',
        description: 'La sección de ejemplos con IA en gramática ahora tiene un checkbox "Usar vocabulario WaniKani" (visible si tienes configurada la API Key de WaniKani). Al activarlo, la IA incluye palabras de tu progreso en WaniKani al generar las frases de ejemplo.',
      },
      {
        type: 'new',
        title: 'Sesión de estudio antes del repaso',
        description: 'Al añadir palabras nuevas (+3/+5/+15) primero se abre una sesión de estudio donde puedes ver el kanji, la lectura y la imagen de cada palabra antes de que aparezca en el repaso. Así nunca te llegará una pregunta sobre algo que no has visto aún.',
      },
      {
        type: 'new',
        title: 'Reportar frases de gramática',
        description: 'Durante la práctica de gramática ahora puedes reportar frases que parezcan incorrectas con el botón 🚩 "Reportar error en esta frase". Los reportes llegan al administrador para su revisión.',
      },
      {
        type: 'fix',
        title: 'Corrección del nivel SRS al añadir palabras',
        description: 'Las palabras nuevas ya no saltaban directamente al nivel 2 tras el primer acierto. Ahora empiezan en nivel 0 (nunca vistas) y el primer acierto las lleva al nivel 1 (Aprendiz 1), independientemente de cuántas veces hayas fallado.',
      },
      {
        type: 'fix',
        title: 'Indicador de nivel en repasos',
        description: 'El indicador de subida/bajada de nivel que aparece al responder ahora muestra la dirección correcta: si habías fallado una palabra antes y finalmente la aciertas, se muestra ↓ (baja) en lugar del engañoso ↑.',
      },
      {
        type: 'improvement',
        title: 'Reportes unificados en el panel de administración',
        description: 'La pestaña de feedback del administrador ahora muestra todos los tipos de reportes en un solo lugar y separados: errores de gramática, errores de vocabulario, imágenes reportadas y bugs/mejoras.',
      },
    ],
  },
]

/** The date string of the most recent changelog version. */
export const LATEST_VERSION = CHANGELOG[0].date

const STORAGE_KEY = 'changelog_seen_version'

export function getSeenVersion(): string | null {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

export function markVersionSeen(date: string) {
  try { localStorage.setItem(STORAGE_KEY, date) } catch { /* incognito */ }
}

export function hasUnseenChanges(): boolean {
  const seen = getSeenVersion()
  if (!seen) return true
  return LATEST_VERSION > seen
}
