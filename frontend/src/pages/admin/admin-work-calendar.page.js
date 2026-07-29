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

/* MACROOBRAS WORK VISIT CALENDAR V1 */
function visitsForWork(workId) {
  return (state.visitPlans || []).flatMap((plan) =>
    (plan.schedule || [])
      .filter((entry) => entry.workId === workId)
      .map((entry) => ({
        ...entry,
        planId: plan.id,
        planName: plan.name,
        planDate: plan.date,
        generatedAt: plan.generatedAt,
      }))
  );
}

function visitCalendarMarkup(entries) {
  if (!entries.length) {
    return `<div class="empty-state"><h3>Nenhuma visita registrada</h3><p>Trace uma rota na página Visitas e use “Registrar no cronograma e imprimir PDF”.</p></div>`;
  }

  return `<div class="work-visit-calendar-list">${entries.map((entry, index) => `
    <article>
      <b>${String(index + 1).padStart(2, "0")}</b>
      <div>
        <small>${esc(entry.planName || "Rota de visitas")}</small>
        <strong>${esc(entry.name || "Visita")}</strong>
        <span>${esc(entry.address || "")}</span>
      </div>
      <time>
        <strong>${esc(entry.planDate || "—")}</strong>
        <span>${esc(entry.start || "—")} – ${esc(entry.end || "—")}</span>
      </time>
      <button class="btn ghost small" data-message="print-visit-plan" data-plan-id="${esc(entry.planId)}">Imprimir rota</button>
    </article>
  `).join("")}</div>`;
}

export function adminWorkCalendar() {
  const work = activeWork();
  const days = ["Seg 03/08", "Ter 04/08", "Qua 05/08", "Qui 06/08", "Sex 07/08", "Sáb 08/08"];
  const rows = work.items.slice(0, 6);
  const visitEntries = visitsForWork(work.id);
  return `${workHeader(work, "Calendário", "Cronograma de execução e visitas registradas para esta obra.", `<button class="btn ghost" data-message="navigate" data-route="admin-visits">Planejar visitas</button><button class="btn" data-message="navigate" data-route="admin-work-planning">Editar cronograma</button>`)}
    <div class="calendar-origin"><b>↗</b><span>Origem</span><strong>Cronograma</strong><small>Arraste o fundo da grade para navegar horizontal e verticalmente.</small></div>
    ${card("Semana da obra", `<div class="node-calendar pan-surface" data-pan-surface><div class="calendar-head"><strong>Item</strong>${days.map((day) => `<strong>${day}</strong>`).join("")}</div>${rows.map((item, rowIndex) => `<div class="calendar-row"><aside><strong>${esc(item.description)}</strong><small>${money(item.budget)}</small></aside>${days.map((day, dayIndex) => `<div>${dayIndex === rowIndex % days.length ? `<span class="calendar-allocation tone-${rowIndex % 4}"><b>${esc(item.description)}</b><small>Data do quadro</small></span>` : ""}</div>`).join("")}</div>`).join("")}</div>`)}
    ${card("Visitas registradas no cronograma", visitCalendarMarkup(visitEntries), "work-visit-calendar-card")} `;
}
