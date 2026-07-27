## Núcleo local de compatibilidade do domínio MacroObras.
##
## A antiga dependência externa `obra_core` foi removida. Este módulo preserva
## o contrato atualmente usado pelo backend e exporta o novo domínio gráfico.

import std/[options, strutils]
import ./operational_graph
export operational_graph

type
  Texto* = string

  Funcionario* = object
    nome*: Texto

  Responsavel* = object
    funcionario*: Funcionario
    especificacaoComposicaoObra*: Texto

  AdministracaoObra* = object
    nome*: Texto
    especificacao*: Texto

  Material* = object
    nome*: Texto

  ElementoObra* = object
    material*: Material
    descricao*: Texto

  TipoTempoAlocacao* = enum
    ttaLivre,
    ttaTurno,
    ttaHoras

  TempoAlocacao* = object
    tipo*: TipoTempoAlocacao
    horas*: float
    descricao*: Texto

  Servico* = object
    funcionario*: Funcionario
    elemento*: ElementoObra
    descricao*: Texto
    tempoNecessario*: Option[TempoAlocacao]

  TipoEntidadeSincronizacao* = enum
    tesServico,
    tesGrafo,
    tesRota,
    tesOrganograma

  AcaoConhecimentoOkf* = enum
    acoCriacao,
    acoAtualizacao,
    acoRemocao

  AtualizacaoConhecimentoOkf* = object
    pendenteSincronizacao*: bool

proc funcionario*(nome: Texto): Funcionario =
  Funcionario(nome: nome)

proc responsavel*(
    funcionario: Funcionario,
    especificacaoComposicaoObra: Texto = ""
): Responsavel =
  Responsavel(
    funcionario: funcionario,
    especificacaoComposicaoObra: especificacaoComposicaoObra
  )

proc administracaoObra*(
    nome, especificacao: Texto
): AdministracaoObra =
  AdministracaoObra(nome: nome, especificacao: especificacao)

proc material*(nome: Texto): Material =
  Material(nome: nome)

proc elementoObra*(
    material: Material,
    descricao: Texto
): ElementoObra =
  ElementoObra(material: material, descricao: descricao)

proc tempoLivre*(descricao: Texto = "tempo livre"): TempoAlocacao =
  TempoAlocacao(
    tipo: ttaLivre,
    horas: 0.0,
    descricao: descricao
  )

proc tempoPorTurno*(turno: Texto): TempoAlocacao =
  TempoAlocacao(
    tipo: ttaTurno,
    horas: 0.0,
    descricao: turno
  )

proc tempoPorHoras*(
    horas: float,
    descricao: Texto = ""
): TempoAlocacao =
  if horas < 0.0:
    raise newException(
      ValueError,
      "A quantidade de horas não pode ser negativa."
    )

  TempoAlocacao(
    tipo: ttaHoras,
    horas: horas,
    descricao: descricao
  )

proc criarServicoPelaAdministracao*(
    funcionario: Funcionario,
    elemento: ElementoObra,
    descricao: Texto,
    tempoNecessario: Option[TempoAlocacao]
): Servico =
  if descricao.strip().len == 0:
    raise newException(
      ValueError,
      "A descrição do serviço é obrigatória."
    )

  Servico(
    funcionario: funcionario,
    elemento: elemento,
    descricao: descricao,
    tempoNecessario: tempoNecessario
  )

proc sobrescreverServicoPelaAdministracao*(
    servico: Servico,
    descricao: Texto,
    tempoNecessario: Option[TempoAlocacao]
): Servico =
  result = servico
  if descricao.strip().len > 0:
    result.descricao = descricao
  result.tempoNecessario = tempoNecessario

proc atualizacaoConhecimentoOkfPendente*(
    entidade: TipoEntidadeSincronizacao,
    acao: AcaoConhecimentoOkf
): AtualizacaoConhecimentoOkf =
  discard entidade
  discard acao
  AtualizacaoConhecimentoOkf(
    pendenteSincronizacao: true
  )
