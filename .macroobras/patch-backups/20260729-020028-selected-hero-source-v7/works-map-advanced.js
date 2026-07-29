import {
  availableWorks,
  routes,
} from "../core/data.js";
import {
  state,
  updateState,
} from "../core/state.js";
import { esc } from "../core/utils.js";

const routeLayersByMap = new WeakMap();
const ROUTE_COLORS = Object.freeze([
  "#0a61d8",
  "#0c9b73",
  "#d98200",
  "#7b52c9",
  "#d33d5c",
  "#008fa8",
  "#86592d",
  "#4b6cb7",
]);

let listenersInstalled = false;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function pageScope(root = document) {
  return root.querySelector(
    ".workspace, main, [data-page-content]",
  ) || root;
}

function pageTitle(root = document) {
  return normalize(
    root.querySelector(
      ".page-header h1, .page-heading h1, main h1, h1",
    )?.textContent,
  );
}

function mapElement(scope) {
  return scope.querySelector(
    [
      '[data-google-map="works"]',
      '[data-google-map="works-visits"]',
      '.works-map-column .google-map',
    ].join(","),
  );
}

function mapSection(map) {
  return map?.closest(
    [
      ".works-filter-card",
      ".works-layout-grid",
      ".works-map-interface",
      "section",
      "article",
      ".card",
    ].join(","),
  );
}

function plannerRoute() {
  return routes.some(
    (route) => route.route === "admin-works-visits",
  )
    ? "admin-works-visits"
    : "admin-visits";
}

function planStops(plan) {
  if (Array.isArray(plan?.stops) && plan.stops.length) {
    return plan.stops;
  }

  if (Array.isArray(plan?.schedule) && plan.schedule.length) {
    return plan.schedule.map((item, index) => {
      const work = availableWorks.find(
        (candidate) => candidate.id === item.workId,
      );

      return {
        id: item.stopId || `schedule:${plan.id}:${index}`,
        workId: item.workId || "",
        name: item.name || work?.name || `Parada ${index + 1}`,
        address: item.address || work?.address || "",
        coordinates:
          item.coordinates
          || work?.coordinates
          || null,
        durationMinutes: Number(item.durationMinutes || 60),
      };
    });
  }

  return (plan?.workIds || [])
    .map((workId) => {
      const work = availableWorks.find(
        (candidate) => candidate.id === workId,
      );

      return work
        ? {
            id: `work:${work.id}`,
            kind: "work",
            workId: work.id,
            name: work.name,
            address: work.address,
            coordinates: work.coordinates,
            durationMinutes: 60,
          }
        : null;
    })
    .filter(Boolean);
}

function coordinates(value) {
  if (!value) return null;

  const lat = typeof value.lat === "function"
    ? value.lat()
    : Number(value.lat);

  const lng = typeof value.lng === "function"
    ? value.lng()
    : Number(value.lng);

  return Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng }
    : null;
}

function planSegments(plan) {
  const explicit =
    plan?.segments
    || plan?.route?.segments
    || plan?.visitRoute?.segments
    || [];

  if (Array.isArray(explicit) && explicit.length) {
    return explicit
      .map((segment, index) => ({
        id: segment.id || `${plan.id}:segment:${index}`,
        path: (segment.path || [])
          .map(coordinates)
          .filter(Boolean),
        distanceMeters: Number(segment.distanceMeters || 0),
        durationMillis: Number(segment.durationMillis || 0),
        fromId: segment.fromId || "",
        toId: segment.toId || "",
      }))
      .filter((segment) => segment.path.length > 1);
  }

  const stops = planStops(plan)
    .map((stop) => ({
      ...stop,
      coordinates: coordinates(stop.coordinates),
    }))
    .filter((stop) => stop.coordinates);

  return stops.slice(0, -1).map((stop, index) => ({
    id: `${plan.id}:fallback:${index}`,
    path: [
      stop.coordinates,
      stops[index + 1].coordinates,
    ],
    distanceMeters: 0,
    durationMillis: 0,
    fromId: stop.id,
    toId: stops[index + 1].id,
  }));
}

