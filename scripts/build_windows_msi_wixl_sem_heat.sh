#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build/windows-cross"
SOURCE_DIR="$BUILD/MacroObras"
WORK="$BUILD/msi-wixl-sem-heat"
VERSION="${1:-1.0.0}"

MSI="$BUILD/MacroObras-Setup-Windows-x64-${VERSION}.msi"
PARTIAL="$MSI.partial.msi"
PRODUCT_WXS="$WORK/Product-${VERSION}.wxs"
FILES_WXS="$WORK/Files-${VERSION}.wxs"
WIXL_LOG="$WORK/wixl-${VERSION}.log"

GENERATE_ONLY="${WIXL_GENERATE_ONLY:-0}"
RUN_PROBE="${WIXL_RUN_PROBE:-1}"

die() {
  printf '\nERRO: %s\n' "$*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 ||
    die "ferramenta ausente: $1"
}

need python3

if [[ "$GENERATE_ONLY" != "1" ]]; then
  for tool in wixl msiextract msiinfo sha256sum; do
    need "$tool"
  done
fi

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
rm -f \
  "$MSI" \
  "$MSI.sha256" \
  "$PARTIAL" \
  "$PRODUCT_WXS" \
  "$FILES_WXS" \
  "$WIXL_LOG"

printf '==> Gerando WiX sem wixl-heat\n'

python3 - \
  "$SOURCE_DIR" \
  "$VERSION" \
  "$PRODUCT_WXS" \
  "$FILES_WXS" <<'PY'
from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import quoteattr
import hashlib
import os
import stat
import sys
import uuid

source = Path(sys.argv[1]).resolve()
version = sys.argv[2]
product_wxs = Path(sys.argv[3])
files_wxs = Path(sys.argv[4])

excluded_suffixes = {".log", ".tmp", ".bak"}
namespace = uuid.UUID("ba8a4cd4-d520-4d3b-8fea-e8d6702e15af")
upgrade_code = "D5752383-57A9-577E-B90D-F9D865A14A53"
product_code = str(
    uuid.uuid5(namespace, f"MacroObras:Product:{version}")
).upper()

def ident(prefix: str, value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]
    return f"{prefix}_{digest}"

def component_guid(relative: str) -> str:
    return str(
        uuid.uuid5(namespace, f"MacroObras:Component:{relative}")
    ).upper()

def source_attr(path: Path) -> str:
    return str(path).replace("$", "$$")

files: list[tuple[str, Path]] = []
casefold_seen: dict[str, str] = {}
invalid_names: list[str] = []
large_files: list[tuple[str, int]] = []

for root, dirs, names in os.walk(source, followlinks=False):
    dirs[:] = sorted(
        [
            name for name in dirs
            if not (Path(root) / name).is_symlink()
        ],
        key=str.casefold,
    )

    for name in sorted(names, key=str.casefold):
        path = Path(root) / name

        try:
            file_stat = path.stat(follow_symlinks=False)
        except OSError as exc:
            raise SystemExit(f"não foi possível ler {path}: {exc}")

        if not stat.S_ISREG(file_stat.st_mode):
            continue

        if path.suffix.lower() in excluded_suffixes:
            continue

        relative = path.relative_to(source).as_posix()

        if any(ord(ch) < 32 for ch in relative):
            invalid_names.append(f"{relative}: contém caractere de controle")
            continue

        try:
            relative.encode("cp1252")
        except UnicodeEncodeError:
            invalid_names.append(
                f"{relative}: não é representável no codepage Windows-1252"
            )
            continue

        folded = relative.casefold()
        previous = casefold_seen.get(folded)
        if previous is not None and previous != relative:
            invalid_names.append(
                f"colisão no Windows: {previous!r} e {relative!r}"
            )
            continue
        casefold_seen[folded] = relative

        if file_stat.st_size > 2_147_483_647:
            large_files.append((relative, file_stat.st_size))
            continue

        files.append((relative, path))

if invalid_names:
    details = "\n  ".join(invalid_names)
    raise SystemExit(f"nomes incompatíveis encontrados:\n  {details}")

if large_files:
    details = "\n  ".join(
        f"{relative}: {size} bytes"
        for relative, size in large_files
    )
    raise SystemExit(
        "arquivos maiores que o limite individual do wixl:\n  " + details
    )

if not files:
    raise SystemExit(f"nenhum arquivo empacotável encontrado em {source}")

