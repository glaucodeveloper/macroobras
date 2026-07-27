#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
VENDOR_DIR="$ROOT_DIR/vendor/ngrok"
TMP_DIR="${TMPDIR:-/tmp}/macroobras-ngrok"

mkdir -p "$VENDOR_DIR/linux" "$VENDOR_DIR/windows" "$TMP_DIR"

fetch_zip() {
  url="$1"
  dest="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -L "$url" -o "$dest"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -O "$dest" "$url"
    return
  fi

  echo "curl or wget is required to download ngrok binaries" >&2
  exit 1
}

unpack_zip() {
  zip_file="$1"
  dest_dir="$2"

  if command -v unzip >/dev/null 2>&1; then
    unzip -o "$zip_file" -d "$dest_dir"
    return
  fi

  echo "unzip is required to extract ngrok binaries" >&2
  exit 1
}

LINUX_ZIP="$TMP_DIR/ngrok-linux-amd64.zip"
WINDOWS_ZIP="$TMP_DIR/ngrok-windows-amd64.zip"

fetch_zip "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip" "$LINUX_ZIP"
fetch_zip "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" "$WINDOWS_ZIP"

unpack_zip "$LINUX_ZIP" "$VENDOR_DIR/linux"
unpack_zip "$WINDOWS_ZIP" "$VENDOR_DIR/windows"

chmod 755 "$VENDOR_DIR/linux/ngrok"

echo "Ngrok binaries prepared:"
echo "  $VENDOR_DIR/linux/ngrok"
echo "  $VENDOR_DIR/windows/ngrok.exe"

echo "Compile current platform with embedded ngrok:"
echo "  nim c -d:ssl -d:macroobrasEmbedNgrok --path:../../obra_macroobras_design_types_tests_bundle/src src/app.nim"