function routeDistance(plan) {
  const direct = Number(
    plan?.distanceMeters
    || plan?.totalDistanceMeters
    || plan?.route?.totalDistanceMeters
    || 0,
  );

  if (direct > 0) return direct;

  return planSegments(plan).reduce(
    (sum, segment) =>
      sum + Number(segment.distanceMeters || 0),
    0,
  );
}

function routeDuration(plan) {
  const direct =
    Number(plan?.travelMinutes || 0)
    + Number(plan?.visitMinutes || 0);

  if (direct > 0) return direct;

  return Math.round(
    planSegments(plan).reduce(
      (sum, segment) =>
        sum + Number(segment.durationMillis || 0),
      0,
    ) / 60000,
  );
}

function distanceText(value) {
  const meters = Number(value || 0);

  if (!(meters > 0)) return "Distância não registrada";

  return `${(meters / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: meters >= 100000 ? 0 : 1,
    maximumFractionDigits: 1,
  })} km`;
}

function durationText(value) {
  const total = Math.max(0, Math.round(Number(value || 0)));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  return hours
    ? `${hours}h ${String(minutes).padStart(2, "0")}min`
    : `${minutes}min`;
}

function consolidateSelectedWork(scope, map) {
  const dashboard = scope.querySelector(
    ".works-selected-dashboard",
  );

  let hero = scope.querySelector(
    ".works-selected-hero",
  );

  const section = mapSection(map);

  if (!hero && dashboard) {
    hero = document.createElement("section");
    hero.className =
      "works-selected-hero work-detail-inline-before-map";
  }

  if (!hero) return;

  hero.classList.add(
    "works-selected-hero",
    "work-detail-inline-before-map",
  );

  if (dashboard && dashboard !== hero) {
    const fragment = document.createDocumentFragment();

    while (dashboard.firstChild) {
      fragment.appendChild(dashboard.firstChild);
    }

    const body = document.createElement("div");
    body.className = "works-selected-hero-dashboard-content";
    body.appendChild(fragment);
    hero.appendChild(body);
    dashboard.remove();
  }

  if (!section?.parentNode) return;

  const closing = scope.querySelector(
    ".works-purchase-closing",
  );

  if (hero.parentNode !== section.parentNode) {
    section.parentNode.insertBefore(
      hero,
      closing || section,
    );
  } else if (
    hero.compareDocumentPosition(section)
    & Node.DOCUMENT_POSITION_PRECEDING
  ) {
    section.parentNode.insertBefore(
      hero,
      closing || section,
    );
  }
}

function movePurchaseClosing(scope, map) {
  const closing = scope.querySelector(
    ".works-purchase-closing",
  );

  const section = mapSection(map);

  if (!closing || !section?.parentNode) return;

  if (closing.nextElementSibling === section) return;

  section.parentNode.insertBefore(closing, section);
}

function routeCard(scope) {
  return scope.querySelector(
    [
      ".works-visit-routes-card",
      "[data-works-visit-routes-card]",
    ].join(","),
  );
}

function setRouteCardVisible(scope, active) {
  const card = routeCard(scope);

  scope.querySelectorAll(
    ".visit-map-wrap, .works-map-column, .works-map-interface",
  ).forEach((wrap) =>
    wrap.classList.toggle(
      "is-route-tracing",
      Boolean(active),
    ),
  );

  if (!card) return;

  card.hidden = !active;
  card.classList.toggle(
    "is-route-tracing-visible",
    Boolean(active),
  );
  card.setAttribute(
    "aria-hidden",
    active ? "false" : "true",
  );
}

function tracingFromDom(scope) {
  return Boolean(
    scope.querySelector(
      [
        ".gm-route-point.is-origin",
        ".gm-route-point.is-hold-ready",
        ".route-draw-status.drawing",
      ].join(","),
    ),
  );
}

