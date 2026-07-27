#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_HOST="${MACROOBRAS_HOST:-127.0.0.1}"
BACKEND_PORT="${MACROOBRAS_PORT:-7654}"
BIN="$ROOT/src/app"
NIMCACHE_DIR="$ROOT/.nimcache"

export PATH="$HOME/.nimble/bin:$PATH"

if [[ -f "$ROOT/config/mobile-platform.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/config/mobile-platform.env"
  set +a
fi

port_open() {
  python3 - "$1" "$2" <<'PY'
import socket, sys
host, port = sys.argv[1], int(sys.argv[2])
with socket.socket() as sock:
    sock.settimeout(0.25)
    try:
        sock.connect((host, port))
    except OSError:
        raise SystemExit(1)
raise SystemExit(0)
PY
}

if port_open "$BACKEND_HOST" "$BACKEND_PORT"; then
  echo "Erro: já existe um processo usando http://$BACKEND_HOST:$BACKEND_PORT" >&2
  echo "Encerre a instância anterior antes de iniciar outra." >&2
  exit 1
fi

if ! command -v nim >/dev/null 2>&1; then
  echo "Erro: o compilador Nim não foi encontrado no PATH." >&2
  exit 127
fi

cd "$ROOT"
sh frontend/build.sh
rm -f "$BIN"
mkdir -p "$NIMCACHE_DIR"

echo "Compilando a estação MacroObras com SSL…"
nim c \
  --nimcache:"$NIMCACHE_DIR" \
  -d:ssl \
  -d:jazzyWeb \
  --path:../../obra_macroobras_design_types_tests_bundle/src \
  src/app.nim

echo "Estação ativa em http://$BACKEND_HOST:$BACKEND_PORT/?surface=admin"
echo "Mantenha este terminal aberto. Ctrl+C encerra a estação."
exec "$BIN"
