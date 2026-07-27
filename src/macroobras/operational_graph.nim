## Modelo gráfico reutilizável do MacroObras.
##
## Este módulo sustenta:
## - cronogramas e fluxos formados por nós e arestas;
## - organograma operacional de RH;
## - criação visual de rotas de visita;
## - campos dinâmicos nos cards;
## - rótulo editável no centro das conexões;
## - pan e zoom mantidos como estado do documento gráfico.

import std/[sequtils, strutils]

type
  Identificador* = string

  PontoCanvas* = object
    x*: float
    y*: float

  CampoGrafico* = object
    id*: Identificador
    nome*: string
    valor*: string

  TipoNoGrafico* = enum
    tngObra,
    tngItemExecucao,
    tngMaterial,
    tngPessoa,
    tngEquipe,
    tngFuncao,
    tngEtapaCompra,
    tngAtividade,
    tngLivre

  NoGrafico* = object
    id*: Identificador
    tipo*: TipoNoGrafico
    titulo*: string
    subtitulo*: string
    posicao*: PontoCanvas
    largura*: float
    altura*: float
    campos*: seq[CampoGrafico]

  ArestaGrafica* = object
    id*: Identificador
    origemId*: Identificador
    destinoId*: Identificador
    rotulo*: string
    direcionada*: bool
    pontosControle*: seq[PontoCanvas]

  EstadoViewport* = object
    zoom*: float
    deslocamento*: PontoCanvas

  GrafoOperacional* = object
    id*: Identificador
    nome*: string
    contexto*: string
    nos*: seq[NoGrafico]
    arestas*: seq[ArestaGrafica]
    viewport*: EstadoViewport

  CoordenadaGeografica* = object
    latitude*: float
    longitude*: float

  TipoPontoRota* = enum
    tprObra,
    tprCidade,
    tprParadaLivre

  PontoRota* = object
    id*: Identificador
    tipo*: TipoPontoRota
    nome*: string
    obraId*: string
    coordenada*: CoordenadaGeografica
    duracaoParadaMinutos*: int
    ordem*: int

  TrechoRota* = object
    id*: Identificador
    origemId*: Identificador
    destinoId*: Identificador
    distanciaMetros*: int
    duracaoSegundos*: int
    polylineCodificada*: string
    caminho*: seq[CoordenadaGeografica]

  RotaVisita* = object
    id*: Identificador
    nome*: string
    pontos*: seq[PontoRota]
    trechos*: seq[TrechoRota]
    ativa*: bool

  TipoEntidadeOrganograma* = enum
    teoPessoa,
    teoEquipe,
    teoFuncao

  EntidadeOrganograma* = object
    id*: Identificador
    tipo*: TipoEntidadeOrganograma
    nome*: string
    descricao*: string
    posicao*: PontoCanvas
    campos*: seq[CampoGrafico]

  RelacaoOrganograma* = object
    id*: Identificador
    origemId*: Identificador
    destinoId*: Identificador
    rotulo*: string

  OrganogramaOperacional* = object
    id*: Identificador
    nome*: string
    entidades*: seq[EntidadeOrganograma]
    relacoes*: seq[RelacaoOrganograma]
    viewport*: EstadoViewport

proc idValido(id: string) =
  if id.strip().len == 0:
    raise newException(ValueError, "O identificador não pode ficar vazio.")

proc novoViewport*(): EstadoViewport =
  EstadoViewport(
    zoom: 1.0,
    deslocamento: PontoCanvas(x: 0.0, y: 0.0)
  )

proc novoGrafoOperacional*(
    id, nome, contexto: string
): GrafoOperacional =
  idValido(id)
  GrafoOperacional(
    id: id,
    nome: nome,
    contexto: contexto,
    nos: @[],
    arestas: @[],
    viewport: novoViewport()
  )

proc indiceNo(grafo: GrafoOperacional, noId: string): int =
  for index, no in grafo.nos:
    if no.id == noId:
      return index
  -1

proc indiceAresta(grafo: GrafoOperacional, arestaId: string): int =
  for index, aresta in grafo.arestas:
    if aresta.id == arestaId:
      return index
  -1

proc adicionarNo*(
    grafo: var GrafoOperacional,
    id: string,
    tipo: TipoNoGrafico,
    titulo: string,
    posicao: PontoCanvas,
    subtitulo = "",
    largura = 280.0,
    altura = 180.0
): NoGrafico =
  idValido(id)
  if grafo.indiceNo(id) >= 0:
    raise newException(ValueError, "Já existe um nó com o identificador informado.")

  result = NoGrafico(
    id: id,
    tipo: tipo,
    titulo: titulo,
    subtitulo: subtitulo,
    posicao: posicao,
    largura: largura,
    altura: altura,
    campos: @[]
  )
  grafo.nos.add(result)

proc moverNo*(
    grafo: var GrafoOperacional,
    noId: string,
    posicao: PontoCanvas
) =
  let index = grafo.indiceNo(noId)
  if index < 0:
    raise newException(ValueError, "Nó não encontrado.")
  grafo.nos[index].posicao = posicao

