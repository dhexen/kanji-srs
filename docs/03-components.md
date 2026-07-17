# 03 — Componentes y Páginas

## Páginas (app/)

### `/` — Página raíz
Redirige inmediatamente a `/login`.

---

### `/login` — Autenticación
**Componente:** `components/ui/LoginPage.tsx`

Ofrece tres métodos de autenticación:
- **Google OAuth** — flujo OAuth2 estándar
- **Magic Link** — enlace mágico enviado al email
- **Email + contraseña** — registro o login con credenciales

No requiere sesión activa. Si el usuario ya está autenticado, `AuthShell` redirige a `/review`.

---

### `/review` — Sesiones de repaso SRS
**Componente principal:** `components/review/ReviewClient.tsx`

La página central de la aplicación. Permite al usuario repasar el vocabulario que tiene pendiente según el SRS.

**Sub-componentes:**
- `ModeSelector` — Selección de modos de repaso (multi, meaning, kanji, reading, reverse) y palabras a repasar
- `QuickAddPanel` — Panel para añadir lotes de palabras nuevas por grado/kanji
- `QuestionCard` — Tarjeta individual de pregunta con input de respuesta, imágenes, audio TTS, y feedback
- `SessionComplete` — Pantalla de fin de sesión con estadísticas y previsión

**Modos de repaso:**
| Modo | Pregunta | Respuesta |
|------|---------|-----------|
| `multi` | Muestra kanji, pide leer correctamente | Selección múltiple de lecturas |
| `meaning` | Muestra kanji, pide el significado | Selección múltiple de significados |
| `kanji` | Muestra significado, pide escribir kanji | Tipo "papel" (el usuario escribe en papel y auto-confirma) |
| `reading` | Muestra significado, pide lectura | Input de hiragana con conversión automática |
| `reverse` | Muestra kanji+significado, pide escribir ambos | Tipo "papel" |

---

### `/study` — Estudio de palabras nuevas
**Componente:** `components/study/StudyClient.tsx`

Permite al usuario revisar los detalles de una palabra (kanji, lectura, significado, imagen) antes de activarla para el SRS. Las palabras en estado `locked` aparecen aquí; al estudiarlas pasan a `active`.

---

### `/vocabulary` — Vocabulario y glosario
**Componente:** `components/vocabulary/VocabularyClient.tsx`

Tiene tres pestañas:
- **Glosario** (`VocabGlossary`) — Búsqueda en el diccionario compartido por grado (1-9)
- **Antónimos** (`VocabAntonyms`) — Lista de pares de antónimos (alto↔bajo). Permite añadir/borrar pares manualmente (contributor/admin) o detectarlos automáticamente con IA
- **Transitivos** (`VocabTransitivity`) — Lista de verbos clasificados por transitiva (他動詞) e intransitiva (自動詞)

---

### `/grammar` — Práctica de gramática
**Componente principal:** `components/grammar/GrammarClient.tsx`, protegido por `RoleGate` (solo `admin`/`contributor` — ver más abajo)

Lista más de 120 puntos gramaticales de Minna no Nihongo (MNN1, MNN2, MNNChūkyū) clasificados por nivel JLPT (N5, N4, N3).

**Sub-componentes:**
- `GrammarDetail` — Explicación del patrón, ejemplos, estructura visual
- `GrammarPractice` — Sesión de fill-in-the-blank. Genera oraciones con Gemini si el pool está vacío. 5 preguntas por sesión. SRS propio para gramática.
- `GrammarExamples` — Ejemplos coloreados generados por IA para cada punto

**Filtros disponibles:** Libro (MNN1/2/C1), JLPT (N5/N4/N3), búsqueda de texto, ocultar dominados, mostrar solo "estudiando"

**Flujo de sesión gramatical:**
1. Usuario abre punto gramatical → `GrammarDetail`
2. Click "Practicar" → `GrammarPractice`
3. Si no hay oraciones → Gemini genera 25 nuevas (filtradas por calidad ≥4)
4. Sesión de 5 preguntas → resultado → SRS actualizado
5. SRS de gramática: niveles 0-7, intervalos de 4h a 1 mes

---

