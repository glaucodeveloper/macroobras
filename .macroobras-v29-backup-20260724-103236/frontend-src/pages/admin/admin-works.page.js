// MacroObras page architecture v27
// Página: admin-works

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

function status(value) {
  const css = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
}

function progress(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="progress-track"><span style="width:${safe}%"></span></div>`;
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

export function adminWorks() {
  return `
    ${pageHeader("Obras", "Mapa geral seguido por uma sessão horizontal para cada obra cadastrada.", `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    ${card("Localização das obras", map("works"), "map-card works-map-card")}
    <div class="section-heading"><div><h2>Obras cadastradas</h2><p>Cada obra ocupa uma faixa completa com acessos diretos às suas subseções.</p></div><div class="inline-filter"><input placeholder="Buscar obra, cliente ou endereço"><button class="btn ghost">Filtrar</button></div></div>
    <section class="work-horizontal-list">
      ${availableWorks.map((work) => `<article class="work-horizontal-section">
        <div class="work-horizontal-main"><header><div><small>${esc(work.code)}</small><h2>${esc(work.name)}</h2></div>${status(work.status)}</header><p class="address">⌖ ${esc(work.address)}</p><p class="client-line"><b>Cliente</b><span>${esc(work.client)}</span></p></div>
        <div class="work-horizontal-progress"><div><small>Execução</small><strong>${percent(work.progress)}</strong></div>${progress(work.progress)}<div class="work-horizontal-values"><span><small>Orçamento</small><b>${money(work.budget)}</b></span><span><small>Próximo marco</small><b>${esc(work.nextMilestone)}</b></span></div></div>
        <nav class="work-horizontal-actions" aria-label="Acessos da obra"><button class="btn" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-overview">Visão geral</button><button class="btn ghost" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-access">Encarregados</button><button class="btn ghost" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-diary">Diário</button><button class="btn ghost" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-purchases">Compras</button></nav>
      </article>`).join("")}
    </section>`;
}

export default adminWorks;
