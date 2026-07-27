// MacroObras page architecture v27
// Página: admin-work-overview

import {
  availableWorks,
  budgetImportPreview,
  mobileUsers,
} from "../../core/data.js";
import {
  selectedPurchaseFlow,
  selectedVisitPlan,
  selectedWork,
  state,
} from "../../core/machine-state.js";
import { esc } from "../../core/utils.js";
import { card, formStep, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const percent = (value) => `${Math.round(Number(value || 0))}%`;

const activeWork = () => selectedWork() || availableWorks[0];

const accessesForWork = (workId) => (state.encarregadoAccesses || []).filter((access) => access.workId === workId);

function status(value) {
  const css = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
}

function map(type = "works", options = {}) {
  const attributes = [
    `data-google-map="${esc(type)}"`,
    options.workId ? `data-work-id="${esc(options.workId)}"` : "",
    options.address ? `data-address="${esc(options.address)}"` : "",
    options.compact ? `data-compact="true"` : "",
  ].filter(Boolean).join(" ");
  return `<div class="google-map ${options.compact ? "compact" : ""}" ${attributes}><div class="map-loading"><span></span><strong>Carregando Google Maps</strong><small>Mapa, marcadores e rotas</small></div></div>`;
}

function kpi(label, value, detail, tone = "blue") {
  return `<article class="metric-card ${tone}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(detail)}</span></article>`;
}

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div>${status(work.status)}<strong>${percent(work.progress)}</strong></div></div>`;
}

function workHeader(work, title, subtitle, actions = "") {
  return `${pageHeader(title, subtitle, actions)}${workContext(work)}`;
}

export function adminWorkOverview() {
  const work = activeWork();
  const accessCount = accessesForWork(work.id).length;
  return `${workHeader(work, "Visão geral", "Resumo operacional da obra selecionada.", `<button class="btn ghost" data-message="navigate" data-route="admin-work-access">Acessos do encarregado</button><button class="btn ghost" data-message="navigate" data-route="admin-work-diary">Diário de obras</button><button class="btn" data-message="navigate" data-route="admin-work-items">Ver itens</button>`)}
    <section class="overview-grid">
      ${card("Localização", map("work", { workId: work.id }), "map-card single-map")}
      ${card("Dados da planilha", `<dl class="facts"><div><dt>Cliente</dt><dd>${esc(work.client)}</dd></div><div><dt>Orçamento</dt><dd>${money(work.budget)}</dd></div><div><dt>Pago</dt><dd>${money(work.paid)}</dd></div><div><dt>Origem</dt><dd>${esc(work.source || "Planilha orçamentária")}</dd></div></dl><div class="quick-actions three"><button data-message="navigate" data-route="admin-work-access"><b>Encarregados</b><span>${accessCount} acesso(s) vinculado(s)</span></button><button data-message="navigate" data-route="admin-work-purchases"><b>Compras</b><span>Fluxos por stickers</span></button><button data-message="navigate" data-route="admin-work-diary"><b>Diário de obras</b><span>Registros e evidências</span></button></div>`)}
    </section>
    <section class="metric-grid compact">
      ${kpi("Itens de execução", String(work.items.length), "descrição + orçamento")}
      ${kpi("Execução", percent(work.progress), work.nextMilestone, "green")}
      ${kpi("Acessos de campo", String(accessCount), "encarregados vinculados", "cyan")}
      ${kpi("Compras", String(state.purchaseFlows.filter((flow) => flow.workId === work.id).length), "fluxos vinculados", "orange")}
    </section>`;
}

export default adminWorkOverview;
