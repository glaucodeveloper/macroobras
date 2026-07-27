# Análise das planilhas orçamentárias do BLOCOS.zip

## Resultado

- Arquivos encontrados: **212**.
- Planilhas Excel: **123**; PDFs: **88**; RAR: **1**.
- Planilhas com estrutura de **orçamento resumido** reconhecida: **29**.
- Resumos consolidados de bloco, inadequados para criar uma única obra: **2**.
- Planilhas individuais utilizáveis: **27**.
- Planilhas individuais ideais, com mais de um item de execução: **23**.
- Planilhas individuais consolidadas em apenas um item: **4**.

## Formato adotado pelo MacroObras

O importador deve procurar uma planilha chamada `Resumo do Orçamento` ou equivalente e localizar o cabeçalho `Planilha Orçamentária Resumida`. A tabela útil contém:

```text
Item | Descrição | Total
```

Para o modelo definido, o sistema importa apenas:

```text
descrição do item | orçamento alocado
```

O campo **Obra** aparece no topo da planilha. O cliente não aparece como uma célula literal chamada “Cliente”: em 22 das 27 planilhas individuais ele está no cabeçalho/rodapé interno do XLSX, principalmente como **Superintendência dos Desportos da Bahia — SUDESB**. O parser precisa ler `headerFooter` do XML da planilha. Nas cinco planilhas sem esse texto, o sistema deve pedir confirmação do cliente na prévia antes de salvar.

## Arquivos que não devem alimentar os itens de execução

- `Orçamento Sintético`: possui códigos, banco, unidade, quantidade e valores unitários; é detalhado demais para o item administrativo definido.
- `Composições com Preço Unitário`: representa insumos e composições.
- `Cronograma`: representa distribuição temporal.
- `RESUMO BLOCO`: reúne diversas obras no mesmo arquivo.

## Planilhas individuais ideais

| Itens | Orçamento identificado | Cliente | Arquivo |
|---:|---:|---|---|
| 5 | R$ 271.941,77 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/SÃO FELIPE/AMPLIAÇÃO DO SISTEMA DE ILUMIN - Orçamento Resumido.xlsx` |
| 5 | R$ 536.998,01 | SUPERINTENDÊNCIA DOS DESPORTOS DO ESTADO DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/JEREMOABO/IMPLANTAÇÃO JEREMOABO - Orçamento Resumido.xlsx` |
| 5 | R$ 502.514,95 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/BOTUPORÃ/IMPLANTAÇÃO DO SISTEMA DE ILUM - Orçamento Resumido.xlsx` |
| 15 | R$ 1.721.101,51 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/QUIJINGUE/COMPLEMENTAÇÃO DE QUADRA POLIESPORTIVA NO MUNICÍPIO DE QUIJINGUE - BAHIA - PLAN RESUMO.xlsx` |
| 8 | R$ 1.507.445,46 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/SÁTIRO DIAS/CONSTRUÇÃO DE ARENINHA 50X30M  - SÁTIRO DIAS - Orçamento Resumido.xlsx` |
| 8 | R$ 820.216,52 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/PARAMIRIM - PAJEU DE BAIXO/CONSTRUÇÃO DE QUADRA POLIESPORTIVA - PARAMIRIM - Orçamento Resumido.xlsx` |
| 8 | R$ 821.376,01 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/PARAMIRIM - CRISTAIS/EXCEL/CONSTRUÇÃO DE QUADRA POLIESPORTIVA - PARAMIRIM Orçamento Resumido.xlsx` |
| 9 | R$ 1.010.052,95 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/EUCLIDES DA CUNHA/PLANILHAS EDITÁVEIS/COMPLEMENTAÇÃO DO CAMPO LAGOA DO GUEDES EUCLIDES DA CUNHA BA - PLAN RESUMIDA.xlsx` |
| 11 | R$ 1.351.948,58 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/BLOCO 06/BLOCO 06/SALVADOR - CERB/EXCEL/REFORMA DE CAMPO EXISTENTE 42, - Orçamento Resumido.xlsx` |
| 9 | R$ 757.276,03 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/TEODORO SAMPAIO/CONSTRUÇÃO DE QUADRA POLIESPORTIVA 31X18 NO MUNICÍPIO DE TEODORO SAMPAIO - Orçamento Resumido.xlsx` |
| 6 | R$ 954.243,88 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/PÉ DE SERRA - SANTO AGOSTINHO/CONSTRUÇÃO DE ALAMBRADO NO POV - Orçamento Resumido.xlsx` |
| 9 | R$ 784.507,51 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/AMÉRICA DOURADA - CONSTRUÇÃO DE QUADRA/CONSTRUÇÃO DE QUADRA POLIESPOR - Orçamento Resumido.xlsx` |
| 7 | R$ 685.332,88 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/ANTAS I - CONSTRUÇÃO DE QUADRA POLIESPORTIVA/ANTAS- CONSTRUÇÃO DE QUADRA POLIESPOR - Orçamento Resumido.xlsx` |
| 10 | R$ 1.047.631,91 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/PILÃO ARCADO/REFORMA E AMPLIAÇÃO DO ESTÁDIO MUNICIPAL DE PILÃO ARCADO - Orçamento Resumido.xlsx` |
| 13 | R$ 1.433.187,77 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA - SUDESB | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/ANTAS II - COMPLEMENTAÇÃO DE CONSTRUÇÃO DE QUADRA POLIESPORTIVA/ANTAS-REFORMA E COMPLEMENTAÇÃO DA QU - Orçamento Resumido.xlsx` |
| 5 | R$ 562.139,97 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/BRUMADO/Resumo.xlsx` |
| 6 | R$ 1.009.875,15 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/PÉ SERRA - NOVO LICURI/CONSTRUÇÃO DE ALAMBRADO NO POV - Orçamento Resumido.xlsx` |
| 14 | R$ 2.319.224,92 | SECRETARIA DO TRABALHO, EMPREGO, RENDA, E ESPORTE | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/AMÉRICA DOURADA - REFORMA E AMPLIAÇÃO/REFORMA DO CAMPO DE FUTEBOL NO MUNICIPIO DE AMÉRICA DOURADA - Orçamento Resumido.xlsx` |
| 10 | R$ 1.937.667,15 | SUPERINTENDENCIA DOS DESPORTOS DA BAHIA | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/PAULO AFONSO/REFORMA DO CAMPO ALTERNATIVO 102X62 NO MUNICIPIO DE PAULO AFONSO - Orçamento Resumido.xlsx` |
| 8 | R$ 1.401.686,29 | não identificado no header/footer | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/CATU/REFORMA DO ESTÁDIO MUNICIPAL DE CATU - Orçamento Resumido.xlsx` |
| 16 | R$ 3.464.695,47 | não identificado no header/footer | `BLOCOS/BLOCO 07/BLOCO 07/ITAETE 2/REFORMA E AMPLIAÇÃO DO ESTÁDIO EM ITAETE BA - Plan Resumo (REV1).xlsx` |
| 9 | R$ 1.396.388,58 | não identificado no header/footer | `BLOCOS/BLOCO 07/BLOCO 07/ITAETE/CONSTRUÇÃO DE ARENINHA 50X30M EM ITAETE BA - Resumido (REV1).xlsx` |
| 7 | R$ 381.231,77 | não identificado no header/footer | `BLOCOS/BLOCO 07/BLOCO 07/NOVA FATIMA/CONSTRUÇÃO DE ARQUIBANCADA 30X3M NOVA FÁTIMA BA - Orçamento Resumido.xlsx` |

