const COMMAND_CENTER_SELECTOR = ".works-command-center";
const MAP_STAGE_SELECTOR = ".works-map-stage";
const MOUNT_ATTRIBUTE = "data-works-selected-sidebar-v5";

const HERO_SELECTOR = [
  ".works-selected-hero.work-detail-inline-before-map",
  ".work-detail-inline-before-map.works-selected-hero",
  '[class*="work-detail-inline-before-mapworks-selected-hero"]',
  '[class*="works-selected-herowork-detail-inline-before-map"]',
].join(",");

let queued = false;
let installed = false;
let savedScroll = null;
let restoreUntil = 0;

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isWorksPage() {
  const heading = document.querySelector(
    ".page-header h1, .page-heading h1, main h1",
  )?.textContent;

  return normalized(heading) === "obras";
}

function normalizeHeroClasses(hero) {
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
    "works-selected-sidebar-v5",
  );
}

function rememberScroll() {
  savedScroll = {
    x: window.scrollX,
    y: window.scrollY,
  };

  restoreUntil = performance.now() + 900;
}

function restoreScroll() {
  if (!savedScroll) return;

  window.scrollTo({
    left: savedScroll.x,
    top: savedScroll.y,
    behavior: "auto",
  });
}

function restoreScrollRepeatedly() {
  [0, 16, 40, 90, 160, 280, 480, 760].forEach(
    (delay) => window.setTimeout(restoreScroll, delay),
  );

  requestAnimationFrame(() => {
    restoreScroll();
    requestAnimationFrame(restoreScroll);
  });
}

function isSelectionControl(target) {
  return target?.closest?.([
    ".works-browser-list [data-work-id]",
    ".works-browser-list button",
    "[data-map-work-id]",
    "[data-message='select-work']",
    "[data-message='open-work-section'][data-work-id]",
    ".gm-work-point",
    ".gm-route-point",
  ].join(","));
}

function handleSelectionIntent(event) {
  if (!isWorksPage()) return;
  if (!isSelectionControl(event.target)) return;

  rememberScroll();
  restoreScrollRepeatedly();
}

function allHeroes() {
  return Array.from(document.querySelectorAll(HERO_SELECTOR))
    .filter((element) => element instanceof HTMLElement);
}

function chooseLiveHero(commandCenter) {
  const heroes = allHeroes();

  const freshOutside = heroes.find(
    (hero) => !commandCenter.contains(hero),
  );

  if (freshOutside) return freshOutside;

  return commandCenter.querySelector(
    `:scope > [${MOUNT_ATTRIBUTE}]`,
  ) || heroes[0] || null;
}

function removeStaleMountedHeroes(commandCenter, liveHero) {
  commandCenter.querySelectorAll(
    `:scope > [${MOUNT_ATTRIBUTE}]`,
  ).forEach((mounted) => {
    if (mounted !== liveHero) mounted.remove();
  });
}

function moveHero() {
  queued = false;

  if (!isWorksPage()) return;

  const commandCenter = document.querySelector(
    COMMAND_CENTER_SELECTOR,
  );

  if (!(commandCenter instanceof HTMLElement)) return;

  const mapStage = commandCenter.querySelector(
    `:scope > ${MAP_STAGE_SELECTOR}`,
  );

  if (!(mapStage instanceof HTMLElement)) return;

  const hero = chooseLiveHero(commandCenter);

  if (!(hero instanceof HTMLElement)) return;

  const viewport = {
    x: window.scrollX,
    y: window.scrollY,
  };

  normalizeHeroClasses(hero);
  removeStaleMountedHeroes(commandCenter, hero);

  hero.setAttribute(MOUNT_ATTRIBUTE, "true");
  commandCenter.classList.add(
    "works-command-center--sidebar-v5",
  );

  /*
   * Movimentação real no DOM:
   * works-browser -> works-map-stage -> works-selected-hero
   */
  if (
    hero.parentElement !== commandCenter
    || hero.previousElementSibling !== mapStage
  ) {
    commandCenter.insertBefore(
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
    left: viewport.x,
    top: viewport.y,
    behavior: "auto",
  });

  if (performance.now() < restoreUntil) {
    restoreScrollRepeatedly();
  }
}

function queueMove() {
  if (queued) return;

  queued = true;

  requestAnimationFrame(() => {
    requestAnimationFrame(moveHero);
  });
}

function install() {
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
        rememberScroll();
        queueMove();
        restoreScrollRepeatedly();
      },
      true,
    );
  });

  const observer = new MutationObserver(() => {
    queueMove();

    if (performance.now() < restoreUntil) {
      restoreScroll();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener(
    "resize",
    queueMove,
    { passive: true },
  );

  queueMove();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    install,
    { once: true },
  );
} else {
  install();
}

window.MacroObrasMoveSelectedHeroV5 = queueMove;
