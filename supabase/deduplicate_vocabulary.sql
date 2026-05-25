-- =============================================================================
-- ELIMINACIÓN DE DUPLICADOS EN vocabulary
--
-- INSTRUCCIONES:
--   1. Ejecuta primero el bloque PASO 0 (preview) y revisa el resultado.
--   2. Si el resultado es correcto, ejecuta el bloque PASO 1 (eliminación).
--   3. Si algo no está bien, el DELETE está dentro de una transacción:
--      cambia COMMIT por ROLLBACK al final para deshacer.
-- =============================================================================


-- =============================================================================
-- PASO 0 — PREVIEW: ver qué filas se eliminarán y cuál se conserva
-- =============================================================================
-- Estrategia de desempate (de mayor a menor prioridad):
--   1. is_official = true  (contenido oficial primero)
--   2. image_url  no nulo  (tiene imagen)
--   3. category   no nulo  (tiene categoría)
--   4. word_type  no nulo  (tiene tipo gramatical)
--   5. ctid más bajo       (fila más antigua físicamente → el "original")

WITH ranked AS (
  SELECT
    ctid,
    word,
    kanji,
    reading,
    meaning_es,
    grade,
    is_official,
    image_url,
    category,
    word_type,
    -- Puntuación: más alta = fila más completa = la que se conserva
    (
      CASE WHEN is_official   THEN 8 ELSE 0 END +
      CASE WHEN image_url  IS NOT NULL AND image_url  <> '' THEN 4 ELSE 0 END +
      CASE WHEN category   IS NOT NULL THEN 2 ELSE 0 END +
      CASE WHEN word_type  IS NOT NULL THEN 1 ELSE 0 END
    ) AS score,
    COUNT(*) OVER (PARTITION BY word) AS total_copies
  FROM vocabulary
),
-- Fila a conservar por cada 'word' duplicado
keepers AS (
  SELECT DISTINCT ON (word)
    ctid  AS keep_ctid,
    word  AS keep_word,
    score AS keep_score
  FROM ranked
  WHERE total_copies > 1
  ORDER BY word, score DESC, ctid ASC   -- desempate: ctid más bajo
)
SELECT
  r.word,
  r.kanji,
  r.reading,
  r.grade,
  r.is_official,
  r.image_url      IS NOT NULL AS tiene_imagen,
  r.category       IS NOT NULL AS tiene_categoria,
  r.word_type      IS NOT NULL AS tiene_tipo,
  r.score,
  r.total_copies,
  CASE WHEN r.ctid = k.keep_ctid THEN '✅ CONSERVAR' ELSE '🗑  ELIMINAR' END AS accion,
  r.ctid
FROM ranked r
JOIN keepers k ON k.keep_word = r.word
ORDER BY r.word, r.score DESC, r.ctid;


-- =============================================================================
-- PASO 1 — ELIMINACIÓN (dentro de una transacción reversible)
-- =============================================================================
-- Lee el resultado del PASO 0 y, si todo es correcto, ejecuta este bloque.
-- Para deshacer: cambia COMMIT por ROLLBACK al final.
-- =============================================================================

BEGIN;

-- Guarda los ctid a eliminar en una CTE temporal
WITH ranked AS (
  SELECT
    ctid,
    word,
    (
      CASE WHEN is_official   THEN 8 ELSE 0 END +
      CASE WHEN image_url  IS NOT NULL AND image_url  <> '' THEN 4 ELSE 0 END +
      CASE WHEN category   IS NOT NULL THEN 2 ELSE 0 END +
      CASE WHEN word_type  IS NOT NULL THEN 1 ELSE 0 END
    ) AS score,
    COUNT(*) OVER (PARTITION BY word) AS total_copies
  FROM vocabulary
),
keepers AS (
  -- Un solo ctid a conservar por 'word'
  SELECT DISTINCT ON (word) ctid AS keep_ctid
  FROM ranked
  WHERE total_copies > 1
  ORDER BY word, score DESC, ctid ASC
),
to_delete AS (
  -- Todos los ctid de filas duplicadas que NO son el keeper
  SELECT r.ctid
  FROM ranked r
  LEFT JOIN keepers k ON k.keep_ctid = r.ctid
  WHERE r.total_copies > 1
    AND k.keep_ctid IS NULL         -- no es el que conservamos
)
DELETE FROM vocabulary
WHERE ctid IN (SELECT ctid FROM to_delete);

-- Cuántas filas se han eliminado
GET DIAGNOSTICS -- no disponible en Supabase SQL Editor; usa el conteo de abajo

-- Verificación post-delete: debería devolver 0 filas
SELECT word, COUNT(*) AS veces
FROM vocabulary
GROUP BY word
HAVING COUNT(*) > 1;

-- Si la query anterior devuelve 0 filas → todo limpio → confirma con COMMIT
-- Si algo falla o no te convence → cambia por ROLLBACK
COMMIT;
-- ROLLBACK;


-- =============================================================================
-- PASO 2 — VERIFICACIÓN FINAL (ejecuta después del COMMIT)
-- =============================================================================

SELECT
  'vocabulary'                           AS tabla,
  COUNT(*)                               AS total_filas,
  COUNT(DISTINCT word)                   AS palabras_unicas,
  COUNT(*) - COUNT(DISTINCT word)        AS duplicados_restantes
FROM vocabulary;
