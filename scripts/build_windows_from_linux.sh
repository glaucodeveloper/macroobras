#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="$HOME/.nimble/bin:$PATH"

for command in \
  nim \
  nimble \
  node \
  npm \
  zip \
  x86_64-w64-mingw32-gcc \
  x86_64-w64-mingw32-g++ \
  x86_64-w64-mingw32-windres; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "ERRO: comando ausente: $command" >&2
    exit 1
  }
done

BUILD="$ROOT/build/windows-cross"

# Toolchain MinGW exposta com os nomes esperados pelo perfil GCC do Nim.
TOOLCHAIN="$BUILD/mingw-bin"
mkdir -p "$TOOLCHAIN"

ln -sfn "$(command -v x86_64-w64-mingw32-gcc)" "$TOOLCHAIN/gcc"
ln -sfn "$(command -v x86_64-w64-mingw32-g++)" "$TOOLCHAIN/g++"
ln -sfn "$(command -v x86_64-w64-mingw32-ar)" "$TOOLCHAIN/ar"
ln -sfn "$(command -v x86_64-w64-mingw32-ranlib)" "$TOOLCHAIN/ranlib"
ln -sfn "$(command -v x86_64-w64-mingw32-windres)" "$TOOLCHAIN/windres"

export PATH="$TOOLCHAIN:$PATH"

# Compatibilidade entre WebView2 SDK e MinGW em filesystem case-sensitive.
COMPAT_INCLUDE="$BUILD/win-compat/include"
mkdir -p "$COMPAT_INCLUDE"

cat > "$COMPAT_INCLUDE/EventToken.h" <<'EVENTTOKEN'
#pragma once

#if defined(__has_include)
  #if __has_include(<eventtoken.h>)
    #include <eventtoken.h>
  #else
    #include <windows.h>

    typedef struct EventRegistrationToken {
      INT64 value;
    } EventRegistrationToken;
  #endif
#else
  #include <windows.h>

  typedef struct EventRegistrationToken {
    INT64 value;
  } EventRegistrationToken;
#endif
EVENTTOKEN

PACKAGE="$BUILD/MacroObras"
BIN="$PACKAGE/bin"
FRONTEND="$PACKAGE/frontend/dist"
NGROK="$ROOT/vendor/ngrok/windows/ngrok.exe"

echo "[1/7] Verificando JavaScript"

find frontend/src -type f -name '*.js' -print0 |
  while IFS= read -r -d '' file; do
    node --check "$file"
  done

echo "[2/7] Compilando frontend"

(
  cd frontend
  npm run build
)

echo "[3/7] Preparando ngrok Windows"

mkdir -p "$ROOT/vendor/ngrok/windows"

if [[ ! -f "$NGROK" ]]; then
  TMP_ZIP="$BUILD/ngrok-windows-amd64.zip"

  mkdir -p "$BUILD"

  curl -L \
    "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" \
    -o "$TMP_ZIP"

  unzip -o \
    "$TMP_ZIP" \
    -d "$ROOT/vendor/ngrok/windows"
fi

test -f "$NGROK" || {
  echo "ERRO: ngrok.exe não foi preparado." >&2
  exit 1
}

echo "[4/7] Preparando pacote"

rm -rf "$PACKAGE"
mkdir -p "$BIN" "$FRONTEND"

cp -a frontend/dist/. "$FRONTEND/"
cp -a "$NGROK" "$BIN/ngrok.exe"

# BEGIN MACROOBRAS WINDOWS ICON RESOURCE
ICON_SOURCE="$ROOT/frontend/public/brand/macroobras.ico"
ICON_DIR="$BUILD/windows-resources"
ICON_RC="$ICON_DIR/macroobras.rc"
ICON_OBJ="$ICON_DIR/macroobras-icon.o"

mkdir -p "$ICON_DIR"

test -s "$ICON_SOURCE" || {
  echo "ERRO: ícone Windows ausente: $ICON_SOURCE" >&2
  exit 1
}

