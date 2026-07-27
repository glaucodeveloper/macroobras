#!/usr/bin/env python3
"""Extrai itens de execução de um Orçamento Sintético PDF.

Regra do MacroObras:
- a obra vem do cabeçalho "Obra";
- o cliente é lido apenas quando houver rótulo explícito Cliente/Contratante;
- apenas itens de primeiro nível (1, 2, 3...) viram itens de execução;
- cada item persistido contém descrição e orçamento alocado (coluna Total);
- subitens decimais ficam como memória documental e não são somados novamente.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
from decimal import Decimal
from pathlib import Path
from typing import Iterable

MONEY_RE = re.compile(r"(?<![\d.])\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)")
TOP_ITEM_RE = re.compile(r"^\s*(\d+)\s{2,}")
ANY_ITEM_RE = re.compile(r"^\s*\d+(?:\.\d+)*\s+")
CLIENT_RE = re.compile(r"\b(?:cliente|contratante)\b\s*[:\-]?\s*(.+)$", re.I)
TOTAL_RE = re.compile(r"Total\s+Geral\s+R\$\s*([\d.]+,\d{2})", re.I)


def decimal_br(value: str) -> Decimal:
    return Decimal(value.replace(".", "").replace(",", "."))


def clean_text(value: str) -> str:
    value = value.replace("\f", " ")
    return re.sub(r"\s+", " ", value).strip(" -\t")


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return normalized or "item"


def pdf_to_layout_text(pdf: Path) -> str:
    executable = shutil.which("pdftotext")
    if not executable:
        raise RuntimeError("pdftotext não encontrado. Instale poppler-utils.")
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp:
        output = Path(temp.name)
    try:
        subprocess.run([executable, "-layout", str(pdf), str(output)], check=True)
        return output.read_text(encoding="utf-8", errors="replace")
    finally:
        output.unlink(missing_ok=True)


def detect_work(lines: list[str]) -> str:
    for index, line in enumerate(lines):
        if re.search(r"\bObra\b", line, re.I):
            for candidate in lines[index + 1:index + 5]:
                # O nome ocupa a primeira coluna; Bancos/BDI ficam à direita.
                value = clean_text(candidate[:92])
                if value and value.casefold() not in {"bancos", "orçamento sintético"}:
                    return value
    return "Obra importada"


def detect_client(lines: Iterable[str]) -> str | None:
    for raw in lines:
        match = CLIENT_RE.search(clean_text(raw))
        if not match:
            continue
        value = clean_text(match.group(1))
        if value:
            return value
    return None


def useful_description_line(raw: str) -> bool:
    value = clean_text(raw)
    if not value or MONEY_RE.search(value) or ANY_ITEM_RE.match(value):
        return False
    lowered = value.casefold()
    rejected = (
        "orçamento sintético", "item código", "valor unit", "peso (%)", "encargos sociais",
        "sinapi -", "orse -", "desonerado:", "bancos", "b.d.i.", "total geral",
        "total sem bdi", "total do bdi",
    )
    return not any(token in lowered for token in rejected)


def adjacent_description(lines: list[str], row_index: int, direction: int) -> list[str]:
    result: list[str] = []
    index = row_index + direction
    for _ in range(3):
        if index < 0 or index >= len(lines):
            break
        raw = lines[index]
        if not clean_text(raw) or ANY_ITEM_RE.match(clean_text(raw)) or MONEY_RE.search(raw):
            break
        if useful_description_line(raw):
            if direction < 0:
                result.insert(0, clean_text(raw))
            else:
                result.append(clean_text(raw))
        index += direction
    return result


def parse_top_items(lines: list[str]) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    seen: set[int] = set()
    for index, raw in enumerate(lines):
        match = TOP_ITEM_RE.match(raw.replace("\f", ""))
        if not match:
            continue
        number = int(match.group(1))
        if number in seen:
            continue
        values = MONEY_RE.findall(raw)
        if len(values) < 3:
            continue

        # O último token monetário é o percentual; o penúltimo é a coluna Total.
        budget = decimal_br(values[-2])
        first_value_at = raw.find(values[0])
        same_line = clean_text(raw[match.end():first_value_at] if first_value_at >= 0 else raw[match.end():])
        description_parts: list[str] = []
        if same_line:
            description_parts.append(same_line)
        else:
            previous = adjacent_description(lines, index, -1)
            description_parts.extend(previous[-1:])
            description_parts.extend(adjacent_description(lines, index, 1))

        description = clean_text(" ".join(description_parts))
        if not description:
            description = f"ITEM {number}"

        seen.add(number)
        items.append({
            "id": f"item-{number:02d}-{slug(description)[:56]}",
            "item": str(number),
            "descricao": description,
            "orcamentoAlocado": float(budget),
            "orcamentoAlocadoBRL": f"{budget:.2f}",
        })
    return items


def parse_budget(pdf: Path) -> dict[str, object]:
    text = pdf_to_layout_text(pdf)
    lines = text.splitlines()
    items = parse_top_items(lines)
    if not items:
        raise RuntimeError("Nenhum item de primeiro nível foi reconhecido no orçamento sintético.")

    detected_sum = sum(Decimal(str(item["orcamentoAlocado"])) for item in items)
    total_match = TOTAL_RE.search(text)
    declared_total = decimal_br(total_match.group(1)) if total_match else None
    difference = detected_sum - declared_total if declared_total is not None else None

    return {
        "fonte": pdf.name,
        "obra": detect_work(lines),
        "cliente": detect_client(lines),
        "clienteDetectado": detect_client(lines) is not None,
        "formato": {
            "colunasOriginais": ["Item", "Código", "Banco", "Descrição", "Und", "Quant.", "Valor Unit", "Valor Unit com BDI", "Total", "Peso (%)"],
            "camposPersistidosPorItem": ["descricao", "orcamentoAlocado"],
            "regra": "Somente linhas de item inteiro viram itens de execução; a coluna Total é o orçamento alocado.",
        },
        "itens": items,
        "quantidadeItens": len(items),
        "totalItens": float(detected_sum),
        "totalGeralDeclarado": float(declared_total) if declared_total is not None else None,
        "diferenca": float(difference) if difference is not None else None,
        "validacaoTotal": difference == 0 if difference is not None else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrai descrição e orçamento alocado dos itens principais de um orçamento sintético PDF.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--saida", type=Path, default=Path("orcamento_macroobras.json"))
    args = parser.parse_args()
    if not args.pdf.is_file():
        parser.error(f"arquivo não encontrado: {args.pdf}")
    payload = parse_budget(args.pdf)
    args.saida.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{payload['quantidadeItens']} itens extraídos para {args.saida}")
    print(f"Total reconhecido: R$ {payload['totalItens']:,.2f}")
    if payload["totalGeralDeclarado"] is not None:
        print(f"Total declarado: R$ {payload['totalGeralDeclarado']:,.2f}")
        print(f"Validação: {'OK' if payload['validacaoTotal'] else 'DIVERGENTE'}")


if __name__ == "__main__":
    main()
