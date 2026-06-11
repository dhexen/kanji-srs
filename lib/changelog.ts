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
        type: 'new',
        title: 'Escritura completa de las palabras (todos los kanji)',
        description: 'Muchas palabras se aprenden con solo el kanji que toca y el resto en kana (p. ej. 草はら). Ahora, además, se muestra la escritura real con todos sus kanji y furigana (草原): siempre en la ficha del glosario, y al revelar la respuesta en los repasos (para no dar pistas durante la pregunta).',
      },
      {
        type: 'new',
        title: 'Pista en los repasos de gramática',
        description: 'En el repaso de gramática hay un botón 💡 "Pista" que revela la respuesta letra a letra y muestra su longitud (con puntos). Útil cuando una frase admite varias formas (formal/informal, てしまいました vs pasado simple…) y no sabes cuál se espera.',
      },
      {
        type: 'new',
        title: 'Gramática: añadir a repasos y ver nivel desde la lista',
        description: 'Cada punto de gramática muestra ahora tu nivel SRS (Aprendiz, Gurú, etc.) en la lista y en su ficha, y tiene un botón ➕ para añadirlo a tus repasos directamente sin entrar en él.',
      },
      {
        type: 'fix',
        title: 'Desmarcar "dominada" en gramática vuelve a nivel 1',
        description: 'Antes, si marcabas un punto de gramática como dominado y luego lo desmarcabas, se quedaba como dominado por dentro. Ahora vuelve correctamente al nivel 1 del SRS y entra de nuevo en tus repasos.',
      },
      {
        type: 'improvement',
        title: 'Las palabras falladas reaparecen dentro del mismo tipo de repaso',
        description: 'En los repasos, cuando fallas una palabra ya no espera al final de toda la sesión para volver: reaparece en una posición aleatoria (estilo WaniKani) pero siempre antes de terminar ese tipo de repaso. Así un fallo de opción múltiple vuelve dentro del bloque de opción múltiple, no después de haber acabado, por ejemplo, el inverso.',
      },
      {
        type: 'new',
        title: 'Instala 栞 como app (PWA)',
        description: 'Ahora puedes instalar la web como una app en tu PC o móvil: aparece un botón "Instalar" (o el icono de instalar del navegador) y la app se abre en su propia ventana con su icono, sin la barra del navegador. En iPhone/iPad se hace desde Compartir → "Añadir a pantalla de inicio".',
      },
      {
        type: 'new',
        title: 'Sugerencia de cargar más vocabulario o gramática',
        description: 'Cuando dominas la mayoría de lo que estudias (Gurú o más) y tienes pocos repasos diarios próximos, la app te avisa con una tarjeta de que es buen momento para añadir vocabulario nuevo (en el Dashboard) o gramática (en su sección). Es una sugerencia descartable, no molesta.',
      },
      {
        type: 'fix',
        title: 'La sección de Contrarios vuelve a mostrar los pares',
        description: 'La lista de antónimos quedaba vacía cuando había muchos pares registrados, por un límite en la consulta. Ahora se cargan por lotes y se muestran todos correctamente.',
      },
      {
        type: 'improvement',
        title: 'Animación de trazos en bucle y orden del glosario',
        description: 'La animación de orden de trazos de los kanji ahora se repite en bucle (con una pausa) en todos los sitios donde aparece, para poder verla varias veces. Además, el glosario de vocabulario se ordena igual que tus repasos (orden del currículo) para evitar confusiones.',
      },
      {
        type: 'new',
        title: 'Glosario de vocabulario renovado',
        description: 'Cada palabra muestra ahora su tipo y categoría, y un punto de color con tu progreso (verde = dominada, amarillo = estudiando, gris = no iniciada). Al tocar una palabra se abre una ficha grande con la lectura, el significado, la imagen (si la hay), el orden de trazos de cada kanji y, si la estudias, tu nivel en cada modo de repaso. Desde la ficha puedes añadir la palabra a tus repasos. El furigana se reparte por kanji y, cuando no es del todo fiable, avisa de que es aproximado.',
      },
      {
        type: 'improvement',
        title: 'Contadores de pendientes en el Dashboard',
        description: 'Los accesos a Vocabulario y Gramática del Dashboard muestran ahora una insignia con el número de repasos pendientes, para ver de un vistazo qué tienes por hacer.',
      },
      {
        type: 'fix',
        title: 'Calendario de gramática: ahora muestra "hoy"',
        description: 'El calendario de próximas gramáticas mostraba siempre los días vacíos porque ocultaba el día de hoy (donde se acumulan los repasos vencidos). Ahora "hoy" aparece destacado con su número.',
      },
      {
        type: 'new',
        title: 'Repaso libre de vocabulario y gramática',
        description: 'Nuevo modo "Repaso libre" sin presión: no cuenta para los niveles. En vocabulario, repasa de forma aleatoria todo tu vocabulario activo (botón 🎲 en el Dashboard). En gramática, eliges por lección las gramáticas que estudias y repasas 2-3 frases por punto en orden aleatorio (sin gramáticas iguales seguidas). De vez en cuando, de forma aleatoria, aparece el reto de escribir entera una frase que ya viste antes en el repaso: se compara con la original, cuenta el acierto/fallo y, si te equivocas, te señala dónde está el error (se acepta con kanji o toda en hiragana).',
      },
      {
        type: 'improvement',
        title: 'Clasificación de WaniKani más robusta ante errores',
        description: 'Al clasificar el vocabulario de WaniKani, si hay un error temporal (p. ej. la API saturada) se reintenta automáticamente varias veces y continúa con las palabras que aún falten por clasificar, en lugar de detenerse al primer fallo. Si aun así se interrumpe, basta con volver a pulsar el botón para seguir donde lo dejó.',
      },
      {
        type: 'fix',
        title: 'Kanji de las frases de gramática más claros',
        description: 'Las frases de gramática (en la práctica y en el repaso) ahora usan la misma fuente clara que la respuesta, en lugar de una decorativa que hacía algunos kanji difíciles de leer.',
      },
      {
        type: 'new',
        title: 'Clasifica tu vocabulario de WaniKani cuando quieras',
        description: 'En Mi Perfil → Cuenta hay un botón "Clasificar vocabulario de WaniKani" que clasifica por categoría y tipo las palabras importadas que aún no lo estén, sin tener que volver a sincronizar. Útil para el vocabulario que importaste antes de esta función.',
      },
      {
        type: 'improvement',
        title: 'Lecturas IA por tema + vocabulario de WaniKani clasificado',
        description: 'Al sincronizar WaniKani, ahora cada palabra se clasifica por categoría y tipo (igual que el vocabulario de la página). Las Lecturas IA usan esa categoría para priorizar las palabras (de la página y de WaniKani) que encajan con el tema elegido, haciendo los textos más coherentes. Vuelve a sincronizar WaniKani para clasificar el vocabulario que ya tenías importado.',
      },
      {
        type: 'improvement',
        title: 'Lecturas IA: kanji completos y elección de vocabulario',
        description: 'Los textos de Lecturas IA ahora escriben las palabras con sus kanji correctos y completos (con furigana sobre todos). Además hay dos casillas: "Incluir vocabulario" (el de la página) e "Incluir vocabulario de WaniKani". Marca las dos para mezclar ambos vocabularios o solo una para usar únicamente ese. El vocabulario de WaniKani, que puede ser muy formal o antiguo, se usa solo cuando encaja en el contexto.',
      },
      {
        type: 'new',
        title: 'Elige el modelo de Gemini',
        description: 'En Mi Perfil → Configuración puedes elegir el modelo de Gemini (Gemini 2.5 Flash o Gemini 3.1 Flash Lite). Así, si un modelo se queda sin cuota, puedes cambiar al otro para seguir generando lecturas y frases de gramática.',
      },
      {
        type: 'improvement',
        title: 'Opciones de repaso de opción múltiple más exigentes',
        description: 'En los repasos de opción múltiple, las respuestas incorrectas ya no son palabras al azar: ahora se eligen palabras que comparten un kanji con la palabra objetivo, suenan de forma parecida o son del mismo tipo, para que distinguir la correcta sea un reto real.',
      },
      {
        type: 'improvement',
        title: 'Se recuerda tu selección de tipos de repaso',
        description: 'Los tipos de repaso que eliges (lectura múltiple, significado, kanji, etc.) se guardan y se mantienen en tu próxima visita, hasta que selecciones otros.',
      },
      {
        type: 'improvement',
        title: 'Menú de usuario en el avatar superior',
        description: 'El acceso a tu perfil (Estadísticas, Mis reportes, Configuración, Cuenta y cerrar sesión) ya no está en el menú lateral: ahora se despliega al pulsar tu avatar en la esquina superior derecha.',
      },
      {
        type: 'fix',
        title: 'Imágenes de vocabulario más nítidas y completas',
        description: 'Las fotos de las palabras ya no se ven estiradas ni cortadas: ahora se muestran enteras, centradas y a mayor resolución, en un tamaño más contenido tanto en los repasos como en la sesión de estudio.',
      },
      {
        type: 'improvement',
        title: 'Repaso más compacto, sin tener que hacer scroll',
        description: 'Se ha reducido el espaciado de la tarjeta de repaso para que el significado y el botón "Siguiente" quepan en pantalla al adivinar una palabra, evitando tener que desplazarse.',
      },
      {
        type: 'new',
        title: 'Vocabulario WaniKani en Lecturas IA',
        description: 'La sección de Lecturas IA tiene ahora un checkbox "Incluir vocabulario de WaniKani" (visible si tienes configurada la API Key de WaniKani). Al activarlo, la IA combina el vocabulario que estás aprendiendo o ya has aprendido en la página con las palabras de tu progreso en WaniKani al crear el texto.',
      },
      {
        type: 'improvement',
        title: 'Generación de frases con reintentos automáticos',
        description: 'Al generar frases de gramática con IA, si la API está saturada (timeouts) la app reintenta automáticamente hasta 5 veces sin que tengas que pulsar otra vez. Si te has quedado sin cuota de la API, se muestra un aviso que puedes cerrar con la ✕.',
      },
      {
        type: 'improvement',
        title: 'Repaso de gramática continuo con resumen final',
        description: 'El repaso SRS de gramática ahora es una sola sesión continua: una frase por gramática, sin pantallas intermedias. Solo se repasan las gramáticas vencidas (las que toca según su nivel); si ninguna lo está, no se puede iniciar el repaso. Practicar un punto desde su ficha es solo para entrenar y no sube de nivel salvo que ya estuviera vencido. Al terminar ves un único resumen con aciertos a la primera, fallos y el nivel final de cada gramática (con flecha de subida/bajada). La pantalla de inicio se simplifica: una sola lista con casillas (todas marcadas por defecto), un botón "generar más" por gramática y dos opciones globales (vocabulario WaniKani y frases de la comunidad).',
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
