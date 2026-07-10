#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="${MACROOBRAS_ENV:-$ROOT_DIR/.env}"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

MACROOBRAS_HOST="${MACROOBRAS_HOST:-127.0.0.1}"
MACROOBRAS_PORT="${MACROOBRAS_PORT:-7654}"
MACROOBRAS_COLLABORATOR_BASE_PATH="${MACROOBRAS_COLLABORATOR_BASE_PATH:-/api/colaboradores}"
MACROOBRAS_NGROK_DOMAIN="${MACROOBRAS_NGROK_DOMAIN:-}"

TARGET="http://$MACROOBRAS_HOST:$MACROOBRAS_PORT"

echo "Starting collaborator tunnel for $TARGET"
echo "Collaborator API base path: $MACROOBRAS_COLLABORATOR_BASE_PATH"

if [ -n "$MACROOBRAS_NGROK_DOMAIN" ]; then
  exec ngrok http --domain "$MACROOBRAS_NGROK_DOMAIN" "$TARGET"
fi

exec ngrok http "$TARGET"