printf 'IDI_ICON1 ICON "%s"\n' "$ICON_SOURCE" > "$ICON_RC"

x86_64-w64-mingw32-windres \
  --input "$ICON_RC" \
  --output "$ICON_OBJ" \
  --output-format=coff

# END MACROOBRAS WINDOWS ICON RESOURCE

echo "[5/7] Compilando MacroObras.exe"


nim cpp \
  -f \
  --nimcache:"$BUILD/nimcache" \
  --cc:gcc \
  --gcc.path:"$TOOLCHAIN" \
  --passC:"-I$COMPAT_INCLUDE" \
  --os:windows \
  --cpu:amd64 \
  -d:mingw \
  -d:ssl \
  -d:release \
  -d:macroobrasEmbedNgrok \
  --app:gui \
  --threads:on \
  --passL:"-static-libgcc" \
  --passL:"-static-libstdc++" \
  --passL:"$ICON_OBJ" \
  --out:"$BIN/MacroObras.exe" \
  src/app.nim

echo "[5.0.1/7] Compilando variante Browser para teste no Wine"

test -x "$TOOLCHAIN/gcc" || {
  echo "ERRO: wrapper MinGW gcc ausente." >&2
  exit 1
}

test -x "$TOOLCHAIN/g++" || {
  echo "ERRO: wrapper MinGW g++ ausente." >&2
  exit 1
}

if [[ "$("$TOOLCHAIN/gcc" -dumpmachine)" != "x86_64-w64-mingw32" ]]; then
  echo "ERRO: gcc não aponta para o MinGW Windows." >&2
  exit 1
fi

if [[ "$("$TOOLCHAIN/g++" -dumpmachine)" != "x86_64-w64-mingw32" ]]; then
  echo "ERRO: g++ não aponta para o MinGW Windows." >&2
  exit 1
fi

rm -rf "$BUILD/nimcache-browser"
rm -f "$BIN/MacroObras-Browser.exe"

PATH="$TOOLCHAIN:$PATH" \
nim cpp \
  -f \
  --nimcache:"$BUILD/nimcache-browser" \
  --cc:gcc \
  --gcc.path:"$TOOLCHAIN" \
  --passC:"-I$COMPAT_INCLUDE" \
  --os:windows \
  --cpu:amd64 \
  -d:mingw \
  -d:ssl \
  -d:release \
  -d:jazzyWeb \
  -d:macroobrasEmbedNgrok \
  --threads:on \
  --passL:"-static-libgcc" \
  --passL:"-static-libstdc++" \
  --passL:"$ICON_OBJ" \
  --out:"$BIN/MacroObras-Browser.exe" \
  src/app.nim

test -f "$BIN/MacroObras-Browser.exe" || {
  echo "ERRO: MacroObras-Browser.exe não foi gerado." >&2
  exit 1
}

file "$BIN/MacroObras-Browser.exe"

test -f "$BIN/MacroObras.exe" || {
  echo "ERRO: MacroObras.exe não foi gerado." >&2
  exit 1
}

echo "[5.1/7] Preparando OpenSSL Windows 1.1"

OPENSSL_VERSION="1.1.1w"
OPENSSL_SHA256="cf3098950cb4d853ad95c0841f1f9c6d3dc102dccfcacd521d93925208b76ac8"
OPENSSL_ARCHIVE="$BUILD/openssl-$OPENSSL_VERSION.tar.gz"
OPENSSL_SOURCE="$BUILD/openssl-$OPENSSL_VERSION"
OPENSSL_CACHE="$BUILD/openssl-win64-$OPENSSL_VERSION"

SSL_DLL="$OPENSSL_CACHE/libssl-1_1-x64.dll"
CRYPTO_DLL="$OPENSSL_CACHE/libcrypto-1_1-x64.dll"

for command in perl make curl tar sha256sum; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "ERRO: comando ausente: $command" >&2
    exit 1
  }
