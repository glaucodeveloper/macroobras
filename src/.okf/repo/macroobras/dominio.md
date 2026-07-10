# MacroObras - Dominio operacional

O MacroObras organiza a operacao administrativa e de campo de obras. A persistencia operacional continua local, enquanto o OKF recebe conhecimento consolidado das entidades e operacoes cadastrais.

## Entidades

- Obra: unidade operacional administrada, criada a partir de dados cadastrais e tabela de itens.
- Item de obra: linha importada da tabela de obra, usada para medicao, cronograma e diarios.
- Servico: trabalho executavel vinculado a item/elemento de obra.
- Rotina: agrupamento de servicos recorrentes do mestre de obras.
- Cronograma: alocacao temporal de rotinas, servicos e apoios pontuais.
- Diario de obra: registro de execucao, ocorrencias, servicos realizados, anexos e evidencias.
- Medicao: percentual administrativo por item, derivado dos diarios completados e ajustes administrativos.
- Comparacao Excel: contraste entre percentuais administrativos e planilha externa.
- Compra e recibo: solicitacoes e evidencias financeiras vinculadas ao fluxo do mestre.
- Elemento de obra: parte material/construtiva que pode ter requisitos, dependencias e liberacoes para outros elementos, servicos, rotinas ou medicoes.

## Regra OKF

O OKF e destino de conhecimento. Ele nao bloqueia cadastros quando a gravacao operacional local foi concluida. Falhas de GitHub, rede ou SSH devem gerar pendencia de sincronizacao, nao perda operacional.
