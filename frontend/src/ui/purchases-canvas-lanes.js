const PURCHASE_STAGES = [
  "Solicitação",
  "Aguardando autorização",
  "Autorizada",
  "Pedido emitido",
  "Aguardando entrega",
  "Entregue com foto",
];

const DRAFT_KEY =
  "macroobras.purchaseCanvasDraft";

const ROOT_SELECTOR =
  "[data-purchases-canvas-lanes]";

let observerInstalled = false;
let hydrationQueued = false;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function visible(element) {
  if (!element) return false;

  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== "none"
    && style.visibility !== "hidden"
    && rect.width > 0
    && rect.height > 0
  );
}

function pageIsPurchases() {
  const title = document.querySelector(
    ".page-header h1, .page-heading h1, main h1",
  )?.textContent;

  return normalize(title) === "compras";
}

function purchaseTable() {
  const tables = Array.from(
    document.querySelectorAll("main table"),
  ).filter(visible);

  return tables.find((table) => {
    const headings = Array.from(
      table.querySelectorAll("thead th"),
    ).map((cell) => normalize(cell.textContent));

    return (
      headings.some(
        (heading) =>
          heading.includes("solicitacao"),
      )
      && headings.some(
        (heading) =>
          heading === "estado"
          || heading.includes("status"),
      )
    );
  }) || null;
}

function tableLabels(table) {
  return Array.from(
    table.querySelectorAll(
      "thead tr:last-child th",
    ),
  ).map((cell, index) => (
    normalize(cell.textContent)
    || `coluna-${index + 1}`
  ));
}

function columnIndex(labels, terms) {
  return labels.findIndex((label) =>
    terms.some((term) => label.includes(term)),
  );
}

function cellText(cells, index) {
  if (index < 0) return "";

  return String(
    cells[index]?.textContent || "",
  )
    .replace(/\s+/g, " ")
    .trim();
}

function stageIndex(value) {
  const current = normalize(value);

  const index = PURCHASE_STAGES.findIndex(
    (stage) => normalize(stage) === current,
  );

  if (index >= 0) return index;

  if (current.includes("entregue")) return 5;
  if (current.includes("aguardando entrega")) return 4;
  if (current.includes("pedido")) return 3;
  if (current.includes("autorizada")) return 2;
  if (current.includes("autorizacao")) return 1;

  return 0;
}

function rowIdentifier(row, index) {
  const dataId = [
    row.dataset.purchaseId,
    row.dataset.flowId,
    row.dataset.id,
  ].find(Boolean);

  if (dataId) return dataId;

  const action = row.querySelector(
    "[data-purchase-id], [data-flow-id]",
  );

  return (
    action?.dataset.purchaseId
    || action?.dataset.flowId
    || `purchase-row-${index + 1}`
  );
}

function cloneActions(row) {
  const source = row.querySelector(
    [
      "button[data-message]",
      "button[data-action]",
      "button",
      "a[role='button']",
      "a.btn",
    ].join(","),
  );

  if (!source) return null;

  const clone = source.cloneNode(true);

  clone.classList.add(
    "purchase-canvas-card-action",
  );

  return clone;
}

