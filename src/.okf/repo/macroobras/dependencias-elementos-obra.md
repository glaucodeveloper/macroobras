# MacroObras - Dependencias e requisitos de elementos de obra

Este espaco registra um fluxo ainda nao orquestrado completamente no app, mas essencial para o dominio: elementos de obra podem depender de outros elementos, de requisitos listados, de evidencias ou de conclusoes administrativas antes de liberar novas operacoes.

## Conceitos

- Elemento dependente: elemento que nao deve ser criado, executado, medido ou liberado antes de cumprir requisitos.
- Requisito: condicao necessaria para liberar um elemento, servico, rotina, diario, compra ou medicao.
- Liberacao: efeito produzido quando um requisito e cumprido.
- Bloqueio operacional: impedimento de exibir ou executar a acao no fluxo do usuario.
- Pendencia de conhecimento: registro OKF gerado para sincronizacao futura, sem bloquear persistencia local quando a operacao ja for valida.

## Exemplos de relacao

- Fundacao libera alvenaria inicial.
- Alvenaria libera reboco interno.
- Impermeabilizacao libera acabamento de banheiro.
- Servico completado em diario pode liberar percentual de medicao.
- Obra selecionada libera rotinas, cronograma, diario, compras e recibos no TWA.

## Espaco de orquestracao futura

O app deve evoluir para uma camada que avalie:

- quais elementos existem;
- quais requisitos cada elemento exige;
- quais requisitos ja foram cumpridos;
- quais acoes ficam ocultas, bloqueadas ou liberadas;
- quais entidades devem receber atualizacao OKF quando uma liberacao ocorre.

Essa camada deve ser usada pelo backend e pela interface. A UI nao deve inventar dependencias isoladamente; ela deve refletir regras de dominio.
