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
El archivo `.env.local` ya tiene las credenciales de Supabase configuradas.  
Si quieres añadir tu propia API Key de Gemini en el servidor:
```
GEMINI_API_KEY=tu_key_aqui
```

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

`supabase/migrations/001_vocab_progress_schema.sql`

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
