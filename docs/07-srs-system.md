# 07 — Sistema SRS (Repetición Espaciada)

## Vocabulario SRS

El sistema de vocabulario SRS está inspirado en WaniKani y usa **9 niveles** (más el nivel 0 para palabras no estudiadas y el nivel 9 "Quemado").

### Niveles y tiempos de espera

| Nivel | Nombre | Espera por defecto |
|-------|--------|-------------------|
| 0 | Sin estudiar | — |
| 1 | Aprendiz 1 | 4 horas |
| 2 | Aprendiz 2 | 8 horas |
| 3 | Aprendiz 3 | 1 día |
| 4 | Aprendiz 4 | 2 días |
| 5 | Gurú 1 | 1 semana |
| 6 | Gurú 2 | 2 semanas |
| 7 | Maestro | 1 mes |
| 8 | Iluminado | 4 meses |
| 9 | Quemado | ∞ (sin más repasos) |

Los tiempos son configurables por el admin en el panel de Administración → Sistema.

### Modos de repaso

Cada palabra tiene **5 modos independientes** con su propio nivel y fecha de próximo repaso:

| Modo | Descripción | Input |
|------|-------------|-------|
| `multi` | Ver el kanji, elegir la lectura correcta | Selección múltiple |
| `meaning` | Ver el kanji, elegir el significado | Selección múltiple |
| `reading` | Ver el significado, escribir la lectura | Hiragana (con wanakana) |
| `kanji` | Ver el significado, escribir el kanji | Papel (auto-confirmar) |
| `reverse` | Ver el kanji+significado, escribir todo | Papel |

El **nivel global** de una palabra (`srsLevel`) es el mínimo de todos sus modos activos.

### Lógica de actualización

```
Respuesta correcta (wrongCount=0):  newLevel = min(level + 1, 9)
Respuesta incorrecta (wrongCount=N): newLevel = max(level - N, 1)

Si newLevel >= 9 (Quemado): nextReview = ∞ → ya no aparece en repasos
```

El `wrongCount` es el número de veces que el usuario falló una pregunta **dentro de la misma sesión**. Si falla 2 veces, baja 2 niveles.

### Sesión de repaso

1. Se crea la cola con todas las palabras pendientes (next_review ≤ ahora)
2. Se agrupa por modo: multi → meaning → reading → kanji → reverse
3. Dentro de cada modo, orden aleatorio
4. Si se falla una pregunta, **la palabra se añade al final de la cola**
5. Una palabra se marca como "completada" solo cuando se acierta
6. La sesión termina cuando no hay más preguntas en cola

### Función "Ya me lo sé"

Marca la palabra directamente como **Iluminado (nivel 8)**:
- Todos los modos pasan a nivel 8
- Próximo repaso en 4 meses
- La palabra desaparece de la cola actual (incluyendo futuras apariciones)
- Se concede XP equivalente al nivel 8 correcto

---

## Gramática SRS

El SRS de gramática es independiente del de vocabulario. Tiene **8 niveles** (0-7).

### Niveles de gramática

| Nivel | Espera |
|-------|--------|
| 0 | Inmediato (nuevo) |
| 1 | 4 horas |
| 2 | 12 horas |
| 3 | 1 día |
| 4 | 3 días |
| 5 | 1 semana |
| 6 | 2 semanas |
| 7 | 1 mes |

### Lógica de sesión

- 5 preguntas por sesión
- La sesión es "aprobada" si ≥ 60% de respuestas son correctas
- Aprobado: level +1
- Suspenso: level -1
- Nivel 0 con next_review=0 → vencido inmediatamente (recién empezado a estudiar)

### Verificación de respuestas de gramática

El sistema acepta múltiples formas equivalentes de la misma respuesta:
- Kanji y kana del mismo segmento (ej: 私は / わたしは)
- Variantes honoríficas (ej: 食べます / 食べる)
- Variantes de la respuesta en el JSON `answer_alts`

La normalización aplica:
- Katakana → Hiragana
- Eliminar puntuación: 。、！？「」etc.
- Colapsar espacios en blanco
- Trim

---

## Sistema de Snapshots

### Automáticos
Cada 25 repasos completados se crea un snapshot automático del vocabulario del usuario. El trigger en PostgreSQL limita a **máx 10 snapshots por usuario** (borra los más antiguos).

### Manuales
El admin puede crear snapshots desde el panel (Admin → Usuarios → ver snapshots) o el usuario desde /stats → Cuenta.

### Restauración
Solo el admin puede restaurar snapshots. La restauración reemplaza completamente el vocabulario del usuario con el del snapshot.

---

## Sistema de Progresión (XP y Niveles)

### Curva de niveles
```
xp_para_nivel_n = 150 * (n-1)^1.75
```

| Nivel | XP necesario |
|-------|-------------|
| 1 | 0 XP |
| 2 | 150 XP |
| 3 | 476 XP |
| 5 | 1,710 XP |
| 10 | 10,290 XP |

### XP por acción

| Acción | XP |
|--------|-----|
| Respuesta vocab correcta (nivel 1) | +15 XP |
| Respuesta vocab correcta (nivel 8) | +50 XP |
| Respuesta vocab incorrecta | -5 XP |
| Sesión gramática aprobada (5 correctas) | +95 XP |
| Sesión gramática suspenso | +25 XP aprox. |
| Marcar gramática como "conocida" | +50 XP |
| "Ya me lo sé" vocab | +50 XP |

### Niveles independientes

Hay 3 niveles separados:
- **Nivel de Vocabulario** — suma de XP de repasos de vocab
- **Nivel de Gramática** — suma de XP de sesiones de gramática
- **Nivel Total** — suma de ambos

---

## Estimación de JLPT

La aplicación estima el nivel JLPT del usuario basándose en cuántas palabras domina y cuántos puntos gramaticales conoce:

| Nivel JLPT | Vocab dominado | Gramática conocida |
|-----------|---------------|-------------------|
| N5 | ≥ 50 | ≥ 10 |
| N4 | ≥ 200 | ≥ 40 |
| N3 | ≥ 500 | ≥ 70 |
| N2 | ≥ 1,000 | ≥ 100 |
| N1 | ≥ 2,000 | ≥ 150 |

"Dominado" = palabras con srsLevel ≥ 4 (Gurú 1 o superior).
