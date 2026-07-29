# Auditoria de requisitos - MacroObras v51

## Regra corrigida de percentuais

A aplicação passa a separar:

1. **Porcentagem apreçada**  
   `orçamento do item / orçamento total da obra × 100`.

2. **Medição oficial do item**  
   Percentual cumulativo registrado a partir de um diário fechado.

3. **Medição oficial da obra**  
   `Σ(orçamento do item × medição oficial do item) / orçamento total × 100`.

Os valores antigos de `work.progress` eram independentes dos percentuais dos
itens. Por isso telas diferentes podiam apresentar números incompatíveis.

## Entregue na v51

- modelo timbrado configurável na página Configurações;
- logomarca, razão social, CNPJ, endereço, contato, responsável e rodapé;
- prévia e impressão do modelo de prova;
- timbre automático nas impressões de canvas;
- timbre automático nos relatórios marcados para impressão;
- porcentagem apreçada na importação e no canvas dos itens;
- soma arredondada em 100,00%;
- criação persistente da obra importada;
- criação inicial do canvas sem relações presumidas;
- Diário com o termo **Gastos**;
- fechamento do Diário;
- botão **Oficializar na medição**;
- medição ponderada pelo orçamento;
- exclusão de obra com duas confirmações;
- exportação JSON e CSV antes da exclusão.

## Pendências confirmadas

### Cronograma e calendário

- calendário temporal em canvas com snap por dia;
- redimensionamento horizontal da duração;
- redimensionamento vertical das horas dedicadas;
- linhas de relacionamento sobre o calendário;
- observações ordenadas pela posição temporal;
- quantidade real de anexos por card;
- ação Cobrar preenchimento com notificação mobile.

### Compras

- upload real do arquivo de ordem;
- geração do documento Ordem de Compra;
- persistência do arquivo no backend;
- abas impressas para as partes do relatório;
- navegação precisa ao dia e ao serviço para compras sem item de origem.

### Tunnel

- impedir definitivamente a segunda inicialização do mesmo domínio ngrok;
- reconciliar automaticamente endpoint já online.

### RH

- campos de pastas dedicadas;
- seletor de pasta nativo;
- abertura da pasta pelo card;
- formulário antes do organograma;
- persistência no backend.

### Persistência de servidor

Os novos registros continuam no armazenamento local da estação. Faltam RPCs
Nim para obras importadas, medições, timbre, tickets, inventário e diagramas.

### Documentação

A documentação Mermaid existente ainda é estática. Falta gerar o manual gráfico
a partir das rotas, entidades, permissões e relações realmente registradas.