### `/context` — Lectura en contexto con IA
**Componente:** `components/context/ContextClient.tsx`, protegido por `RoleGate` (solo `admin`/`contributor` — ver más abajo)

Genera textos de lectura en japonés usando el vocabulario que el usuario domina como contexto. Usa Google Gemini. Los textos generados se guardan en `user_settings.context_texts` (máx 10).

---

### `/kana` — Hiragana y Katakana
**Componentes:** `components/kana/KanaClient.tsx`, `KanaLearn.tsx`, `KanaTest.tsx`

Dos modos:
- **Aprender** — Tarjetas con mnemonics visuales para memorizar los silabarios
- **Test** — Test cronometrado de reconocimiento

Cubre los 46 caracteres básicos de hiragana y los 46 de katakana.

---

### `/progress` — Progreso detallado
**Componente:** `components/progress/ProgressClient.tsx`

Vista tabular de todas las palabras activas del usuario con su nivel SRS por modo, fecha de próximo repaso, y filtros avanzados (por nivel, por estado, búsqueda).

---

### `/stats` — Estadísticas y perfil
**Componente:** `components/stats/StatsClient.tsx`

Tiene 5 pestañas:
- **Estadísticas** — Gráficos de progreso, distribución de niveles SRS, racha diaria
- **Progresión** — XP ganada, nivel total, niveles por vocabulario y gramática
- **Importar** — Añadir palabras por kanji (buscando en el diccionario oficial)
- **Configuración** — API keys (Gemini, Pexels, WaniKani), idioma de interfaz, toggle de oraciones compartidas
- **Cuenta** — Backup/restore de progreso (snapshots), logout

---

### `/import` — Importador IA
**Componente:** `components/import/ImportClient.tsx`

Permite importar vocabulario usando lenguaje natural con Gemini. El usuario puede describir un tema y la IA genera palabras relevantes del currículo.

---

### `/admin` — Panel de administración
**Componente:** `components/admin/AdminClient.tsx`  
**Requiere:** rol `admin` + MFA verificado (AAL2)

Tiene 5 pestañas:
- **Usuarios** — Listar, crear, borrar usuarios; ver/restaurar snapshots
- **Clasificación** — Clasificar vocabulario con Gemini (tipo gramatical, categoría, imagen de Pexels, antónimos). Un lote de 35 palabras por llamada.
- **Vocabulario** — Buscar/borrar palabras; importar CSV; ver reportes de errores
- **Sistema** — Configurar intervalos SRS globales; feedback de usuarios
- **Feedback** — Reportes de bugs y mejoras de usuarios

---

## Componentes de UI

### `Toast` (`components/ui/Toast.tsx`)
Sistema de notificaciones tipo toast. Muestra mensajes de éxito (verde), error (rojo) o info (azul). Cada toast tiene botón X para cerrar. Los errores duran 8 segundos; el resto, 4 segundos. Los mensajes de error idénticos se deduplican en una ventana de 5 segundos.

**Uso:**
```typescript
import { showToast } from '@/components/ui/Toast'
showToast('✓ Guardado', 'success')
showToast('Error de red', 'error')
showToast('3 palabras importadas', 'info')
```

---

### `HelpDrawer` + `HelpProvider` (`components/ui/HelpDrawer.tsx`, `lib/help-context.tsx`)
Drawer lateral de ayuda contextual, con contenido distinto según la sección activa (review, vocabulary, grammar, kana, context, stats, progress, study, import). Se abre automáticamente **una sola vez por cuenta, para siempre** (no una vez por sección) la primera vez que un `admin`/`contributor` usa la app, mediante un doble guard: `localStorage['help_done_v1']` (mismo dispositivo) + `user_settings.help_seen` (Supabase, cross-device). Reabrible en cualquier momento con el botón "?" del Header o del dashboard.

Para cuentas nuevas con rol `user`, este auto-open se desactiva a propósito — en su lugar se muestra `OnboardingTour` (ver abajo).

---

