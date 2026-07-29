#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="${PROJECT:-$HOME/dev/macroobras-jazzy/app/macroobras}"
PREFIX="${PREFIX:-$HOME/.local/share/wineprefixes/macroobras-msi}"
INSTALL="$PREFIX/drive_c/Program Files/MacroObras"
BACKEND="$INSTALL/bin/MacroObras-Browser.exe"
FRONTEND="$PROJECT/frontend/dist"

BACKEND_LOG="/tmp/macroobras-backend.log"
FRONTEND_LOG="/tmp/macroobras-frontend.log"

die() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

[[ -f "$BACKEND" ]] ||
  die "executável ausente: $BACKEND"

[[ -s "$FRONTEND/index.html" ]] ||
  die "frontend ausente: $FRONTEND/index.html"

pkill -f 'MacroObras-Browser.exe' \
  2>/dev/null || true

pkill -f 'python3 -m http.server 7655' \
  2>/dev/null || true

fuser -k 7654/tcp \
  2>/dev/null || true

fuser -k 7655/tcp \
  2>/dev/null || true

cd "$INSTALL/bin"

env \
  WINEPREFIX="$PREFIX" \
  MACROOBRAS_ENABLE_NGROK=0 \
  WINEDEBUG=-all \
  wine "$BACKEND" \
  >"$BACKEND_LOG" 2>&1 &

BACKEND_PID=$!

for _ in $(seq 1 30); do
  if curl -s \
    -o /dev/null \
    http://127.0.0.1:7654/dev-ui
  then
    break
  fi

  sleep 1
done

cd "$FRONTEND"

python3 -m http.server \
  7655 \
  --bind 127.0.0.1 \
  >"$FRONTEND_LOG" 2>&1 &

FRONTEND_PID=$!

for _ in $(seq 1 20); do
  if curl -fsS \
    -o /dev/null \
    http://127.0.0.1:7655/
  then
    break
  fi

  sleep 1
done

printf 'Backend: http://127.0.0.1:7654\n'
printf 'Frontend: http://127.0.0.1:7655\n'
printf 'Backend PID: %s\n' "$BACKEND_PID"
printf 'Frontend PID: %s\n' "$FRONTEND_PID"
printf 'Log backend: %s\n' "$BACKEND_LOG"
printf 'Log frontend: %s\n' "$FRONTEND_LOG"

xdg-open 'http://127.0.0.1:7655/'
