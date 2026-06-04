# 05 — Flujos de Usuario

## Flujo 1: Primer uso (onboarding)

```
1. Usuario llega a la web → redirigido a /login
2. Inicia sesión (Google, Magic Link o email/password)
3. ProductTour se inicia automáticamente
   ├── Presenta la web y sus funciones
   ├── Señala el panel "QuickAdd" para añadir primeras palabras
   └── Guía a través de la primera sesión de repaso

4. Usuario añade su primer lote de kanjis (ej: 3 kanjis del grado 1)
   └── QuickAddPanel → getNextNewVocab() → addVocabItems() → vocabulario activado

5. Inicia su primera sesión de repaso
   ├── ModeSelector → selecciona modos y palabras
   ├── QuestionCard → 5-20 preguntas de SRS
   └── SessionComplete → estadísticas + previsión de próximos 7 días

6. Tour continúa: explica modos de repaso y secciones del dashboard
7. Tour completado → guardado en DB y localStorage
```

---

## Flujo 2: Sesión diaria de repasos

```
1. Usuario accede a /review
2. Badge en el nav muestra número de repasos pendientes (next_review ≤ now)
3. ModeSelector muestra tarjetas por modo con conteo de pendientes
4. Usuario selecciona modos y hace click en "Iniciar repaso"
5. Se genera la cola de sesión (orderByMode: multi → meaning → reading → kanji → reverse)

Para cada pregunta:
  ├── Se muestra QuestionCard con el modo correspondiente
  ├── Usuario responde (selección múltiple, input hiragana, o "papel")
  ├── Feedback inmediato: correcto/incorrecto + respuesta correcta
  ├── XP calculado y mostrado (toast)
  ├── Toast de cambio de nivel (↑ o ↓)
  └── Si incorrecto: la palabra se re-encola al final

Al completar la sesión:
  ├── SessionComplete muestra estadísticas
  ├── SRS actualizado (level ±N según wrongCount)
  ├── Snap automático si reviews_since = 25
  ├── XP guardado en progression
  └── Pronóstico de próximos 7 días
```

---

## Flujo 3: Añadir vocabulario nuevo

```
Opción A — QuickAddPanel (repasos):
  1. Click en "+" en la página de repasos
  2. Panel muestra siguiente lote disponible (3, 5, 10, 20 palabras)
  3. Click en el lote → palabras añadidas y activadas
  4. Aparecen en la cola de la próxima sesión

Opción B — Vocabulario por grado:
  1. Navegar a /vocabulary
  2. Pestaña "Glosario" → seleccionar grado (1-9)
  3. Buscar palabras → añadir individualmente

Opción C — Importador IA (/import):
  1. Describir tema en lenguaje natural (ej: "palabras de cocina japonesa")
  2. Gemini genera lista de palabras del currículo relevantes
  3. Confirmar importación
```

---

## Flujo 4: Práctica de gramática

```
1. Navegar a /grammar
2. Filtrar por libro (MNN1/2/C1) y nivel JLPT
3. Click en un punto gramatical → GrammarDetail
   └── Muestra: patrón, estructura, ejemplo con furigana, explicación

4. Click "Practicar" → GrammarPractice
   ├── Si no hay oraciones: Gemini genera 25 nuevas (filtradas por calidad ≥4)
   │   └── Oraciones guardadas en grammar_sentences (pool compartido)
   └── Si hay oraciones: selecciona 5 del pool

5. 5 preguntas de fill-in-the-blank:
   ├── [texto antes] ____ [texto después]
   ├── Usuario escribe la respuesta en hiragana
   ├── Verificación: acepta variantes (kanji/kana, honoríficos)
   └── Feedback inmediato con traducción

6. Resultado de sesión (≥60% correcto = "aprobado")
   ├── SRS actualizado: level +1 (aprobado) o level -1 (suspenso)
   ├── next_review calculado: 4h, 12h, 1d, 3d, 1s, 2s, 1m
   ├── XP gramática ganado
   └── Si primer repaso: markGrammarAsStudying() → aparece en cola SRS

7. El punto aparece en "Estudiando" y en cola de repaso cuando vence
```

---

## Flujo 5: Repaso de gramática (cola SRS)

```
1. En /grammar, aparece banner "⏰ N puntos de gramática vencidos hoy"
2. Click "▶ Iniciar Repaso" → GrammarSrsQueue
3. Itera por cada punto vencido:
   ├── Carga GrammarPractice con oraciones del pool compartido
   ├── Sesión de 5 preguntas
   ├── SRS actualizado al finalizar
   └── Pasa al siguiente punto
4. Al terminar todos: pantalla de celebración 🎉
```

---

## Flujo 6: Backup y restauración

```
Backup automático:
  └── Cada 25 repasos → snapshot automático en srs_progress_snapshots

Backup manual:
  1. /stats → pestaña Cuenta
  2. "Crear copia de seguridad" → snapshot manual con reason='manual'

Restauración:
  1. Admin → pestaña Usuarios → buscar usuario
  2. Ver snapshots disponibles
  3. Click "Restaurar" → confirmar
  4. El vocabulario del usuario se reemplaza con el snapshot
```

---

## Flujo 7: Integración WaniKani

```
1. /stats → pestaña Configuración
2. Pegar WaniKani API Key
3. Seleccionar nivel SRS mínimo (ej: Guru = 5+)
4. Click "Sincronizar WaniKani"
5. POST /api/wanikani/sync:
   ├── Obtiene todos los subjects (vocabulario)
   ├── Filtra por srs_stage ≥ minStage
   ├── Traduce significados al ES/CA con Gemini
   └── Guarda en wanikani_user_vocab
6. El vocabulario WaniKani está disponible como contexto en la generación de oraciones de gramática
```

