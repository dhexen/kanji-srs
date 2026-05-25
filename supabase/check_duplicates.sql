-- =============================================================================
-- DIAGNÓSTICO DE VOCABULARIO DUPLICADO
-- Pega esto en el SQL Editor de Supabase y ejecuta sección a sección.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLA vocabulary (catálogo global)
--    La columna 'word' es la clave, así que duplicados exactos no pueden
--    existir, pero sí pueden haber palabras con el mismo kanji o la misma
--    lectura registradas con distintos valores de 'word' (ej. "行く" vs "いく").
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Mismo 'word' más de una vez (sólo posible si la PK no existe o fue violada)
SELECT
  word,
  COUNT(*) AS apariciones
FROM vocabulary
GROUP BY word
HAVING COUNT(*) > 1
ORDER BY apariciones DESC;

-- 1b. Mismo kanji en distintas entradas de 'word'
--     (mismo carácter, distintas lecturas registradas como palabras separadas)
--     Nota: sólo hay un campo 'word'; el kanji viene de user_vocab_progress.
--     Busca 'word' con igual prefijo kanji si lo tienes guardado en vocabulary.
--     → Si la tabla vocabulary NO tiene columna 'kanji', salta esta sección.
/*
SELECT
  kanji,
  COUNT(*) AS entradas,
  STRING_AGG(word, ', ' ORDER BY word) AS palabras
FROM vocabulary
GROUP BY kanji
HAVING COUNT(*) > 1
ORDER BY entradas DESC;
*/


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLA user_vocab_progress (progreso por usuario)
--    La PK es (user_id, jp), así que un mismo jp no puede estar dos veces
--    para el mismo usuario. Pero puede haber duplicados semánticos:
--      · Mismo kanji + misma lectura → la misma palabra con distintos 'jp'
--      · Misma lectura para distintos kanjis
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. Mismo kanji + misma lectura para el mismo usuario
--     → palabras que son la misma pero con 'jp' diferente (ej. kana vs kanji)
SELECT
  user_id,
  kanji,
  reading,
  COUNT(*)          AS veces,
  STRING_AGG(jp, ', ' ORDER BY jp) AS valores_jp
FROM user_vocab_progress
GROUP BY user_id, kanji, reading
HAVING COUNT(*) > 1
ORDER BY veces DESC, user_id, kanji;

-- 2b. Mismo 'jp' para el mismo usuario (debería ser imposible por la PK, pero
--     sirve como comprobación de integridad)
SELECT
  user_id,
  jp,
  COUNT(*) AS veces
FROM user_vocab_progress
GROUP BY user_id, jp
HAVING COUNT(*) > 1
ORDER BY veces DESC;

-- 2c. Resumen: cuántos usuarios tienen al menos un duplicado semántico
SELECT
  COUNT(DISTINCT user_id) AS usuarios_con_duplicados
FROM (
  SELECT user_id, kanji, reading
  FROM user_vocab_progress
  GROUP BY user_id, kanji, reading
  HAVING COUNT(*) > 1
) sub;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LEGACY — tabla srs_progress (vocab_db como JSONB array)
--    Si aún tienes usuarios en el modo legacy, el array puede tener entradas
--    repetidas por el campo 'jp'.
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. Usuarios con duplicados en su vocab_db legacy
SELECT
  user_id,
  jp_value,
  COUNT(*) AS veces
FROM (
  SELECT
    user_id,
    item->>'jp' AS jp_value
  FROM srs_progress,
       jsonb_array_elements(vocab_db) AS item
  WHERE jsonb_typeof(vocab_db) = 'array'
) expanded
GROUP BY user_id, jp_value
HAVING COUNT(*) > 1
ORDER BY veces DESC, user_id, jp_value;

-- 3b. Número total de usuarios legacy con algún duplicado
SELECT COUNT(DISTINCT user_id) AS usuarios_legacy_con_duplicados
FROM (
  SELECT
    user_id,
    item->>'jp' AS jp_value,
    COUNT(*) AS veces
  FROM srs_progress,
       jsonb_array_elements(vocab_db) AS item
  WHERE jsonb_typeof(vocab_db) = 'array'
  GROUP BY user_id, item->>'jp'
  HAVING COUNT(*) > 1
) sub;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CRUCE: palabras en user_vocab_progress que NO están en vocabulary
--    (vocabulario huérfano — sin imagen, categoría ni tipo)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  uvp.jp,
  uvp.kanji,
  uvp.reading,
  COUNT(DISTINCT uvp.user_id) AS usuarios_afectados
FROM user_vocab_progress uvp
LEFT JOIN vocabulary v ON v.word = uvp.jp
WHERE v.word IS NULL
GROUP BY uvp.jp, uvp.kanji, uvp.reading
ORDER BY usuarios_afectados DESC, uvp.jp;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RESUMEN GLOBAL — una sola consulta de estado
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  'vocabulary (global)'                              AS tabla,
  (SELECT COUNT(*)  FROM vocabulary)                 AS total_filas,
  (SELECT COUNT(DISTINCT word) FROM vocabulary)      AS palabras_unicas,
  (SELECT COUNT(*) FROM vocabulary) -
  (SELECT COUNT(DISTINCT word) FROM vocabulary)      AS duplicados_exactos

UNION ALL

SELECT
  'user_vocab_progress',
  (SELECT COUNT(*) FROM user_vocab_progress),
  (SELECT COUNT(DISTINCT (user_id::text || '|' || jp)) FROM user_vocab_progress),
  0  -- la PK impide duplicados exactos

UNION ALL

SELECT
  'user_vocab_progress (duplicados semánticos kanji+reading)',
  (
    SELECT COALESCE(SUM(cnt - 1), 0)
    FROM (
      SELECT COUNT(*) AS cnt
      FROM user_vocab_progress
      GROUP BY user_id, kanji, reading
      HAVING COUNT(*) > 1
    ) sub
  ),
  NULL,
  NULL;
