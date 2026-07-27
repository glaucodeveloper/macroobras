# MacroObras

Aplicação híbrida para operação de obras com três frentes principais:

- estação desktop administrativa;
- app de medição para campo;
- servidor local de colaboradores, Archive, scaffold OKF e apontamento do servidor Llama com `gemma4eb`.

## Arquitetura

O código principal foi desacoplado por responsabilidade para reduzir acoplamento entre bootstrap, domínio administrativo, instalador, integração OKF e servidor de colaboradores.

```text
src/
  app.nim                         # bootstrap, rotas HTTP e RPC exposed
  macroobras/
    config.nim                    # constantes, env e paths base
    response_utils.nim            # envelope JSON padrão
    admin_service.nim             # payloads administrativos
    okf_service.nim               # scaffold e sincronização OKF
    installer_service.nim         # pasta de instalação, FTP, Archive e Llama
    collaborator_service.nim      # endpoint de colaboradores e ngrok opcional

frontend/src/
  module.js                       # entrada do front
  core/                           # estado, roteamento, API e controller
  screens/
    installer/
    admin/
    mobile/
  ui/                             # shells e componentes compartilhados
  styles.css
```

## Superfícies da aplicação

### Instalador

- escolha de pasta única de instalação;
- introdução visual do endpoint de colaboradores;
- introdução de Archive, OKF e servidor Llama local;
- indicação de transmissão FTP local da pasta escolhida;
- preparação da pasta, `archive/`, scaffold OKF e arquivos de referência do Llama.

### Administração

- cadastro de obra;
- importação de tabela de medição;
- cadastro de elemento de obra com materiais, descrição, dependências e liberações;
- cadastro de colaboradores com email, CPF e vínculo por obra;
- cronograma com alocação administrativa;
- medição e comparação da medição com base na planilha importada.

### App de medição

- gate de acesso por email e CPF;
- seleção de obra autorizada;
- criação de rotinas;
- cronograma do dia com expansão por card e CRUD das rotinas aplicadas;
- diário de obra com ênfase em confirmação por câmera do serviço executado;
- provas listadas ao fim da página e correlacionadas ao serviço feito;
- envio do diário para aplicação do progresso da medição.

## OKF

O scaffold OKF já nasce com relações básicas do sistema:

- obra;
- elemento de obra;
- item de medição;
- serviço;
- rotina;
- cronograma;
- diário de obra;
- confirmação de serviço;
- medição;
- comparação da medição;
- colaborador;
- archive;
- llama local.

Arquivos gerados ficam sob `.okf/repo/macroobras/` quando o preparo é executado.

## Testes

### UI com Playwright

Executar:

```bash
cd frontend
npm run test:ui:report
```

Resultado validado em `2026-07-09`:

- 16 rotinas UI aprovadas;
- relatório Playwright HTML;
- relatório técnico JSON/JUnit;
- relatório executivo em Markdown;
- relatório visual HTML com prints.

Artefatos:

- [frontend/output/playwright-report/index.html](/home/icarogdo/dev/macroobras-jazzy/app/macroobras/frontend/output/playwright-report/index.html)
- [frontend/output/ui-visual-report.html](/home/icarogdo/dev/macroobras-jazzy/app/macroobras/frontend/output/ui-visual-report.html)
- [frontend/output/ui-test-report.md](/home/icarogdo/dev/macroobras-jazzy/app/macroobras/frontend/output/ui-test-report.md)
- `frontend/output/ui-screens/*.png`

### Backend Nim

Validação reprodutível usada neste ciclo:

```bash
nim check src/app.nim
```

Esse check compilou com sucesso após o desacoplamento dos módulos.

Observação: `nimble test` no ambiente atual tenta resolver outra toolchain via `choosenim` e falha por dependência externa de download do Nim, antes mesmo de executar a task do projeto.

## Fluxo de build

Frontend:

```bash
cd frontend
npm run build
```

Backend desktop/web:

```bash
nimble dev
```

ou:

```bash
nimble build
```

## Repositório

Repositório publicado:

- `git@github.com:glaucodeveloper/macroobras.git`
- `https://github.com/glaucodeveloper/macroobras`