function hydrateRouteCardVisibility(scope) {
  setRouteCardVisible(
    scope,
    tracingFromDom(scope),
  );

  const host = scope.querySelector(
    ".visit-map-wrap, .works-map-column, .works-map-interface",
  );

  if (!host || host.dataset.routeTraceObserver === "true") {
    return;
  }

  host.dataset.routeTraceObserver = "true";

  const observer = new MutationObserver(() => {
    setRouteCardVisible(
      scope,
      tracingFromDom(scope),
    );
  });

  observer.observe(host, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}

function clearRouteLayers(map) {
  const registry = routeLayersByMap.get(map);

  if (!registry) return;

  registry.layers.forEach((entry) => {
    entry.polylines.forEach(
      (polyline) => polyline.setMap(null),
    );
  });

  registry.layers.clear();
  registry.selectedId = "";
  registry.open = false;
}

function drawRouteLayers(map, plans) {
  clearRouteLayers(map);

  const registry = {
    open: true,
    selectedId: "",
    layers: new Map(),
  };

  plans.forEach((plan, planIndex) => {
    const color =
      ROUTE_COLORS[planIndex % ROUTE_COLORS.length];

    const polylines = planSegments(plan).map(
      (segment, segmentIndex) =>
        new google.maps.Polyline({
          map,
          path: segment.path,
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 7,
          zIndex: 40 + planIndex + segmentIndex,
          clickable: true,
        }),
    );

    registry.layers.set(plan.id, {
      plan,
      color,
      polylines,
    });
  });

  routeLayersByMap.set(map, registry);

  return registry;
}

function setLayerFocus(map, planId = "") {
  const registry = routeLayersByMap.get(map);

  if (!registry) return;

  registry.layers.forEach((entry, id) => {
    const focused = !planId || id === planId;

    entry.polylines.forEach((polyline) => {
      polyline.setOptions({
        strokeOpacity: focused ? 0.96 : 0.14,
        strokeWeight: id === planId ? 9 : 6,
        zIndex: id === planId ? 120 : 40,
      });
    });
  });
}

function routeFromPlan(plan) {
  const stops = planStops(plan)
    .map((stop) => ({
      ...stop,
      coordinates: coordinates(stop.coordinates),
    }))
    .filter((stop) => stop.coordinates);

  const segments = planSegments(plan);

  return {
    stops,
    segments,
    totalDistanceMeters: routeDistance(plan),
    totalDurationMillis: segments.reduce(
      (sum, segment) =>
        sum + Number(segment.durationMillis || 0),
      0,
    ),
    pendingStopId: "",
  };
}

function editRoute(plan) {
  updateState({
    visitRoute: routeFromPlan(plan),
    selectedVisitPlanId: plan.id,
    route: plannerRoute(),
    toast: `Rota aberta para edição: ${plan.name || "visita"}.`,
  });
}

function deleteRoute(plan) {
  const accepted = window.confirm(
    `Excluir a rota “${plan.name || "Rota de visita"}”?`,
  );

  if (!accepted) return;

  updateState({
    visitPlans: (state.visitPlans || []).filter(
      (candidate) => candidate.id !== plan.id,
    ),
    selectedVisitPlanId:
      state.selectedVisitPlanId === plan.id
        ? ""
        : state.selectedVisitPlanId,
    toast: `Rota excluída: ${plan.name || "visita"}.`,
  });
}

function showRouteLegend(host, map, plan, color) {
  let legend = host.querySelector(
    "[data-works-route-history-legend]",
  );

  if (!legend) {
    legend = document.createElement("aside");
    legend.className = "works-route-history-legend";
    legend.dataset.worksRouteHistoryLegend = "true";
    host.appendChild(legend);
  }

  legend.style.setProperty("--history-route-color", color);
  legend.innerHTML = `
    <header>
      <i></i>
      <div>
        <small>Rota selecionada</small>
        <strong>${esc(plan.name || "Rota de visita")}</strong>
      </div>
      <button
        type="button"
        data-history-route-close
        aria-label="Fechar legenda"
      >
        ×
      </button>
    </header>

    <div>
      <span>
        <small>Distância</small>
        <strong>${esc(distanceText(routeDistance(plan)))}</strong>
      </span>
      <span>
        <small>Duração</small>
        <strong>${esc(durationText(routeDuration(plan)))}</strong>
      </span>
      <span>
        <small>Data</small>
        <strong>${esc(plan.date || plan.generatedAt || "Sem data")}</strong>
      </span>
    </div>

    <footer>
      <button type="button" data-history-route-edit>
        Editar
      </button>
      <button
        type="button"
        class="danger"
        data-history-route-delete
      >
        Excluir
      </button>
    </footer>
  `;

  legend.querySelector(
    "[data-history-route-close]",
  )?.addEventListener("click", () => {
    legend.remove();
    setLayerFocus(map, "");
  });

  legend.querySelector(
    "[data-history-route-edit]",
  )?.addEventListener("click", () => editRoute(plan));

  legend.querySelector(
    "[data-history-route-delete]",
  )?.addEventListener("click", () => deleteRoute(plan));
}

function routeHistoryMarkup(plans) {
  return plans.map((plan, index) => `
    <button
      type="button"
      class="works-route-history-item"
      data-history-route-id="${esc(plan.id)}"
      style="--history-route-color:${
        ROUTE_COLORS[index % ROUTE_COLORS.length]
      }"
    >
      <i></i>
      <span>
        <strong>${esc(plan.name || "Rota de visita")}</strong>
        <small>
          ${esc(distanceText(routeDistance(plan)))}
          ·
          ${esc(durationText(routeDuration(plan)))}
        </small>
      </span>
    </button>
  `).join("");
}

function bindHistoryItems(
  panel,
  host,
  map,
  plans,
) {
  panel.querySelectorAll(
    "[data-history-route-id]",
  ).forEach((button) => {
    const plan = plans.find(
      (candidate) =>
        candidate.id === button.dataset.historyRouteId,
    );

    if (!plan) return;

    button.addEventListener("mouseenter", () => {
      panel.classList.add("has-route-hover");
      panel.querySelectorAll(
        "[data-history-route-id]",
      ).forEach((candidate) =>
        candidate.classList.toggle(
          "is-muted",
          candidate !== button,
        ),
      );

      setLayerFocus(map, plan.id);
    });

    button.addEventListener("mouseleave", () => {
      panel.classList.remove("has-route-hover");
      panel.querySelectorAll(
        "[data-history-route-id]",
      ).forEach((candidate) =>
        candidate.classList.remove("is-muted"),
      );

      const selected = panel.querySelector(
        "[data-history-route-id].is-selected",
      );

      setLayerFocus(
        map,
        selected?.dataset.historyRouteId || "",
      );
    });

    button.addEventListener("click", () => {
      panel.querySelectorAll(
        "[data-history-route-id]",
      ).forEach((candidate) =>
        candidate.classList.toggle(
          "is-selected",
          candidate === button,
        ),
      );

      setLayerFocus(map, plan.id);

      showRouteLegend(
        host,
        map,
        plan,
        getComputedStyle(button)
          .getPropertyValue("--history-route-color")
          .trim(),
      );
    });
  });
}

function ensureRouteHistory(scope, mapNode) {
  const host =
    mapNode.closest(
      ".works-map-column, .visit-map-wrap, .works-map-interface",
    )
    || mapNode.parentElement;

  if (!host) return;

  host.classList.add("works-map-history-host");

  let controls = host.querySelector(
    "[data-works-route-history-controls]",
  );

  if (!controls) {
    controls = document.createElement("section");
    controls.className = "works-route-history-controls";
    controls.dataset.worksRouteHistoryControls = "true";

    mapNode.insertAdjacentElement("afterend", controls);
  }

  const plans = Array.isArray(state.visitPlans)
    ? state.visitPlans
    : [];

  controls.innerHTML = `
    <button
      type="button"
      class="works-route-history-toggle"
      data-history-routes-toggle
      aria-expanded="false"
    >
      <span>Rotas de visitas realizadas</span>
      <b>${plans.length}</b>
    </button>

    <div
      class="works-route-history-panel"
      data-history-routes-panel
      hidden
    >
      ${plans.length
        ? routeHistoryMarkup(plans)
        : `<div class="works-route-history-empty">
            Nenhuma rota de visita registrada.
          </div>`}
    </div>
  `;

  const toggle = controls.querySelector(
    "[data-history-routes-toggle]",
  );

  const panel = controls.querySelector(
    "[data-history-routes-panel]",
  );

  toggle?.addEventListener("click", () => {
    const open = panel.hidden;

    panel.hidden = !open;
    controls.classList.toggle("is-open", open);
    toggle.setAttribute(
      "aria-expanded",
      open ? "true" : "false",
    );

    const map = mapNode.__macroMap;

    if (!map) {
      if (open) {
        window.setTimeout(
          () => ensureRouteHistory(scope, mapNode),
          180,
        );
      }

      return;
    }

    if (!open) {
      clearRouteLayers(map);
      host.querySelector(
        "[data-works-route-history-legend]",
      )?.remove();
      return;
    }

    drawRouteLayers(map, plans);
    bindHistoryItems(panel, host, map, plans);
  });
}

function installGlobalListeners() {
  if (listenersInstalled) return;

  listenersInstalled = true;

  document.addEventListener(
    "macroobras:visit-route-drawing",
    (event) => {
      const scope = pageScope(document);

      if (pageTitle(scope) !== "obras") return;

      setRouteCardVisible(
        scope,
        Boolean(event.detail?.active),
      );
    },
  );
}

export function hydrateWorksMapAdvanced(
  root = document,
) {
  installGlobalListeners();

  if (pageTitle(root) !== "obras") return;

  const scope = pageScope(root);
  const map = mapElement(scope);

  if (!map) return;

  consolidateSelectedWork(scope, map);
  movePurchaseClosing(scope, map);
  hydrateRouteCardVisibility(scope);
  ensureRouteHistory(scope, map);
}

/* MACROOBRAS SELECTED HERO HARD MOUNT V6 */

const moSelectedHeroMountV6 = (() => {
  const centerSelector = ".works-command-center";
  const stageSelector = ".works-map-stage";
  const heroSelector = [
    "header.works-selected-hero.work-detail-inline-before-map",
    ".works-selected-hero.work-detail-inline-before-map",
    ".work-detail-inline-before-map.works-selected-hero",
  ].join(",");

  let queued = false;
  let installed = false;
  let savedViewport = null;
  let restoreDeadline = 0;

  const rememberViewport = () => {
    savedViewport = {
      x: window.scrollX,
      y: window.scrollY,
    };

    restoreDeadline = performance.now() + 900;
  };

  const restoreViewport = () => {
    if (!savedViewport) return;

    window.scrollTo({
      left: savedViewport.x,
      top: savedViewport.y,
      behavior: "auto",
    });
  };

  const restoreRepeatedly = () => {
    [0, 16, 40, 90, 160, 280, 480, 760].forEach(
      (delay) => window.setTimeout(
        restoreViewport,
        delay,
      ),
    );

    requestAnimationFrame(() => {
      restoreViewport();
      requestAnimationFrame(restoreViewport);
    });
  };

  const selectedWorkControl = (target) =>
    target?.closest?.([
      ".works-browser-list [data-work-id]",
      ".works-browser-list button",
      "[data-map-work-id]",
      "[data-message='select-work']",
      "[data-message='open-work-section'][data-work-id]",
      ".gm-work-point",
      ".gm-route-point",
    ].join(","));

  const handleSelectionIntent = (event) => {
    if (!document.querySelector(centerSelector)) return;
    if (!selectedWorkControl(event.target)) return;

    rememberViewport();
    restoreRepeatedly();
  };

  const normalizeHero = (hero) => {
    hero.className = String(hero.className || "")
      .replaceAll(
        "work-detail-inline-before-mapworks-selected-hero",
        "work-detail-inline-before-map works-selected-hero",
      )
      .replaceAll(
        "works-selected-herowork-detail-inline-before-map",
        "works-selected-hero work-detail-inline-before-map",
      )
      .replace(/\s+/g, " ")
      .trim();

    hero.classList.add(
      "works-selected-hero",
      "work-detail-inline-before-map",
      "works-selected-sidebar-mounted-v6",
    );

    hero.dataset.worksSelectedSidebarMounted = "v6";
  };

  const chooseHero = (center) => {
    const heroes = Array.from(
      document.querySelectorAll(heroSelector),
    ).filter(
      (element) => element instanceof HTMLElement,
    );

    return (
      heroes.find((hero) => !center.contains(hero))
      || center.querySelector(
        ":scope > [data-works-selected-sidebar-mounted='v6']",
      )
      || heroes[0]
      || null
    );
  };

  const removeStaleMounted = (center, liveHero) => {
    center.querySelectorAll(
      ":scope > [data-works-selected-sidebar-mounted='v6']",
    ).forEach((mounted) => {
      if (mounted !== liveHero) mounted.remove();
    });
  };

  const mount = () => {
    queued = false;

    const center = document.querySelector(centerSelector);

    if (!(center instanceof HTMLElement)) return;

    const mapStage = center.querySelector(
      `:scope > ${stageSelector}`,
    );

    if (!(mapStage instanceof HTMLElement)) return;

    const hero = chooseHero(center);

    if (!(hero instanceof HTMLElement)) return;

    const viewportBeforeMove = {
      x: window.scrollX,
      y: window.scrollY,
    };

    normalizeHero(hero);
    removeStaleMounted(center, hero);

    center.classList.add(
      "works-command-center--selected-v6",
    );
    center.dataset.selectedHeroMounted = "v6";

    /*
     * Movimento real do nó:
     * works-browser -> works-map-stage -> works-selected-hero
     */
    if (
      hero.parentElement !== center
      || hero.previousElementSibling !== mapStage
    ) {
      center.insertBefore(
        hero,
        mapStage.nextSibling,
      );
    }

    [
      "display",
      "position",
      "inset",
      "width",
      "height",
      "margin",
      "transform",
    ].forEach((property) => {
      hero.style.removeProperty(property);
    });

    window.scrollTo({
      left: viewportBeforeMove.x,
      top: viewportBeforeMove.y,
      behavior: "auto",
    });

    if (performance.now() < restoreDeadline) {
      restoreRepeatedly();
    }
  };

  const queueMount = () => {
    if (queued) return;

    queued = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(mount);
    });
  };

  const install = () => {
    if (installed) return;
    installed = true;

    document.addEventListener(
      "pointerdown",
      handleSelectionIntent,
      true,
    );

    document.addEventListener(
      "click",
      handleSelectionIntent,
      true,
    );

    [
      "macroobras:select-work",
      "macroobras:open-work-section",
    ].forEach((eventName) => {
      document.addEventListener(
        eventName,
        () => {
          rememberViewport();
          queueMount();
          restoreRepeatedly();
        },
        true,
      );
    });

    const observer = new MutationObserver(() => {
      queueMount();

      if (performance.now() < restoreDeadline) {
        restoreViewport();
      }
    });

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true,
      },
    );

    window.addEventListener(
      "resize",
      queueMount,
      { passive: true },
    );

    queueMount();
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      install,
      { once: true },
    );
  } else {
    install();
  }

  return Object.freeze({
    mount: queueMount,
  });
})();

window.MacroObrasSelectedHeroMountV6 =
  moSelectedHeroMountV6.mount;

/* END MACROOBRAS SELECTED HERO HARD MOUNT V6 */
