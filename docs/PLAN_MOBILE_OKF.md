# Plano: mobile, instalacao e OKF

## Objetivo

Elevar o padrao mobile do MacroObras e transformar o app Nim em uma estacao administrativa instalavel. A primeira execucao deve guiar o usuario por instalacao local, OKF, logins do mestre e distribuicao APK/TWA.

## Superficies

- Desktop administrativo: instalacao, obras, cronograma, medicoes e comparacao Excel.
- Mobile/TWA mestre de obras: superficie restrita por `?surface=twa`, sem rotas administrativas.
- APK: aponta para a superficie TWA publicada pela porta/local/ngrok definida pelo app administrativo.

## Padrao mobile

- Navegacao principal fixa no rodape.
- Cabecalho compacto, com obra ativa como contexto.
- Acoes dependentes de obra devem ficar ocultas ou bloqueadas ate existir obra selecionada.
- Fluxos implementados agora: painel, criar rotina, cronograma do dia e diario de obra.
- Fluxos pendentes como servicos, compras e recibos so devem aparecer quando tiverem fluxo real e requisitos atendidos.

## Wizard de instalacao

- Etapa 1: preparar OKF local com conhecimento de dominio e operacoes.
- Etapa 2: validar login do mestre de obras.
- Etapa 3: orientar distribuicao do APK/TWA pela URL publica/local disponivel.

O wizard deve ser executado pelo app Nim compilado. Scripts shell podem existir para desenvolvimento, mas nao devem ser dependencia da instalacao runtime.

## OKF

O OKF e destino de conhecimento, nao banco operacional. A aplicacao pode cadastrar localmente e deixar sincronizacao pendente quando GitHub, rede ou SSH falharem.

A preparacao OKF deve gerar conhecimento inicial a partir do que ja existe no desenvolvimento:

- dominio operacional;
- entidades do sistema;
- operacoes administrativas;
- operacoes do mestre mobile;
- regras de guardrail;
- instalacao e distribuicao;
- dependencias e requisitos de elementos de obra.

## Dependencias de elementos de obra

O dominio precisa reservar espaco formal para elementos de obra que dependem de outros elementos, requisitos listados, evidencias ou conclusoes. Essa orquestracao sera evoluida depois, mas ja deve estar documentada no OKF.

Conceitos que precisam existir:

- elemento dependente;
- requisito;
- liberacao;
- bloqueio operacional;
- pendencia de conhecimento.

Exemplos:

- fundacao libera alvenaria;
- alvenaria libera reboco;
- impermeabilizacao libera acabamento;
- diario completado pode liberar medicao;
- obra selecionada libera rotinas, cronograma, diario, compras e recibos.

## Proximas etapas

1. Persistir status de instalacao local.
2. Criar editor de credenciais/logins de mestre.
3. Modelar dependencias de elementos de obra no backend.
4. Expor avaliador de requisitos para frontend e API.
5. Sincronizar OKF remoto quando o repositorio Git estiver configurado.
