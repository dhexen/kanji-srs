# 02 — Arquitectura y Base de Datos

## Arquitectura general

```
Browser
  │
  ├── Next.js App Router (SSR + Client Components)
  │     ├── /app/*          → Server Components (thin, no logic)
  │     ├── components/*    → Client Components ('use client')
  │     └── /app/api/*      → Route Handlers (server-side API)
  │
  └── Supabase (BaaS)
        ├── Auth (JWT + OAuth Google + Magic Link)
        ├── PostgreSQL (RLS habilitado)
        └── REST API (PostgREST + schema cache)

External APIs (llamadas desde el servidor o desde el cliente con key propia):
  ├── Google Gemini 2.5 Flash  → generación de oraciones y clasificación
  ├── Google Cloud TTS          → audio de pronunciación
  ├── Pexels API                → imágenes de vocabulario
  └── WaniKani API v2           → vocabulario externo
```

## Estado global (`lib/store.tsx`)

El estado de la aplicación se gestiona con `useReducer` + `Context API`. No se usa Redux ni Zustand.

```typescript
interface State {
  db: VocabItem[]            // Vocabulario del usuario (en memoria)
  user: { email, id } | null
  role: 'admin' | 'contributor' | 'user'
  simulatedRole: ...         // Solo para admin: simular rol de usuario
  syncing: boolean
  loaded: boolean
  geminiApiKey: string       // Key del usuario (preferida sobre servidor)
  pexelsApiKey: string
  waniKaniApiKey: string
  showSharedSentences: boolean
  contextTexts: ContextText[]
  lang: 'es' | 'ca' | 'en' | 'ja'
  progression: UserProgression  // XP + niveles
  pendingLevelUp: LevelUpEvent | null
  isOnline: boolean          // Estado de red del navegador
  pendingWrites: number      // Cambios pendientes de sincronizar
}
```

**Acciones relevantes:**
- `SET_DB` — reemplaza vocabulario completo
- `ADD_ITEMS` — añade nuevas palabras
- `APPLY_RESULT` — actualiza SRS de una palabra tras respuesta
- `SET_ONLINE` / `SET_PENDING_WRITES` — estado de red
- `SET_PROGRESSION` — actualiza XP/niveles

**Persistencia:**
- Los cambios en `APPLY_RESULT` se persisten en Supabase vía `withRetry()` (3 reintentos: 2s, 6s, 18s)
- Si todos los reintentos fallan, `pendingWrites` se incrementa y se intenta un sync completo al recuperar conexión

## Tablas de base de datos

### Tablas de usuario

```sql
-- Progreso SRS por palabra y modo
user_vocab_progress (
  user_id UUID,
  jp TEXT,                    -- clave: la palabra japonesa
  status TEXT,                -- 'locked' | 'active'
  srsLevel INT,               -- nivel global (máx del cualquier modo)
  srs_multi_level INT,        -- nivel modo multimodal
  srs_meaning_level INT,
  srs_kanji_level INT,
  srs_reading_level INT,
  srs_reverse_level INT,
  srs_*_due BIGINT,          -- timestamps de próximo repaso
  PRIMARY KEY (user_id, jp)
)

-- Configuración por usuario
user_settings (
  user_id UUID PRIMARY KEY,
  gemini_api_key TEXT,
  pexels_api_key TEXT,
  wanikani_api_key TEXT,
  wanikani_min_srs_stage INT DEFAULT 5,
  show_shared_sentences BOOLEAN DEFAULT TRUE,
  context_texts JSONB,        -- últimas 10 frases generadas
  language TEXT DEFAULT 'es',
  tour_v3_done BOOLEAN DEFAULT FALSE,
  reviews_since_snapshot INT DEFAULT 0
)

-- Snapshots de seguridad (máx 10 por usuario, trigger de poda)
srs_progress_snapshots (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  snapshot JSONB,             -- array completo de VocabItem
  reason TEXT,                -- 'scheduled' | 'legacy_migration' | 'manual'
  word_count INT,
  created_at TIMESTAMPTZ
)

-- Auditoría inmutable de repasos
srs_review_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  jp TEXT,
  mode TEXT,
  wrong_count INT,
  level_before INT,
  level_after INT,
  due_after BIGINT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
)

-- Roles
user_roles (
  user_id UUID PRIMARY KEY,
  role TEXT DEFAULT 'user'    -- 'admin' | 'contributor' | 'user'
)

-- Progresión XP
user_progression (
  user_id UUID PRIMARY KEY,
  vocab_xp INT DEFAULT 0,
  grammar_xp INT DEFAULT 0,
  total_xp INT DEFAULT 0,
  vocab_level INT DEFAULT 1,
  grammar_level INT DEFAULT 1,
  total_level INT DEFAULT 1
)
```

### Vocabulario compartido (diccionario)

