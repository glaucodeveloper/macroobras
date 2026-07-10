# Relatorio de testes UI MacroObras

Gerado em: 2026-07-10T01:14:10.354Z

## Artefatos

- HTML navegavel: `output/playwright-report/index.html`
- JSON tecnico: `output/playwright-results/results.json`
- JUnit CI: `output/playwright-results/junit.xml`
- Markdown executivo: `output/ui-test-report.md`
- HTML com prints: `output/ui-visual-report.html`
- Prints PNG: `output/ui-screens/`

## Avaliação

- Rotinas avaliadas: 16
- Rotinas aprovadas: 16
- Prints gerados: 16
- HTML visual organizado por instalação, administração e app de medição: `output/ui-visual-report.html`

## Cobertura por rotina

| Rotina | Suite | Superficie | Eventos de front | Status | Print | Proposito |
| --- | --- | --- | --- | --- | --- | --- |
| Pasta de instalação e FTP local | Instalador | Installer | goto, click | passou | `ui-screens/installer-install-folder-desktop-admin-installer.png` | Validar pasta única de instalação e transmissão FTP local da pasta escolhida. |
| Endpoint de colaboradores | Instalador | Installer | click | passou | `ui-screens/installer-collaborator-endpoint-desktop-admin-installer.png` | Apresentar endpoint de colaboradores e apontar visualmente sua funcionalidade. |
| Archive, OKF e Llama local | Instalador | Installer | click | passou | `ui-screens/installer-archive-okf-llama-desktop-admin-installer.png` | Introduzir Archive, OKF, servidor Llama local e modelo gemma4eb. |
| Administração e app de medição | Instalador | Installer | click | passou | `ui-screens/installer-admin-mobile-intro-desktop-admin-installer.png` | Introduzir uso administrativo e preparação do app de medição por email, CPF e obra. |
| Cadastro de obra | Admin | Admin desktop | fill, click | passou | `ui-screens/admin-add-work-desktop-admin-installer.png` | Cadastrar nome de obra e permitir importação de tabela de medição. |
| Elemento de obra | Admin | Admin desktop | fill, click, drag | passou | `ui-screens/admin-elements-desktop-admin-installer.png` | Adicionar elemento de obra com materiais, dependências e liberações em canvas. |
| Acessos do app de medição | Admin | Admin desktop | fill, click | passou | `ui-screens/admin-mobile-access-desktop-admin-installer.png` | Cadastrar email e CPF de colaborador e vincular login do app de medição a uma obra. |
| Cronograma da obra | Admin | Admin desktop | click | passou | `ui-screens/admin-calendar-desktop-admin-installer.png` | Navegar para cronograma e registrar novo agendamento. |
| Medição administrativa | Admin | Admin desktop | fill, click | passou | `ui-screens/admin-measurement-comparison-desktop-admin-installer.png` | Aplicar progresso da medição com prova de serviço vinda do diário. |
| Comparação da medição | Admin | Admin desktop | click | passou | `ui-screens/admin-measurement-comparison-desktop-admin-installer.png` | Gerar comparação da medição administrativa com a planilha importada. |
| Cadastro do colaborador | App de medição | App de medição | fill, click | passou | `ui-screens/mobile-login-gate-mobile-twa.png` | Exigir email e CPF autorizados antes de liberar seleção de obra. |
| Bloqueio sem obra | App de medição | App de medição | fill, click | passou | `ui-screens/mobile-work-lock-mobile-twa.png` | Garantir bloqueio dos fluxos antes da seleção de obra vinculada. |
| Seleção de obra | App de medição | App de medição | fill, click | passou | `ui-screens/mobile-select-work-mobile-twa.png` | Selecionar obra vinculada e liberar rotinas do mestre. |
| Criar rotina | App de medição | App de medição | click, fill | passou | `ui-screens/mobile-routine-mobile-twa.png` | Criar rotina com servicos e observacoes. |
| Cronograma do dia | App de medição | App de medição | click | passou | `ui-screens/mobile-day-mobile-twa.png` | Expandir card do cronograma, navegar nas rotinas aplicadas do dia e executar CRUD. |
| Diário de obra | App de medição | App de medição | click, fill | passou | `ui-screens/mobile-diary-mobile-twa.png` | Confirmar serviço feito por câmera, anexar ao diário e enviar prova para medição. |

## Execucoes Playwright

| Teste | Projeto | Status |
| --- | --- | --- |
| [admin-add-work] cadastra obra | desktop-admin-installer | passed |
| [admin-calendar] cria agendamento no cronograma | desktop-admin-installer | passed |
| [admin-elements] adiciona elemento de obra com dependencias e liberacoes | desktop-admin-installer | passed |
| [admin-mobile-access] cadastra login do app de medição vinculado a obra | desktop-admin-installer | passed |
| [admin-measurement] altera percentual da medição administrativa | desktop-admin-installer | passed |
| [admin-measurement-comparison] gera comparacao da medição com planilha importada | desktop-admin-installer | passed |
| [installer-install-folder] valida pasta de instalacao e FTP local | desktop-admin-installer | passed |
| [installer-collaborator-endpoint] apresenta endpoint de colaboradores | desktop-admin-installer | passed |
| [installer-archive-okf-llama] apresenta Archive, OKF e servidor Llama | desktop-admin-installer | passed |
| [installer-admin-mobile-intro] introduz admin e app de medição | desktop-admin-installer | passed |
| [mobile-login-gate] exige email e CPF autorizados | mobile-twa | passed |
| [mobile-work-lock] bloqueia fluxos ate selecionar uma obra | mobile-twa | passed |
| [mobile-select-work] seleciona obra e libera rotinas | mobile-twa | passed |
| [mobile-routine] cria rotina do mestre | mobile-twa | passed |
| [mobile-day] adiciona item ao cronograma do dia | mobile-twa | passed |
| [mobile-diary] completa diario de obra | mobile-twa | passed |
