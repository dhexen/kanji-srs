# Kanji SRS

App de repetición espaciada para aprender japonés (vocabulario, kana,
gramática, lecturas) con IA de Gemini y varios usuarios. Next.js 14 (App
Router, React 18) + Tailwind en Vercel, datos y auth en Supabase.

**Este archivo es el mapa: úsalo en vez de recorrer el proyecto.** Para el
detalle hay documentación en `docs/` (empieza por `DOCUMENTATION.md`,
que es el índice): `02-architecture` (tablas), `03-components`,
`04-api`, `07-srs-system`, `08-i18n`. Lee solo lo que toque la tarea. Si un
cambio deja este mapa desfasado (ruta nueva, decisión de diseño), actualízalo
en el mismo cambio.

## Comandos

- `npm run dev` — servidor local; `npm run build` — build de producción.
- `npx tsc --noEmit` — comprobar tipos. **No hay tests** ni linter.
- `scripts/` — sueltos y manuales: `import-vocab.ts`, `ordenar-catalogo.mjs`,
  `copiar-catalogo.mjs`, `compare-gemini-quality.ts`, `test-gemini-models.sh`,
  `wk-descargar.mjs` (copia de solo lectura de WaniKani) y `wk-aplicar.mjs`
  (escribe sinónimos y notas en español en WaniKani; ensayo en seco salvo
  `--aplicar`, exige copia previa; necesita `WK_API_KEY`) y `wk-diario.mjs`
  (rutina diaria en GitHub Actions, `.github/workflows/wk-diario.yml`: traduce con `claude -p` las fichas nuevas de WaniKani sin
  «[ES]» y las escribe; `--seco` solo lista).

## Dónde está cada cosa

- `app/` — páginas: `review` y `study` (SRS de vocabulario), `grammar` y
  `grammar-test` (gramática; la «TEST» es una copia aislada con su propia
  capa de datos), `catalogo` (gramática del JLPT, solo mirar y practicar),
  `kana`, `context` (lecturas con IA), `import` (importador IA), `vocabulary`,
  `stats`, `progress`, `admin`, `login`, `guia-usuario`.
- `app/api/` — `gemini` (proxy, la clave va en servidor), `tts`, `wanikani`,
  `vocab`, `ranking`, `user`, `admin/*`, `cron/grammar-refresh` (diario 03:00,
  ver `vercel.json`).
- `lib/` — la lógica:
  - Datos: `supabase.ts` (cliente y casi todas las funciones de datos, 92 KB),
    `admin-server.ts` (service_role, solo servidor), `admin-client.ts`.
  - SRS: `srs.ts` (vocabulario), `grammar-srs.ts`, `catalogo-srs.ts`,
    `progression.ts` (XP y niveles), `progress.ts`, `store.tsx` (estado global).
  - IA: `gemini-fetch.ts` (llamada con cadena de modelos de reserva),
    `gemini-models.ts`, `grammar-seed-core.ts`, `grammar-refresh-core.ts`.
  - Contenido: `grammar-mnn1/2/c1.ts` y `grammar-bunpro.ts` (datos enormes,
    200 KB: no los leas enteros), copias `grammar-test-*`, `catalogo*.ts`,
    `kana-data.ts`, `verb-pairs.ts`.
  - UI: `i18n.ts` (ES/CA/EN/JA), `dashboard.ts` (filas personalizables),
    `changelog.ts`, `onboarding.ts`, `help-context.tsx`.
- `components/` — por sección, igual que `app/`; `ui/` lo genérico.
- `supabase/migrations/NNN_*.sql` — 48 migraciones numeradas, se aplican a
  mano en el SQL Editor y en orden. La siguiente es la `049`. Los `supabase-*.sql`
  de la raíz son parches antiguos.

## Decisiones que no se ven en el código

- Roles: `user` (no ve Gramática ni Lecturas IA), `contributor`, `admin`
  (exige MFA). Hay «Simular rol» en el menú Admin. El respaldo de admin es
  `NEXT_PUBLIC_ADMIN_EMAILS`.
- La service_role solo en rutas de servidor (`/api/admin/*`); nunca al cliente.
- El catálogo (`catalogo*.ts`, `catalogo-buscar/diff`) está copiado del
  proyecto Hellotalk; si se arregla allí, conviene arreglarlo aquí.
- Los repasos dejan un log append-only y snapshots cada 25 repasos.
- Se dejó de generar frases con IA (commit «No generar más frases con IA»).

## Cómo se trabaja aquí

- Todo en castellano: comentarios, commits, textos al usuario.
- Los comentarios explican el **porqué**, no el qué.
- La interfaz va en cuatro idiomas vía `lib/i18n.ts`: un texto nuevo se añade
  en los cuatro.
- Commits: título corto en castellano que describe el efecto.
- Cuota de Gemini (capa gratuita): 20 peticiones/día **por modelo**. Si un
  modelo da 429 `PerDay`, se cambia de modelo (`gemini-fetch.ts` ya lo hace
  con la cadena de reserva); esperar no sirve. No gastar peticiones reales en
  pruebas.
- Si algo «no sale en la web», mirar push y despliegue de Vercel antes de
  depurar código.
- `.env.local` tiene claves reales: no lo leas ni lo imprimas.
- Un hook (`.claude/hooks/comprobar.sh`) pasa `tsc` al final de cada turno
  en que haya cambiado código; si falla, arréglalo antes de terminar.
