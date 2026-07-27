#!/usr/bin/env bash
set -euo pipefail
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="$HERE/../../.macroobras/runtime/ngrok.env"
if [[ -f "$ENV_FILE" ]]; then
  source "$ENV_FILE"
fi
cd "$HERE"
exec "$HERE/macroobras" "$@"