proc adicionarCampoNo*(
    grafo: var GrafoOperacional,
    noId, campoId, nome, valor: string
) =
  let index = grafo.indiceNo(noId)
  if index < 0:
    raise newException(ValueError, "Nó não encontrado.")

  idValido(campoId)
  for campo in grafo.nos[index].campos:
    if campo.id == campoId:
      raise newException(ValueError, "O campo já existe no nó.")

  grafo.nos[index].campos.add(
    CampoGrafico(id: campoId, nome: nome, valor: valor)
  )

proc atualizarCampoNo*(
    grafo: var GrafoOperacional,
    noId, campoId, valor: string
) =
  let index = grafo.indiceNo(noId)
  if index < 0:
    raise newException(ValueError, "Nó não encontrado.")

  for fieldIndex, campo in grafo.nos[index].campos:
    if campo.id == campoId:
      grafo.nos[index].campos[fieldIndex].valor = valor
      return

  raise newException(ValueError, "Campo não encontrado.")

proc conectarNos*(
    grafo: var GrafoOperacional,
    id, origemId, destinoId: string,
    rotulo = "",
    direcionada = true,
    pontosControle: seq[PontoCanvas] = @[]
): ArestaGrafica =
  idValido(id)
  if grafo.indiceAresta(id) >= 0:
    raise newException(ValueError, "Já existe uma aresta com o identificador informado.")
  if grafo.indiceNo(origemId) < 0 or grafo.indiceNo(destinoId) < 0:
    raise newException(ValueError, "A origem e o destino precisam existir no grafo.")
  if origemId == destinoId:
    raise newException(ValueError, "A conexão precisa terminar em outro nó.")

  result = ArestaGrafica(
    id: id,
    origemId: origemId,
    destinoId: destinoId,
    rotulo: rotulo,
    direcionada: direcionada,
    pontosControle: pontosControle
  )
  grafo.arestas.add(result)

proc atualizarRotuloAresta*(
    grafo: var GrafoOperacional,
    arestaId, rotulo: string
) =
  let index = grafo.indiceAresta(arestaId)
  if index < 0:
    raise newException(ValueError, "Aresta não encontrada.")
  grafo.arestas[index].rotulo = rotulo

proc removerAresta*(grafo: var GrafoOperacional, arestaId: string) =
  let index = grafo.indiceAresta(arestaId)
  if index < 0:
    return
  grafo.arestas.delete(index)

proc removerNo*(grafo: var GrafoOperacional, noId: string) =
  let index = grafo.indiceNo(noId)
  if index < 0:
    return

  grafo.nos.delete(index)
  grafo.arestas = grafo.arestas.filterIt(
    it.origemId != noId and it.destinoId != noId
  )

proc atualizarViewport*(
    grafo: var GrafoOperacional,
    zoom: float,
    deslocamento: PontoCanvas
) =
  if zoom <= 0.0:
    raise newException(ValueError, "O zoom precisa ser maior que zero.")
  grafo.viewport.zoom = zoom
  grafo.viewport.deslocamento = deslocamento

proc novaRotaVisita*(id, nome: string): RotaVisita =
  idValido(id)
  RotaVisita(
    id: id,
    nome: nome,
    pontos: @[],
    trechos: @[],
    ativa: true
  )

proc indicePonto(rota: RotaVisita, pontoId: string): int =
  for index, ponto in rota.pontos:
    if ponto.id == pontoId:
      return index
  -1

proc adicionarPontoRota*(
    rota: var RotaVisita,
    id: string,
    tipo: TipoPontoRota,
    nome: string,
    coordenada: CoordenadaGeografica,
    duracaoParadaMinutos = 0,
    obraId = ""
): PontoRota =
  idValido(id)
  if rota.indicePonto(id) >= 0:
    raise newException(ValueError, "O ponto já existe na rota.")
  if duracaoParadaMinutos < 0:
    raise newException(ValueError, "A duração da parada não pode ser negativa.")

  result = PontoRota(
    id: id,
    tipo: tipo,
    nome: nome,
    obraId: obraId,
    coordenada: coordenada,
    duracaoParadaMinutos: duracaoParadaMinutos,
    ordem: rota.pontos.len
  )
  rota.pontos.add(result)

proc atualizarTempoParada*(
    rota: var RotaVisita,
    pontoId: string,
    minutos: int
) =
  if minutos < 0:
    raise newException(ValueError, "A duração da parada não pode ser negativa.")
  let index = rota.indicePonto(pontoId)
  if index < 0:
    raise newException(ValueError, "Ponto de rota não encontrado.")
  rota.pontos[index].duracaoParadaMinutos = minutos