### `OnboardingTour` (`components/onboarding/OnboardingTour.tsx`, `lib/onboarding.ts`)
Tutorial guiado paso a paso, hecho a mano (sin librería de terceros), que se muestra automáticamente solo a cuentas **nuevas con rol `user`** al aterrizar en `/review` (la misma señal "cuenta nunca ha visto ayuda" que usa `HelpProvider`: `helpSeen.length === 0` + flag local `onboarding_done_v1` sin marcar). Sustituye, para esas cuentas, tanto el `WhatsNewModal` de novedades como el `HelpDrawer` automático.

Pasos: 0) prompt "¿ya sabes hiragana/katakana?" con rama opcional explicando la sección Kana; 1) calendario "repasos para hoy" (`data-tutorial-id="forecast-card"`); 2) cómo añadir vocabulario y los ritmos normal/rápido/súper rápido (`data-tutorial-id="quick-add-panel"`); 3) selección de tipos de repaso (`data-tutorial-id="mode-selector"`); 4) niveles SRS de las palabras (informativo). Saltar o completar el tour lo marca como visto (`markHelpSeen('onboarding')` + `onboarding_done_v1`); no vuelve a aparecer solo, pero es reiniciable manualmente desde Mi Perfil → Configuración → "Reiniciar tutoriales".

---

### `RoleGate` (`components/ui/RoleGate.tsx`)
Wrapper de página que restringe el acceso a `admin`/`contributor` (rol efectivo = `simulatedRole ?? role`), redirigiendo a `/review` en cualquier otro caso. Usado por `/grammar` y `/context`, que además ya están ocultas de `Nav` y del dashboard para el rol `user`.

---

### `LevelWidget` (`components/progression/LevelWidget.tsx`)
Widget que muestra el nivel y XP actual. Se adapta al contexto: muestra nivel de vocabulario en `/review`, nivel de gramática en `/grammar`, y nivel total en el resto.

---

### `ThemeToggle` (`components/ui/ThemeToggle.tsx`)
Selector de tema con dos opciones: ☀️ Claro / 🌙 Oscuro. El tema se guarda en `localStorage`. Si el valor guardado era 'system' (opción eliminada), se normaliza a 'light'.

---

### `Header` (`components/ui/Header.tsx`)
Encabezado sticky siempre visible. Contiene:
- Botón hamburguesa (≡) para abrir/cerrar sidebar
- Logo 栞
- Indicador de sincronización pendiente (⏳ N si hay cambios offline)
- Avatar del usuario con punto de estado de red (verde=online, rojo=offline)
- Email del usuario (enlace a /stats?tab=account)
- Botón Reportar 🐛
- Selector de tema

---

### `Nav` (`components/ui/Nav.tsx`)
Sidebar colapsable para todos los usuarios (no solo admin). Contiene:
- Logo
- Info del usuario (avatar, email, estado de red)
- Banner de cambios pendientes (si los hay)
- LevelWidget
- Navegación por secciones — los enlaces a Gramática y Lecturas IA solo se muestran si el rol efectivo (`simulatedRole ?? role`) es `admin` o `contributor`
- Controles de simulación de rol (solo admin)

**Comportamiento:**
- Se abre/cierra con el hamburguesa en el Header
- Se cierra al hacer click fuera (desktop) o en el overlay (mobile)
- Se cierra automáticamente al navegar a otra sección
- Empieza cerrado por defecto

---

### `QuestionCard` (`components/review/QuestionCard.tsx`)
Tarjeta de repaso individual. Maneja los 5 modos de respuesta:
- **Selección múltiple** (multi, meaning): botones de opciones aleatorias
- **Input de hiragana** (reading): input con conversión automática de romaji a hiragana (via wanakana)
- **Papel** (kanji, reverse): el usuario escribe en papel y confirma manualmente

Incluye:
- Imagen de vocabulario con botones de **votos de imagen** 👍/👎
- Botón de audio TTS (pronunciación en japonés)
- "Ya me lo sé" — marca como Enlightened (nivel 8) y elimina de la cola actual
- Feedback visual al responder (correcto/incorrecto + respuesta correcta)
- XP toast al responder
- Toast de cambio de nivel (↑ Aprendiz 3 o ↓ Gurú 1) al responder
- **Reporte de errores de vocabulario** (lectura, significado, kanji o general)

---

### Sistema de votos de imagen (`vocab_image_votes`)

