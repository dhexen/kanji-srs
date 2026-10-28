#!/usr/bin/env bash
# Al terminar Claude un turno: comprobar tipos, pero solo si el código ha
# cambiado desde la última vez que pasaron. Así un turno de charla no cuesta
# lo que tarda tsc. Si falla, sale con 2 y Claude ve el error y lo arregla
# antes de darte el trabajo por terminado. (No hay tests en este proyecto.)
cd "$(dirname "$0")/../.." || exit 0
entrada=$(cat)

# La huella del código: lo cambiado respecto a HEAD más lo nuevo sin añadir.
huella=$( { git diff HEAD -- '*.ts' '*.tsx' '*.mjs' '*.js'
            git ls-files --others --exclude-standard -- '*.ts' '*.tsx' '*.mjs' '*.js' | xargs -r -d '\n' cat
          } 2>/dev/null | sha1sum | cut -d' ' -f1)
apunte=.claude/hooks/.ultima-huella-buena
[ "$huella" = "$(cat "$apunte" 2>/dev/null)" ] && exit 0

salida=$(npx tsc --noEmit 2>&1)
if [ $? -eq 0 ]; then
  echo "$huella" > "$apunte"
  exit 0
fi

# Si ya se le paró una vez y sigue fallando, no lo encerramos en un bucle:
# te avisa a ti y suelta.
if [ "$(echo "$entrada" | jq -r '.stop_hook_active // false')" = "true" ]; then
  echo '{"systemMessage":"⚠️ Los tipos siguen fallando tras el intento de arreglo."}'
  exit 0
fi
echo "Los tipos fallan tras tus cambios. Arréglalo antes de terminar:" >&2
echo "$salida" | tail -40 >&2
exit 2
