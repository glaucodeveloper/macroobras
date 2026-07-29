import { getDiagramModel } from "./diagram-canvas.js";

const REPORT_MARKER = "canvas-report-table-v1";
const PRINT_RECORDS_KEY = "macroobras.printRecords";
const PRINT_SEQUENCE_KEY = "macroobras.canvasPrintSequence";

function readObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function letterhead() {
  const customization = {
    ...readObject("macroobras.customization"),
    ...readObject("macroobras.stationCustomization"),
  };

  const stored = {
    ...readObject("macroobras.letterhead"),
    ...readObject("macroobras.letterheadSettings"),
    ...readObject("macroobras.printLetterhead"),
  };

  return {
    tradeName:
      stored.tradeName
      || stored.nomeFantasia
      || customization.stationName
      || "ERP da construção Maximus Empreendimentos",
    legalName:
      stored.legalName
      || stored.razaoSocial
      || "",
    cnpj: stored.cnpj || "",
    address:
      stored.address
      || stored.endereco
      || "",
    phone:
      stored.phone
      || stored.telefone
      || "",
    email: stored.email || "",
    responsible:
      stored.responsible
      || stored.responsavel
      || "",
    documentCode:
      stored.canvasDocumentCode
      || stored.codigoRelatorioCanvas
      || stored.documentCode
      || "CANVAS-REL",
    footer:
      stored.footer
      || stored.rodape
      || "Documento operacional emitido pelo MacroObras.",
  };
}

function nextRecord(title, canvasId) {
  const current = Number(
    localStorage.getItem(PRINT_SEQUENCE_KEY) || 0,
  );

  const sequence = current + 1;
  localStorage.setItem(
    PRINT_SEQUENCE_KEY,
    String(sequence),
  );

  const now = new Date();
  const dateCode = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const brand = letterhead();
  const record = {
    id: `canvas-print-${Date.now().toString(36)}`,
    number:
      `${brand.documentCode}-${dateCode}-`
      + String(sequence).padStart(4, "0"),
    type: "canvas-table-report",
    title,
    canvasId,
    dateLabel: now.toLocaleString("pt-BR"),
    createdAt: now.toISOString(),
    userName:
      readObject("macroobras.currentUser").name
      || readObject("macroobras.adminUser").name
      || "Administrador",
  };

  const records = readArray(PRINT_RECORDS_KEY);
  localStorage.setItem(
    PRINT_RECORDS_KEY,
    JSON.stringify([record, ...records].slice(0, 500)),
  );

  return record;
}

function fieldEntries(node) {
  if (Array.isArray(node?.fields)) {
    return node.fields.map((field) => ({
      name: String(
        field?.name
        ?? field?.label
        ?? field?.key
        ?? "",
      ),
      value:
        field?.value
        ?? field?.content
        ?? field?.text
        ?? "",
    }));
  }

  if (node?.fields && typeof node.fields === "object") {
    return Object.entries(node.fields).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );
  }

  return [];
}

function externalIdentifier(node) {
  const direct = [
    node?.externalId,
    node?.externalIdentifier,
    node?.externalCode,
    node?.integrationId,
    node?.referenceId,
  ].find((value) => String(value ?? "").trim());

  if (direct) return String(direct).trim();

  const names = new Set([
    "id externo",
    "identificador externo",
    "codigo externo",
    "código externo",
    "external id",
    "external identifier",
    "external code",
    "id de integracao",
    "id de integração",
    "codigo de integracao",
    "código de integração",
    "referencia externa",
    "referência externa",
    "id okf",
    "codigo okf",
    "código okf",
  ].map(normalized));

  const entry = fieldEntries(node).find(
    (field) =>
      names.has(normalized(field.name))
      && String(field.value ?? "").trim(),
  );

  return entry
    ? String(entry.value).trim()
    : "—";
}

