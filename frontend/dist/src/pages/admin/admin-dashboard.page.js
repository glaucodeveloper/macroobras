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
} from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, formStep, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value) => `${Math.round(Number(value || 0))}%`;
const workById = (id) => availableWorks.find((work) => work.id === id);
const activeWork = () => selectedWork() || availableWorks[0];
const flowWork = (flow) => workById(flow?.workId);
const flowItem = (flow) => flowWork(flow)?.items.find((item) => item.id === flow?.itemId);
const accessesForWork = (workId) => (state.encarregadoAccesses || []).filter((access) => access.workId === workId);

function encarregadoAccessUrl(access) {
  const base = state.collaboratorStatus?.publicAppUrl
    || state.collaboratorStatus?.lanAppUrl
    || state.collaboratorStatus?.localAppUrl
    || `${window.location.origin}/?surface=twa`;
  const url = new URL(base, window.location.origin);
  url.searchParams.set("surface", "twa");
  url.searchParams.set("access", access.id);
  url.searchParams.set("work", access.workId);
  return url.toString();
}


function authStatusMarkup() {
  const message = String(state.toast || "").trim();
  return `<div class="auth-form-status" data-auth-status data-tone="info" ${message ? "" : "hidden"} role="status" aria-live="polite">${esc(message)}</div>`;
}

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

function kpi(label, value, detail, tone = "blue") {
  return `<article class="metric-card ${tone}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(detail)}</span></article>`;
}

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div>${status(work.status)}<strong>${percent(work.progress)}</strong></div></div>`;
}

function workHeader(work, title, subtitle, actions = "") {
  return `${pageHeader(title, subtitle, actions)}${workContext(work)}`;
}

function diagramSeed(work) {
  const columns = work.items.length > 8 ? 4 : 3;
  const nodes = work.items.map((item, index) => ({
    id: item.id,
    kind: "Item da obra",
    title: item.description,
    description: money(item.budget),
    observations: "",
    fields: [{ name: "Data", value: `2026-${String(8 + Math.floor(index / 6)).padStart(2, "0")}-${String(3 + (index * 3) % 25).padStart(2, "0")}` }],
    x: 54 + (index % columns) * 315,
    y: 54 + Math.floor(index / columns) * 225,
  }));
  const edges = nodes.slice(0, -1).filter((_, index) => index < 4).map((node, index) => ({
    id: `seed-${index}`,
    from: node.id,
    to: nodes[index + 1].id,
    label: index % 2 ? "libera atividade" : "precede",
  }));
  return { nodes, edges };
}

export function adminDashboard() {
  const totalBudget = availableWorks.reduce((sum, work) => sum + work.budget, 0);
  const measuredValue = availableWorks.reduce((sum, work) => sum + (work.budget * work.progress / 100), 0);
  const consolidatedProgress = totalBudget ? Math.round(measuredValue / totalBudget * 100) : 0;
  const plans = state.visitPlans || [];
  const diaries = availableWorks.map((work, index) => ({
    work,
    day: String(22 - index).padStart(2, "0"),
    month: "JUL",
    title: index === 0 ? "Preparação da base para grama sintética" : index === 1 ? "Movimentação de terra e regularização" : "Instalação e conferência dos refletores",
    detail: index === 2 ? "Registro com evidência fotográfica" : "Registro diário atualizado pela equipe de campo",
  }));

  return `
    ${pageHeader("Painel", "Resumo de medições, visitas, obras e diários de campo.", `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    <section class="dashboard-module-grid">
      <article class="dashboard-module-card measurement-module" data-message="open-work-section" data-work-id="${esc(availableWorks[0]?.id || "")}" data-route="admin-work-measurement" tabindex="0">
        <header><div><small>Medições</small><h2>Balanço das medições</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${percent(consolidatedProgress)}</strong><span>${money(measuredValue)} medidos de ${money(totalBudget)}</span></div>
        <div class="dashboard-module-list">
          ${availableWorks.map((work) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-measurement"><span><strong>${esc(work.name)}</strong><small>${money(work.budget * work.progress / 100)} medidos</small></span><b>${percent(work.progress)}</b></button>`).join("")}
        </div>
      </article>

      <article class="dashboard-module-card visits-module" data-message="navigate" data-route="admin-visits" tabindex="0">
        <header><div><small>Agenda</small><h2>Visitas programadas</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${plans.length}</strong><span>${plans.length === 1 ? "roteiro salvo" : "roteiros salvos"}</span></div>
        <div class="dashboard-module-list">
          ${plans.length ? plans.map((plan) => `<button data-message="navigate" data-route="admin-visits"><span><strong>${esc(plan.name)}</strong><small>${esc(plan.date)} · ${Math.round((plan.travelMinutes + plan.visitMinutes) / 60)} h previstas</small></span><b>Agenda</b></button>`).join("") : `<div class="dashboard-empty"><strong>Nenhuma visita agendada</strong><small>Abra Visitas para criar o primeiro roteiro.</small></div>`}
        </div>
      </article>

      <article class="dashboard-module-card works-module" data-message="navigate" data-route="admin-works" tabindex="0">
        <header><div><small>Obras</small><h2>Obras cadastradas</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${availableWorks.length}</strong><span>obras com medição ativa</span></div>
        <div class="dashboard-module-list">
          ${availableWorks.map((work) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-overview"><span><strong>${esc(work.name)}</strong><small>${esc(work.address)}</small></span><b>${percent(work.progress)}</b></button>`).join("")}
        </div>
      </article>

      <article class="dashboard-module-card diary-module" data-message="open-work-section" data-work-id="${esc(availableWorks[0]?.id || "")}" data-route="admin-work-diary" tabindex="0">
        <header><div><small>Campo</small><h2>Diários de obras</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${diaries.length}</strong><span>obras com registros recentes</span></div>
        <div class="dashboard-module-list diary-dashboard-list">
          ${diaries.map(({ work, day, month, title, detail }) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-diary"><i><b>${esc(day)}</b><small>${esc(month)}</small></i><span><strong>${esc(title)}</strong><small>${esc(work.name)} · ${esc(detail)}</small></span><em>›</em></button>`).join("")}
        </div>
      </article>
    </section>
  `;
}