done

if [[ ! -f "$SSL_DLL" || ! -f "$CRYPTO_DLL" ]]; then
  mkdir -p "$BUILD" "$OPENSSL_CACHE"

  if [[ ! -f "$OPENSSL_ARCHIVE" ]]; then
    curl -L \
      "https://www.openssl.org/source/old/1.1.1/openssl-$OPENSSL_VERSION.tar.gz" \
      -o "$OPENSSL_ARCHIVE"
  fi

  echo "$OPENSSL_SHA256  $OPENSSL_ARCHIVE" |
    sha256sum -c -

  rm -rf "$OPENSSL_SOURCE"

  tar -xzf \
    "$OPENSSL_ARCHIVE" \
    -C "$BUILD"

  (
    cd "$OPENSSL_SOURCE"

    export CROSS_COMPILE="x86_64-w64-mingw32-"

    perl Configure \
      mingw64 \
      shared \
      no-tests \
      no-asm

    make -j"$(nproc)"
  )

  SSL_FOUND="$(
    find "$OPENSSL_SOURCE" \
      -type f \
      -iname 'libssl-1_1-x64.dll' \
      -print \
      -quit
  )"

  CRYPTO_FOUND="$(
    find "$OPENSSL_SOURCE" \
      -type f \
      -iname 'libcrypto-1_1-x64.dll' \
      -print \
      -quit
  )"

  if [[ -z "$SSL_FOUND" ]]; then
    echo "ERRO: libssl-1_1-x64.dll não foi gerada." >&2
    exit 1
  fi

  if [[ -z "$CRYPTO_FOUND" ]]; then
    echo "ERRO: libcrypto-1_1-x64.dll não foi gerada." >&2
    exit 1
  fi

  cp -a "$SSL_FOUND" "$SSL_DLL"
  cp -a "$CRYPTO_FOUND" "$CRYPTO_DLL"
fi

cp -a "$SSL_DLL" "$BIN/"
cp -a "$CRYPTO_DLL" "$BIN/"

test -f "$BIN/libssl-1_1-x64.dll"
test -f "$BIN/libcrypto-1_1-x64.dll"

echo "[6/7] Copiando DLLs do MinGW"

MINGW_BIN="/usr/x86_64-w64-mingw32/bin"

for dll in \
  libgcc_s_seh-1.dll \
  libstdc++-6.dll \
  libwinpthread-1.dll; do
  if [[ -f "$MINGW_BIN/$dll" ]]; then
    cp -a "$MINGW_BIN/$dll" "$BIN/"
  fi
done

cat > "$PACKAGE/Executar MacroObras.bat" <<'BAT'
@echo off
setlocal
cd /d "%~dp0bin"
start "" "MacroObras.exe"
BAT

cat > "$PACKAGE/LEIA-ME.txt" <<'TXT'
MacroObras para Windows x64

Execute:
  Executar MacroObras.bat

ou:
  bin\MacroObras.exe

As pastas bin e frontend devem permanecer dentro da pasta MacroObras.
O Windows precisa possuir o Microsoft Edge WebView2 Runtime.
TXT

# BEGIN MACROOBRAS CACERT RUNTIME
echo "[6.4/7] Preparando certificados TLS"

CACERT_CACHE="$BUILD/runtime/cacert.pem"
CACERT_TMP="$CACERT_CACHE.tmp"

mkdir -p "$BUILD/runtime" "$BIN"
rm -f "$CACERT_TMP"

curl -fL \
  --retry 3 \
  --retry-all-errors \
  https://curl.se/ca/cacert.pem \
  -o "$CACERT_TMP"

if [[ ! -s "$CACERT_TMP" ]]; then
  echo "ERRO: cacert.pem vazio." >&2
  exit 1
fi

if ! grep -q 'BEGIN CERTIFICATE' "$CACERT_TMP"; then
  echo "ERRO: cacert.pem inválido." >&2
  exit 1
fi