function propertyValue(node, keys, fieldNames = []) {
  for (const key of keys) {
    const value = node?.[key];

    if (
      value !== undefined
      && value !== null
      && String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  const names = new Set(fieldNames.map(normalized));
  const entry = fieldEntries(node).find(
    (field) =>
      names.has(normalized(field.name))
      && String(field.value ?? "").trim(),
  );

  return entry
    ? String(entry.value).trim()
    : "";
}

function nodeLabel(node) {
  return String(
    node?.title
    || node?.name
    || node?.label
    || node?.description
    || node?.id
    || "Item",
  );
}

function relationSummary(node, model, nodeById) {
  const edges = Array.isArray(model?.edges)
    ? model.edges
    : [];

  const descriptions = edges
    .filter(
      (edge) =>
        edge?.fromId === node.id
        || edge?.toId === node.id,
    )
    .map((edge) => {
      const outgoing = edge.fromId === node.id;
      const otherId = outgoing
        ? edge.toId
        : edge.fromId;

      const other = nodeById.get(otherId);
      const direction = outgoing ? "→" : "←";
      const label = String(
        edge.label
        || edge.description
        || edge.kind
        || "relação",
      );

      return `${direction} ${nodeLabel(other || { id: otherId })} (${label})`;
    });

  return descriptions.join("; ") || "—";
}

function modelFromCanvas(canvas) {
  const id = canvas.dataset.interactiveDiagram || "";

  const runtimeModel = id
    ? getDiagramModel(id)
    : null;

  if (runtimeModel?.nodes) {
    return {
      id,
      model: runtimeModel,
    };
  }

  const script = canvas.querySelector(
    'script[type="application/json"]',
  );

  if (!script?.textContent) {
    return {
      id,
      model: {
        nodes: [],
        edges: [],
      },
    };
  }

  try {
    return {
      id,
      model: JSON.parse(script.textContent),
    };
  } catch {
    return {
      id,
      model: {
        nodes: [],
        edges: [],
      },
    };
  }
}

function reportTitle(canvas) {
  const card = canvas.closest(
    ".card, article, section",
  );

  const localTitle = card?.querySelector(
    ":scope > h2, :scope > header h2, :scope > header strong",
  )?.textContent?.trim();

  const pageTitle = document.querySelector(
    ".page-header h1, .page-heading h1, main h1",
  )?.textContent?.trim();

  if (localTitle && pageTitle && localTitle !== pageTitle) {
    return `${pageTitle} — ${localTitle}`;
  }

  return localTitle || pageTitle || "Relatório do canvas";
}

function rowsFromModel(model) {
  const nodes = Array.isArray(model?.nodes)
    ? model.nodes
    : [];

  const nodeById = new Map(
    nodes.map((node) => [node.id, node]),
  );

  return nodes.map((node, index) => ({
    order: index + 1,
    externalId: externalIdentifier(node),
    internalId: String(node.id || "—"),
    kind: String(
      node.kind
      || node.type
      || node.category
      || "Item",
    ),
    title: nodeLabel(node),
    description: propertyValue(
      node,
      ["description", "observations", "notes", "function"],
      [
        "Descrição",
        "Observações",
        "Observacao",
        "Função",
        "Funcao",
      ],
    ) || "—",
    date: propertyValue(
      node,
      ["date", "startDate", "scheduledDate", "day"],
      [
        "Data",
        "Data inicial",
        "Dia",
        "Data programada",
      ],
    ) || "—",
    quantity: propertyValue(
      node,
      ["quantity", "amount", "units"],
      ["Quantidade", "Qtd", "Unidades"],
    ) || "—",
    percentage: propertyValue(
      node,
      ["percentage", "progress", "percent"],
      ["Percentual", "Porcentagem", "Progresso"],
    ) || "—",
    requester: propertyValue(
      node,
      ["requester", "requiredBy", "responsible"],
      ["Requerente", "Solicitante", "Responsável"],
    ) || "—",
    requirements: propertyValue(
      node,
      ["requirements", "requirement", "prerequisites"],
      ["Requisitos", "Requisito", "Pré-requisitos"],
    ) || "—",
    relations: relationSummary(
      node,
      model,
      nodeById,
    ),
  }));
}

function tableRows(rows) {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="12" class="canvas-report-empty">
          Nenhum item registrado no canvas.
        </td>
      </tr>
    `;
  }

  return rows.map((row) => `
    <tr>
      <td>${String(row.order).padStart(2, "0")}</td>
      <td><strong>${htmlEscape(row.externalId)}</strong></td>
      <td><code>${htmlEscape(row.internalId)}</code></td>
      <td>${htmlEscape(row.kind)}</td>
      <td><strong>${htmlEscape(row.title)}</strong></td>
      <td>${htmlEscape(row.description)}</td>
      <td>${htmlEscape(row.date)}</td>
      <td>${htmlEscape(row.quantity)}</td>
      <td>${htmlEscape(row.percentage)}</td>
      <td>${htmlEscape(row.requester)}</td>
      <td>${htmlEscape(row.requirements)}</td>
      <td>${htmlEscape(row.relations)}</td>
    </tr>
  `).join("");
}

function cleanupPrintDocument(documentRoot, oldTitle) {
  document.documentElement.classList.remove(
    "macroobras-printing",
    "macroobras-canvas-report-printing",
  );

  documentRoot?.remove();
  document.title = oldTitle;
}

export function printCanvasTableReport(canvas) {
  if (!canvas) return;

  const {
    id: canvasId,
    model,
  } = modelFromCanvas(canvas);

  const title = reportTitle(canvas);
  const rows = rowsFromModel(model);
  const edges = Array.isArray(model?.edges)
    ? model.edges
    : [];

  const brand = letterhead();
  const record = nextRecord(title, canvasId);

  document.querySelector(
    "[data-macroobras-print-document]",
  )?.remove();

  const documentRoot = document.createElement("section");
  documentRoot.dataset.macroobrasPrintDocument = "true";
  documentRoot.dataset.canvasReport = REPORT_MARKER;
  documentRoot.className =
    "macroobras-print-document canvas-report-document";

  documentRoot.innerHTML = `
    <header class="print-letterhead canvas-report-letterhead">
      <div class="print-brand">
        <img
          src="./brand/logo_macroobras_ref.png"
          alt=""
        >
        <div>
          <strong>${htmlEscape(brand.tradeName)}</strong>
          ${brand.legalName
            ? `<span>${htmlEscape(brand.legalName)}</span>`
            : ""}
          ${brand.cnpj
            ? `<small>CNPJ ${htmlEscape(brand.cnpj)}</small>`
            : ""}
        </div>
      </div>

      <div class="print-document-id">
        <small>${htmlEscape(brand.documentCode)}</small>
        <strong>${htmlEscape(record.number)}</strong>
        <span>${htmlEscape(record.dateLabel)}</span>
      </div>
    </header>

    <div class="print-company-details">
      ${brand.address
        ? `<span>${htmlEscape(brand.address)}</span>`
        : ""}
      ${brand.phone
        ? `<span>${htmlEscape(brand.phone)}</span>`
        : ""}
      ${brand.email
        ? `<span>${htmlEscape(brand.email)}</span>`
        : ""}
      ${brand.responsible
        ? `<span>Responsável: ${htmlEscape(brand.responsible)}</span>`
        : ""}
    </div>

    <main>
      <section class="canvas-report-heading">
        <div>
          <small>Relatório tabular de canvas</small>
          <h1>${htmlEscape(title)}</h1>
          <p>
            Representação plana dos itens, propriedades,
            identificadores e relações registrados no canvas.
          </p>
        </div>

        <dl>
          <div>
            <dt>Canvas</dt>
            <dd>${htmlEscape(canvasId || "—")}</dd>
          </div>
          <div>
            <dt>Itens</dt>
            <dd>${rows.length}</dd>
          </div>
          <div>
            <dt>Relações</dt>
            <dd>${edges.length}</dd>
          </div>
          <div>
            <dt>Emitido por</dt>
            <dd>${htmlEscape(record.userName)}</dd>
          </div>
        </dl>
      </section>

      <section class="canvas-report-table-section">
        <table>
          <colgroup>
            <col class="col-order">
            <col class="col-external">
            <col class="col-internal">
            <col class="col-kind">
            <col class="col-title">
            <col class="col-description">
            <col class="col-date">
            <col class="col-quantity">
            <col class="col-percentage">
            <col class="col-requester">
            <col class="col-requirements">
            <col class="col-relations">
          </colgroup>

          <thead>
            <tr>
              <th>#</th>
              <th>Identificador externo</th>
              <th>ID interno</th>
              <th>Tipo</th>
              <th>Item</th>
              <th>Descrição / função</th>
              <th>Data</th>
              <th>Qtd.</th>
              <th>%</th>
              <th>Requerente</th>
              <th>Requisitos</th>
              <th>Relações</th>
            </tr>
          </thead>

          <tbody>
            ${tableRows(rows)}
          </tbody>
        </table>
      </section>
    </main>

    <footer class="print-footer canvas-report-footer">
      <span>${htmlEscape(brand.footer)}</span>
      <strong>${htmlEscape(record.number)}</strong>
    </footer>
  `;

  document.body.appendChild(documentRoot);

  const oldTitle = document.title;
  document.title = `${title} — ${record.number}`;

  document.documentElement.classList.add(
    "macroobras-printing",
    "macroobras-canvas-report-printing",
  );

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    cleanupPrintDocument(documentRoot, oldTitle);
  };

  window.addEventListener("afterprint", cleanup, {
    once: true,
  });

  window.setTimeout(() => {
    window.print();
  }, 60);

  window.setTimeout(cleanup, 60000);
}

function installButton(canvas) {
  if (canvas.dataset.canvasReportReady === "true") {
    return;
  }

  canvas.dataset.canvasReportReady = "true";

  const card = canvas.closest(
    ".card, article, section",
  );

  if (!card) return;

  let toolbar = card.querySelector(
    ":scope > [data-canvas-report-toolbar]",
  );

  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "canvas-report-toolbar";
    toolbar.dataset.canvasReportToolbar = "true";

    const heading = card.querySelector(
      ":scope > h2, :scope > header",
    );

    if (heading) {
      heading.insertAdjacentElement(
        "afterend",
        toolbar,
      );
    } else {
      card.insertBefore(toolbar, canvas);
    }
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn secondary canvas-report-button";
  button.dataset.canvasReportButton = "true";
  button.textContent = "Relatório PDF";

  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      printCanvasTableReport(canvas);
    },
    true,
  );

  toolbar.appendChild(button);
}

export function hydrateCanvasReportPrint(
  root = document,
) {
  root.querySelectorAll(
    "[data-interactive-diagram]",
  ).forEach(installButton);
}

function installObserver() {
  hydrateCanvasReportPrint(document);

  const observer = new MutationObserver(() => {
    hydrateCanvasReportPrint(document);
  });

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
    },
  );
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

window.MacroObrasPrintCanvasReport =
  printCanvasTableReport;
