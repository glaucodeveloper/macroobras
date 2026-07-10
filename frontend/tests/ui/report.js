import fs from "node:fs";
import path from "node:path";
import { routineManifest } from "./routine-manifest.js";

const rootDir = process.cwd();
const resultsPath = path.join(rootDir, "output/playwright-results/results.json");
const reportPath = path.join(rootDir, "output/ui-test-report.md");
const visualReportPath = path.join(rootDir, "output/ui-visual-report.html");

function flattenSpecs(suites, rows = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const project = test.projectName || "default";
        const status = test.results?.at(-1)?.status || "unknown";
        rows.push({ title: spec.title, project, status });
      }
    }
    flattenSpecs(suite.suites, rows);
  }
  return rows;
}

function statusFor(rows, routine) {
  const matches = rows.filter((row) => row.title.includes(`[${routine.id}]`));
  if (!matches.length) return "nao executado";
  if (matches.every((row) => row.status === "passed")) return "passou";
  if (matches.some((row) => row.status === "failed" || row.status === "timedOut")) return "falhou";
  return matches.map((row) => row.status).join(", ");
}

function screenshotFor(routine) {
  const screensDir = path.join(rootDir, "output/ui-screens");
  if (!fs.existsSync(screensDir)) return "";

  const file = fs
    .readdirSync(screensDir)
    .find((name) => name.startsWith(`${routine.id}-`) && name.endsWith(".png"));

  return file ? `ui-screens/${file}` : "";
}

function escHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const rows = flattenSpecs(results.suites);
const generatedAt = new Date().toISOString();
const manifestRows = routineManifest.map((routine) => ({
  ...routine,
  status: statusFor(rows, routine),
  screenshot: screenshotFor(routine),
}));

function reportGroup(routine) {
  if (routine.suite === "Instalador") return "Instalação";
  if (routine.suite === "App de medição") return "Rotinas do app de medição";
  return "Rotinas de uso administrativo";
}

function groupDescription(group) {
  const descriptions = {
    "Instalação": "Telas de avaliação do wizard: pasta local, FTP, endpoint de colaboradores, Archive, OKF, Llama/gemma4eb e introduções de uso.",
    "Rotinas de uso administrativo": "Telas internas de administração: obras, elementos de obra, acessos do app de medição, cronograma, medição e comparação da medição.",
    "Rotinas do app de medição": "Telas internas do colaborador: cadastro por email/CPF, vínculo de obra, bloqueios e execução de rotinas de campo.",
  };
  return descriptions[group] || "";
}

const groupedRows = [
  "Instalação",
  "Rotinas de uso administrativo",
  "Rotinas do app de medição",
].map((group) => ({
  group,
  description: groupDescription(group),
  rows: manifestRows.filter((routine) => reportGroup(routine) === group),
}));

const lines = [
  "# Relatorio de testes UI MacroObras",
  "",
  `Gerado em: ${generatedAt}`,
  "",
  "## Artefatos",
  "",
  "- HTML navegavel: `output/playwright-report/index.html`",
  "- JSON tecnico: `output/playwright-results/results.json`",
  "- JUnit CI: `output/playwright-results/junit.xml`",
  "- Markdown executivo: `output/ui-test-report.md`",
  "- HTML com prints: `output/ui-visual-report.html`",
  "- Prints PNG: `output/ui-screens/`",
  "",
  "## Avaliação",
  "",
  `- Rotinas avaliadas: ${manifestRows.length}`,
  `- Rotinas aprovadas: ${manifestRows.filter((row) => row.status === "passou").length}`,
  `- Prints gerados: ${manifestRows.filter((row) => row.screenshot).length}`,
  "- HTML visual organizado por instalação, administração e app de medição: `output/ui-visual-report.html`",
  "",
  "## Cobertura por rotina",
  "",
  "| Rotina | Suite | Superficie | Eventos de front | Status | Print | Proposito |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...manifestRows.map((routine) => [
    `| ${routine.title || routine.id}`,
    routine.suite,
    routine.surface,
    routine.frontEvents.join(", "),
    routine.status,
    routine.screenshot ? `\`${routine.screenshot}\`` : "sem print",
    `${routine.purpose} |`,
  ].join(" | ")),
  "",
  "## Execucoes Playwright",
  "",
  "| Teste | Projeto | Status |",
  "| --- | --- | --- |",
  ...rows.map((row) => `| ${row.title} | ${row.project} | ${row.status} |`),
  "",
];

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, lines.join("\n"));

function cardFor(routine) {
  return `
  <article class="card ${routine.status === "passou" ? "passed" : "failed"}">
    <header>
      <div>
        <span class="suite">${escHtml(routine.suite)}</span>
        <h2>${escHtml(routine.title || routine.id)}</h2>
      </div>
      <strong>${escHtml(routine.status)}</strong>
    </header>
    <p>${escHtml(routine.purpose)}</p>
    <dl>
      <dt>Superficie</dt><dd>${escHtml(routine.surface)}</dd>
      <dt>Eventos</dt><dd>${escHtml(routine.frontEvents.join(", "))}</dd>
    </dl>
    ${routine.screenshot ? `<a href="${escHtml(routine.screenshot)}" target="_blank"><img src="${escHtml(routine.screenshot)}" alt="Print ${escHtml(routine.title || routine.id)}"></a>` : "<div class=\"empty\">Print nao encontrado</div>"}
  </article>
`;
}