```sql
-- Vocabulario oficial del currículo japonés
vocabulary (
  word TEXT,                  -- palabra japonesa (ej: 食べる)
  kanji TEXT,                 -- kanji principal (ej: 食)
  reading TEXT,               -- lectura hiragana (ej: たべる)
  meaning_es TEXT,
  meaning_ca TEXT,
  meaning_en TEXT,
  grade INT,                  -- grado escolar (1-9)
  sort_order INT,
  is_official BOOLEAN DEFAULT TRUE,
  word_type TEXT,             -- 'noun' | 'verb_transitive' | etc.
  category TEXT,              -- 'animals' | 'food' | etc.
  image_url TEXT,
  image_search_term TEXT,
  PRIMARY KEY (word, kanji)   -- misma palabra puede tener kanjis distintos
)

-- Pares de antónimos (alto ↔ bajo)
vocab_antonyms (
  id BIGSERIAL PRIMARY KEY,
  word_a TEXT,
  word_b TEXT,
  UNIQUE (word_a, word_b),
  UNIQUE (word_b, word_a)     -- constraint bidireccional
)

-- Reportes de errores en vocabulario
vocab_reports (
  id UUID PRIMARY KEY,
  word TEXT,
  field TEXT,                 -- 'reading' | 'meaning' | 'kanji' | 'general'
  description TEXT,
  user_email TEXT,
  status TEXT DEFAULT 'open', -- 'open' | 'resolved'
  created_at TIMESTAMPTZ
)
```

### Gramática

```sql
-- Progreso SRS por punto gramatical
grammar_srs_progress (
  user_id UUID,
  grammar_id TEXT,            -- ej: 'mnn1-01-1'
  level INT DEFAULT 0,        -- 0-7 (8 reservado para niveles especiales)
  next_review BIGINT DEFAULT 0,
  PRIMARY KEY (user_id, grammar_id)
)

-- Estado "conocido" del usuario (independiente del SRS)
user_grammar_progress (
  user_id UUID,
  grammar_id TEXT,
  known BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, grammar_id)
)

-- Pool compartido de oraciones de fill-in-the-blank (máx 100 por grammar_id)
grammar_sentences (
  id UUID PRIMARY KEY,
  grammar_id TEXT,
  sentence_before TEXT,          -- texto antes del hueco (kanji)
  sentence_before_reading TEXT,  -- en kana puro
  sentence_before_alts TEXT[],   -- hasta 4 variantes alternativas
  sentence_before_reading_alts TEXT[],
  sentence_after TEXT,
  sentence_after_reading TEXT,
  answer TEXT,                   -- SOLO la respuesta (kana, nunca kanji)
  answer_alts JSONB,             -- variantes aceptables
  translation_es TEXT,
  translation_ca TEXT,
  translation_en TEXT,
  validated BOOLEAN DEFAULT FALSE,
  validated_by UUID,
  created_at TIMESTAMPTZ
)

-- Ejemplos personales generados por IA (máx 10 por usuario×punto)
user_grammar_examples (
  id UUID PRIMARY KEY,
  user_id UUID,
  grammar_id TEXT,
  jp JSONB,                   -- array de tokens coloreados
  translation JSONB,
  created_at TIMESTAMPTZ
)

-- Oraciones compartidas por usuarios (persistentes, sin límite)
user_shared_sentences (
  id UUID PRIMARY KEY,
  grammar_id TEXT,
  shared_by UUID,
  sentence_before TEXT,
  sentence_before_reading TEXT,
  sentence_before_alts TEXT[],
  sentence_before_reading_alts TEXT[],
  sentence_after TEXT,
  sentence_after_reading TEXT,
  answer TEXT,
  answer_alts TEXT[],
  translation_es TEXT,
  translation_ca TEXT,
  translation_en TEXT,
  grammar_jlpt TEXT,
  vocab_words TEXT[],
  topic TEXT,
  shared_at TIMESTAMPTZ
)
```

### WaniKani

```sql
wanikani_user_vocab (
  user_id UUID,
  wanikani_id INT,
  word TEXT,
  reading TEXT,
  meaning_en TEXT,
  meaning_es TEXT,
  meaning_ca TEXT,
  level INT,
  srs_stage INT,
  synced_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, wanikani_id)
)
```

### Configuración global

```sql
app_config (
  key TEXT PRIMARY KEY,
  value JSONB,                -- para 'srs_intervals': [0, 14400000, ...]
  updated_at TIMESTAMPTZ
)
```

## Políticas de seguridad (RLS)

Todas las tablas de usuario tienen RLS habilitado. El patrón estándar es:

```sql
-- Lectura: solo los propios datos
CREATE POLICY "read_own" ON table_name
  FOR SELECT USING (user_id = auth.uid());

-- Escritura: solo los propios datos
CREATE POLICY "write_own" ON table_name
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Las rutas API de administración usan el **service role** (que bypassa RLS) y verifican el rol del usuario en `user_roles` antes de proceder.

## Flujo de sincronización

```
Usuario responde → applyResult() en SRS local
      ↓
Dispatch APPLY_RESULT → state.db actualizado (inmediato)
      ↓
runPersist() → withRetry(3 intentos: 2s, 6s, 18s)
      ↓
  ┌──────────────────────────────────────┐
  │ Éxito: saveReviewResult() en Supabase│
  │  ├── Actualiza user_vocab_progress   │
  │  ├── Inserta en srs_review_log       │
  │  └── Snapshot si reviews_since = 25 │
  └──────────────────────────────────────┘
      ↓ Si falla tras 3 intentos:
  pendingWrites++ → banner en sidebar
      ↓ Cuando navigator.onLine = true:
  upsertVocabItems(db completo) → sync completo
```
