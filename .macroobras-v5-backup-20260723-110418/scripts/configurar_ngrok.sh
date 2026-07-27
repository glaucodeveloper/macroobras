#!/usr/bin/env bash
set -euo pipefail

if ! command -v ngrok >/dev/null 2>&1; then
  echo "Erro: ngrok não está instalado ou não está no PATH." >&2
  exit 1
fi

TOKEN="${1:-${NGROK_AUTHTOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  read -r -s -p "Authtoken do ngrok: " TOKEN
  echo
fi

if [[ -z "$TOKEN" ]]; then
  echo "Erro: authtoken vazio." >&2
  exit 1
fi

ngrok config add-authtoken "$TOKEN"
echo "Authtoken registrado na configuração local do ngrok."
