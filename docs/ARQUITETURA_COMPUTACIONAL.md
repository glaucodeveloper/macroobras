# Arquitetura computacional do MacroObras

## Fluxo geral

```mermaid
flowchart LR
    O[Obras] --> I[Itens de execução em canvas]
    I --> C[Cronograma e calendário]
    C --> D[Diário de obras]
    D --> M[Medição]
    V[Inventário] --> T[Tickets]
    T --> P[Compras]
    P --> D
```

## Serviços de obra

```mermaid
classDiagram
    class Obra {
      +id
      +codigo
      +nome
      +orcamento
      +progresso
    }

    class ItemServico {
      +id
      +obraId
      +descricao
      +orcamento
      +porcentagemAprecada
      +dataInicial
      +duracao
      +observacao
    }

    class RelacaoServico {
      +id
      +origemId
      +destinoId
      +tipo
    }

    class MaterialVinculado {
      +id
      +descricao
      +quantidade
      +unidade
    }

    Obra "1" --> "*" ItemServico
    ItemServico "0..*" --> "0..*" RelacaoServico
    ItemServico "0..*" --> "0..*" MaterialVinculado
```

As relações entre itens não são geradas automaticamente.

## Inventário, ticket e compra

```mermaid
sequenceDiagram
    participant A as Administração
    participant I as Inventário
    participant T as Tickets
    participant C as Compras
    participant O as Obra

    A->>I: Seleciona material e quantidade
    I->>T: Cria ticket de alocação
    alt estoque suficiente
      T->>O: Reserva material para a obra
    else estoque insuficiente
      T->>C: Cria solicitação para a diferença
      C->>O: Entrega material comprado
    end
```

A compra pode ser administrativa e não precisa possuir item de obra.

## Tickets

```mermaid
flowchart TD
    R[Requerente] -->|cria| T[Ticket]
    T -->|atribui| F[Funcionário responsável]
    T -->|opcional| O[Obra]
    T -->|opcional| I[Item de obra]
    T -->|opcional| V[Material do inventário]
    F -->|atualiza| S[Status]
```

## Sitemap

```mermaid
flowchart TD
    P[Painel]
    P --> O[Obras]
    O --> I[Itens de execução]
    O --> RS[Relações de serviços]
    I --> CR[Cronograma]
    CR --> CA[Calendário]
    CA --> D[Diário]
    D --> M[Medição]
    P --> C[Compras]
    P --> V[Inventário]
    P --> T[Tickets]
    P --> RH[RH]
    P --> MAN[Manual gráfico]
```

## Persistência atual

Os modelos gráficos, inventário e tickets são persistidos no armazenamento
local da estação. O ciclo seguinte deve mover esses registros para RPCs do
backend Nim.
