# 06 — Funciones Clave

## lib/srs.ts

### `applyResult(item, mode, wrongCount)`
Calcula el nuevo nivel SRS y la fecha de próximo repaso tras una respuesta.

```typescript
function applyResult(item: VocabItem, mode: ReviewMode, wrongCount: number): VocabItem

// wrongCount = 0 → respuesta correcta a la primera → level +1
// wrongCount > 0 → hubo fallos → level - wrongCount (mínimo 1)
// Si newLevel ≥ SRS_MAX_LEVEL (9) → Burned → nextReview = Number.MAX_SAFE_INTEGER
```

**Ejemplo:**
```typescript
const updated = applyResult(item, 'reading', 0)
// item.srs_reading_level: 3 → 4
// item.srs_reading_due: now + 2 days
```

---

### `getPendingCount(items, modes)`
Cuenta cuántos ítems están vencidos ahora para los modos especificados.

```typescript
function getPendingCount(items: VocabItem[], modes: ReviewMode[]): number
// Cuenta items donde getModeLevelAndDue(item, mode).due ≤ Date.now()
// y el item está en status 'active' y level < SRS_MAX_LEVEL
```

---

### `getReviewForecast(items, locale, dayCount)`
Calcula cuántas repasos vencerán en los próximos N días.

```typescript
function getReviewForecast(items: VocabItem[], locale: string, dayCount = 7): ForecastDay[]
// Devuelve array de { date, dayLabel, newDue, cumulative }
// newDue = nuevos vencimientos ese día
// cumulative = total acumulado ese día (contando también los de días anteriores)
```

---

### `masterItem(item)`
Marca una palabra como "ya me la sé". Establece todos los modos al nivel 8 (Enlightened) con próximo repaso en 4 meses.

```typescript
function masterItem(item: VocabItem): VocabItem
// Todos los srs_*_level = 8
// Todos los srs_*_due = Date.now() + 120 días
```

---

## lib/grammar-srs.ts

### `checkFullSentence(userInput, ...params)`
Verifica si la respuesta del usuario es correcta para una oración de fill-in-the-blank. Acepta múltiples variantes de kanji/kana tanto para el texto antes/después como para la respuesta.

```typescript
function checkFullSentence(
  userInput: string,
  sentenceBeforeReading: string,  // ej: "わたしは"
  sentenceBefore: string,          // ej: "私は"
  answer: string,                   // ej: "がくせい"
  sentenceAfterReading: string,    // ej: "です"
  sentenceAfter: string,           // ej: "です"
  options?: {
    beforeAlts?: Array<{ jp: string; reading: string }>  // variantes honoríficas etc.
    answerAlts?: string[]           // variantes de la respuesta
  }
): boolean
// Normaliza todo: katakana→hiragana, elimina puntuación, colapsa espacios
// Acepta respuesta si coincide con cualquier combinación válida
```

---

### `applyGrammarResult(level, isCorrect)`
Calcula el nuevo nivel SRS de gramática.

```typescript
function applyGrammarResult(level: number, isCorrect: boolean): { newLevel: number; nextReview: number }
// isCorrect=true  → level +1 (máx 7)
// isCorrect=false → level -1 (mín 0)
// Intervalos: [0, 4h, 12h, 1d, 3d, 7d, 14d, 30d]
```

---

## lib/progression.ts

### `applyXp(prev, gain)`
Actualiza la progresión del usuario con el XP ganado.

```typescript
function applyXp(
  prev: UserProgression,
  gain: XpGain  // { vocabXp?, grammarXp? }
): {
  next: UserProgression,
  vocabLevelUp: boolean,
  grammarLevelUp: boolean,
  totalLevelUp: boolean
}
// Calcula nuevos niveles. Los level-ups disparan el overlay de celebración.
```

---

### `vocabXpForResult(srsLevel, isCorrect)`
Calcula el XP ganado o perdido en un repaso de vocabulario.

```typescript
function vocabXpForResult(srsLevel: number, isCorrect: boolean): number
// Correcto:    10 + srsLevel * 5  (de 15 a 55 XP según nivel)
// Incorrecto:  -5 XP
```

---

### `grammarXpForSession(correct, wrong, passed)`
Calcula el XP de una sesión de gramática.

```typescript
function grammarXpForSession(correct: number, wrong: number, passed: boolean): number
// correct * 15  (base por cada correcta)
// - wrong * 5   (penalización por cada incorrecta)
// + 20          (bonus si passed = correctas ≥ 60%)
```

---

## lib/supabase.ts

### `saveReviewResult(item, meta, fullDb)`
Persiste el resultado de un repaso en Supabase. Actualiza `user_vocab_progress`, añade entrada a `srs_review_log`, e incrementa el contador de snapshot. Si llega a 25, crea snapshot automático.

```typescript
async function saveReviewResult(
  item: VocabItem,
  meta: {
    jp: string
    mode: ReviewMode
    wrongCount: number
    levelBefore: number
    levelAfter: number
    dueAfter: number
  },
  fullDb: VocabItem[]
): Promise<void>
```

---

### `downloadAccountData()`
Descarga el progreso completo del usuario (vocabulario + configuración).

```typescript
async function downloadAccountData(): Promise<{
  vocab: VocabProgressRow[]
  settings: UserSettingsRow
} | null>
```

---

### `fetchSchoolVocabSample(sampleSize)`
Obtiene una muestra del vocabulario escolar para usar como contexto en el prompt de Gemini.

```typescript
async function fetchSchoolVocabSample(sampleSize = 30): Promise<
  Array<{ jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }>
>
// Selecciona palabras activas del usuario mezcladas con palabras del diccionario
// para dar contexto variado a Gemini al generar oraciones
```

---

## lib/store.tsx

### `applyReviewResult(jp, mode, wrongCount)`
Acción del store que actualiza el SRS en memoria y persiste en Supabase con retry automático.

```typescript
// Dispatch en el componente:
applyReviewResult('食べる', 'reading', 0)

// Internamente:
// 1. applyResult(item, mode, wrongCount) → nuevo estado local
// 2. dispatch SET_DB con el nuevo estado
// 3. withRetry(3 intentos) → saveReviewResult() en Supabase
// 4. Si falla: pendingWrites++ y marca pendingSyncRef
// 5. Al recuperar conexión: sync completo del DB
```

---

### `masterVocabItem(jp)`
Marca una palabra como dominada (nivel 8 Enlightened).

```typescript
async function masterVocabItem(jp: string): Promise<void>
// 1. masterItem(item) → todos los modos a nivel 8
// 2. dispatch SET_DB
// 3. upsertVocabItem() en Supabase
// 4. vocabXpForResult(8, true) → XP concedida
// 5. applyXp() + upsertUserProgression()
```

---

### `withRetry(fn)` (función interna)
Reintenta una función async con backoff exponencial.

```typescript
async function withRetry<T>(fn: () => Promise<T>): Promise<T>
// Reintentos: 3 (delays: 2s, 6s, 18s)
// Lanza el último error si todos fallan
```
