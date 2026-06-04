# 04 — API REST

Todas las rutas están bajo `/app/api/`. Las rutas de admin requieren token JWT de usuario con rol `admin` en la cabecera `Authorization: Bearer <token>`.

## APIs Públicas

### `GET /api/vocab/antonyms`
Devuelve todos los pares de antónimos con datos completos de vocabulario.  
**Auth:** No requerida  
**Respuesta:**
```json
{
  "pairs": [
    {
      "id": 1,
      "word_a": { "word": "高い", "reading": "たかい", "meaning_es": "alto", "word_type": "adj_i", "grade": 2 },
      "word_b": { "word": "低い", "reading": "ひくい", "meaning_es": "bajo", "word_type": "adj_i", "grade": 3 }
    }
  ]
}
```

---

### `POST /api/gemini`
Proxy a Google Gemini. Usa la key del usuario si la proporciona, o la key del servidor (con rate-limit de 10 req/hora por usuario).  
**Auth:** Requerida (JWT)  
**Body:**
```json
{ "prompt": "Generate...", "userApiKey": "AIza..." }
```
**Respuesta:** `{ "text": "..." }`

---

### `POST /api/tts`
Genera audio TTS para una palabra japonesa. Usa caché por hash del texto.  
**Auth:** Requerida (JWT)  
**Body:** `{ "text": "食べる", "lang": "ja-JP" }`  
**Respuesta:** Audio en base64 o URL

---

### `POST /api/wanikani/sync`
Sincroniza el vocabulario de WaniKani del usuario. Lee la API key desde `user_settings`. Filtra por el nivel mínimo de SRS configurado. Traduce significados al ES/CA con Gemini si hay key disponible.  
**Auth:** Requerida (JWT)  
**Body:** `{}`  
**Respuesta:** `{ "count": 342 }` (número de palabras sincronizadas)

---

## APIs de Administración

Todas requieren `Authorization: Bearer <token>` con rol `admin`.

### `GET /api/admin/classify-vocab-full`
Estadísticas de clasificación del vocabulario.  
**Respuesta:**
```json
{
  "total": 4098,
  "with_type": 1007,
  "with_category": 1005,
  "with_image": 984,
  "antonym_pairs": 42,
  "antonym_todo": 146,
  "pending": 3260
}
```

### `POST /api/admin/classify-vocab-full`
Procesa un lote de palabras con Gemini: asigna tipo gramatical, categoría semántica, imagen (Pexels) y detecta antónimos. Por defecto 35 palabras por lote. Siempre incluye al menos 10 verbos/adjetivos sin antónimo aunque el lote esté lleno.  
**Body:**
```json
{
  "geminiApiKey": "AIza...",
  "pexelsApiKey": "...",
  "limit": 35
}
```
**Respuesta:**
```json
{
  "processed": 35,
  "updated_vocab": 24,
  "new_images": 18,
  "not_imageable": 17,
  "no_source_image": 0,
  "antonym_pairs_added": 3
}
```

---

### `GET /api/admin/users`
Lista todos los usuarios con su rol, número de palabras y último login.  
**Query params:** `?q=email&role=admin`

### `POST /api/admin/users`
Crea un nuevo usuario.  
**Body:** `{ "email": "...", "password": "...", "role": "user" }`

### `DELETE /api/admin/users/[userId]`
Elimina un usuario y todo su progreso.

### `POST /api/admin/users/[userId]/role`
Cambia el rol de un usuario.  
**Body:** `{ "role": "contributor" }`

### `GET /api/admin/users/[userId]/snapshots`
Devuelve los snapshots de progreso de un usuario.

### `POST /api/admin/users/[userId]/restore`
Restaura el progreso de un usuario desde un snapshot.  
**Body:** `{ "snapshotId": 42 }`

---

### `GET /api/admin/vocab`
Búsqueda en el vocabulario compartido.

### `GET/PUT/DELETE /api/admin/vocab/[word]`
CRUD de una palabra específica.

### `POST /api/admin/vocab/import`
Importación masiva de vocabulario (array de objetos).

### `POST /api/admin/vocab/reset-all`
Borra todo el vocabulario compartido y el progreso de todos los usuarios. Irreversible.

---

### `GET/POST /api/admin/vocab/antonyms`
Lista o crea pares de antónimos.

### `DELETE /api/admin/vocab/antonyms/[id]`
Elimina un par de antónimos.

### `POST /api/admin/vocab/antonyms/auto-detect`
Envía todos los verbos y adjetivos a Gemini para detectar pares de antónimos automáticamente.  
**Body:** `{ "geminiApiKey": "...", "limit": 400 }`  
**Respuesta:** `{ "pairs_added": 15, "candidates_checked": 287 }`

---

### `GET/POST /api/admin/config`
Lee o actualiza la configuración global (ej: intervalos SRS).  
**Body (POST):** `{ "key": "srs_intervals", "value": [0, 14400000, ...] }`

---

### `GET /api/admin/feedback`
Lista los reportes de feedback de usuarios.

### `GET /api/admin/vocab-reports`
Lista los reportes de errores en vocabulario.

### `GET /api/admin/image-reports`
Lista las imágenes con más votos negativos.

### `POST /api/admin/process-images`
Procesa un lote de palabras sin imagen buscando en Pexels.

### `POST /api/admin/process-images/reset`
Resetea el campo `image_url` a NULL para reintentar la búsqueda.
