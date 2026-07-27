## Persistência JSON dos documentos gráficos do MacroObras.

import std/[json, os, strutils]
import ./config

proc armazenamentoGraficoDir(): string =
  appRootDir() / ".macroobras" / "operacional"

proc diretorioTipo(tipo: string): string =
  armazenamentoGraficoDir() / tipo

proc normalizarId(valor: string): string =
  for ch in valor.strip():
    let permitido =
      (ch >= 'a' and ch <= 'z') or
      (ch >= 'A' and ch <= 'Z') or
      (ch >= '0' and ch <= '9') or
      ch == '-' or ch == '_'

    if permitido:
      result.add(ch)
    elif ch == ' ':
      result.add('-')

  if result.len == 0:
    raise newException(
      ValueError,
      "O documento gráfico precisa de um identificador."
    )

proc idPayload(payload: JsonNode): string =
  if payload.kind != JObject:
    raise newException(ValueError, "O payload precisa ser um objeto JSON.")

  result = payload{"id"}.getStr("").normalizarId()

proc caminhoDocumento(tipo, id: string): string =
  diretorioTipo(tipo) / (id.normalizarId() & ".json")

proc salvarDocumento(
    tipo: string,
    payload: JsonNode
): JsonNode =
  let id = payload.idPayload()
  let directory = diretorioTipo(tipo)
  createDir(directory)

  let path = caminhoDocumento(tipo, id)
  writeFile(path, pretty(payload))

  %*{
    "salvo": true,
    "tipo": tipo,
    "id": id,
    "arquivo": path,
    "conhecimentoOkfPendente": true
  }

proc obterDocumento(
    tipo: string,
    payload: JsonNode
): JsonNode =
  let id = payload{"id"}.getStr("").normalizarId()
  let path = caminhoDocumento(tipo, id)

  if not fileExists(path):
    return %*{
      "encontrado": false,
      "tipo": tipo,
      "id": id
    }

  %*{
    "encontrado": true,
    "tipo": tipo,
    "id": id,
    "documento": parseFile(path)
  }

proc listarDocumentos(tipo: string): JsonNode =
  let directory = diretorioTipo(tipo)
  result = %*{
    "tipo": tipo,
    "documentos": newJArray()
  }

  if not dirExists(directory):
    return

  for entryKind, path in walkDir(directory):
    if entryKind != pcFile or not path.toLowerAscii().endsWith(".json"):
      continue

    try:
      result["documentos"].add(parseFile(path))
    except CatchableError:
      discard

proc removerDocumento(
    tipo: string,
    payload: JsonNode
): JsonNode =
  let id = payload{"id"}.getStr("").normalizarId()
  let path = caminhoDocumento(tipo, id)

  if fileExists(path):
    removeFile(path)

  %*{
    "removido": true,
    "tipo": tipo,
    "id": id,
    "conhecimentoOkfPendente": true
  }

proc salvarGrafoOperacionalPayload*(
    payload: JsonNode
): JsonNode =
  salvarDocumento("grafos", payload)

proc obterGrafoOperacionalPayload*(
    payload: JsonNode
): JsonNode =
  obterDocumento("grafos", payload)

proc listarGrafosOperacionaisPayload*(): JsonNode =
  listarDocumentos("grafos")

proc removerGrafoOperacionalPayload*(
    payload: JsonNode
): JsonNode =
  removerDocumento("grafos", payload)

proc salvarRotaVisitaPayload*(
    payload: JsonNode
): JsonNode =
  salvarDocumento("rotas", payload)

proc obterRotaVisitaPayload*(
    payload: JsonNode
): JsonNode =
  obterDocumento("rotas", payload)

proc listarRotasVisitaPayload*(): JsonNode =
  listarDocumentos("rotas")

proc removerRotaVisitaPayload*(
    payload: JsonNode
): JsonNode =
  removerDocumento("rotas", payload)

proc salvarOrganogramaPayload*(
    payload: JsonNode
): JsonNode =
  salvarDocumento("organogramas", payload)

proc obterOrganogramaPayload*(
    payload: JsonNode
): JsonNode =
  obterDocumento("organogramas", payload)

proc listarOrganogramasPayload*(): JsonNode =
  listarDocumentos("organogramas")

proc removerOrganogramaPayload*(
    payload: JsonNode
): JsonNode =
  removerDocumento("organogramas", payload)