function parseRows(table) {
  const labels = tableLabels(table);

  const indexes = {
    order: columnIndex(labels, ["#", "numero"]),
    request: columnIndex(
      labels,
      ["solicitacao", "item"],
    ),
    work: columnIndex(labels, ["obra"]),
    requester: columnIndex(
      labels,
      ["solicitante", "requerente"],
    ),
    quantity: columnIndex(
      labels,
      ["quantidade", "qtd"],
    ),
    expected: columnIndex(
      labels,
      ["previsto", "estimado"],
    ),
    spent: columnIndex(
      labels,
      ["gastos", "pago", "cotado"],
    ),
    state: columnIndex(
      labels,
      ["estado", "status"],
    ),
    file: columnIndex(
      labels,
      ["arquivo", "recibo", "comprovante"],
    ),
  };

  return Array.from(
    table.querySelectorAll("tbody tr"),
  ).map((row, index) => {
    const cells = Array.from(row.children);
    const state = cellText(cells, indexes.state);

    return {
      id: rowIdentifier(row, index),
      order:
        cellText(cells, indexes.order)
        || String(index + 1).padStart(2, "0"),
      request:
        cellText(cells, indexes.request)
        || "Compra sem identificação",
      work:
        cellText(cells, indexes.work)
        || "Sem obra vinculada",
      requester:
        cellText(cells, indexes.requester)
        || "Sem solicitante",
      quantity:
        cellText(cells, indexes.quantity)
        || "—",
      expected:
        cellText(cells, indexes.expected)
        || "—",
      spent:
        cellText(cells, indexes.spent)
        || "—",
      state:
        state || PURCHASE_STAGES[0],
      file:
        cellText(cells, indexes.file)
        || "Sem arquivo",
      stage: stageIndex(state),
      action: cloneActions(row),
    };
  });
}

function readDraft() {
  try {
    const draft = JSON.parse(
      sessionStorage.getItem(DRAFT_KEY)
      || "null",
    );

    return (
      draft
      && typeof draft === "object"
    )
      ? draft
      : null;
  } catch {
    return null;
  }
}

function writeDraft(draft) {
  if (!draft) {
    sessionStorage.removeItem(DRAFT_KEY);
    return;
  }

  sessionStorage.setItem(
    DRAFT_KEY,
    JSON.stringify(draft),
  );
}

function sourceHost(table) {
  return (
    table.closest(
      [
        "[data-purchases-report]",
        ".purchase-report",
        ".table-card",
        ".card",
        "article",
        "section",
      ].join(","),
    )
    || table.parentElement
  );
}

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

function stageHeaders() {
  const header = createElement(
    "div",
    "purchases-canvas-stage-header",
  );

  header.appendChild(
    createElement(
      "div",
      "purchases-canvas-lane-axis",
      "Linha",
    ),
  );

  PURCHASE_STAGES.forEach(
    (stage, index) => {
      const cell = createElement(
        "div",
        "purchases-canvas-stage-title",
      );

      cell.dataset.stageIndex = String(index);
      cell.appendChild(
        createElement(
          "span",
          "",
          String(index + 1).padStart(2, "0"),
        ),
      );
      cell.appendChild(
        createElement(
          "strong",
          "",
          stage,
        ),
      );

      header.appendChild(cell);
    },
  );

  return header;
}

function metric(label, value) {
  const item = createElement(
    "div",
    "purchase-canvas-card-metric",
  );

  item.appendChild(
    createElement("small", "", label),
  );
  item.appendChild(
    createElement("strong", "", value),
  );

  return item;
}

function purchaseCard(item) {
  const card = createElement(
    "article",
    "purchase-canvas-card",
  );

  card.dataset.purchaseId = item.id;
  card.dataset.purchaseStage = String(item.stage);

  const head = createElement(
    "header",
    "purchase-canvas-card-head",
  );

  const identity = createElement("div");

  identity.appendChild(
    createElement(
      "small",
      "",
      `COMPRA ${item.order}`,
    ),
  );
  identity.appendChild(
    createElement(
      "strong",
      "",
      item.request,
    ),
  );

  head.appendChild(identity);
  head.appendChild(
    createElement(
      "span",
      "purchase-canvas-state",
      item.state,
    ),
  );

  card.appendChild(head);

  const work = createElement(
    "div",
    "purchase-canvas-card-work",
  );

  work.appendChild(
    createElement("small", "", "OBRA"),
  );
  work.appendChild(
    createElement("strong", "", item.work),
  );

  card.appendChild(work);

  const metrics = createElement(
    "div",
    "purchase-canvas-card-metrics",
  );

  metrics.appendChild(
    metric("Solicitante", item.requester),
  );
  metrics.appendChild(
    metric("Quantidade", item.quantity),
  );
  metrics.appendChild(
    metric("Previsto", item.expected),
  );
  metrics.appendChild(
    metric("Gastos", item.spent),
  );

  card.appendChild(metrics);

  const footer = createElement(
    "footer",
    "purchase-canvas-card-footer",
  );

  footer.appendChild(
    createElement(
      "span",
      "purchase-canvas-file",
      item.file,
    ),
  );

  if (item.action) {
    footer.appendChild(item.action);
  }

  card.appendChild(footer);

  return card;
}

