#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${MACROOBRAS_MOBILE_ENV:-$ROOT/config/mobile-platform.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "Aviso: configuração mobile não encontrada em $ENV_FILE; iniciando a estação sem configuração externa." >&2
fi

if command -v ngrok >/dev/null 2>&1; then
  if [[ -n "${NGROK_AUTHTOKEN:-}" ]]; then
    ngrok config add-authtoken "$NGROK_AUTHTOKEN" >/dev/null 2>&1 || \
      echo "Aviso: não foi possível registrar o authtoken do ngrok; o backend continuará disponível localmente." >&2
  fi
else
  echo "Aviso: ngrok não está no PATH. O acesso local continuará funcionando e o túnel ficará indisponível." >&2
fi

if ! command -v nimble >/dev/null 2>&1; then
  echo "Erro: nimble não está instalado ou não está no PATH." >&2
  echo "Instale o Nim/Nimble e execute novamente." >&2
  exit 127
fi

cd "$ROOT"
exec nimble dev
