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

export function adminVisits() {
  const selected = selectedVisitPlan();
  const route = state.visitRoute || { stops: [], segments: [], totalDistanceMeters: 0, totalDurationMillis: 0 };
  const stops = Array.isArray(route.stops) ? route.stops : [];
  const visitMinutes = stops.reduce((sum, stop) => sum + Number(stop.durationMinutes || state.visitDurations[stop.id] || 60), 0);
  const routeDistance = `${(Number(route.totalDistanceMeters || 0) / 1000).toFixed(route.totalDistanceMeters >= 100000 ? 0 : 1)} km`;
  const travelMinutes = Math.round(Number(route.totalDurationMillis || 0) / 60000);
  const travelLabel = `${Math.floor(travelMinutes / 60)}h ${travelMinutes % 60}min`;
  const selectedStops = selected?.stops || selected?.workIds?.map((id) => {
    const work = workById(id);
    return work ? { id: `work:${work.id}`, workId: work.id, name: work.name, address: work.address } : null;
  }).filter(Boolean) || [];
  const calendarRows = selected?.schedule?.length
    ? selected.schedule.map((entry, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><span><strong>${esc(entry.name || workById(entry.workId)?.name || "Parada")}</strong><small>${esc(entry.address || workById(entry.workId)?.address || "")}</small></span><time>${esc(entry.start)} — ${esc(entry.end)}</time></article>`).join("")
    : selectedStops.map((stop, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><span><strong>${esc(stop.name)}</strong><small>${esc(stop.address || "")}</small></span><time>${8 + index * 2}:00 — ${9 + index * 2}:00</time></article>`).join("");

  return `${pageHeader("Visitas", "Segure um ponto de obra, mova o mouse e solte em qualquer cidade ou ponto da estrada para criar uma parada.", `<button class="btn" data-message="generate-visit-plan">Gerar calendário</button>`)}
    <div class="visit-layout">
      <section>
        <div class="visit-map-wrap">
          <div class="route-map-toolbar">
            <div><strong>Traçado por estradas</strong><span class="route-draw-status" data-route-draw-status>Segure um ponto e mova o mouse.</span></div>
            <div><button type="button" data-map-only="true" data-visit-map-command="undo">↶ Desfazer</button><button type="button" data-map-only="true" data-visit-map-command="clear">Novo traçado</button></div>
          </div>
          ${map("visits")}
          <div class="route-live-order" data-route-live-order>${stops.length ? stops.map((stop, index) => `<span><b>${index + 1}</b>${esc(stop.name)}</span>`).join("") : "<small>Nenhuma parada conectada</small>"}</div>
        </div>
        <div class="route-metrics"><span><small>Distância</small><strong data-route-distance>${routeDistance}</strong></span><span><small>Deslocamento</small><strong data-route-travel>${travelLabel}</strong></span><span><small>Paradas</small><strong data-route-visits>${visitMinutes} min</strong></span><span><small>Fonte</small><strong data-route-source>${route.segments.length ? "Google Routes · vias rodoviárias" : "Aguardando traçado"}</strong></span></div>
      </section>
      <aside class="saved-routes"><h3>Calendários gerados</h3>${state.visitPlans.map((plan) => { const count = plan.stops?.length || plan.workIds?.length || 0; return `<button class="${selected?.id === plan.id ? "active" : ""}" data-message="select-visit-plan" data-plan-id="${esc(plan.id)}"><strong>${esc(plan.name)}</strong><small>${esc(plan.date)} · ${count} paradas</small><span>${Math.floor((plan.travelMinutes + plan.visitMinutes) / 60)}h ${(plan.travelMinutes + plan.visitMinutes) % 60}min</span></button>`; }).join("")}</aside>
    </div>
    ${card("Paradas do traçado", stops.length ? `<div class="current-route-list">${stops.map((stop, index) => `<article><b>${index + 1}</b><span><strong>${esc(stop.name)}</strong><small>${esc(stop.address || "")}</small></span><label>Parada<input type="number" min="0" step="15" value="${Number(stop.durationMinutes || 60)}" data-visit-duration="${esc(stop.id)}"><small>min</small></label><button class="route-stop-remove" data-message="remove-visit-stop" data-stop-id="${esc(stop.id)}" aria-label="Remover parada">Remover</button></article>`).join("")}</div>` : `<div class="route-empty-state"><b>●</b><strong>Inicie em um ponto de obra</strong><span>Segure o ponto, mova o mouse e acompanhe o caminho pelas estradas. Ao soltar, informe o tempo da nova parada.</span></div>`)}
    ${selected ? card("Calendário da rota", `<div class="route-calendar pan-surface" data-pan-surface>${calendarRows}</div>`) : ""}`;
}