proc adicionarTrechoRota*(
    rota: var RotaVisita,
    id, origemId, destinoId: string,
    distanciaMetros, duracaoSegundos: int,
    polylineCodificada = "",
    caminho: seq[CoordenadaGeografica] = @[]
): TrechoRota =
  idValido(id)
  if rota.indicePonto(origemId) < 0 or rota.indicePonto(destinoId) < 0:
    raise newException(ValueError, "Os pontos do trecho precisam existir.")
  if origemId == destinoId:
    raise newException(ValueError, "O trecho precisa terminar em outro ponto.")

  for trecho in rota.trechos:
    if trecho.id == id:
      raise newException(ValueError, "O trecho já existe na rota.")

  result = TrechoRota(
    id: id,
    origemId: origemId,
    destinoId: destinoId,
    distanciaMetros: max(distanciaMetros, 0),
    duracaoSegundos: max(duracaoSegundos, 0),
    polylineCodificada: polylineCodificada,
    caminho: caminho
  )
  rota.trechos.add(result)

proc desfazerUltimoTrecho*(rota: var RotaVisita) =
  if rota.trechos.len == 0:
    return

  let removido = rota.trechos[^1]
  rota.trechos.setLen(rota.trechos.len - 1)

  if rota.pontos.len > 0 and rota.pontos[^1].id == removido.destinoId:
    rota.pontos.setLen(rota.pontos.len - 1)

proc removerPontoRota*(rota: var RotaVisita, pontoId: string) =
  let index = rota.indicePonto(pontoId)
  if index < 0:
    return

  rota.pontos.delete(index)
  rota.trechos = rota.trechos.filterIt(
    it.origemId != pontoId and it.destinoId != pontoId
  )

  for ordem, ponto in rota.pontos:
    rota.pontos[ordem].ordem = ordem

proc novoOrganogramaOperacional*(
    id, nome: string
): OrganogramaOperacional =
  idValido(id)
  OrganogramaOperacional(
    id: id,
    nome: nome,
    entidades: @[],
    relacoes: @[],
    viewport: novoViewport()
  )

proc indiceEntidade(
    organograma: OrganogramaOperacional,
    entidadeId: string
): int =
  for index, entidade in organograma.entidades:
    if entidade.id == entidadeId:
      return index
  -1

proc adicionarEntidadeOrganograma*(
    organograma: var OrganogramaOperacional,
    id: string,
    tipo: TipoEntidadeOrganograma,
    nome: string,
    descricao: string,
    posicao: PontoCanvas
): EntidadeOrganograma =
  idValido(id)
  if organograma.indiceEntidade(id) >= 0:
    raise newException(ValueError, "A entidade já existe no organograma.")

  result = EntidadeOrganograma(
    id: id,
    tipo: tipo,
    nome: nome,
    descricao: descricao,
    posicao: posicao,
    campos: @[]
  )
  organograma.entidades.add(result)

proc adicionarCampoEntidade*(
    organograma: var OrganogramaOperacional,
    entidadeId, campoId, nome, valor: string
) =
  let index = organograma.indiceEntidade(entidadeId)
  if index < 0:
    raise newException(ValueError, "Entidade não encontrada.")

  for campo in organograma.entidades[index].campos:
    if campo.id == campoId:
      raise newException(ValueError, "O campo já existe na entidade.")

  organograma.entidades[index].campos.add(
    CampoGrafico(id: campoId, nome: nome, valor: valor)
  )

proc moverEntidadeOrganograma*(
    organograma: var OrganogramaOperacional,
    entidadeId: string,
    posicao: PontoCanvas
) =
  let index = organograma.indiceEntidade(entidadeId)
  if index < 0:
    raise newException(ValueError, "Entidade não encontrada.")
  organograma.entidades[index].posicao = posicao

proc relacionarEntidades*(
    organograma: var OrganogramaOperacional,
    id, origemId, destinoId, rotulo: string
): RelacaoOrganograma =
  idValido(id)
  if organograma.indiceEntidade(origemId) < 0 or
      organograma.indiceEntidade(destinoId) < 0:
    raise newException(ValueError, "As entidades da relação precisam existir.")

  for relacao in organograma.relacoes:
    if relacao.id == id:
      raise newException(ValueError, "A relação já existe.")

  result = RelacaoOrganograma(
    id: id,
    origemId: origemId,
    destinoId: destinoId,
    rotulo: rotulo
  )
  organograma.relacoes.add(result)

proc atualizarRotuloRelacao*(
    organograma: var OrganogramaOperacional,
    relacaoId, rotulo: string
) =
  for index, relacao in organograma.relacoes:
    if relacao.id == relacaoId:
      organograma.relacoes[index].rotulo = rotulo
      return
  raise newException(ValueError, "Relação não encontrada.")

proc removerEntidadeOrganograma*(
    organograma: var OrganogramaOperacional,
    entidadeId: string
) =
  let index = organograma.indiceEntidade(entidadeId)
  if index < 0:
    return

  organograma.entidades.delete(index)
  organograma.relacoes = organograma.relacoes.filterIt(
    it.origemId != entidadeId and it.destinoId != entidadeId
  )

proc atualizarViewport*(
    organograma: var OrganogramaOperacional,
    zoom: float,
    deslocamento: PontoCanvas
) =
  if zoom <= 0.0:
    raise newException(ValueError, "O zoom precisa ser maior que zero.")
  organograma.viewport.zoom = zoom
  organograma.viewport.deslocamento = deslocamento