const sections = groupedRows.map((group) => `
  <section class="report-section" id="${escHtml(group.group.toLowerCase().replaceAll(" ", "-"))}">
    <div class="section-title">
      <div>
        <h2>${escHtml(group.group)}</h2>
        <p>${escHtml(group.description)}</p>
      </div>
      <strong>${group.rows.filter((row) => row.status === "passou").length}/${group.rows.length}</strong>
    </div>
    <div class="grid">
      ${group.rows.map(cardFor).join("\n")}
    </div>
  </section>
`).join("\n");

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Relatorio visual UI MacroObras</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f6f8;
        --panel: #ffffff;
        --text: #17202a;
        --muted: #617080;
        --line: #d9e0e7;
        --ok: #147a46;
        --fail: #b42318;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background: var(--bg);
      }
      main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 48px; }
      .top { display: flex; justify-content: space-between; gap: 24px; align-items: end; margin-bottom: 24px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .top p { margin: 0; color: var(--muted); }
      .nav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0 0 18px;
      }
      .nav a {
        padding: 9px 12px;
        color: var(--text);
        text-decoration: none;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 8px;
        font-weight: 700;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }
      .metric, .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 8px;
      }
      .metric { padding: 14px 16px; }
      .metric span { display: block; color: var(--muted); font-size: 12px; }
      .metric strong { display: block; font-size: 22px; margin-top: 4px; }
      .assessment {
        display: grid;
        gap: 10px;
        margin: 0 0 26px;
        padding: 16px;
        background: #eef8f1;
        border: 1px solid #b8e4c7;
        border-radius: 8px;
      }
      .assessment h2 { margin: 0; font-size: 18px; }
      .assessment p { margin: 0; color: #315a3e; }
      .report-section { margin-top: 34px; }
      .section-title {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: end;
        margin-bottom: 14px;
      }
      .section-title h2 { margin: 0 0 6px; font-size: 24px; }
      .section-title p { margin: 0; color: var(--muted); }
      .section-title strong {
        padding: 8px 12px;
        color: var(--ok);
        background: #eef8f1;
        border: 1px solid #b8e4c7;
        border-radius: 8px;
        white-space: nowrap;
      }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
      .card { overflow: hidden; }
      .card header { display: flex; align-items: start; justify-content: space-between; gap: 16px; padding: 16px 16px 0; }
      .suite { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
      h2 { margin: 4px 0 0; font-size: 18px; }
      .card header strong { color: var(--ok); }
      .card.failed header strong { color: var(--fail); }
      .card p { margin: 12px 16px; color: var(--muted); }
      dl { display: grid; grid-template-columns: 90px 1fr; gap: 6px 10px; margin: 0 16px 16px; }
      dt { color: var(--muted); }
      dd { margin: 0; }
      img {
        display: block;
        width: 100%;
        max-height: 560px;
        object-fit: contain;
        object-position: top center;
        border-top: 1px solid var(--line);
        background: #eef2f5;
      }
      .empty { padding: 32px 16px; border-top: 1px solid var(--line); color: var(--muted); }
      @media (max-width: 840px) {
        .top { display: block; }
        .section-title { display: block; }
        .summary, .grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="top">
        <div>
          <h1>Relatorio visual UI MacroObras</h1>
          <p>Gerado em ${escHtml(generatedAt)}. Este HTML reune telas de avaliação, instalação e rotinas internas de uso.</p>
        </div>
      </section>
      <nav class="nav" aria-label="Seções do relatório">
        <a href="#instalação">Instalação</a>
        <a href="#rotinas-de-uso-administrativo">Administração</a>
        <a href="#rotinas-do-app-de-medição">App de medição</a>
      </nav>
      <section class="summary">
        <div class="metric"><span>Rotinas</span><strong>${manifestRows.length}</strong></div>
        <div class="metric"><span>Passaram</span><strong>${manifestRows.filter((row) => row.status === "passou").length}</strong></div>
        <div class="metric"><span>Falharam</span><strong>${manifestRows.filter((row) => row.status !== "passou").length}</strong></div>
        <div class="metric"><span>Prints</span><strong>${manifestRows.filter((row) => row.screenshot).length}</strong></div>
      </section>
      <section class="assessment">
        <h2>Avaliação geral</h2>
        <p>Resultado atual: ${manifestRows.every((row) => row.status === "passou") ? "todas as rotinas passaram e possuem telas capturadas para revisão." : "existem rotinas com falha ou sem print; consulte os cards abaixo."}</p>
      </section>
      ${sections}
    </main>
  </body>
</html>`;

fs.writeFileSync(visualReportPath, html);
console.log(`Relatorio Markdown gerado em ${reportPath}`);
console.log(`Relatorio visual gerado em ${visualReportPath}`);
