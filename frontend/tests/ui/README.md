# Suites UI MacroObras

Esta pasta contem testes Playwright orientados por eventos reais do front: `goto`, `click`, `fill` e asserts de estado visivel. Os RPCs da estação local sao mockados em `helpers.js` para manter a suite deterministica.

## Suites

- `installer.spec.js`: pasta de instalacao, FTP local, endpoint de colaboradores, Archive/OKF, servidor Llama com gemma4eb e introducoes de admin/app de medição.
- `admin.spec.js`: cadastro de obra, elementos de obra, acessos do app de medição, cronograma administrativo, medicao e comparacao da medição.
- `mobile.spec.js`: cadastro por email/CPF, bloqueio por dependencia de obra, selecao de obra, rotina, cronograma do dia e diario do mestre no app de medição.

## Relatorios

Execute:

```bash
npm run test:ui:report
```

Artefatos gerados:

- `output/playwright-report/index.html`: relatorio navegavel com traces quando houver retry.
- `output/playwright-results/results.json`: resultado tecnico usado pelo compilador documental.
- `output/playwright-results/junit.xml`: formato para CI.
- `output/ui-test-report.md`: documento Markdown consolidado por rotina.
- `output/ui-visual-report.html`: documento HTML com os prints finais de cada rotina.
- `output/ui-screens/`: prints PNG capturados apos cada teste.

O arquivo `routine-manifest.js` declara o proposito de cada rotina, a superficie testada, os eventos de front usados e o artefato esperado.