function laneForItem(item, laneIndex) {
  const lane = createElement(
    "section",
    "purchases-canvas-lane",
  );

  lane.dataset.purchaseLane = item.id;
  lane.style.setProperty(
    "--purchase-stage",
    String(item.stage),
  );

  const axis = createElement(
    "aside",
    "purchases-canvas-lane-number",
  );

  axis.appendChild(
    createElement(
      "small",
      "",
      "LINHA",
    ),
  );
  axis.appendChild(
    createElement(
      "strong",
      "",
      String(laneIndex + 1).padStart(2, "0"),
    ),
  );

  lane.appendChild(axis);

  PURCHASE_STAGES.forEach(
    (_stage, stage) => {
      const cell = createElement(
        "div",
        "purchases-canvas-lane-cell",
      );

      cell.dataset.stageIndex = String(stage);

      if (stage === item.stage) {
        cell.appendChild(
          purchaseCard(item),
        );
      }

      lane.appendChild(cell);
    },
  );

  return lane;
}

function draftLane(index) {
  const lane = createElement(
    "section",
    "purchases-canvas-lane is-draft",
  );

  lane.dataset.purchaseDraftLane = "true";
  lane.style.setProperty(
    "--purchase-stage",
    "0",
  );

  const axis = createElement(
    "aside",
    "purchases-canvas-lane-number",
  );

  axis.appendChild(
    createElement("small", "", "LINHA"),
  );
  axis.appendChild(
    createElement(
      "strong",
      "",
      String(index + 1).padStart(2, "0"),
    ),
  );

  lane.appendChild(axis);

  PURCHASE_STAGES.forEach(
    (_stage, stage) => {
      const cell = createElement(
        "div",
        "purchases-canvas-lane-cell",
      );

      cell.dataset.stageIndex = String(stage);

      if (stage === 0) {
        const card = createElement(
          "article",
          "purchase-canvas-card is-draft",
        );

        const head = createElement(
          "header",
          "purchase-canvas-card-head",
        );

        const identity = createElement("div");

        identity.appendChild(
          createElement(
            "small",
            "",
            "NOVA COMPRA",
          ),
        );
        identity.appendChild(
          createElement(
            "strong",
            "",
            "Compra em preparação",
          ),
        );

        head.appendChild(identity);
        head.appendChild(
          createElement(
            "span",
            "purchase-canvas-state",
            "Solicitação",
          ),
        );

        card.appendChild(head);
        card.appendChild(
          createElement(
            "p",
            "purchase-canvas-draft-copy",
            "Preencha os dados do cadastro aberto para concluir esta linha.",
          ),
        );

        const remove = createElement(
          "button",
          "purchase-canvas-draft-remove",
          "Remover linha",
        );

        remove.type = "button";
        remove.dataset.purchaseDraftRemove = "true";

        card.appendChild(remove);
        cell.appendChild(card);
      }

      lane.appendChild(cell);
    },
  );

  return lane;
}

function canvasHeader(items) {
  const header = createElement(
    "header",
    "purchases-canvas-heading",
  );

  const copy = createElement("div");

  copy.appendChild(
    createElement(
      "small",
      "",
      "FLUXO OPERACIONAL",
    ),
  );
  copy.appendChild(
    createElement(
      "h2",
      "",
      "Canvas de compras",
    ),
  );
  copy.appendChild(
    createElement(
      "p",
      "",
      "Cada compra ocupa uma linha própria e avança horizontalmente pelas etapas.",
    ),
  );

  const counter = createElement(
    "div",
    "purchases-canvas-counter",
  );

  counter.appendChild(
    createElement(
      "strong",
      "",
      String(items.length).padStart(2, "0"),
    ),
  );
  counter.appendChild(
    createElement(
      "span",
      "",
      items.length === 1
        ? "linha ativa"
        : "linhas ativas",
    ),
  );

  header.appendChild(copy);
  header.appendChild(counter);

  return header;
}