Cada palabra con imagen muestra dos botones superpuestos: **👍 Buena imagen** y **👎 Imagen incorrecta**. Cada usuario puede votar una vez por palabra. Los votos se registran en la tabla `vocab_image_votes`.

El admin puede ver en **Admin → Clasificación → Imágenes reportadas** las palabras con más votos negativos. Desde ahí puede:
- **Rechazar** la imagen actual y buscar una nueva en Pexels
- **Aceptar** la imagen como correcta (resuelve el reporte)

El umbral para aparecer en "Imágenes reportadas" es cuando los votos 👎 superan a los 👍.

---

### Reporte de errores de vocabulario

Durante un repaso, el usuario puede pulsar el botón de reporte (icono de bandera) en la tarjeta de pregunta para indicar que hay un error en:
- **Lectura** — la lectura en hiragana es incorrecta
- **Significado** — el significado en español es incorrecto
- **Kanji** — el kanji mostrado es incorrecto
- **General** — otro tipo de error (con descripción libre)

Los reportes se almacenan en `vocab_reports` con estado `open` (pendiente) o `resolved` (resuelto). El admin los gestiona desde **Admin → Vocabulario → Errores reportados**, donde puede:
- Ver la descripción del error
- Editar directamente la lectura o el significado de la palabra
- Marcar el reporte como resuelto (o reabrirlo)
- Al guardar una corrección, todos los reportes abiertos de esa palabra se marcan automáticamente como resueltos

---

### Pool compartido de oraciones de gramática (`grammar_sentences`)

Las oraciones de fill-in-the-blank generadas por IA **se comparten entre todos los usuarios**. Cuando un usuario genera oraciones para un punto gramatical, estas se guardan en el pool compartido y están disponibles para todos los demás usuarios de ese mismo punto.

**Características del pool:**
- **Tamaño máximo:** 100 oraciones por punto gramatical (las más antiguas se eliminan automáticamente al superar el límite)
- **Prioridad en sesión:** Las oraciones **validadas** por admin/contributor se usan primero; después las **compartidas** por usuarios; por último las generadas automáticamente por IA
- **Persistencia:** Las oraciones del pool NO se borran cuando un nuevo usuario genera sus propias. Se acumulan (hasta el límite)
- **Regeneración:** Un usuario con API Key propia puede regenerar el pool desde cero con el botón "Regenerar oraciones"

---

### Validación de oraciones por admin/contributor

Los usuarios con rol `admin` o `contributor` (que actúan como profesores/revisores) pueden validar las oraciones del pool desde la vista de práctica.

**Acciones disponibles para admin/contributor:**
- **✓ Validar** / **✗ Invalidar** — Marca la oración como revisada y correcta (o la devuelve a estado no validado)
- **Editar** — Modifica el texto antes/después, la respuesta, las variantes aceptadas y la traducción
- **Eliminar** — Borra la oración del pool
- **Añadir alternativas** — Amplía las respuestas aceptadas (ej: añadir variantes honoríficas)

Las oraciones validadas tienen un **badge verde** visible en el panel de edición y se priorizan en las sesiones de repaso.

---

### Oraciones compartidas por usuarios (`user_shared_sentences`)

Cualquier usuario puede compartir una oración de su sesión de práctica con la comunidad pulsando el botón **"🌐 Compartir con la comunidad"**. Estas oraciones se guardan en `user_shared_sentences` (tabla separada, sin límite de tamaño) y aparecen en las sesiones de otros usuarios junto al pool principal.

A diferencia del pool de IA (`grammar_sentences`), las oraciones de usuario son **permanentes** y no se borran automáticamente.

---

### Reporte de bugs y mejoras (`FeedbackModal`)

El botón **🐛 Reportar** en la barra superior abre un modal donde cualquier usuario puede enviar un reporte de incidencia o sugerencia de mejora. El reporte incluye:
- Tipo (bug, mejora, pregunta)
- Descripción libre
- URL de la página actual (se adjunta automáticamente)

Los reportes se guardan en la base de datos y el admin los gestiona desde **Admin → Feedback**, donde puede:
- Leer la descripción
- Ver la URL donde ocurrió el problema
- Marcar como resuelto o cerrado
