const MAP_SELECTOR =
  '[data-google-map="works"]';

const SIDEBAR_SELECTORS = [
  ".works-selected-hero.work-detail-inline-before-map",
  ".works-selected-hero",
  ".work-detail-inline-before-map",
  '[class*="work-detail-inline-before-mapworks-selected-hero"]',
].join(",");

let observerInstalled = false;
let queued = false;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isWorksPage() {
  const title = document.querySelector(
    ".page-header h1, .page-heading h1, main h1",
  )?.textContent;

  return normalize(title) === "obras";
}

function normalizeBrokenClasses(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const fixed = element.className
    .replaceAll(
      "work-detail-inline-before-mapworks-selected-hero",
      "work-detail-inline-before-map works-selected-hero",
    )
    .replaceAll(
      "work-detail-inline-before-mapwork-detail-inline-before-map",
      "work-detail-inline-before-map",
    )
    .replace(/\s+/g, " ")
    .trim();

  element.className = fixed;
  element.classList.add(
    "works-selected-hero",
    "work-detail-inline-before-map",
    "works-map-right-sidebar",
  );
}

function findSidebar(root = document) {
  const direct = root.querySelector(
    SIDEBAR_SELECTORS,
  );

  if (direct) return direct;

  return Array.from(
    root.querySelectorAll("[class]"),
  ).find((element) => {
    const value = String(element.className || "");

    return (
      value.includes("works-selected-hero")
      && value.includes("work-detail-inline-before-map")
    );
  }) || null;
}

function findMapHost(map) {
  return (
    map.closest(".works-map-column")
    || map.closest(".works-map-layout")
    || map.closest(".works-filter-card")
    || map.parentElement
  );
}

function removeOldHosts(sidebar, currentHost) {
  document.querySelectorAll(
    ".has-works-map-right-sidebar",
  ).forEach((host) => {
    if (host !== currentHost) {
      host.classList.remove(
        "has-works-map-right-sidebar",
      );
    }
  });

  document.querySelectorAll(
    ".works-map-right-sidebar",
  ).forEach((candidate) => {
    if (candidate !== sidebar) {
      candidate.classList.remove(
        "works-map-right-sidebar",
      );
    }
  });
}

function fitSidebarBesideMap() {
  queued = false;

  if (!isWorksPage()) return;

  const map = document.querySelector(MAP_SELECTOR);
  const sidebar = findSidebar();

  if (!map || !sidebar) return;

  normalizeBrokenClasses(sidebar);

  const host = findMapHost(map);

  if (!host) return;

  removeOldHosts(sidebar, host);

  host.classList.add(
    "has-works-map-right-sidebar",
  );

  map.classList.add(
    "works-map-main-surface",
  );

  /*
   * O mapa não é movido. Apenas o detalhe entra no mesmo host,
   * imediatamente depois do mapa, preservando a instância Google.
   */
  if (
    sidebar.parentElement !== host
    || sidebar.previousElementSibling !== map
  ) {
    map.insertAdjacentElement(
      "afterend",
      sidebar,
    );
  }

  sidebar.removeAttribute("style");
  sidebar.dataset.worksMapSidebar = "right";

  const mapHeight = Math.round(
    map.getBoundingClientRect().height,
  );

  if (mapHeight > 180) {
    host.style.setProperty(
      "--works-map-live-height",
      `${mapHeight}px`,
    );
  }

  const mapObject = map.__macroMap;

  if (
    mapObject
    && window.google?.maps?.event
  ) {
    requestAnimationFrame(() => {
      window.google.maps.event.trigger(
        mapObject,
        "resize",
      );
    });
  }
}

function queueFit() {
  if (queued) return;

  queued = true;

  requestAnimationFrame(() => {
    requestAnimationFrame(
      fitSidebarBesideMap,
    );
  });
}

function installObserver() {
  if (observerInstalled) return;

  observerInstalled = true;

  const observer = new MutationObserver(
    queueFit,
  );

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "data-work-id",
      ],
    },
  );

  window.addEventListener(
    "resize",
    queueFit,
    {
      passive: true,
    },
  );

  document.addEventListener(
    "macroobras:select-work",
    queueFit,
  );

  queueFit();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    installObserver,
    {
      once: true,
    },
  );
} else {
  installObserver();
}

window.MacroObrasFitWorkSidebar =
  queueFit;
