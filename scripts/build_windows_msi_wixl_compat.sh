#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build/windows-cross"
SOURCE_DIR="$BUILD/MacroObras"
WORK="$BUILD/msi-wixl"
VERSION="${1:-1.0.0}"
MSI="$BUILD/MacroObras-Setup-Windows-x64-${VERSION}.msi"
PRODUCT_WXS="$WORK/Product-${VERSION}.wxs"
FILES_WXS="$WORK/Files-${VERSION}.wxs"
PARTIAL="$MSI.partial.msi"

die() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

for tool in wixl wixl-heat msiextract msiinfo python3; do
  command -v "$tool" >/dev/null 2>&1 ||
    die "ferramenta ausente: $tool"
done

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
  die "versão inválida: use major.minor.build, por exemplo 1.0.0"

[[ -d "$SOURCE_DIR" ]] ||
  die "pacote Windows ausente: $SOURCE_DIR"

REQUIRED=(
  "$SOURCE_DIR/bin/MacroObras.exe"
  "$SOURCE_DIR/bin/MacroObras-Browser.exe"
  "$SOURCE_DIR/bin/sqlite3_64.dll"
  "$SOURCE_DIR/bin/libssl-1_1-x64.dll"
  "$SOURCE_DIR/bin/libcrypto-1_1-x64.dll"
  "$SOURCE_DIR/bin/cacert.pem"
  "$SOURCE_DIR/bin/ngrok.exe"
)

for item in "${REQUIRED[@]}"; do
  [[ -f "$item" ]] || die "dependência ausente: $item"
done

mkdir -p "$WORK"
rm -f "$MSI" "$PARTIAL" "$PRODUCT_WXS" "$FILES_WXS"

PRODUCT_CODE="$(
  python3 - "$VERSION" <<'PY'
import sys, uuid
version = sys.argv[1]
namespace = uuid.UUID("ba8a4cd4-d520-4d3b-8fea-e8d6702e15af")
print(str(uuid.uuid5(namespace, "MacroObras:Product:" + version)).upper())
PY
)"

UPGRADE_CODE="D5752383-57A9-577E-B90D-F9D865A14A53"

cat > "$PRODUCT_WXS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product
    Id="$PRODUCT_CODE"
    Name="MacroObras"
    Language="1046"
    Codepage="1252"
    Version="$VERSION"
    Manufacturer="Maximus Empreendimentos"
    UpgradeCode="$UPGRADE_CODE">

    <Package
      Id="*"
      InstallerVersion="200"
      Languages="1046"
      Compressed="yes"
      SummaryCodepage="1252"
      Description="Instalador MacroObras $VERSION"
      Manufacturer="Maximus Empreendimentos" />

    <Media
      Id="1"
      Cabinet="MacroObras.cab"
      EmbedCab="yes" />

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="INSTALLDIR" Name="MacroObras" />
      </Directory>
    </Directory>

    <Feature
      Id="Complete"
      Title="MacroObras"
      Level="1">
      <ComponentGroupRef Id="CG.MacroObras" />
    </Feature>
  </Product>
</Wix>
EOF

find "$SOURCE_DIR" \
  -type f \
  ! -name '*.log' \
  ! -name '*.tmp' \
  ! -name '*.bak' \
  -print \
  | LC_ALL=C sort \
  | wixl-heat \
      -p "$SOURCE_DIR" \
      --component-group CG.MacroObras \
      --var var.SourceDir \
      --directory-ref INSTALLDIR \
  > "$FILES_WXS"

[[ -s "$FILES_WXS" ]] ||
  die "wixl-heat não gerou o fragmento de arquivos"

printf '[MSI] Compilando em modo compatível com wixl\n'

set +e
wixl \
  -v \
  --arch x64 \
  -D "SourceDir=$SOURCE_DIR" \
  -o "$PARTIAL" \
  "$PRODUCT_WXS" \
  "$FILES_WXS"
STATUS=$?
set -e

printf 'Código de saída do wixl: %s\n' "$STATUS"

if (( STATUS != 0 )); then
  rm -f "$PARTIAL"
  die "wixl falhou"
fi

[[ -s "$PARTIAL" ]] ||
  die "wixl terminou sem produzir o MSI"

mv -f "$PARTIAL" "$MSI"

msiextract -l "$MSI" > "$WORK/files-${VERSION}.txt"
msiinfo suminfo "$MSI" > "$WORK/suminfo-${VERSION}.txt"
sha256sum "$MSI" > "$MSI.sha256"

printf '\nMSI criado:\n  %s\n' "$MSI"
printf 'SHA-256:\n  %s\n' "$MSI.sha256"
printf 'Conteúdo:\n  %s\n' "$WORK/files-${VERSION}.txt"
