const MAP_SELECTOR =
  '[data-google-map="works"]';

const STAGE_CLASS =
  "works-map-selected-stage-v2";

const DETAIL_SELECTORS = [
  ".works-selected-hero.work-detail-inline-before-map",
  ".work-detail-inline-before-map.works-selected-hero",
  ".works-selected-hero",
  ".work-detail-inline-before-map",
  '[class*="work-detail-inline-before-mapworks-selected-hero"]',
  '[class*="works-selected-herowork-detail-inline-before-map"]',
].join(",");

let observerInstalled = false;
let layoutQueued = false;
let preservedScroll = null;
let selectionGuardUntil = 0;

function normalized(value) {
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

  return normalized(title) === "obras";
}

function normalizeDetailClasses(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const corrected = String(element.className || "")
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

  element.className = corrected;

  element.classList.add(
    "works-selected-hero",
    "work-detail-inline-before-map",
    "works-map-selected-sidebar-v2",
  );
}

function detailCandidate() {
  const direct = document.querySelector(
    DETAIL_SELECTORS,
  );

  if (direct) return direct;

  const overview = document.querySelector(
    ".work-overview-hero",
  );

  if (!overview) return null;

  let cursor = overview.parentElement;

  while (cursor && cursor !== document.body) {
    const containsActions = Boolean(
      cursor.querySelector(
        ".work-horizontal-actions",
      ),
    );

    const containsMetrics = Boolean(
      cursor.querySelector(
        ".work-focus-body, .focus-stat",
      ),
    );

    if (containsActions && containsMetrics) {
      return cursor;
    }

    cursor = cursor.parentElement;
  }

  return overview.parentElement;
}

function mapCandidate() {
  return document.querySelector(MAP_SELECTOR);
}

function stageForMap(map) {
  const current = map.closest(
    `.${STAGE_CLASS}`,
  );

  if (current) return current;

  const stage = document.createElement("section");

  stage.className = STAGE_CLASS;
  stage.dataset.worksMapSelectedStage = "true";

  const originalParent = map.parentElement;

  if (!originalParent) return null;

  originalParent.insertBefore(stage, map);
  stage.appendChild(map);

  return stage;
}

function removeDuplicateStages(activeStage) {
  document.querySelectorAll(
    `.${STAGE_CLASS}`,
  ).forEach((stage) => {
    if (stage === activeStage) return;

    const map = stage.querySelector(MAP_SELECTOR);

    if (map && activeStage) {
      activeStage.prepend(map);
    }

    stage.remove();
  });
}

function preserveScrollPosition() {
  preservedScroll = {
    x: window.scrollX,
    y: window.scrollY,
  };

  selectionGuardUntil =
    performance.now() + 700;
}

function restorePreservedScroll() {
  if (!preservedScroll) return;

  const { x, y } = preservedScroll;

  window.scrollTo({
    left: x,
    top: y,
    behavior: "auto",
  });
}

function scheduleScrollRestoration() {
  const delays = [
    0,
    16,
    40,
    90,
    180,
    320,
    560,
  ];

  delays.forEach((delay) => {
    window.setTimeout(
      restorePreservedScroll,
      delay,
    );
  });

  requestAnimationFrame(() => {
    restorePreservedScroll();

    requestAnimationFrame(
      restorePreservedScroll,
    );
  });
}

function beginSelectionGuard() {
  preserveScrollPosition();
  scheduleScrollRestoration();
}

function selectionButton(target) {
  return target?.closest?.(
    [
      "[data-map-work-id]",
      "[data-work-id][data-route='admin-works']",
      "[data-message='select-work']",
      "[data-message='open-work-section'][data-work-id]",
      ".work-picker",
      ".gm-route-point",
      ".gm-work-point",
    ].join(","),
  );
}

function handleSelectionClick(event) {
  if (!isWorksPage()) return;

  if (!selectionButton(event.target)) return;

  beginSelectionGuard();
}

function resizeMap(map) {
  const mapObject = map.__macroMap;

  if (
    !mapObject
    || !window.google?.maps?.event
  ) {
    return;
  }

  requestAnimationFrame(() => {
    window.google.maps.event.trigger(
      mapObject,
      "resize",
    );
  });
}

function applyLayout() {
  layoutQueued = false;

  if (!isWorksPage()) return;

  const map = mapCandidate();
  const detail = detailCandidate();

  if (!map || !detail) return;

  normalizeDetailClasses(detail);

  const stage = stageForMap(map);

  if (!stage) return;

  removeDuplicateStages(stage);

  stage.classList.add(
    "has-selected-work-sidebar-v2",
  );

  map.classList.add(
    "works-map-surface-v2",
  );

  if (
    detail.parentElement !== stage
    || detail.previousElementSibling !== map
  ) {
    stage.appendChild(detail);
  }

  detail.removeAttribute("style");
  detail.dataset.worksMapSidebar = "right-v2";

  const rect = map.getBoundingClientRect();
  const height = Math.max(
    430,
    Math.round(rect.height || 0),
  );

  stage.style.setProperty(
    "--works-map-stage-height",
    `${height}px`,
  );

  resizeMap(map);

  if (
    performance.now() < selectionGuardUntil
  ) {
    scheduleScrollRestoration();
  }
}

function queueLayout() {
  if (layoutQueued) return;

  layoutQueued = true;

  requestAnimationFrame(() => {
    requestAnimationFrame(
      applyLayout,
    );
  });
}

function handleSelectWorkEvent() {
  beginSelectionGuard();
  queueLayout();
}

function installObserver() {
  if (observerInstalled) return;

  observerInstalled = true;

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  document.addEventListener(
    "pointerdown",
    handleSelectionClick,
    true,
  );

  document.addEventListener(
    "click",
    handleSelectionClick,
    true,
  );

  document.addEventListener(
    "macroobras:select-work",
    handleSelectWorkEvent,
    true,
  );

  document.addEventListener(
    "macroobras:open-work-section",
    handleSelectWorkEvent,
    true,
  );

  window.addEventListener(
    "resize",
    queueLayout,
    {
      passive: true,
    },
  );

  const observer = new MutationObserver(
    () => {
      queueLayout();

      if (
        performance.now() < selectionGuardUntil
      ) {
        restorePreservedScroll();
      }
    },
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

  queueLayout();
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

window.MacroObrasApplyWorksMapSidebarV2 =
  queueLayout;

window.MacroObrasPreserveWorksScroll =
  beginSelectionGuard;
