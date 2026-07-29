import "./works-map-selected-sidebar-v2.js";
import "./purchases-canvas-lanes.js";
import "./graph-ghost-table-print.js";
import "./print-table-reflow.js";
import "./canvas-table-print-router.js";
import "./canvas-report-print.js";
import "./component-pdf-print.js";
import { availableWorks } from "../core/data.js";
import { state } from "../core/state.js";
import { esc } from "../core/utils.js";

import { hydrateCurrentOperationalEnhancements } from "./current-operational-enhancements.js";
import { hydrateMapInventoryInteractions } from "./map-inventory-interactions.js";
import { hydrateWorksMapAdvanced } from "./works-map-advanced.js";
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

  const selectionFloat = wrap.parentElement?.querySelector(
    ":scope > .work-selection-float",
  );

  if (selectionFloat && !wrap.contains(selectionFloat)) {
    selectionFloat.classList.add("works-route-selection-float");
    wrap.appendChild(selectionFloat);
  }

  wrap.querySelector("[data-works-visit-toolbar]")?.remove();
  wrap.querySelectorAll(
    ":scope > .works-route-live-order, :scope > .works-route-metrics",
  ).forEach((element) => element.remove());

  const plans = Array.isArray(state.visitPlans) ? state.visitPlans : [];
  const selectedId = state.selectedVisitPlanId || "";

  const stopName = (stop, fallback = "Ponto não informado") =>
    stop?.name
    || stop?.title
    || stop?.address
    || fallback;

  const planStops = (plan) =>
    Array.isArray(plan?.stops) && plan.stops.length
      ? plan.stops
      : Array.isArray(plan?.schedule)
        ? plan.schedule
        : [];

  const distanceLabel = (plan) => {
    const meters = Number(
      plan?.distanceMeters
      || plan?.totalDistanceMeters
      || 0,
    );

    return meters > 0
      ? `${(meters / 1000).toLocaleString("pt-BR", {
          minimumFractionDigits: meters >= 100000 ? 0 : 1,
          maximumFractionDigits: 1,
        })} km`
      : "—";
  };

  const routeRow = (plan) => {
    const stops = planStops(plan);
    const start = stops.at(0);
    const end = stops.at(-1);
    const active = plan.id === selectedId ? " active" : "";

    return `
      <button
        type="button"
        class="works-visit-route-row${active}"
        data-message="load-works-visit-route"
        data-plan-id="${esc(plan.id || "")}"
        title="Carregar ${esc(plan.name || "rota")} no mapa"
      >
        <span>
          <small>Ponto inicial</small>
          <strong>${esc(stopName(start))}</strong>
        </span>

        <span class="distance">
          <small>Distância</small>
          <strong>${esc(distanceLabel(plan))}</strong>
        </span>

        <span>
          <small>Ponto de chegada</small>
          <strong>${esc(stopName(end))}</strong>
        </span>
      </button>
    `;
  };

  const currentRoute = state.visitRoute || {};
  const currentStops = Array.isArray(currentRoute.stops)
    ? currentRoute.stops
    : [];

  const draftMarkup = currentStops.length >= 2
    ? routeRow({
        id: "",
        name: "Trajeto em edição",
        stops: currentStops,
        distanceMeters: currentRoute.totalDistanceMeters,
      }).replace(
        'data-message="load-works-visit-route"',
        'data-current-route-row="true" disabled',
      )
    : "";

  let card = wrap.querySelector("[data-works-visit-routes-card]");

  if (!card) {
    card = document.createElement("aside");
    card.className = "works-visit-routes-card";
    card.dataset.worksVisitRoutesCard = "true";
    card.setAttribute("aria-label", "Rotas de visita registradas");
    wrap.appendChild(card);
  }

  card.innerHTML = `
    <header>
      <div>
        <small>Rotas de visita</small>
        <strong>Trajetos registrados</strong>
      </div>
      <span>${plans.length}</span>
    </header>

    <div class="works-visit-route-rows">
      ${draftMarkup}
      ${plans.length
        ? plans.map(routeRow).join("")
        : `<div class="works-visit-routes-empty">
            <strong>Nenhuma rota registrada</strong>
            <span>Crie o primeiro trajeto pressionando e arrastando um ponto diretamente no mapa.</span>
          </div>`}
    </div>
  `;
}