---

## Flujo 8: Generación de texto en contexto

```
1. Navegar a /context
2. Configurar parámetros (tema, nivel, longitud)
3. Click "Generar" → llamada a Gemini
4. El prompt incluye las últimas palabras activas del usuario como contexto
5. El texto generado aparece con furigana y traducción
6. Se guarda en user_settings.context_texts (máx 10 histórico)
```

---

## Flujo 9: Administración de vocabulario (admin)

```
1. Admin → pestaña Clasificación
2. Configurar Gemini API Key y Pexels API Key
3. Click "Clasificar lote (35 palabras)"
4. Gemini clasifica cada palabra:
   ├── word_type: noun, verb_transitive, verb_intransitive, adj_i, adj_na, etc.
   ├── category: animals, food, nature, etc.
   ├── imageable: true/false
   ├── image_search_term: término en inglés para Pexels
   └── antonym: palabra contraria si existe en el currículo

5. Para palabras con imageable=true: Pexels busca y guarda imagen
6. Para antónimos detectados: se insertan en vocab_antonyms
7. Lote procesado. Repetir hasta pending=0.
```

---

## Flujo 10: Reporte y moderación de imágenes

```
Usuario durante un repaso:
  1. Ve la imagen de una palabra
  2. La imagen es incorrecta o confusa → pulsa 👎
  3. submitImageVote(word, -1) → guardado en vocab_image_votes

Admin en panel Admin → Clasificación → "Cargar reportes":
  1. Ve la lista de palabras con más votos negativos que positivos
  2. Para cada imagen reportada:
     ├── Opción A: "Buscar nueva imagen" → introduce URL de Pexels → actualiza vocabulary.image_url
     └── Opción B: "Aceptar imagen" → la marca como correcta (no vuelve a aparecer en reportes)
```

---

## Flujo 11: Validación de oraciones de gramática (admin/contributor)

```
Admin o Contributor durante una sesión de práctica de gramática:
  1. Ve una oración generada por IA
  2. En el panel de editor (visible solo para admin/contributor):
     ├── Lee la oración y comprueba que es correcta gramaticalmente
     ├── Si correcta: pulsa "✓ Validar" → validated=true en grammar_sentences
     └── Si incorrecta o mejorable:
           ├── "Editar" → modifica texto, respuesta o traducción
           └── "Eliminar" → la borra del pool compartido

Las oraciones validadas:
  - Aparecen en las sesiones con prioridad (antes que las no validadas)
  - Se muestran con un badge verde en el panel de editor
  - Son más "seguras" para los usuarios porque han sido revisadas por un profesor
```

---

## Flujo 12: El pool compartido de oraciones

```
Usuario A (con API Key de Gemini):
  1. Accede a gramática, punto "〜ています"
  2. No hay oraciones → Gemini genera 25 nuevas
  3. Las oraciones se guardan en grammar_sentences (pool compartido)

Usuario B (sin API Key de Gemini):
  1. Accede al mismo punto gramatical
  2. Encuentra las 25 oraciones que generó el Usuario A
  3. Puede practicar inmediatamente sin necesitar su propia API Key
  4. Sus respuestas no borran las oraciones del pool

Admin/Contributor:
  5. Revisa y valida las oraciones del pool
  6. Las validadas tienen prioridad en futuras sesiones de todos los usuarios

Límite del pool: máximo 100 oraciones por punto gramatical.
Cuando se supera: las más antiguas se eliminan automáticamente.
```

---

## Flujo 13: Compartir una oración con la comunidad

```
Usuario durante una sesión de gramática:
  1. Responde correctamente una oración
  2. En la pantalla de feedback aparece el botón "🌐 Compartir con la comunidad"
  3. Click → shareGrammarSentence() → guardado en user_shared_sentences

Otros usuarios:
  4. Ven la oración compartida en sus sesiones de práctica
     (si tienen activado "Mostrar oraciones compartidas" en Configuración)
  5. Las oraciones compartidas aparecen con una etiqueta "🌐" identificativa
  6. Prioridad en sesión: validadas > compartidas > generadas por IA
```

---

## Flujo 14: Reporte de errores de vocabulario

```
Usuario durante un repaso:
  1. Ve que la lectura o significado de una palabra es incorrecto
  2. Pulsa el icono de reporte (bandera) en la tarjeta de pregunta
  3. Selecciona qué está mal: Lectura / Significado / Kanji / General
  4. Escribe una descripción opcional y pulsa "Enviar"
  5. submitVocabReport() → guardado en vocab_reports con status='open'

Admin en panel Admin → Vocabulario → "Cargar reportes":
  6. Ve los reportes agrupados por palabra
  7. Lee la descripción del error
  8. En el panel de edición:
     ├── Corrige la lectura y/o el significado directamente
     ├── Pulsa "💾 Guardar y resolver"
     └── Todos los reportes abiertos de esa palabra se marcan como 'resolved'
  O bien:
     └── Marca el reporte como "✓ Resolver" sin editar (si considera que era incorrecto)
```

---

## Flujo 15: Reporte de bugs y mejoras

```
Cualquier usuario:
  1. Pulsa el botón "🐛 Reportar" en la barra superior
  2. Se abre FeedbackModal
  3. Describe el problema o sugerencia (campo de texto libre)
  4. La URL actual se adjunta automáticamente al reporte
  5. submitFeedbackReport() → guardado en feedback_reports

Admin en panel Admin → Feedback:
  6. Ve todos los reportes con su descripción y URL
  7. Puede marcar como "Resuelto" o "Cerrado"
  8. Los reportes agrupados por página ayudan a identificar problemas recurrentes
```
