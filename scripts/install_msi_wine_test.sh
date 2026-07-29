#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build/windows-cross"
VERSION="${1:-1.0.0}"
MSI="$BUILD/MacroObras-Setup-Windows-x64-${VERSION}.msi"
PREFIX="${WINEPREFIX:-$HOME/.local/share/wineprefixes/macroobras-msi-test}"
LOG_WIN='C:\macroobras-msi-install.log'

die() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

command -v wine >/dev/null 2>&1 ||
  die "wine não encontrado"

command -v winepath >/dev/null 2>&1 ||
  die "winepath não encontrado"

[[ -s "$MSI" ]] ||
  die "MSI ausente: $MSI"

mkdir -p "$PREFIX"

WINEARCH=win64 \
WINEPREFIX="$PREFIX" \
wineboot -u

MSI_WIN="$(
  WINEPREFIX="$PREFIX" \
  winepath -w "$MSI"
)"

printf 'Instalando:\n  %s\nPrefixo:\n  %s\n' \
  "$MSI" \
  "$PREFIX"

WINEPREFIX="$PREFIX" \
wine msiexec \
  /i "$MSI_WIN" \
  /qn \
  /norestart \
  /L*V "$LOG_WIN"

INSTALL="$PREFIX/drive_c/Program Files/MacroObras"
EXE="$INSTALL/bin/MacroObras-Browser.exe"
LOG="$PREFIX/drive_c/macroobras-msi-install.log"

[[ -f "$EXE" ]] || {
  printf 'Log MSI:\n  %s\n' "$LOG" >&2
  die "instalação não produziu: $EXE"
}

printf '\nInstalação concluída:\n  %s\n' "$INSTALL"
printf 'Log:\n  %s\n' "$LOG"

