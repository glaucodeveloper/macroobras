#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="$HOME/.nimble/bin:$PATH"

current_ngrok_missing() {
  case "$(uname -s)" in
    Linux*) test ! -x "$ROOT_DIR/vendor/ngrok/linux/ngrok" ;;
    MINGW*|MSYS*|CYGWIN*) test ! -f "$ROOT_DIR/vendor/ngrok/windows/ngrok.exe" ;;
    *) return 1 ;;
  esac
}

if current_ngrok_missing; then
  sh scripts/prepare_ngrok_binaries.sh
fi

sh frontend/build.sh
nim c -d:ssl -d:release -d:macroobrasEmbedNgrok src/app.nim

echo "Single build complete: $ROOT_DIR/src/app"

