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
**Componente principal:** `components/grammar/GrammarClient.tsx`

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
**Componente:** `components/context/ContextClient.tsx`

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

### `ProductTour` (`components/ui/ProductTour.tsx`)
Tour interactivo con [driver.js](https://driverjs.com/) que guía al usuario en su primer uso. 4 fases:
1. `dashboard-init` — Bienvenida + señala el panel de añadir palabras
2. `await-study` — Espera a que el usuario inicie una sesión
3. `study-intro` — Explica los botones durante la sesión
4. `dashboard-full` — Muestra las secciones del dashboard

El estado de completado se guarda en `localStorage` Y en `user_settings.tour_v3_done` (para que no se repita en otros navegadores del mismo usuario).

---

### `SectionHelp` (`components/ui/SectionHelp.tsx`)
Modales de ayuda contextual por sección (review, vocabulary, grammar, context, progress, profile). Se abre automáticamente una sola vez por sección después de que el tour principal se haya completado. Tiene botón "?" para reabrirlo manualmente.

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
- Navegación por secciones
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
- Imagen de vocabulario (con votos 👍/👎)
- Botón de audio TTS
- "Ya me lo sé" — marca como Enlightened (nivel 8) y elimina de la cola actual
- Feedback visual al responder (correcto/incorrecto)
- XP toast al responder
- Toast de cambio de nivel (↑ Aprendiz 3 o ↓ Gurú 1) al responder
