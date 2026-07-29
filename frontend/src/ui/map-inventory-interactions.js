const ROUTE_CARD_STORAGE =
  "macroobras:works-visit-routes-card:collapsed";

let globalListenersInstalled = false;
let inventoryTransitionPending = false;
let inventoryTransitionTimer = 0;
let inventoryTransitionHost = null;

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function currentPage(root = document) {
  const heading = root.querySelector(
    ".page-header h1, .page-heading h1, main h1, h1",
  );

  return normalized(heading?.textContent);
}

function unwrapWorksMapSelection(root) {
  root.querySelectorAll(".works-map-selection-wrap").forEach(
    (wrapper) => {
      const parent = wrapper.parentNode;

      if (!parent) {
        wrapper.remove();
        return;
      }

      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
      }

      wrapper.remove();
    },
  );
}

function setRouteCardState(card, collapsed) {
  card.classList.toggle("is-collapsed", collapsed);
  card.dataset.collapsed = collapsed ? "true" : "false";

  const button = card.querySelector(
    "[data-works-visit-routes-toggle]",
  );

  if (!button) return;

  button.setAttribute(
    "aria-expanded",
    collapsed ? "false" : "true",
  );

  button.setAttribute(
    "aria-label",
    collapsed
      ? "Expandir rotas de visita"
      : "Minimizar rotas de visita",
  );

  button.title = collapsed
    ? "Expandir rotas"
    : "Minimizar rotas";

  button.innerHTML = `
    <span aria-hidden="true">
      ${collapsed ? "＋" : "−"}
    </span>
  `;
}

function hydrateRouteCardToggle(root) {
  const card = root.querySelector(
    [
      ".works-visit-routes-card",
      "[data-works-visit-routes-card]",
    ].join(","),
  );

  if (!card) return;

  const header = card.querySelector(":scope > header");

  if (!header) return;

  let button = header.querySelector(
    "[data-works-visit-routes-toggle]",
  );

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "works-visit-routes-toggle";
    button.dataset.worksVisitRoutesToggle = "true";

    const count = header.querySelector(":scope > span");

    if (count) {
      header.insertBefore(button, count);
    } else {
      header.appendChild(button);
    }
  }

  if (button.dataset.bound !== "true") {
    button.dataset.bound = "true";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const collapsed = !card.classList.contains(
        "is-collapsed",
      );

      setRouteCardState(card, collapsed);

      try {
        localStorage.setItem(
          ROUTE_CARD_STORAGE,
          collapsed ? "1" : "0",
        );
      } catch {
        // Mantém o comportamento sem persistência.
      }
    });
  }

  let collapsed = false;

  try {
    collapsed =
      localStorage.getItem(ROUTE_CARD_STORAGE) === "1";
  } catch {
    collapsed = card.classList.contains("is-collapsed");
  }

  setRouteCardState(card, collapsed);
}

function findInventorySheet(root = document) {
  const direct = root.querySelector(
    [
      "[data-inventory-sheet]",
      ".inventory-sheet",
      ".inventory-detail-sheet",
      ".inventory-natural-sheet",
      ".inventory-location-sheet",
    ].join(","),
  );

  if (direct) return direct;

  const heading = Array.from(
    root.querySelectorAll(
      "h2, h3, .card-title, header strong",
    ),
  ).find((element) =>
    /folha de inventario|inventario natural|inventario do local|itens do local/i
      .test(normalized(element.textContent)),
  );

  return heading?.closest(
    "section, article, .card, .panel, [data-card]",
  ) || null;
}

function inventorySelectionTrigger(target) {
  if (!(target instanceof Element)) return null;

  if (target.closest("[data-inventory-location-sheet]")) {
    return null;
  }

  return target.closest(
    [
      "[data-inventory-location]",
      "[data-location-id]",
      "[data-place-id]",
      "[data-inventory-place]",
      ".inventory-location",
      ".inventory-place",
      ".inventory-location-row",
      ".inventory-location-card",
      ".inventory-map-location",
      '[data-google-map="inventory"]',
      '[data-google-map="inventories"]',
      ".inventory-map",
    ].join(","),
  );
}

function lockInventorySheetHeight(sheet) {
  const host = sheet.parentElement;

  if (!host) return;

  inventoryTransitionHost = host;
  host.classList.add("inventory-transition-height-lock");
  host.style.setProperty(
    "--inventory-transition-height",
    `${Math.ceil(sheet.getBoundingClientRect().height)}px`,
  );
}

function releaseInventorySheetHeight() {
  const host = inventoryTransitionHost;

  if (!host) return;

  host.classList.remove("inventory-transition-height-lock");
  host.style.removeProperty("--inventory-transition-height");
  inventoryTransitionHost = null;
}

function animateInventorySheetOut(root = document) {
  const sheet = findInventorySheet(root);

  if (!sheet) return;

  sheet.dataset.inventoryLocationSheet = "true";
  lockInventorySheetHeight(sheet);

  sheet.classList.remove(
    "inventory-location-sheet-enter",
    "inventory-location-sheet-settled",
  );

  void sheet.offsetWidth;

  sheet.classList.add("inventory-location-sheet-exit");
}

function animateInventorySheetIn(root = document) {
  const sheet = findInventorySheet(root);

  if (!sheet) return false;

  sheet.dataset.inventoryLocationSheet = "true";
  sheet.classList.remove(
    "inventory-location-sheet-exit",
    "inventory-location-sheet-settled",
  );

  void sheet.offsetWidth;

  sheet.classList.add("inventory-location-sheet-enter");

  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;

    sheet.classList.remove(
      "inventory-location-sheet-enter",
      "inventory-location-sheet-exit",
    );

    sheet.classList.add("inventory-location-sheet-settled");
    releaseInventorySheetHeight();
  };

  sheet.addEventListener("animationend", finish, {
    once: true,
  });

  window.setTimeout(finish, 520);
  inventoryTransitionPending = false;

  return true;
}

function scheduleInventoryEnter() {
  window.clearTimeout(inventoryTransitionTimer);

  inventoryTransitionTimer = window.setTimeout(() => {
    if (currentPage(document) !== "inventario") return;

    animateInventorySheetIn(document);
  }, 190);
}

function installGlobalListeners() {
  if (globalListenersInstalled) return;

  globalListenersInstalled = true;

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (currentPage(document) !== "inventario") return;

      const trigger = inventorySelectionTrigger(event.target);

      if (!trigger) return;

      inventoryTransitionPending = true;
      animateInventorySheetOut(document);
      scheduleInventoryEnter();
    },
    true,
  );
}

function hydrateInventoryTransition(root) {
  if (currentPage(root) !== "inventario") return;

  const sheet = findInventorySheet(root);

  if (sheet) {
    sheet.dataset.inventoryLocationSheet = "true";
  }

  if (!inventoryTransitionPending) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animateInventorySheetIn(root);
    });
  });
}

export function hydrateMapInventoryInteractions(
  root = document,
) {
  installGlobalListeners();
  unwrapWorksMapSelection(root);
  hydrateRouteCardToggle(root);
  hydrateInventoryTransition(root);
}
