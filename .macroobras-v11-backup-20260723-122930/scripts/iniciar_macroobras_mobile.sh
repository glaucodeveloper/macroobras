#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${MACROOBRAS_MOBILE_ENV:-$ROOT/config/mobile-platform.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: configuração mobile ausente em $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if ! command -v ngrok >/dev/null 2>&1; then
  echo "Erro: ngrok não está instalado ou não está no PATH." >&2
  exit 1
fi

if [[ -n "${NGROK_AUTHTOKEN:-}" ]]; then
  ngrok config add-authtoken "$NGROK_AUTHTOKEN" >/dev/null
fi

cd "$ROOT"
exec nimble dev