## Planilhas individuais com somente um item consolidado

| Orçamento | Arquivo |
|---:|---|
| R$ 823.784,86 | `BLOCOS/BLOCO 06/BLOCO 06/CAETITÉ/CAETITÉ- CONSTRUÇÃO DE QUADRA POLIESPOR - Orçamento Resumido-1.xlsx` |
| R$ 879.591,11 | `BLOCOS/BLOCO 06/BLOCO 06/AIQUARA/EXCEL/AIQUARA-REFORMA DE QUADRA POLIESPORTIV - Orçamento Resumido-1.xlsx` |
| R$ 886.816,11 | `BLOCOS/ARQUIVOS BLOCO 10/BLOCO 10/RIBEIRA DO POMBAL/1-REFORMA DO GRAMADO D - Orçamento Resumido.xlsx` |
| R$ 2.075.184,17 | `BLOCOS/BLOCO 07/BLOCO 07/APUAREMA/CONST. DE QUADRA COBERTA - APUAREMA - BA - Orçamento Resumido.xlsx` |

## Resumos de bloco excluídos

- `BLOCOS/BLOCO 06/BLOCO 06/RESUMO BLOCO 06 - REV 02.xlsx`
- `BLOCOS/BLOCO 07/BLOCO 07/RESUMO BLOCO 07 - REV 02.xlsx`

## Regra de importação

1. O administrador informa somente o endereço da obra.
2. O sistema recebe a planilha resumida.
3. O sistema extrai a obra e o cliente do conteúdo interno.
4. O sistema identifica os itens no menor nível de agrupamento imediatamente abaixo da obra.
5. Cada item recebe somente `descricao` e `orcamento_alocado`.
6. Cada item passa a disponibilizar a ação **Iniciar fluxo de compra**.
7. Quantidade, unidade, data necessária, solicitante e valor estimado são preenchidos no sticker de solicitação, sem campo de justificativa.

## Ferramenta incluída

O script `tools/extrair_orcamento_resumido.py` lê um `.xlsx` ou um `.zip`, sem depender de Excel ou LibreOffice, e gera JSON normalizado para o MacroObras.
