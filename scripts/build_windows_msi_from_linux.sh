#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build/windows-cross"
PACKAGE_DIR="$BUILD/MacroObras"
WORK_DIR="$BUILD/msi"
VERSION="${1:-${MACROOBRAS_VERSION:-1.0.0}}"

MSI="$BUILD/MacroObras-Setup-Windows-x64-${VERSION}.msi"
PARTIAL="$MSI.partial.msi"
MAIN_WXS="$WORK_DIR/MacroObras-${VERSION}.wxs"
FILES_WXS="$WORK_DIR/MacroObras-${VERSION}-files.wxs"
CONTENTS="$WORK_DIR/files-${VERSION}.txt"
SHA256="$MSI.sha256"

die() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 ||
  die "python3 não encontrado."

for command_name in wixl wixl-heat msiinfo msiextract; do
  command -v "$command_name" >/dev/null 2>&1 ||
    die "$command_name não encontrado. Instale: sudo pacman -S --needed msitools"
done

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
  die "versão inválida. Use major.minor.build, por exemplo 1.0.0."

[[ -d "$PACKAGE_DIR" ]] ||
  die "pacote Windows ausente: $PACKAGE_DIR"

REQUIRED_FILES=(
  "$PACKAGE_DIR/bin/MacroObras.exe"
  "$PACKAGE_DIR/bin/sqlite3_64.dll"
  "$PACKAGE_DIR/bin/libssl-1_1-x64.dll"
  "$PACKAGE_DIR/bin/libcrypto-1_1-x64.dll"
  "$PACKAGE_DIR/bin/cacert.pem"
  "$PACKAGE_DIR/bin/ngrok.exe"
)

for required_file in "${REQUIRED_FILES[@]}"; do
  [[ -f "$required_file" ]] ||
    die "dependência ausente: $required_file"
done

mkdir -p "$WORK_DIR"
rm -f "$MSI" "$PARTIAL" "$MAIN_WXS" "$FILES_WXS" "$CONTENTS" "$SHA256"

readarray -t GUIDS < <(
  python3 - "$VERSION" <<'PY'
import sys
import uuid

version = sys.argv[1]
namespace = uuid.UUID("ba8a4cd4-d520-4d3b-8fea-e8d6702e15af")

print(str(uuid.uuid5(namespace, f"MacroObras:Product:{version}")).upper())
print(str(uuid.uuid5(namespace, "MacroObras:UpgradeCode")).upper())
PY
)

PRODUCT_CODE="${GUIDS[0]}"
UPGRADE_CODE="${GUIDS[1]}"

cat > "$MAIN_WXS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product
    Id="$PRODUCT_CODE"
    Name="MacroObras"
    Language="1046"
    Version="$VERSION"
    Manufacturer="Maximus Empreendimentos"
    UpgradeCode="$UPGRADE_CODE">

    <Package
      InstallerVersion="500"
      Compressed="yes"
      InstallScope="perMachine" />

    <Media
      Id="1"
      Cabinet="MacroObras.cab"
      EmbedCab="yes" />

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="INSTALLFOLDER" Name="MacroObras" />
      </Directory>
    </Directory>

    <Feature
      Id="Complete"
      Title="MacroObras"
      Level="1">
      <ComponentGroupRef Id="CG_MacroObras" />
    </Feature>
  </Product>
</Wix>
EOF

printf '[MSI 1/4] Gerando fragmento dos arquivos\n'

find "$PACKAGE_DIR" \
  -type f \
  ! -name '*.log' \
  ! -name '*.tmp' \
  ! -name '*.bak' \
  ! -name '*.msi' \
  ! -name '*.zip' \
  ! -name '*.sha256' \
  -print |
LC_ALL=C sort |
wixl-heat \
  --prefix "$PACKAGE_DIR" \
  --directory-ref INSTALLFOLDER \
  --component-group CG_MacroObras \
  --var var.SourceDir \
  > "$FILES_WXS"

[[ -s "$FILES_WXS" ]] ||
  die "wixl-heat não gerou o fragmento de arquivos."

printf '[MSI 2/4] Compilando instalador\n'
printf 'ProductCode: %s\n' "$PRODUCT_CODE"
printf 'UpgradeCode: %s\n' "$UPGRADE_CODE"

set +e
wixl \
  --verbose \
  --arch x64 \
  -D "SourceDir=$PACKAGE_DIR" \
  -o "$PARTIAL" \
  "$MAIN_WXS" \
  "$FILES_WXS"

WIXL_STATUS=$?
set -e

printf 'Código de saída do wixl: %s\n' "$WIXL_STATUS"

if (( WIXL_STATUS != 0 )); then
  rm -f "$PARTIAL"
  die "wixl falhou; o MSI final não foi publicado."
fi

[[ -s "$PARTIAL" ]] ||
  die "wixl terminou sem produzir um MSI válido."

mv -f "$PARTIAL" "$MSI"

printf '[MSI 3/4] Validando MSI\n'

msiinfo suminfo "$MSI"
msiextract -l "$MSI" > "$CONTENTS"

grep -q 'MacroObras.exe' "$CONTENTS" ||
  die "MacroObras.exe não consta no MSI."

grep -q 'cacert.pem' "$CONTENTS" ||
  die "cacert.pem não consta no MSI."

printf '[MSI 4/4] Gerando SHA-256\n'

sha256sum "$MSI" > "$SHA256"

printf '\nMSI criado:\n  %s\n' "$MSI"
printf 'SHA-256:\n  %s\n' "$SHA256"
printf 'Conteúdo:\n  %s\n' "$CONTENTS"
