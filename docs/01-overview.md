# 01 — Resumen del Proyecto

## ¿Qué es Kanji SRS?

**Kanji SRS** es una aplicación web de aprendizaje de japonés que combina un sistema de repetición espaciada (SRS) con inteligencia artificial para acelerar la adquisición de vocabulario y gramática. Está pensada para estudiantes que quieren llevar un seguimiento riguroso de su progreso basado en el currículo escolar japonés (grados 1–9).

## Características principales

| Área | Descripción |
|------|-------------|
| **Vocabulario SRS** | 5 modos de repaso (lectura, significado, kanji, reverse, multimodal) con 9 niveles al estilo WaniKani |
| **Gramática con IA** | Fill-in-the-blank generado por Google Gemini; pool compartido de oraciones entre usuarios |
| **Lectura en contexto** | Generación de textos con el vocabulario dominado del usuario |
| **Aprendizaje de kana** | Hiragana y katakana con nemotécnica visual y test |
| **Integración WaniKani** | Importa el vocabulario sincronizado desde WaniKani |
| **Multi-idioma** | Interfaz en Español, Catalán, Inglés y Japonés |
| **Progresión con XP** | Sistema de niveles independiente para vocabulario y gramática |
| **Auditoría completa** | Log append-only + snapshots automáticos cada 25 repasos |

## Stack tecnológico

```
Frontend:   Next.js 14 + React 18 + Tailwind CSS
Backend:    Supabase (PostgreSQL + Auth + RLS)
IA:         Google Gemini 2.5 Flash
Audio:      Google Cloud Text-to-Speech
Imágenes:   Pexels API
WaniKani:   WaniKani API v2
Japonés:    Wanakana (conversión kana ↔ romaji)
Tour:       Componentes propios (sin librería) — ver HelpDrawer y OnboardingTour en docs/03-components.md
```

## Estructura de carpetas

```
kanji-srs/
├── app/                    # Páginas y rutas API (Next.js App Router)
│   ├── admin/             # Panel de administración
│   ├── api/               # 25 endpoints REST
│   │   ├── admin/         # Endpoints de administración
│   │   ├── gemini/        # Proxy a Google Gemini
│   │   ├── tts/           # Text-to-Speech
│   │   ├── vocab/         # API pública de vocabulario
│   │   └── wanikani/      # Sincronización WaniKani
│   ├── auth/              # Callback de OAuth
│   ├── context/           # Lectura en contexto con IA
│   ├── grammar/           # Práctica de gramática
│   ├── grammar-test/      # Test de gramática
│   ├── import/            # Importador IA de vocabulario
│   ├── kana/              # Aprendizaje de hiragana/katakana
│   ├── login/             # Autenticación
│   ├── progress/          # Progreso detallado por palabra
│   ├── review/            # Sesiones de repaso SRS
│   ├── stats/             # Estadísticas y perfil
│   ├── study/             # Estudio de palabras nuevas
│   ├── vocabulary/        # Glosario + antónimos + transitivos
│   ├── globals.css        # Estilos globales y animaciones
│   ├── layout.tsx         # Layout raíz de la aplicación
│   └── page.tsx           # Redirige a /login
│
├── components/             # Componentes React reutilizables
│   ├── admin/             # Componentes del panel admin
│   ├── context/           # Componente de lectura IA
│   ├── grammar/           # Componentes de gramática
│   ├── grammar-test/      # Test de gramática
│   ├── import/            # Importador IA
│   ├── kana/              # Hiragana/katakana
│   ├── progress/          # Vista de progreso
│   ├── progression/       # XP, niveles, toasts
│   ├── review/            # Repasos SRS
│   ├── stats/             # Estadísticas
│   ├── study/             # Estudio nuevas palabras
│   ├── ui/                # Componentes UI genéricos
│   └── vocabulary/        # Glosario, antónimos, transitivos
│
├── lib/                    # Lógica de negocio compartida
│   ├── srs.ts             # Sistema SRS para vocabulario
│   ├── grammar-srs.ts     # Sistema SRS para gramática
│   ├── progression.ts     # XP y niveles
│   ├── store.tsx          # Estado global (Context + useReducer)
│   ├── supabase.ts        # Cliente BD + todas las funciones de datos
│   ├── admin-server.ts    # Funciones admin (server-side)
│   ├── admin-client.ts    # Funciones admin (client-side)
│   ├── i18n.ts            # Traducciones (ES/CA/EN/JA)
│   ├── theme.ts           # Sistema de temas
│   ├── sidebar-context.tsx # Contexto del sidebar
│   ├── grammar-mnn1.ts    # Puntos gramaticales MNN nivel 1
│   ├── grammar-mnn2.ts    # Puntos gramaticales MNN nivel 2
│   ├── grammar-mnnc1.ts   # Puntos gramaticales MNN Chūkyū I
│   └── grammar-bunpro.ts  # Puntos gramaticales BunPro (N5-N1)
│
├── supabase/
│   └── migrations/        # 17 scripts SQL (aplicar en orden)
│
├── docs/                   # Documentación técnica (este directorio)
├── DOCUMENTATION.md        # Índice de documentación técnica
└── GUIA_DE_USUARIO.md      # Guía de usuario no técnica
```

## Variables de entorno requeridas

```env
# Supabase (obligatorias)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Solo en servidor

# APIs opcionales (o el usuario aporta la suya)
GEMINI_API_KEY=AIza...
PEXELS_API_KEY=...
```

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `user` | Repasos, vocabulario, kana, estadísticas propias. **No ve Gramática ni Lecturas IA** (secciones aún no pulidas, ocultas de la navegación y del dashboard, y bloqueadas si se accede directamente por URL — ver `RoleGate` en `docs/03-components.md`) |
| `contributor` | Todo lo anterior + Gramática y Lecturas IA + editar/validar oraciones de gramática |
| `admin` | Todo lo anterior + panel de administración completo (requiere MFA) |

Un `admin` puede "Simular rol" (menú 🔧 Admin del Header) para previsualizar la navegación y el dashboard tal como los ve `contributor` o `user`, incluyendo el ocultado de Gramática/Lecturas IA.
