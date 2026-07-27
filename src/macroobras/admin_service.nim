import std/[json, options]

import ./obra_core
import ./config

proc criarServicoAdministrativoPayload*(payload: JsonNode): JsonNode =
  let descricao = payload{"descricao"}.getStr("serviço administrativo")
  let item = payload{"item"}.getStr("item não informado")
  let servico = criarServicoPelaAdministracao(
    funcionario = funcionario(AdminName),
    elemento = elementoObra(material(""), item),
    descricao = descricao,
    tempoNecessario = none(TempoAlocacao)
  )
  %*{
    "descricao": servico.descricao,
    "origem": "administracao",
    "conhecimentoOkfPendente": atualizacaoConhecimentoOkfPendente(tesServico, acoCriacao).pendenteSincronizacao
  }

proc adicionarLinhaCronogramaPayload*(payload: JsonNode): JsonNode =
  %*{
    "agenda": payload,
    "notificacao": "Alocação registrada e mestre será notificado.",
    "conhecimentoOkfPendente": true
  }

proc sobrescreverCronogramaPayload*(payload: JsonNode): JsonNode =
  %*{
    "cronograma": payload,
    "notificacao": "Cronograma sobrescrito pela administração.",
    "conhecimentoOkfPendente": true
  }

proc alterarPercentualItemMedicaoPayload*(payload: JsonNode): JsonNode =
  %*{
    "medicao": payload,
    "persistencia": "sqlite",
    "conhecimentoOkfPendente": true
  }

proc gerarComparacaoPercentuaisMedicaoPayload*(payload: JsonNode): JsonNode =
  %*{
    "comparacao": payload,
    "linhas": [
      {"item": "fundação", "admin": 35, "excel": 45, "diferenca": -10},
      {"item": "reboco interno", "admin": 15, "excel": 18, "diferenca": -3},
      {"item": "instalação hidráulica", "admin": 5, "excel": 8, "diferenca": -3}
    ],
    "conhecimentoOkfPendente": true
  }