/* MACROOBRAS WORKS VISIT CARD ONLY V4 */
function hydrateWorksVisitRouteCard(root) {
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

  const selectionFloat = wrap.parentElement?.querySelector(
    ":scope > .work-selection-float",
  );

  if (selectionFloat && !wrap.contains(selectionFloat)) {
    selectionFloat.classList.add("works-route-selection-float");
    wrap.appendChild(selectionFloat);
  }

  /*
   * Remove a implementação visual anterior em toda hidratação.
   * Assim, mesmo uma toolbar produzida por código legado desaparece
   * antes da exibição do card.
   */
  wrap.querySelectorAll(
    [
      "[data-works-visit-toolbar]",
      ".works-visit-crud-toolbar",
      ":scope > .works-route-live-order",
      ":scope > .works-route-metrics",
      "[data-works-route-metrics]",
    ].join(","),
  ).forEach((element) => element.remove());

  const plans = Array.isArray(state.visitPlans)
    ? state.visitPlans
    : [];

  const selectedId = state.selectedVisitPlanId || "";

  const workStop = (workId) => {
    const work = availableWorks.find((item) => item.id === workId);

    return work
      ? {
          name: work.name,
          address: work.address,
        }
      : null;
  };

  const planStops = (plan) => {
    if (Array.isArray(plan?.stops) && plan.stops.length) {
      return plan.stops;
    }

    if (Array.isArray(plan?.schedule) && plan.schedule.length) {
      return plan.schedule;
    }

    if (Array.isArray(plan?.workIds) && plan.workIds.length) {
      return plan.workIds
        .map(workStop)
        .filter(Boolean);
    }

    return [];
  };

  const pointLabel = (stop, fallback) =>
    stop?.name
    || stop?.title
    || stop?.address
    || fallback;

  const distanceLabel = (plan) => {
    const meters = Number(
      plan?.distanceMeters
      || plan?.totalDistanceMeters
      || 0,
    );

    if (!(meters > 0)) return "—";

    return `${(meters / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: meters >= 100000 ? 0 : 1,
      maximumFractionDigits: 1,
    })} km`;
  };

  const rowMarkup = (plan) => {
    const stops = planStops(plan);
    const initial = stops.at(0);
    const arrival = stops.at(-1);
    const active = plan.id === selectedId ? " active" : "";

    return `
      <button
        type="button"
        class="works-visit-route-row${active}"
        data-message="load-works-visit-route"
        data-plan-id="${esc(plan.id || "")}"
        aria-label="Carregar rota ${esc(plan.name || "registrada")}"
      >
        <strong class="works-visit-route-name">
          ${esc(plan.name || "Rota de visita")}
        </strong>

        <span>
          <small>Ponto inicial</small>
          <b>${esc(pointLabel(initial, "Não informado"))}</b>
        </span>

        <span class="distance">
          <small>Distância</small>
          <b>${esc(distanceLabel(plan))}</b>
        </span>

        <span>
          <small>Ponto de chegada</small>
          <b>${esc(pointLabel(arrival, "Não informado"))}</b>
        </span>
      </button>
    `;
  };

  let card = wrap.querySelector("[data-works-visit-routes-card]");

  if (!card) {
    card = document.createElement("aside");
    card.className = "works-visit-routes-card";
    card.dataset.worksVisitRoutesCard = "true";
    card.setAttribute("aria-label", "Rotas de visita");
    wrap.appendChild(card);
  }

  card.innerHTML = `
    <header>
      <div>
        <small>Rotas de visita</small>
        <strong>Trajetos registrados</strong>
      </div>
      <span>${plans.length}</span>
    </header>

    <div class="works-visit-route-rows">
      ${plans.length
        ? plans.map(rowMarkup).join("")
        : `<div class="works-visit-routes-empty">
            <strong>Nenhuma rota registrada</strong>
            <span>Os trajetos criados no Planejador de visitas aparecerão aqui.</span>
          </div>`}
    </div>
  `;
}


export function hydrateOperationalLayouts(root = document) {
  hydrateInventoryLayout(root);
  hydrateWorksVisitToolbar(root);
  hydrateWorksVisitRouteCard(root);
  hydrateCurrentOperationalEnhancements(root);
  hydrateMapInventoryInteractions(root);
  hydrateWorksMapAdvanced(root);
}
