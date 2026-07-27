import std/[json, os, strutils, times]

import ./okf_service

proc agoraIso(): string = now().utc.format("yyyy-MM-dd'T'HH:mm:ss'Z'")

proc criarObraPorPlanilhaPayload*(payload: JsonNode): JsonNode =
  %*{
    "obra": {
      "endereco": payload{"endereco"}.getStr(),
      "cliente": payload{"cliente"}.getStr(),
      "nome": payload{"obra"}.getStr(),
      "itens": payload{"itens"},
      "origem": "planilha-orcamentaria-resumida",
      "criadaEm": agoraIso()
    },
    "regra": "entrada manual restrita ao endereço; cliente e itens vêm da planilha",
    "conhecimentoOkfPendente": true
  }

proc iniciarFluxoCompraPayload*(payload: JsonNode): JsonNode =
  %*{
    "fluxo": {
      "obraId": payload{"obraId"}.getStr(),
      "itemExecucaoId": payload{"itemExecucaoId"}.getStr(),
      "status": "solicitacao",
      "stickers": [
        {"tipo": "item-execucao", "preenchido": true},
        {"tipo": "solicitacao", "preenchido": false},
        {"tipo": "cotacao", "preenchido": false},
        {"tipo": "autorizacao", "preenchido": false, "papel": "administrador"},
        {"tipo": "compra", "preenchido": false},
        {"tipo": "transporte", "preenchido": false},
        {"tipo": "entrega", "preenchido": false, "exigeFoto": true}
      ],
      "criadoEm": agoraIso()
    },
    "conhecimentoOkfPendente": true
  }

proc autorizarCompraPayload*(payload: JsonNode): JsonNode =
  %*{
    "fluxoId": payload{"fluxoId"}.getStr(),
    "status": "autorizada",
    "autorizador": "administrador-desktop",
    "autorizadaEm": agoraIso(),
    "conhecimentoOkfPendente": true
  }

proc comprovarEntregaPayload*(payload: JsonNode): JsonNode =
  %*{
    "fluxoId": payload{"fluxoId"}.getStr(),
    "status": "entregue-com-foto",
    "foto": payload{"foto"}.getStr(),
    "quantidadeRecebida": payload{"quantidadeRecebida"}.getStr(),
    "divergencia": payload{"divergencia"}.getStr(),
    "comprovadaEm": agoraIso(),
    "stickerEntregaPreenchido": true,
    "conhecimentoOkfPendente": true
  }

proc salvarPlanejamentoNosPayload*(payload: JsonNode): JsonNode =
  %*{
    "obraId": payload{"obraId"}.getStr(),
    "diagrama": payload{"diagrama"},
    "calendarioRegenerado": true,
    "salvoEm": agoraIso(),
    "conhecimentoOkfPendente": true
  }

proc salvarRotaVisitasPayload*(payload: JsonNode): JsonNode =
  %*{
    "rota": payload,
    "calendarioGerado": true,
    "tempoDeslocamentoOrigem": "requisicao-web",
    "salvaEm": agoraIso(),
    "conhecimentoOkfPendente": true
  }

proc salvarOrganogramaPayload*(payload: JsonNode): JsonNode =
  %*{
    "organograma": payload,
    "entidades": ["equipe", "funcao", "colaborador", "obra", "vinculo"],
    "salvoEm": agoraIso(),
    "conhecimentoOkfPendente": true
  }


proc safeSlug(value: string): string =
  result = value.toLowerAscii()
  for character in result.mitems:
    if not (character in {'a'..'z', '0'..'9', '-', '_'}):
      character = '-'
  while result.contains("--"):
    result = result.replace("--", "-")
  result = result.strip(chars = {'-'})
  if result.len == 0:
    result = "obra"

proc markdownValue(value: JsonNode): string =
  case value.kind
  of JString: value.getStr("")
  of JInt: $value.getInt()
  of JFloat: $value.getFloat()
  of JBool: $value.getBool()
  else: $value

proc salvarOkfElementosObraPayload*(payload: JsonNode): JsonNode =
  let obraId = payload{"obraId"}.getStr("obra")
  let obraNome = payload{"obra"}.getStr(obraId)
  let diagrama = payload{"diagrama"}
  let nodes = diagrama{"nodes"}
  let edges = diagrama{"edges"}
  let repoDir = okfAbsoluteDir(okfConfig())
  let workDir = repoDir / "macroobras" / "obras" / safeSlug(obraId)
  createDir(workDir)

  var markdown = "# Elementos da obra — " & obraNome & "\n\n"
  markdown.add("Fonte canônica: Cronograma gráfico da obra.\n\n")
  markdown.add("## Elementos e materiais\n\n")
  if nodes.kind == JArray:
    for node in nodes:
      markdown.add("### " & node{"title"}.getStr("Elemento") & "\n\n")
      markdown.add("- ID: `" & node{"id"}.getStr("") & "`\n")
      markdown.add("- Tipo: " & node{"kind"}.getStr("Quadro") & "\n")
      markdown.add("- Descrição: " & node{"description"}.getStr("") & "\n")
      markdown.add("- Observações: " & node{"observations"}.getStr("") & "\n")
      let fields = node{"fields"}
      if fields.kind == JArray and fields.len > 0:
        markdown.add("- Campos:\n")
        for field in fields:
          markdown.add("  - " & field{"name"}.getStr("Campo") & ": " & markdownValue(field{"value"}) & "\n")
      markdown.add("\n")

  markdown.add("## Relações\n\n")
  if edges.kind == JArray:
    for edge in edges:
      markdown.add("- `" & edge{"from"}.getStr("") & "` — **" & edge{"label"}.getStr("relação") & "** → `" & edge{"to"}.getStr("") & "`\n")

  writeFileIfChanged(workDir / "elementos.md", markdown)
  writeFileIfChanged(workDir / "elementos.json", pretty(diagrama))
  %*{
    "obraId": obraId,
    "okfPath": workDir,
    "salvoEm": agoraIso(),
    "mensagem": "OKF atualizado a partir do gráfico de elementos da obra.",
    "calendarioRegenerado": true
  }
