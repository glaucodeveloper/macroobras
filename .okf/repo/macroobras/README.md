# MacroObras OKF scaffold

Scaffold inicial do OKF para a estação MacroObras. Ele registra as entidades, relações e rotinas básicas já entendidas pelo sistema.

## Estrutura

- `manifest.json`: identificação do scaffold.
- `dominio.md`: visão operacional.
- `schema/entidades.json`: entidades principais.
- `schema/relacoes.json`: relações básicas.
- `graph/macroobras.mmd`: grafo Mermaid do domínio.

## Regra

O OKF é memória operacional e grafo de conhecimento. Ele não bloqueia a persistência local quando uma operação válida já foi salva pela aplicação.
