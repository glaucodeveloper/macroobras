#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
RUNTIME_DIR="$ROOT/.macroobras/runtime"
BACKEND_LOG="$RUNTIME_DIR/backend.log"
PREVIEW_HOST="${MACROOBRAS_PREVIEW_HOST:-127.0.0.1}"
PREVIEW_PORT="${MACROOBRAS_PREVIEW_PORT:-4173}"
BACKEND_HOST="${MACROOBRAS_BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${MACROOBRAS_BACKEND_PORT:-7654}"
BACKEND_PID=""
PREVIEW_PID=""
STARTED_BACKEND=0

mkdir -p "$RUNTIME_DIR"

port_open() {
  python3 - "$1" "$2" <<'PY'
import socket, sys
host, port = sys.argv[1], int(sys.argv[2])
with socket.socket() as sock:
    sock.settimeout(0.35)
    try:
        sock.connect((host, port))
    except OSError:
        raise SystemExit(1)
raise SystemExit(0)
PY
}

cleanup() {
  if [[ -n "$PREVIEW_PID" ]]; then
    kill "$PREVIEW_PID" >/dev/null 2>&1 || true
    wait "$PREVIEW_PID" >/dev/null 2>&1 || true
  fi
  if [[ "$STARTED_BACKEND" == "1" && -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

if [[ -f "$ROOT/config/mobile-platform.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/config/mobile-platform.env"
  set +a
fi

(cd "$FRONTEND" && npm run build)

if port_open "$BACKEND_HOST" "$BACKEND_PORT"; then
  echo "Backend MacroObras já ativo em http://$BACKEND_HOST:$BACKEND_PORT"
else
  if [[ -n "${MACROOBRAS_BACKEND_COMMAND:-}" ]]; then
    BACKEND_COMMAND="$MACROOBRAS_BACKEND_COMMAND"
  else
    if ! command -v nimble >/dev/null 2>&1; then
      echo "Erro: o preview precisa iniciar o backend, mas nimble não foi encontrado." >&2
      echo "Instale Nim/Nimble ou defina MACROOBRAS_BACKEND_COMMAND." >&2
      exit 127
    fi
    BACKEND_COMMAND="nimble dev"
  fi

  : > "$BACKEND_LOG"
  echo "Iniciando backend MacroObras: $BACKEND_COMMAND"
  (
    cd "$ROOT"
    exec bash -lc "$BACKEND_COMMAND"
  ) >>"$BACKEND_LOG" 2>&1 &
  BACKEND_PID="$!"
  STARTED_BACKEND=1

  READY=0
  for _ in $(seq 1 120); do
    if port_open "$BACKEND_HOST" "$BACKEND_PORT"; then
      READY=1
      break
    fi
    if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if [[ "$READY" != "1" ]]; then
    echo "Erro: o backend não abriu a porta $BACKEND_PORT." >&2
    echo "Log: $BACKEND_LOG" >&2
    tail -n 80 "$BACKEND_LOG" >&2 || true
    exit 1
  fi
  echo "Backend pronto em http://$BACKEND_HOST:$BACKEND_PORT"
fi

cat <<MSG
Preview MacroObras ativo:
  http://$PREVIEW_HOST:$PREVIEW_PORT/?surface=admin

RPC:
  http://$BACKEND_HOST:$BACKEND_PORT

O backend permanece ativo enquanto este processo estiver aberto.
MSG

python3 -m http.server "$PREVIEW_PORT" --bind "$PREVIEW_HOST" --directory "$FRONTEND/dist" &
PREVIEW_PID="$!"
wait "$PREVIEW_PID"
