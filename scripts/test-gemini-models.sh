#!/usr/bin/env bash
# Prueba de disponibilidad de modelos Gemini para TU api key.
#
# Uso:
#   GEMINI_API_KEY=xxxx bash scripts/test-gemini-models.sh
#   # o
#   bash scripts/test-gemini-models.sh TU_API_KEY
#
# 1) Lista los modelos flash que TU clave puede usar (ListModels).
# 2) Prueba una generación mínima con cada modelo candidato y dice OK / error.

set -u

KEY="${1:-${GEMINI_API_KEY:-}}"
if [ -z "$KEY" ]; then
  echo "❌ Falta la API key. Usa: GEMINI_API_KEY=xxxx bash scripts/test-gemini-models.sh"
  exit 1
fi

BASE="https://generativelanguage.googleapis.com/v1beta"

echo "════════════════════════════════════════════════════════"
echo " 1. Modelos disponibles para tu clave (filtrado flash/3.x)"
echo "════════════════════════════════════════════════════════"
curl -s "${BASE}/models?key=${KEY}&pageSize=200" \
  | grep -oE '"name": "models/[^"]+"' \
  | sed 's/"name": "models\///; s/"//' \
  | grep -Ei 'flash|3\.[0-9]|pro' \
  | sort -u \
  || echo "(no se pudo listar; ¿clave válida?)"

echo
echo "════════════════════════════════════════════════════════"
echo " 2. Prueba de generación por modelo candidato"
echo "════════════════════════════════════════════════════════"

# Nuevos primero (los que quieres priorizar), luego los actuales como control.
CANDIDATES=(
  "gemini-3.6-flash"
  "gemini-3.6-flash-preview"
  "gemini-3.5-flash"
  "gemini-3.5-flash-preview"
  "gemini-3.5-flash-lite"
  "gemini-3.5-flash-lite-preview"
  "gemini-3.1-flash-lite-preview"
  "gemini-2.5-flash"
  "gemini-2.5-flash-lite"
)

for m in "${CANDIDATES[@]}"; do
  resp=$(curl -s -w "\n%{http_code}" \
    "${BASE}/models/${m}:generateContent?key=${KEY}" \
    -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Responde solo: OK"}]}]}')
  code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  if [ "$code" = "200" ]; then
    txt=$(echo "$body" | grep -oE '"text": "[^"]*"' | head -n1 | sed 's/"text": "//; s/"$//')
    echo "✅ ${m}  →  ${txt:-(respuesta vacía)}"
  else
    msg=$(echo "$body" | grep -oE '"message": "[^"]*"' | head -n1 | sed 's/"message": "//; s/"$//')
    echo "❌ ${m}  →  HTTP ${code}: ${msg:-error}"
  fi
done

echo
echo "Hecho. Los que salen ✅ son los IDs exactos que podemos añadir a la app."
