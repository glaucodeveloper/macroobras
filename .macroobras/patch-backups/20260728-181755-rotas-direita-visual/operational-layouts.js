import { state } from "../core/state.js";
import { esc } from "../core/utils.js";

function normalizedText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function pageTitle(root) {
  return normalizedText(root.querySelector(".page-header h1, .page-heading h1, h1")?.textContent);
}

function cardHeading(card) {
  return normalizedText(card?.querySelector(":scope > h2, :scope > header h2, h2, h3")?.textContent);
}

function commonAncestor(left, right) {
  if (!left || !right) return null;
  const ancestors = new Set();
  let current = left;

  while (current) {
    ancestors.add(current);
    current = current.parentElement;
  }

  current = right;
  while (current) {
    if (ancestors.has(current)) return current;
    current = current.parentElement;
  }

  return null;
}

function hydrateInventoryLayout(root) {
  if (pageTitle(root) !== "inventario") return;

  const cards = [...root.querySelectorAll("article.card, .card")];
  const listCard = cards.find((card) => {
    const heading = cardHeading(card);
    return heading.includes("locais de inventario")
      || heading.includes("lista de inventario")
      || heading.includes("locais do inventario");
  });

  const mapElement = root.querySelector(
    '[data-google-map="inventory"], [data-google-map="inventario"], [data-google-map="works"], [data-google-map="work"]',
  );

  const mapCard = mapElement?.closest("article.card, .card");

  if (!listCard || !mapCard || listCard === mapCard) return;

  const container = commonAncestor(listCard, mapCard);
  if (!container) return;

  container.classList.add("mo-inventory-split");
  listCard.classList.add("mo-inventory-list-panel");
  mapCard.classList.add("mo-inventory-map-panel");
  mapElement.classList.add("mo-inventory-responsive-map");
}

function selectedVisitPlan() {
  const plans = Array.isArray(state.visitPlans) ? state.visitPlans : [];
  return plans.find((plan) => plan.id === state.selectedVisitPlanId) || null;
}

function routeStops() {
  const route = state.visitRoute || {};
  return Array.isArray(route.stops) ? route.stops : [];
}

function routeLabel() {
  const route = state.visitRoute || {};
  const stops = routeStops();

  if (stops.length) {
    return `Rota em edição com ${stops.length} parada(s). Segure um ponto e arraste para continuar.`;
  }

  return "Nova rota. Segure uma obra por 0,6 s e arraste até o próximo destino.";
}

function planOptions() {
  const plans = Array.isArray(state.visitPlans) ? state.visitPlans : [];
  const selectedId = state.selectedVisitPlanId || "";

  return [
    `<option value="">Nova rota sem registro salvo</option>`,
    ...plans.map((plan) => {
      const selected = plan.id === selectedId ? " selected" : "";
      const count = plan.stops?.length || plan.workIds?.length || 0;
      return `<option value="${esc(plan.id)}"${selected}>${esc(plan.name)} · ${count} parada(s)</option>`;
    }),
  ].join("");
}

function liveOrderMarkup() {
  const stops = routeStops();

  if (!stops.length) {
    return "<small>Nenhuma parada conectada</small>";
  }

  return stops
    .map((stop, index) => `<span><b>${index + 1}</b>${esc(stop.name || "Parada")}</span>`)
    .join("");
}

function routeDistance() {
  const meters = Number(state.visitRoute?.totalDistanceMeters || 0);
  return `${(meters / 1000).toFixed(meters >= 100000 ? 0 : 1)} km`;
}

function routeTravel() {
  const total = Math.max(
    0,
    Math.round(Number(state.visitRoute?.totalDurationMillis || 0) / 60000),
  );
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function hydrateWorksVisitToolbar(root) {
  if (pageTitle(root) !== "obras") return;

  const map = root.querySelector(
    '[data-google-map="works"], [data-google-map="works-visits"]',
  );

  if (!map) return;

  map.dataset.googleMap = "works-visits";

  let wrap = map.closest(".works-visit-map-wrap");

  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "visit-map-wrap works-visit-map-wrap";
    map.parentNode.insertBefore(wrap, map);
    wrap.appendChild(map);
  }

  if (!wrap.querySelector("[data-works-visit-toolbar]")) {
    const selected = selectedVisitPlan();
    const toolbar = document.createElement("section");
    toolbar.className = "works-visit-crud-toolbar";
    toolbar.dataset.worksVisitToolbar = "true";
    toolbar.setAttribute("aria-label", "CRUD de rotas de visita");

    toolbar.innerHTML = `
      <div class="works-visit-toolbar-heading">
        <small>Rotas de visita</small>
        <strong>Planejamento diretamente sobre o mapa das obras</strong>
        <span class="route-draw-status" data-route-draw-status>${esc(routeLabel())}</span>
      </div>

      <div class="works-visit-toolbar-fields">
        <label>
          <span>Nome da rota</span>
          <input
            data-works-visit-route-name
            value="${esc(selected?.name || "Nova rota de visitas")}"
            placeholder="Nome da rota"
          >
        </label>

        <label>
          <span>Rotas registradas</span>
          <select data-works-visit-plan-select>
            ${planOptions()}
          </select>
        </label>
      </div>

      <div class="works-visit-toolbar-actions">
        <button type="button" class="btn ghost" data-map-only="true" data-visit-map-command="clear">
          Nova
        </button>
        <button type="button" class="btn ghost" data-map-only="true" data-visit-map-command="undo">
          Desfazer
        </button>
        <button type="button" class="btn ghost" data-message="load-works-visit-route">
          Carregar
        </button>
        <button type="button" class="btn" data-message="save-works-visit-route">
          Salvar
        </button>
        <button type="button" class="btn ghost danger" data-message="delete-works-visit-route">
          Excluir
        </button>
        <button type="button" class="btn" data-message="generate-visit-plan">
          Registrar e PDF
        </button>
        <button type="button" class="btn ghost" data-message="navigate" data-route="admin-visits">
          Planejador completo
        </button>
      </div>
    `;

    wrap.prepend(toolbar);
  }

  if (!wrap.querySelector("[data-route-live-order]")) {
    const order = document.createElement("div");
    order.className = "route-live-order works-route-live-order";
    order.dataset.routeLiveOrder = "true";
    order.innerHTML = liveOrderMarkup();
    wrap.appendChild(order);
  }

  if (!wrap.querySelector("[data-works-route-metrics]")) {
    const metrics = document.createElement("div");
    metrics.className = "works-route-metrics";
    metrics.dataset.worksRouteMetrics = "true";
    metrics.innerHTML = `
      <span><small>Distância</small><strong data-route-distance>${esc(routeDistance())}</strong></span>
      <span><small>Deslocamento</small><strong data-route-travel>${esc(routeTravel())}</strong></span>
      <span><small>Paradas</small><strong data-route-visits>${routeStops().reduce((sum, stop) => sum + Number(stop.durationMinutes || 0), 0)} min</strong></span>
      <span><small>Fonte</small><strong data-route-source>${state.visitRoute?.segments?.length ? "Google Routes" : "Aguardando traçado"}</strong></span>
    `;
    wrap.appendChild(metrics);
  }
}

export function hydrateOperationalLayouts(root = document) {
  hydrateInventoryLayout(root);
  hydrateWorksVisitToolbar(root);
}
