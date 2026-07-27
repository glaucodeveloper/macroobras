#!/usr/bin/env python3
"""Normaliza planilhas orçamentárias resumidas para o MacroObras.

Entrada aceita: arquivo .xlsx ou .zip contendo planilhas.
Saída: JSON com obra, cliente e itens {descricao, orcamento_alocado}.
Não depende de openpyxl: lê diretamente o pacote XML do XLSX.
"""
from __future__ import annotations

import argparse
import json
import re
import tempfile
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def normalizar(texto: object) -> str:
    texto = "".join(
        caractere
        for caractere in unicodedata.normalize("NFD", str(texto or ""))
        if unicodedata.category(caractere) != "Mn"
    )
    return re.sub(r"\s+", " ", texto).strip().upper()


def numero(valor: object) -> float | None:
    candidatos = re.findall(r"-?\d[\d.]*,\d{2}|-?\d+(?:\.\d+)?", str(valor or ""))
    if not candidatos:
        return None
    texto = candidatos[-1]
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    try:
        return round(float(texto), 2)
    except ValueError:
        return None


def profundidade_item(codigo: object) -> int:
    texto = re.sub(r"[^0-9.]", "", str(codigo or "")).strip(".")
    return len([parte for parte in texto.split(".") if parte]) if texto else 999


def ler_xlsx(caminho: Path) -> list[dict]:
    with zipfile.ZipFile(caminho) as pacote:
        compartilhadas: list[str] = []
        if "xl/sharedStrings.xml" in pacote.namelist():
            raiz = ET.fromstring(pacote.read("xl/sharedStrings.xml"))
            for item in raiz.findall("a:si", NS):
                compartilhadas.append("".join(no.text or "" for no in item.iter(f"{{{NS['a']}}}t")))

        workbook = ET.fromstring(pacote.read("xl/workbook.xml"))
        relacoes = ET.fromstring(pacote.read("xl/_rels/workbook.xml.rels"))
        mapa_relacoes = {no.attrib["Id"]: no.attrib["Target"] for no in relacoes}
        resultado: list[dict] = []

        for planilha in workbook.find("a:sheets", NS) or []:
            rel_id = planilha.attrib[f"{{{NS['r']}}}id"]
            alvo = mapa_relacoes[rel_id]
            if alvo.startswith("/"):
                alvo = alvo[1:]
            elif not alvo.startswith("xl/"):
                alvo = f"xl/{alvo}"
            alvo = alvo.replace("xl/../", "")
            xml = ET.fromstring(pacote.read(alvo))
            celulas: dict[str, str] = {}

            for celula in xml.findall(".//a:c", NS):
                referencia = celula.attrib["r"]
                tipo = celula.attrib.get("t")
                valor = celula.find("a:v", NS)
                inline = celula.find("a:is", NS)
                texto = ""
                if tipo == "s" and valor is not None:
                    texto = compartilhadas[int(valor.text or 0)]
                elif tipo == "inlineStr" and inline is not None:
                    texto = "".join(no.text or "" for no in inline.iter(f"{{{NS['a']}}}t"))
                elif valor is not None:
                    texto = valor.text or ""
                if texto:
                    celulas[referencia] = texto

            rodape = xml.find("a:headerFooter", NS)
            cabecalho_rodape = "\n".join((no.text or "") for no in rodape) if rodape is not None else ""
            resultado.append({"nome": planilha.attrib["name"], "celulas": celulas, "cabecalho_rodape": cabecalho_rodape})
        return resultado


def coluna(referencia: str) -> str:
    return re.match(r"[A-Z]+", referencia).group(0)  # type: ignore[union-attr]


def linha(referencia: str) -> int:
    return int(re.search(r"\d+", referencia).group(0))  # type: ignore[union-attr]


