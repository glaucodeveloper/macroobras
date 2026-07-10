# MacroObras - Operacoes do sistema

## Administracao desktop

- Adicionar obra: cadastra obra, importa tabela de itens e cria estrutura operacional inicial.
- Criar servico administrativo: cria servico pela administracao e marca conhecimento OKF pendente.
- Cronograma da obra: adiciona linhas, sobrescreve planejamento e notifica mestre.
- Medicao da obra: altera percentuais administrativos por item e relaciona diarios.
- Comparacao com Excel: importa percentuais esperados e gera diferencas contra a medicao administrativa.

## Mestre de obras mobile/TWA

- Login do colaborador: autentica perfil mestre pelo endpoint `/api/colaboradores/login`.
- Criar rotina: depende de obra selecionada e cria agrupamento recorrente de servicos.
- Cronograma do dia: mostra alocacoes do dia e permite itens planejados.
- Diario de obra: registra descricao, servicos executados, anexos e evidencia.
- Completar diario: envia diario para medicao e notifica administracao.
- Solicitar compra e anexar recibo: dependem de obra ativa e devem gerar conhecimento cadastral pendente.

## Guardrails de fluxo

Operacoes do mestre que dependem de obra nao devem aparecer ou executar antes de uma obra ativa. A interface mobile e restrita ao TWA; a administracao desktop nao deve expor o mestre como aba comum.

Fluxos futuros de elementos de obra devem respeitar dependencias e requisitos declarados: o usuario nao deve receber acoes liberadas quando o elemento anterior, evidencia, diario ou medicao exigida ainda nao existir.