tree: dict = {"dirs": {}, "files": []}

for relative, absolute in files:
    parts = relative.split("/")
    node = tree
    for part in parts[:-1]:
        node = node["dirs"].setdefault(
            part,
            {"dirs": {}, "files": []},
        )
    node["files"].append((relative, absolute))

components: list[str] = []

def emit_node(
    node: dict,
    relative_dir: str,
    indent: str,
    output: list[str],
) -> None:
    for relative, absolute in sorted(
        node["files"],
        key=lambda item: item[0].casefold(),
    ):
        component_id = ident("Cmp", relative)
        file_id = ident("Fil", relative)
        guid = component_guid(relative)
        name = Path(relative).name
        components.append(component_id)

        output.append(
            f'{indent}<Component Id={quoteattr(component_id)} '
            f'Guid={quoteattr(guid)}>'
        )
        output.append(
            f'{indent}  <File Id={quoteattr(file_id)} '
            f'Name={quoteattr(name)} '
            f'Source={quoteattr(source_attr(absolute))} '
            f'KeyPath="yes" />'
        )
        output.append(f"{indent}</Component>")

    for dirname, child in sorted(
        node["dirs"].items(),
        key=lambda item: item[0].casefold(),
    ):
        child_relative = (
            f"{relative_dir}/{dirname}"
            if relative_dir
            else dirname
        )
        directory_id = ident("Dir", child_relative)

        output.append(
            f'{indent}<Directory Id={quoteattr(directory_id)} '
            f'Name={quoteattr(dirname)}>'
        )
        emit_node(
            child,
            child_relative,
            indent + "  ",
            output,
        )
        output.append(f"{indent}</Directory>")

files_xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">',
    '  <Fragment>',
    '    <DirectoryRef Id="INSTALLDIR">',
]
emit_node(tree, "", "      ", files_xml)
files_xml += [
    '    </DirectoryRef>',
    '  </Fragment>',
    '  <Fragment>',
    '    <ComponentGroup Id="CG.MacroObras">',
]
files_xml += [
    f'      <ComponentRef Id={quoteattr(component_id)} />'
    for component_id in components
]
files_xml += [
    '    </ComponentGroup>',
    '  </Fragment>',
    '</Wix>',
    '',
]

