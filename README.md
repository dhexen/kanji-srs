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

Asegúrate de tener esta tabla en tu proyecto Supabase:

```sql
create table public.srs_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  vocab_db jsonb not null default '[]',
  updated_at timestamptz default now()
);

alter table public.srs_progress enable row level security;

create policy "Users can manage their own progress"
  on public.srs_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

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
