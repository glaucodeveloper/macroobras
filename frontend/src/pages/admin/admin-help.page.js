import { state } from "../../core/state.js";
import { pageHeader, card } from "../../ui/components.js";

function architectureModel() {
  return {
    nodes: [
      { id: "manual-module-works", kind: "Módulo", title: "Obras", description: "Cadastro, itens, cronograma, diário e medição.", x: 60, y: 70 },
      { id: "manual-page-items", kind: "Página", title: "Itens de execução", description: "Canvas de serviços e materiais.", x: 390, y: 70 },
      { id: "manual-page-calendar", kind: "Página", title: "Cronograma e calendário", description: "Alocação temporal dos serviços.", x: 720, y: 70 },
      { id: "manual-page-diary", kind: "Página", title: "Diário de obras", description: "Execução, gastos e evidências.", x: 1050, y: 70 },
      { id: "manual-page-measure", kind: "Página", title: "Medição", description: "Consolidação dos diários oficializados.", x: 1050, y: 330 },
      { id: "manual-module-inventory", kind: "Módulo", title: "Inventário", description: "Materiais disponíveis por cidade.", x: 60, y: 390 },
      { id: "manual-module-tickets", kind: "Módulo", title: "Tickets", description: "Demandas, responsáveis e requisitos.", x: 390, y: 390 },
      { id: "manual-module-purchases", kind: "Módulo", title: "Compras", description: "Solicitações com ou sem item de obra.", x: 720, y: 390 },
    ],
    edges: [
      { id: "m-a-1", from: "manual-module-works", to: "manual-page-items", label: "contém" },
      { id: "m-a-2", from: "manual-page-items", to: "manual-page-calendar", label: "planeja" },
      { id: "m-a-3", from: "manual-page-calendar", to: "manual-page-diary", label: "orienta execução" },
      { id: "m-a-4", from: "manual-page-diary", to: "manual-page-measure", label: "oficializa" },
      { id: "m-a-5", from: "manual-module-inventory", to: "manual-module-tickets", label: "gera alocação" },
      { id: "m-a-6", from: "manual-module-tickets", to: "manual-module-purchases", label: "pode solicitar" },
      { id: "m-a-7", from: "manual-module-purchases", to: "manual-page-diary", label: "registra gastos" },
    ],
  };
}

function sitemapModel() {
  const labels = [
    ["s-dashboard", "Painel"],
    ["s-works", "Obras"],
    ["s-items", "Itens de execução"],
    ["s-relations", "Relações de serviços"],
    ["s-planning", "Cronograma"],
    ["s-calendar", "Calendário"],
    ["s-diary", "Diário"],
    ["s-measure", "Medição"],
    ["s-purchases", "Compras"],
    ["s-inventory", "Inventário"],
    ["s-tickets", "Tickets"],
    ["s-rh", "RH"],
    ["s-manual", "Manual"],
  ];
  const nodes = labels.map(([id, title], index) => ({
    id,
    kind: "Página",
    title,
    description: `Rota funcional: ${title}`,
    x: 60 + (index % 4) * 320,
    y: 60 + Math.floor(index / 4) * 220,
  }));
  const edges = [
    ["s-dashboard", "s-works"],
    ["s-works", "s-items"],
    ["s-works", "s-relations"],
    ["s-items", "s-planning"],
    ["s-planning", "s-calendar"],
    ["s-calendar", "s-diary"],
    ["s-diary", "s-measure"],
    ["s-dashboard", "s-purchases"],
    ["s-dashboard", "s-inventory"],
    ["s-dashboard", "s-tickets"],
    ["s-dashboard", "s-rh"],
    ["s-dashboard", "s-manual"],
  ].map(([from, to], index) => ({ id: `sitemap-edge-${index}`, from, to, label: "navega" }));
  return { nodes, edges };
}

function organizationModel() {
  const saved = state.diagramModels?.["rh-main"];
  if (saved?.nodes?.length) return saved;
  return {
    nodes: [
      { id: "org-admin", kind: "Função", title: "Administrador", description: "Configuração e aprovação.", x: 550, y: 50 },
      { id: "org-engineer", kind: "Função", title: "Engenheiro", description: "Planejamento e medição.", x: 220, y: 310 },
      { id: "org-buyer", kind: "Função", title: "Comprador", description: "Ordens e fornecedores.", x: 550, y: 310 },
      { id: "org-store", kind: "Função", title: "Almoxarife", description: "Inventário e transferências.", x: 880, y: 310 },
      { id: "org-field", kind: "Função", title: "Encarregado", description: "Diário, execução e tickets.", x: 220, y: 570 },
    ],
    edges: [
      { id: "org-1", from: "org-admin", to: "org-engineer", label: "coordena" },
      { id: "org-2", from: "org-admin", to: "org-buyer", label: "autoriza" },
      { id: "org-3", from: "org-admin", to: "org-store", label: "supervisiona" },
      { id: "org-4", from: "org-engineer", to: "org-field", label: "orienta" },
    ],
  };
}

function canvas(id, model) {
  return `<div class="interactive-diagram manual-diagram" data-interactive-diagram="${id}" data-fixed-edges="true" data-hide-node-dates="true" data-fit-on-load="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(model)}</script></div>`;
}

export function adminHelp() {
  return `${pageHeader("Manual gráfico do sistema", "Arquitetura, funções, organização e sitemap representados em canvases relacionados.", `<button class="btn ghost" data-message="print-current-report">Imprimir manual</button>`)}
    <section class="manual-canvas-stack" data-print-report>
      ${card("Arquitetura funcional", canvas("manual-architecture", architectureModel()), "interactive-diagram-card")}
      ${card("Sitemap", canvas("manual-sitemap", sitemapModel()), "interactive-diagram-card")}
      ${card("Organograma e funções", canvas("manual-organization", organizationModel()), "interactive-diagram-card")}
    </section>`;
}
