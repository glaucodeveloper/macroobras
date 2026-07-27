#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${MACROOBRAS_MOBILE_ENV:-$ROOT/config/mobile-platform.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

HOST="${MACROOBRAS_HOST:-127.0.0.1}"
PORT="${MACROOBRAS_PORT:-7654}"
TARGET="http://${HOST}:${PORT}"
NGROK_BIN="${MACROOBRAS_NGROK_BIN:-ngrok}"

if ! command -v "$NGROK_BIN" >/dev/null 2>&1 && [[ ! -x "$NGROK_BIN" ]]; then
  echo "Erro: ngrok não localizado. Configure MACROOBRAS_NGROK_BIN." >&2
  exit 1
fi

if ! curl -fsS "$TARGET/?surface=twa" >/dev/null 2>&1; then
  echo "Erro: a estação MacroObras não está respondendo em $TARGET." >&2
  echo "Inicie o aplicativo antes de publicar a plataforma mobile." >&2
  exit 1
fi

ARGS=(http "$TARGET")
if [[ -n "${MACROOBRAS_NGROK_DOMAIN:-}" ]]; then
  ARGS+=(--url "$MACROOBRAS_NGROK_DOMAIN")
fi

exec "$NGROK_BIN" "${ARGS[@]}"
