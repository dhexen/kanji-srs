# 🌸 Kanji SRS

App de repetición espaciada para aprender kanjis japoneses con IA (Gemini) y sincronización multiusuario (Supabase).

## Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (auth + base de datos)
- **Gemini API** (IA para importar vocabulario y generar textos)

## Puesta en marcha

### 1. Instalar Node.js
Descarga e instala desde https://nodejs.org (versión LTS recomendada)

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de entorno
El archivo `.env.local` debe incluir:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # Panel Admin: crear/eliminar usuarios y restaurar backups
GEMINI_API_KEY=tu_key_aqui      # opcional, servidor
NEXT_PUBLIC_ADMIN_EMAILS=tu@email.com   # emails admin separados por coma (fallback si user_roles no tiene fila)
```

La **service role** solo se usa en rutas API del servidor (`/api/admin/*`). No la expongas en el cliente.

### 4. Arrancar en local
```bash
npm run dev
```
Abre http://localhost:3000

## Deploy en Vercel

1. Crea cuenta en https://vercel.com
2. Conecta tu repositorio de GitHub
3. En Vercel, añade las variables de entorno de `.env.local`
4. Deploy automático en cada `git push`

## Base de datos Supabase

Ejecuta el script de migración en el SQL Editor de Supabase:

- `supabase/migrations/001_vocab_progress_schema.sql`
- `supabase/migrations/002_admin_policies.sql`

Crea estas tablas:

- **`user_vocab_progress`** — una fila por palabra y usuario (lectura/escritura rápida al repasar)
- **`user_settings`** — API key Gemini, idioma, textos de contexto (sin tocar el progreso)
- **`srs_review_log`** — auditoría de cada acierto/fallo SRS
- **`srs_progress_snapshots`** — copias de seguridad del vocabulario completo (se conservan las 10 más recientes)

Al iniciar sesión, si `user_vocab_progress` está vacío pero existe `srs_progress.vocab_db` (esquema antiguo), la app migra los datos automáticamente.

La tabla legacy `srs_progress` puede mantenerse como respaldo; la app ya no escribe en `vocab_db`.

## Estructura del proyecto

```
app/                  → Páginas (Next.js App Router)
  review/             → Repaso SRS con selector de modos
  study/              → Estudiar nuevas palabras
  import/             → Importador IA (Gemini)
  context/            → Generador de textos en japonés
  stats/              → Estadísticas, auth y vocabulario
  api/gemini/         → API route (Gemini, key en servidor)

components/
  ui/                 → Header, Nav, Toast, ConfirmDialog
  review/             → ModeSelector, QuestionCard, SessionComplete
  study/              → StudyClient
  import/             → ImportClient
  context/            → ContextClient
  stats/              → StatsClient

lib/
  srs.ts              → Lógica SRS, tipos, constantes
  supabase.ts         → Cliente Supabase
  store.tsx           → Estado global (React Context)
```
"# kanji-srs" 
"# kanji-srs" 
"# kanji-srs" 
"# kanji-srs" 