mv -f "$CACERT_TMP" "$CACERT_CACHE"

install -m 0644 \
  "$CACERT_CACHE" \
  "$BIN/cacert.pem"
# END MACROOBRAS CACERT RUNTIME

# BEGIN MACROOBRAS SQLITE WINDOWS RUNTIME
echo "[6.4/7] Preparando SQLite Windows x64"

SQLITE_DLL="$BIN/sqlite3_64.dll"
SQLITE_CODE="${SQLITE_CODE:-3530400}"
SQLITE_CACHE="$BUILD/sqlite-runtime"
SQLITE_ARCHIVE="$SQLITE_CACHE/sqlite-dll-win-x64-${SQLITE_CODE}.zip"
SQLITE_EXPECTED_SHA3="deddee963c810d1eeac3ce5e15c7c41da21a1c54d7a39cf54fbf577d2f50de3a"

if [[ ! -s "$SQLITE_DLL" ]]; then
  mkdir -p "$SQLITE_CACHE/extracted"

  if [[ ! -s "$SQLITE_ARCHIVE" ]]; then
    curl -fL \
      "https://www.sqlite.org/2026/sqlite-dll-win-x64-${SQLITE_CODE}.zip" \
      -o "$SQLITE_ARCHIVE"
  fi

  python3 - "$SQLITE_ARCHIVE" "$SQLITE_EXPECTED_SHA3" <<'PYSQLITE'
from pathlib import Path
import hashlib
import sys

archive = Path(sys.argv[1])
expected = sys.argv[2].lower()
actual = hashlib.sha3_256(archive.read_bytes()).hexdigest()

if actual != expected:
    raise SystemExit(
        f"checksum SQLite inválido: {actual}"
    )
PYSQLITE

  rm -rf "$SQLITE_CACHE/extracted"
  mkdir -p "$SQLITE_CACHE/extracted"

  unzip -o \
    "$SQLITE_ARCHIVE" \
    -d "$SQLITE_CACHE/extracted"

  SQLITE_SOURCE="$(
    find "$SQLITE_CACHE/extracted" \
      -type f \
      -iname 'sqlite3.dll' \
      -print \
      -quit
  )"

  [[ -n "$SQLITE_SOURCE" ]] || {
    echo "ERRO: sqlite3.dll ausente no pacote oficial." >&2
    exit 1
  }

  install -m 0755 \
    "$SQLITE_SOURCE" \
    "$SQLITE_DLL"
fi

file "$SQLITE_DLL"
# END MACROOBRAS SQLITE WINDOWS RUNTIME

echo "[6.5/7] Validando dependências de execução"

RUNTIME_FILES=(
  "$BIN/MacroObras.exe"
  "$BIN/MacroObras-Browser.exe"
  "$BIN/sqlite3_64.dll"
  "$BIN/libssl-1_1-x64.dll"
  "$BIN/libcrypto-1_1-x64.dll"
  "$BIN/cacert.pem"
  "$BIN/ngrok.exe"
)

for runtime_file in "${RUNTIME_FILES[@]}"; do
  if [[ ! -f "$runtime_file" ]]; then
    echo "ERRO: dependência ausente no pacote:" >&2
    echo "  $runtime_file" >&2
    exit 1
  fi
done

echo "Dependências Windows confirmadas."

echo "[7/7] Gerando pacote portátil"

(
  cd "$BUILD"
  rm -f MacroObras-Windows-x64-portable.zip

  zip -9 -r \
    MacroObras-Windows-x64-portable.zip \
    MacroObras
)

echo
echo "Build concluído:"
echo "  $BIN/MacroObras.exe"
echo
echo "Pacote:"
echo "  $BUILD/MacroObras-Windows-x64-portable.zip"

if command -v wine >/dev/null 2>&1; then
  echo
  echo "Identificação pelo Wine:"
  wine "$BIN/MacroObras.exe" --help \
    >/dev/null 2>&1 || true
fi
