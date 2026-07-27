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

python3 - "$ROOT_DIR" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
app = root / "src/app.nim"
text = app.read_text(encoding="utf-8")

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
    text = re.sub(
        rf"(?<![A-Za-z0-9_.]){re.escape(name)}\s*\(",
        f"graph_service.{name}(",
        text,
    )

if "desktopFrontendDir" not in text:
    anchor = "startDesktopApp("
    index = text.find(anchor)
    if index < 0:
        raise SystemExit("Não foi possível localizar startDesktopApp.")
    block = (
        "let desktopFrontendDir =\n"
        "  when defined(release):\n"
        "    getAppDir() / \"frontend\" / \"dist\"\n"
        "  else:\n"
        "    \"../frontend/dist\"\n\n"
    )
    text = text[:index] + block + text[index:]

text = text.replace(
    'prodDir = "../frontend/dist"',
    "prodDir = desktopFrontendDir",
)
app.write_text(text, encoding="utf-8")

stale = "--path:../../obra_macroobras_design_types_tests_bundle/src"
for rel in ["macroobras.nimble", "scripts/run_app.sh", "scripts/build.sh", "README.md"]:
    path = root / rel
    if not path.exists():
        continue
    original = path.read_text(encoding="utf-8")
    lines = []
    for line in original.splitlines():
        if stale not in line:
            lines.append(line)
            continue
        replaced = line.replace(stale, "")
        if replaced.strip() in {"", "\\"}:
            continue
        lines.append(re.sub(r"[ \t]{2,}", " ", replaced).rstrip())
    updated = "\n".join(lines) + ("\n" if original.endswith("\n") else "")
    path.write_text(updated, encoding="utf-8")
PY

echo "[1/5] Verificando JavaScript..."
find frontend/src -type f -name '*.js' -print0 |
  while IFS= read -r -d '' file; do
    node --check "$file"
  done

echo "[2/5] Compilando frontend visual..."
(
  cd frontend
  npm run build
)

echo "[3/5] Preparando ngrok..."
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
fi

echo "[4/5] Verificando backend desktop..."
nim check -d:ssl src/app.nim

echo "[5/5] Compilando desktop release..."
OUTPUT_DIR="$ROOT_DIR/build/desktop"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/frontend"

nim c \
  -d:ssl \
  -d:release \
  "${EMBED_FLAG[@]}" \
  --out:"$OUTPUT_DIR/macroobras" \
  src/app.nim

cp -a frontend/dist "$OUTPUT_DIR/frontend/dist"

cat > "$OUTPUT_DIR/run-macroobras.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$HERE"
exec "$HERE/macroobras" "$@"
SH
chmod +x "$OUTPUT_DIR/run-macroobras.sh"

echo
echo "Desktop criado em:"
echo "  $OUTPUT_DIR"
echo "Execute:"
echo "  $OUTPUT_DIR/run-macroobras.sh"