function buildCanvas(table, items) {
  const host = sourceHost(table);

  if (!host) return;

  host.querySelector(ROOT_SELECTOR)?.remove();

  const root = createElement(
    "section",
    "purchases-canvas-lanes",
  );

  root.dataset.purchasesCanvasLanes = "true";

  root.appendChild(canvasHeader(items));

  const viewport = createElement(
    "div",
    "purchases-canvas-viewport",
  );

  const grid = createElement(
    "div",
    "purchases-canvas-grid",
  );

  grid.appendChild(stageHeaders());

  items.forEach((item, index) => {
    grid.appendChild(
      laneForItem(item, index),
    );
  });

  const draft = readDraft();

  if (draft) {
    if (
      items.length > Number(draft.baseline || 0)
    ) {
      writeDraft(null);
    } else {
      grid.appendChild(
        draftLane(items.length),
      );
    }
  }

  if (!items.length && !readDraft()) {
    const empty = createElement(
      "div",
      "purchases-canvas-empty",
    );

    empty.appendChild(
      createElement(
        "strong",
        "",
        "Nenhuma compra registrada",
      ),
    );
    empty.appendChild(
      createElement(
        "span",
        "",
        "Use “Nova compra avulsa” para criar a primeira linha.",
      ),
    );

    grid.appendChild(empty);
  }

  viewport.appendChild(grid);
  root.appendChild(viewport);

  table.classList.add(
    "purchases-canvas-source-table",
  );

  host.classList.add(
    "has-purchases-canvas",
  );

  table.insertAdjacentElement(
    "beforebegin",
    root,
  );
}

function hydrate() {
  hydrationQueued = false;

  if (!pageIsPurchases()) return;

  const table = purchaseTable();

  if (!table) return;

  const items = parseRows(table);
  buildCanvas(table, items);
}

function queueHydrate() {
  if (hydrationQueued) return;

  hydrationQueued = true;

  requestAnimationFrame(() => {
    requestAnimationFrame(hydrate);
  });
}

function currentRowCount() {
  return purchaseTable()?.querySelectorAll(
    "tbody tr",
  ).length || 0;
}

function isNewPurchaseButton(target) {
  const button = target?.closest?.(
    "button, a, [role='button']",
  );

  if (!button) return null;

  const label = normalize(
    [
      button.textContent,
      button.dataset.message,
      button.dataset.action,
    ].filter(Boolean).join(" "),
  );

  return (
    label.includes("nova compra")
    || label.includes("iniciar compra")
  )
    ? button
    : null;
}

function handleNewPurchase(event) {
  if (!pageIsPurchases()) return;

  const button = isNewPurchaseButton(
    event.target,
  );

  if (!button) return;

  const existing = readDraft();

  if (!existing) {
    writeDraft({
      id: `draft-${Date.now().toString(36)}`,
      baseline: currentRowCount(),
      createdAt: new Date().toISOString(),
    });
  }

  /*
   * O evento original não é interrompido.
   * O formulário ou modal existente continua abrindo.
   */
  queueHydrate();
}

function handleDraftRemove(event) {
  const button = event.target?.closest?.(
    "[data-purchase-draft-remove]",
  );

  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  writeDraft(null);
  queueHydrate();
}

function installObserver() {
  if (observerInstalled) return;

  observerInstalled = true;

  document.addEventListener(
    "click",
    handleNewPurchase,
    true,
  );

  document.addEventListener(
    "click",
    handleDraftRemove,
    true,
  );

  const observer = new MutationObserver(
    queueHydrate,
  );

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
    },
  );

  queueHydrate();
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

window.MacroObrasHydratePurchasesCanvas =
  queueHydrate;
