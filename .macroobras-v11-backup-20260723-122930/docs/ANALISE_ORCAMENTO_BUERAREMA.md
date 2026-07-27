# Análise do formato — Orçamento Sintético Buerarema

Arquivo analisado: `ORÇAMENTO SINTETICO BUERAREMA REFORMA(1).pdf`.

## Estrutura reconhecida

Cabeçalho da obra:

- obra: `REFORMA DO ESTÁDIO MUNICIPAL EM BUERAREMA-BA`;
- BDI: `27,0%`;
- bancos: SINAPI Bahia e ORSE Sergipe;
- colunas: Item, Código, Banco, Descrição, Und, Quant., Valor Unit, Valor Unit com BDI, Total e Peso (%).

## Regra de importação do MacroObras

O orçamento é hierárquico. Para respeitar a regra do sistema — cada item de execução contém somente descrição e orçamento alocado — a importação usa apenas as linhas cujo campo `Item` é inteiro (`1`, `2`, `3`...).

- `Descrição` vira `descricao`;
- `Total` vira `orcamentoAlocado`;
- linhas decimais permanecem como memória documental;
- subitens não são somados novamente, evitando duplicidade financeira.

## Resultado

- 12 itens de execução reconhecidos;
- soma dos itens: R$ 4.129.335,51;
- Total Geral declarado: R$ 4.129.335,51;
- diferença: R$ 0,00;
- validação: aprovada.

O PDF não contém um campo textual explícito `Cliente` ou `Contratante` no texto extraído. O importador mantém o cliente como não detectado quando esse rótulo não estiver presente, em vez de inferir a partir de logotipos ou referências institucionais.

O arquivo normalizado está em `docs/orcamento_buerarema_normalizado.json`.