product_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product
    Id="{product_code}"
    Name="MacroObras"
    Language="1046"
    Codepage="1252"
    Version="{version}"
    Manufacturer="Maximus Empreendimentos"
    UpgradeCode="{upgrade_code}">

    <Package
      InstallerVersion="200"
      Compressed="yes"
      Comments="Instalador MacroObras {version}" />

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
'''

product_wxs.write_text(product_xml, encoding="utf-8")
files_wxs.write_text("\n".join(files_xml), encoding="utf-8")

print(f"ProductCode: {product_code}")
print(f"UpgradeCode: {upgrade_code}")
print(f"Arquivos: {len(files)}")
print(f"Componentes: {len(components)}")
print(f"Product WXS: {product_wxs}")
print(f"Files WXS: {files_wxs}")
PY

[[ -s "$PRODUCT_WXS" ]] ||
  die "Product WXS vazio"

[[ -s "$FILES_WXS" ]] ||
  die "Files WXS vazio"

if grep -nE 'Name=""|Source="[^"]*//' \
  "$PRODUCT_WXS" "$FILES_WXS"; then
  die "o WXS contém diretório vazio ou caminho com barra dupla"
fi

printf '==> Fragmento validado\n'
printf '    Diretórios: %s\n' \
  "$(grep -c '<Directory ' "$FILES_WXS" || true)"
printf '    Componentes: %s\n' \
  "$(grep -c '<Component ' "$FILES_WXS" || true)"
printf '    Arquivos: %s\n' \
  "$(grep -c '<File ' "$FILES_WXS" || true)"

if [[ "$GENERATE_ONLY" == "1" ]]; then
  printf '\nWXS gerados; compilação ignorada por WIXL_GENERATE_ONLY=1.\n'
  exit 0
fi

printf '\n==> wixl instalado\n'
wixl --version 2>/dev/null || true

if [[ "$RUN_PROBE" == "1" ]]; then
  PROBE_DIR="$WORK/probe"
  PROBE_FILE="$PROBE_DIR/probe.txt"
  PROBE_WXS="$PROBE_DIR/probe.wxs"
  PROBE_MSI="$PROBE_DIR/probe.msi"

  rm -rf "$PROBE_DIR"
  mkdir -p "$PROBE_DIR"
  printf 'MacroObras wixl probe\n' > "$PROBE_FILE"

  PROBE_PRODUCT="$(
    python3 - <<'PY'
import uuid
ns = uuid.UUID("ba8a4cd4-d520-4d3b-8fea-e8d6702e15af")
print(str(uuid.uuid5(ns, "MacroObras:wixl-probe:product")).upper())
PY
  )"

  PROBE_COMPONENT="$(
    python3 - <<'PY'
import uuid
ns = uuid.UUID("ba8a4cd4-d520-4d3b-8fea-e8d6702e15af")
print(str(uuid.uuid5(ns, "MacroObras:wixl-probe:component")).upper())
PY
  )"

  cat > "$PROBE_WXS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product
    Id="$PROBE_PRODUCT"
    UpgradeCode="D0CB8B0A-E792-49E0-8C49-A6685748A56D"
    Name="MacroObras Wixl Probe"
    Version="1.0.0"
    Manufacturer="Maximus Empreendimentos"
    Language="1046"
    Codepage="1252">
    <Package InstallerVersion="200" Compressed="yes" />
    <Media Id="1" Cabinet="probe.cab" EmbedCab="yes" />
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="INSTALLDIR" Name="MacroObrasWixlProbe">
          <Component
            Id="Cmp_Probe"
            Guid="$PROBE_COMPONENT">
            <File
              Id="Fil_Probe"
              Name="probe.txt"
              Source="$PROBE_FILE"
              KeyPath="yes" />
          </Component>
        </Directory>
      </Directory>
    </Directory>
    <Feature Id="Complete" Title="Probe" Level="1">
      <ComponentRef Id="Cmp_Probe" />
    </Feature>
  </Product>
</Wix>
EOF

  printf '\n==> Testando a instalação local do wixl\n'
  if ! wixl \
      --arch x64 \
      -o "$PROBE_MSI" \
      "$PROBE_WXS" \
      >"$PROBE_DIR/probe.log" 2>&1; then
    cat "$PROBE_DIR/probe.log" >&2
    die "o MSI mínimo também falhou; reinstale msitools/libmsi antes de compilar o projeto"
  fi

  [[ -s "$PROBE_MSI" ]] ||
    die "o teste mínimo do wixl não produziu MSI"

  printf '    Probe MSI: OK\n'
fi

printf '\n==> Compilando MSI completo\n'

set +e
G_MESSAGES_DEBUG=all \
wixl \
  -v \
  --arch x64 \
  -o "$PARTIAL" \
  "$PRODUCT_WXS" \
  "$FILES_WXS" \
  2>&1 |
tee "$WIXL_LOG"
STATUS=${PIPESTATUS[0]}
set -e

printf 'Código de saída do wixl: %s\n' "$STATUS"

if (( STATUS != 0 )); then
  printf '\nDiagnóstico preservado:\n' >&2
  printf '  Log: %s\n' "$WIXL_LOG" >&2
  printf '  Product: %s\n' "$PRODUCT_WXS" >&2
  printf '  Files: %s\n' "$FILES_WXS" >&2

  if [[ -e "$PARTIAL" ]]; then
    printf '  Parcial: %s\n' "$PARTIAL" >&2
    file "$PARTIAL" >&2 || true
  fi

  printf '\nMaiores arquivos do pacote:\n' >&2
  find "$SOURCE_DIR" -type f -printf '%s\t%p\n' |
    sort -nr |
    head -n 20 >&2 || true

  die "wixl falhou; consulte o log preservado"
fi

[[ -s "$PARTIAL" ]] ||
  die "wixl terminou sem produzir o MSI parcial"

mv -f "$PARTIAL" "$MSI"

printf '\n==> Validando MSI\n'
msiextract -l "$MSI" > "$WORK/files-${VERSION}.txt"
msiinfo suminfo "$MSI" > "$WORK/suminfo-${VERSION}.txt"
sha256sum "$MSI" > "$MSI.sha256"

printf '\nMSI criado:\n  %s\n' "$MSI"
printf 'SHA-256:\n  %s\n' "$MSI.sha256"
printf 'Conteúdo:\n  %s\n' "$WORK/files-${VERSION}.txt"
printf 'Log wixl:\n  %s\n' "$WIXL_LOG"

