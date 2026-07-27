#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"
export PATH="$HOME/.nimble/bin:$PATH"

for command in nim node npm python3; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Erro: comando obrigatório não encontrado: $command" >&2
    exit 1
  }
done

echo "MacroObras — desktop full build"
echo "Projeto: $ROOT_DIR"

python3 - "$ROOT_DIR" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
app = root / "src/app.nim"
source = app.read_text(encoding="utf-8")

# Remove o bloco dinâmico inválido inserido por builds anteriores.
lines = source.splitlines()
output = []
skipping = False

for line in lines:
    if line.startswith("let desktopFrontendDir"):
        skipping = True
        continue

    if skipping:
        if line.startswith("startDesktopApp("):
            skipping = False
            output.append(line)
        continue

    output.append(line)

source = "\n".join(output)
if app.read_text(encoding="utf-8").endswith("\n"):
    source += "\n"

source = source.replace(
    "prodDir = desktopFrontendDir",
    'prodDir = "../frontend/dist"',
)

# Evita colisões entre operations_service e graph_service.
for name in [
    "salvarGrafoOperacionalPayload",
    "obterGrafoOperacionalPayload",
    "listarGrafosOperacionaisPayload",
    "removerGrafoOperacionalPayload",
    "salvarRotaVisitaPayload",
    "obterRotaVisitaPayload",
    "listarRotasVisitaPayload",
    "removerRotaVisitaPayload",
    "salvarOrganogramaPayload",
    "obterOrganogramaPayload",
    "listarOrganogramasPayload",
    "removerOrganogramaPayload",
]:
    source = re.sub(
        rf"(?<![A-Za-z0-9_.]){re.escape(name)}\s*\(",
        f"graph_service.{name}(",
        source,
    )

app.write_text(source, encoding="utf-8")

# Remove a referência à dependência obra_core externa apagada.
stale = "--path:../../obra_macroobras_design_types_tests_bundle/src"
for rel in [
    "macroobras.nimble",
    "scripts/run_app.sh",
    "scripts/build.sh",
    "README.md",
]:
    path = root / rel
    if not path.exists():
        continue

    original = path.read_text(encoding="utf-8")
    cleaned = []

    for line in original.splitlines():
        if stale not in line:
            cleaned.append(line)
            continue

        replaced = line.replace(stale, "")
        if replaced.strip() in {"", "\\"}:
            continue
        cleaned.append(re.sub(r"[ \t]{2,}", " ", replaced).rstrip())

    updated = "\n".join(cleaned)
    if original.endswith("\n"):
        updated += "\n"
    path.write_text(updated, encoding="utf-8")
PY

echo
echo "[1/5] Verificando JavaScript..."
find frontend/src -type f -name '*.js' -print0 |
  while IFS= read -r -d '' file; do
    node --check "$file"
  done

echo
echo "[2/5] Compilando frontend visual..."
(
  cd frontend
  npm run build
)

echo
echo "[3/5] Preparando ngrok incorporado..."
case "$(uname -s)" in
  Linux*) NGROK_BIN="$ROOT_DIR/vendor/ngrok/linux/ngrok" ;;
  MINGW*|MSYS*|CYGWIN*) NGROK_BIN="$ROOT_DIR/vendor/ngrok/windows/ngrok.exe" ;;
  *) NGROK_BIN="" ;;
esac

if [[ -n "$NGROK_BIN" && ! -f "$NGROK_BIN" && -x "$ROOT_DIR/scripts/prepare_ngrok_binaries.sh" ]]; then
  sh "$ROOT_DIR/scripts/prepare_ngrok_binaries.sh"
fi

EMBED_FLAG=()
if [[ -n "$NGROK_BIN" && -f "$NGROK_BIN" ]]; then
  EMBED_FLAG=(-d:macroobrasEmbedNgrok)
else
  echo "Aviso: ngrok incorporado não encontrado; compilando sem binário embutido."
fi

echo
echo "[4/5] Verificando backend desktop..."
nim check -d:ssl src/app.nim

echo
echo "[5/5] Compilando executável desktop release..."
BUILD_DIR="$ROOT_DIR/build"
OUTPUT_DIR="$BUILD_DIR/desktop"
ASSET_DIR="$BUILD_DIR/frontend"

rm -rf "$OUTPUT_DIR" "$ASSET_DIR"
mkdir -p "$OUTPUT_DIR" "$ASSET_DIR"

nim c \
  -d:ssl \
  -d:release \
  "${EMBED_FLAG[@]}" \
  --out:"$OUTPUT_DIR/macroobras" \
  src/app.nim

# prodDir = ../frontend/dist. Como o executável roda em build/desktop,
# os arquivos visuais ficam em build/frontend/dist.
cp -a frontend/dist "$ASSET_DIR/dist"

cat > "$OUTPUT_DIR/run-macroobras.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="$HERE/../../.macroobras/runtime/ngrok.env"
if [[ -f "$ENV_FILE" ]]; then
  source "$ENV_FILE"
fi
cd "$HERE"
exec "$HERE/macroobras" "$@"
SH
chmod +x "$OUTPUT_DIR/run-macroobras.sh"

echo
echo "Desktop full build concluído:"
echo "  $OUTPUT_DIR/macroobras"
echo
echo "Frontend do desktop:"
echo "  $ASSET_DIR/dist"
echo
echo "Executar:"
echo "  $OUTPUT_DIR/run-macroobras.sh"
