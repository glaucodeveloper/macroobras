import std/[json, times]

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