def extrair(caminho: Path) -> dict | None:
    planilhas = ler_xlsx(caminho)
    alvo = None
    for planilha in planilhas:
        valores = [normalizar(valor) for valor in planilha["celulas"].values()]
        if "PLANILHA ORCAMENTARIA RESUMIDA" in valores or (
            "RESUM" in normalizar(planilha["nome"])
            and "DESCRICAO" in valores
            and "TOTAL" in valores
        ):
            alvo = planilha
            break
    if alvo is None:
        return None

    celulas = alvo["celulas"]
    ref_descricao = next((ref for ref, valor in celulas.items() if normalizar(valor) == "DESCRICAO"), None)
    ref_total = next((ref for ref, valor in celulas.items() if normalizar(valor) == "TOTAL"), None)
    ref_item = next((ref for ref, valor in celulas.items() if normalizar(valor) == "ITEM"), None)
    if not all([ref_descricao, ref_total, ref_item]):
        return None

    ref_obra = next((ref for ref, valor in celulas.items() if normalizar(valor) == "OBRA"), None)
    obra = celulas.get(f"{coluna(ref_obra)}{linha(ref_obra) + 1}", "") if ref_obra else ""

    ultima_linha = max((linha(ref) for ref in celulas), default=linha(ref_descricao))
    registros = []
    for numero_linha in range(linha(ref_descricao) + 1, ultima_linha + 1):
        codigo = celulas.get(f"{coluna(ref_item)}{numero_linha}", "").strip()
        descricao = celulas.get(f"{coluna(ref_descricao)}{numero_linha}", "").strip()
        total = numero(celulas.get(f"{coluna(ref_total)}{numero_linha}", ""))
        if codigo and descricao and total is not None:
            registros.append({
                "codigo": codigo,
                "profundidade": profundidade_item(codigo),
                "descricao": descricao,
                "orcamento_alocado": total,
            })

    if not registros:
        return None
    primeira = registros[0]
    primeira_e_raiz = bool(obra and (
        normalizar(primeira["descricao"]) == normalizar(obra)
        or normalizar(primeira["descricao"]) in normalizar(obra)
        or normalizar(obra) in normalizar(primeira["descricao"])
    ))
    profundidade = primeira["profundidade"] + 1 if primeira_e_raiz else min(item["profundidade"] for item in registros)
    itens = [
        {"descricao": item["descricao"], "orcamento_alocado": item["orcamento_alocado"]}
        for item in registros
        if item["profundidade"] == profundidade
    ]

    texto_rodape = re.sub(r"&[LCR]|&\"[^\"]+\"|&\d+|&[A-Z]", " ", alvo["cabecalho_rodape"])
    linhas = [re.sub(r"\s+", " ", parte).strip() for parte in texto_rodape.splitlines() if parte.strip()]
    cliente = next((parte for parte in linhas if "SUPERINTEND" in normalizar(parte)), "")
    if not cliente:
        cliente = next((parte for parte in linhas if "SECRETARIA" in normalizar(parte)), "")

    return {
        "arquivo": caminho.name,
        "planilha": alvo["nome"],
        "obra": obra,
        "cliente": cliente,
        "itens": itens,
        "orcamento_total": round(sum(item["orcamento_alocado"] for item in itens), 2),
    }


def arquivos_entrada(caminho: Path):
    if caminho.suffix.lower() == ".xlsx":
        yield caminho
        return
    if caminho.suffix.lower() != ".zip":
        raise ValueError("A entrada deve ser .xlsx ou .zip")
    with tempfile.TemporaryDirectory(prefix="macroobras-") as pasta:
        with zipfile.ZipFile(caminho) as pacote:
            pacote.extractall(pasta)
        yield from Path(pasta).rglob("*.xlsx")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("entrada", type=Path)
    parser.add_argument("--saida", type=Path, default=Path("orcamentos_normalizados.json"))
    args = parser.parse_args()

    resultados = []
    for arquivo in arquivos_entrada(args.entrada):
        try:
            resultado = extrair(arquivo)
            if resultado:
                resultado["caminho_relativo"] = str(arquivo)
                resultados.append(resultado)
        except (KeyError, ValueError, zipfile.BadZipFile, ET.ParseError) as erro:
            resultados.append({"arquivo": str(arquivo), "erro": str(erro)})

    args.saida.write_text(json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(resultados)} planilhas resumidas gravadas em {args.saida}")


if __name__ == "__main__":
    main()
