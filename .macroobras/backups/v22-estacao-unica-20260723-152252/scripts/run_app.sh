#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="$HOME/.nimble/bin:$PATH"

nimble frontend
python3 -m http.server 5173 --directory frontend/dist &
FRONTEND_PID="$!"
trap 'kill "$FRONTEND_PID" 2>/dev/null || true' EXIT

nim c -d:ssl -r -d:jazzyWeb --path:../../obra_macroobras_design_types_tests_bundle/src src/app.nim
