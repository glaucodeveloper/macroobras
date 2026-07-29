const CARD = ".purchase-canvas-card:not(.is-draft)";
const TABLE = ".purchases-canvas-source-table";
const ROOT = "[data-purchase-card-floating-menu]";
let queued = false;
let active = null;

const norm = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const text = (root, selector, fallback = "—") =>
  String(root.querySelector(selector)?.textContent || "")
    .replace(/\s+/g, " ")
    .trim() || fallback;

function el(tag, className = "", value = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value) node.textContent = value;
  return node;
}

function purchasesPage() {
  return norm(document.querySelector(
    ".page-header h1, .page-heading h1, main h1",
  )?.textContent) === "compras";
}

function rowFor(card) {
  const cards = [...document.querySelectorAll(CARD)];
  const rows = [...document.querySelectorAll(`${TABLE} tbody tr`)];
  return rows[cards.indexOf(card)] || null;
}

function sourceActions(card) {
  const row = rowFor(card);
  if (!row) return [];

  return [...row.querySelectorAll([
    "button[data-message]",
    "button[data-action]",
    "a[data-message]",
    "a[role='button']",
    "a.btn",
  ].join(","))].map((source) => {
    const clone = source.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("purchase-floating-action", "is-source-action");
    if (clone.tagName === "BUTTON") clone.type = "button";
    return clone;
  });
}

function closeDrawer() {
  document.querySelector(ROOT)?.remove();
  document.body.classList.remove("has-purchase-floating-menu");
  active?.classList.remove("is-floating-menu-open");
  active = null;
}

function addMetric(list, label, value) {
  const item = el("div");
  item.append(el("dt", "", label), el("dd", "", value));
  list.appendChild(item);
}

function openDrawer(card) {
  closeDrawer();
  active = card;
  card.classList.add("is-floating-menu-open");

  const backdrop = el("div", "purchase-floating-backdrop");
  backdrop.dataset.purchaseCardFloatingMenu = "true";

  const drawer = el("aside", "purchase-card-floating-menu");
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-label", "Informações e ações da compra");

  const header = el("header", "purchase-floating-header");
  const identity = el("div");
  identity.append(
    el("small", "", text(card, ".purchase-canvas-card-head small", "COMPRA")),
    el("h2", "", text(card, ".purchase-canvas-card-head strong", "Compra")),
  );

  const status = el(
    "span",
    "purchase-floating-status",
    text(card, ".purchase-canvas-state", "Solicitação"),
  );

  const close = el("button", "purchase-floating-close", "×");
  close.type = "button";
  close.dataset.purchaseFloatingClose = "true";
  close.setAttribute("aria-label", "Fechar detalhes da compra");
  header.append(identity, status, close);

  const work = el("section", "purchase-floating-work");
  work.append(
    el("small", "", "OBRA"),
    el("strong", "", text(card, ".purchase-canvas-card-work strong", "Sem obra vinculada")),
  );

  const content = el("div", "purchase-floating-content");
  const metrics = el("dl", "purchase-floating-metrics");
  card.querySelectorAll(".purchase-canvas-card-metric").forEach((metric) => {
    addMetric(metrics, text(metric, "small", "Informação"), text(metric, "strong"));
  });
  content.appendChild(metrics);

  const file = el("section", "purchase-floating-file");
  file.append(
    el("small", "", "ARQUIVO"),
    el("strong", "", text(card, ".purchase-canvas-file", "Sem arquivo")),
  );
  content.appendChild(file);

  const actions = el("footer", "purchase-floating-actions");
  const originals = sourceActions(card);
  if (originals.length) {
    originals.forEach((button) => actions.appendChild(button));
  } else {
    const fallback = el("button", "purchase-floating-action", "Abrir fluxo de compras");
    fallback.type = "button";
    fallback.dataset.message = "navigate";
    fallback.dataset.route = "admin-purchases";
    actions.appendChild(fallback);
  }

  const inventory = el(
    "button",
    "purchase-floating-action is-inventory-action",
    "Levar ao inventário",
  );
  inventory.type = "button";
  inventory.dataset.message = "navigate";
  inventory.dataset.route = "admin-inventory";
  actions.appendChild(inventory);

  drawer.append(header, work, content, actions);
  backdrop.appendChild(drawer);
  document.body.appendChild(backdrop);
  document.body.classList.add("has-purchase-floating-menu");
  close.focus({ preventScroll: true });
}

function hydrate() {
  queued = false;
  if (!purchasesPage()) {
    closeDrawer();
    return;
  }

  document.querySelectorAll(CARD).forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-haspopup", "dialog");
  });
}

function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => requestAnimationFrame(hydrate));
}

document.addEventListener("click", (event) => {
  if (
    event.target.closest("[data-purchase-floating-close]")
    || (event.target.matches(ROOT) && !event.target.closest(".purchase-card-floating-menu"))
  ) {
    event.preventDefault();
    closeDrawer();
    return;
  }

  if (!purchasesPage()) return;
  const card = event.target.closest(CARD);
  if (!card || event.target.closest("button, a, input, select, textarea, label")) return;
  event.preventDefault();
  openDrawer(card);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector(ROOT)) {
    closeDrawer();
    return;
  }
  const card = event.target.closest?.(CARD);
  if (!card || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  openDrawer(card);
});

new MutationObserver(queue).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", queue, { once: true });
} else {
  queue();
}

window.MacroObrasPurchaseFloatingMenu = { hydrate: queue, close: closeDrawer };
