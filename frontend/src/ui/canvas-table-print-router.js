import { getDiagramModel } from "./diagram-canvas.js";

const PRINT_CLASS =
  "macroobras-canvas-table-router-printing";

const PRINT_DOCUMENT_SELECTOR =
  "[data-canvas-table-router-document]";

function readObject(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "{}",
    );

    return value && typeof value === "object"
      ? value
      : {};
  } catch {
    return {};
  }
}

function escapeHtml(value) {
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
    footer:
      stored.footer
      || stored.rodape
      || "Documento operacional emitido pelo MacroObras.",
  };
}

function fieldsOf(node) {
  if (Array.isArray(node?.fields)) {
    return node.fields.map((field) => ({
      name: String(
        field?.name
        ?? field?.label
        ?? field?.key
        ?? "Campo",
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

const EXTERNAL_FIELD_NAMES = new Set([
  "id externo",
  "identificador externo",
  "codigo externo",
  "external id",
  "external identifier",
  "external code",
  "id de integracao",
  "codigo de integracao",
  "referencia externa",
  "id okf",
  "codigo okf",
  "cpf",
  "cnpj",
  "matricula",
  "registro",
  "registro profissional",
  "email",
  "e-mail",
  "telefone",
].map(normalized));

function externalIdentifiers(node) {
  const result = [];

  const direct = [
    ["ID externo", node?.externalId],
    ["Identificador externo", node?.externalIdentifier],
    ["Código externo", node?.externalCode],
    ["ID de integração", node?.integrationId],
    ["Referência externa", node?.referenceId],
    ["CPF", node?.cpf],
    ["CNPJ", node?.cnpj],
    ["Matrícula", node?.registration],
    ["E-mail", node?.email],
  ];

  direct.forEach(([label, value]) => {
    if (String(value ?? "").trim()) {
      result.push(`${label}: ${String(value).trim()}`);
    }
  });

  fieldsOf(node).forEach((field) => {
    const name = normalized(field.name);
    const value = String(field.value ?? "").trim();

    if (
      value
      && EXTERNAL_FIELD_NAMES.has(name)
      && !result.some(
        (item) =>
          normalized(item).includes(normalized(value)),
      )
    ) {
      result.push(`${field.name}: ${value}`);
    }
  });

  return result.length
    ? result.join(" · ")
    : "—";
}

function additionalFields(node) {
  return fieldsOf(node)
    .filter(
      (field) =>
        !EXTERNAL_FIELD_NAMES.has(normalized(field.name))
        && String(field.value ?? "").trim(),
    )
    .map(
      (field) =>
        `${field.name}: ${String(field.value).trim()}`,
    )
    .join(" · ") || "—";
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

function nodeDescription(node) {
  return String(
    node?.description
    || node?.observations
    || node?.notes
    || node?.function
    || "—",
  );
}

function edgeSource(edge) {
  return String(
    edge?.from
    ?? edge?.fromId
    ?? edge?.source
    ?? "",
  );
}

function edgeTarget(edge) {
  return String(
    edge?.to
    ?? edge?.toId
    ?? edge?.target
    ?? "",
  );
}

function relationSummary(node, model, nodeById) {
  const edges = Array.isArray(model?.edges)
    ? model.edges
    : [];

  const descriptions = edges
    .filter((edge) => {
      const from = edgeSource(edge);
      const to = edgeTarget(edge);

      return from === node.id || to === node.id;
    })
    .map((edge) => {
      const from = edgeSource(edge);
      const to = edgeTarget(edge);
      const outgoing = from === node.id;
      const otherId = outgoing ? to : from;
      const other = nodeById.get(otherId);

      const label = String(
        edge?.label
        || edge?.description
        || edge?.kind
        || "relação",
      );

      return (
        `${outgoing ? "→" : "←"} `
        + `${nodeLabel(other || { id: otherId })} `
        + `(${label})`
      );
    });

  return descriptions.join("; ") || "—";
}

function modelFromCanvas(canvas) {
  const id = canvas.dataset.interactiveDiagram || "";
  const runtime = id ? getDiagramModel(id) : null;

  if (runtime?.nodes) {
    return {
      id,
      model: runtime,
    };
  }

  const script = canvas.querySelector(
    'script[type="application/json"]',
  );

  try {
    return {
      id,
      model: JSON.parse(
        script?.textContent || '{"nodes":[],"edges":[]}',
      ),
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
  const localCard = canvas.closest(
    ".card, article, section",
  );

  const local = localCard?.querySelector(
    [
      ":scope > h2",
      ":scope > h3",
      ":scope > header h2",
      ":scope > header h3",
      ":scope > header strong",
    ].join(","),
  )?.textContent?.trim();

  const page = document.querySelector(
    ".page-header h1, .page-heading h1, main h1",
  )?.textContent?.trim();

  if (
    local
    && page
    && normalized(local) !== normalized(page)
  ) {
    return `${page} — ${local}`;
  }

  return local || page || "Relatório do canvas";
}

function rowsFromModel(model) {
  const nodes = Array.isArray(model?.nodes)
    ? model.nodes
    : [];

  const nodeById = new Map(
    nodes.map((node) => [
      String(node.id || ""),
      node,
    ]),
  );

  return nodes.map((node, index) => ({
    order: index + 1,
    external: externalIdentifiers(node),
    internal: String(node.id || "—"),
    type: String(
      node.kind
      || node.type
      || node.category
      || "Item",
    ),
    title: nodeLabel(node),
    description: nodeDescription(node),
    fields: additionalFields(node),
    relations: relationSummary(
      node,
      model,
      nodeById,
    ),
  }));
}

function tableBody(rows) {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="8" class="canvas-table-empty">
          Nenhum item registrado no canvas.
        </td>
      </tr>
    `;
  }

  return rows.map((row) => `
    <tr>
      <td>${String(row.order).padStart(2, "0")}</td>
      <td>
        <strong>${escapeHtml(row.external)}</strong>
      </td>
      <td>
        <code>${escapeHtml(row.internal)}</code>
      </td>
      <td>${escapeHtml(row.type)}</td>
      <td>
        <strong>${escapeHtml(row.title)}</strong>
      </td>
      <td>${escapeHtml(row.description)}</td>
      <td>${escapeHtml(row.fields)}</td>
      <td>${escapeHtml(row.relations)}</td>
    </tr>
  `).join("");
}

function isPdfButton(target) {
  const button = target?.closest?.(
    "button, a, [role='button']",
  );

  if (!button) return null;

  const dataText = [
    button.dataset.message,
    button.dataset.action,
    button.dataset.export,
    button.dataset.format,
    button.dataset.pdf,
    button.dataset.exportPdf,
    button.dataset.printPdf,
  ].filter(Boolean).join(" ");

  const label = normalized(
    `${dataText} ${button.textContent || ""}`,
  );

  const explicit = button.matches(
    [
      "[data-canvas-report-button]",
      "[data-export-pdf]",
      "[data-print-pdf]",
      "[data-component-pdf]",
      "[data-message*='pdf' i]",
      "[data-action*='pdf' i]",
      "[data-format='pdf' i]",
    ].join(","),
  );

  const textual =
    label.includes("relatorio pdf")
    || label.includes("exportar em pdf")
    || label.includes("exportar / imprimir pdf")
    || label.includes("imprimir pdf")
    || label.includes("baixar pdf");

  return explicit || textual
    ? button
    : null;
}

function explicitCanvas(button) {
  const selectors = [
    button.dataset.printTarget,
    button.dataset.pdfTarget,
    button.dataset.exportTarget,
    button.dataset.componentTarget,
  ].filter(Boolean);

  const controlled = button.getAttribute("aria-controls");

  if (controlled) {
    selectors.push(`#${CSS.escape(controlled)}`);
  }

  for (const selector of selectors) {
    try {
      const target = document.querySelector(selector);
      const canvas = target?.matches?.(
        "[data-interactive-diagram]",
      )
        ? target
        : target?.querySelector?.(
          "[data-interactive-diagram]",
        );

      if (canvas) return canvas;
    } catch {
      // Seletor inválido: segue pela estrutura visual.
    }
  }

  return null;
}

function canvasForButton(button) {
  const explicit = explicitCanvas(button);

  if (explicit) return explicit;

  const local = button.closest(
    [
      "[data-print-component]",
      "[data-pdf-component]",
      ".interactive-diagram-card",
      ".card",
      ".panel",
      "article",
      "section",
    ].join(","),
  );

  const localCanvas = local?.querySelector?.(
    "[data-interactive-diagram]",
  );

  if (localCanvas) return localCanvas;

  const workspace = button.closest(
    ".workspace, main, [role='main']",
  ) || document.querySelector(
    ".workspace, main, [role='main']",
  );

  const candidates = Array.from(
    workspace?.querySelectorAll?.(
      "[data-interactive-diagram]",
    ) || [],
  ).filter(visible);

  if (candidates.length === 1) {
    return candidates[0];
  }

  const pageTitle = normalized(
    document.querySelector(
      ".page-header h1, .page-heading h1, main h1",
    )?.textContent,
  );

  if (pageTitle === "rh") {
    return (
      workspace?.querySelector?.(
        '[data-interactive-diagram="rh-main"]',
      )
      || candidates[0]
      || null
    );
  }

  return null;
}

export function printCanvasTable(canvas) {
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
  const now = new Date();
  const issuedAt = now.toLocaleString("pt-BR");

  document.querySelector(
    PRINT_DOCUMENT_SELECTOR,
  )?.remove();

  document.documentElement.classList.remove(
    "macroobras-component-pdf-printing",
    "macroobras-canvas-report-printing",
  );

  const root = document.createElement("section");
  root.dataset.canvasTableRouterDocument = "true";
  root.className =
    "macroobras-canvas-table-router-document";

  root.innerHTML = `
    <header class="canvas-table-router-letterhead">
      <div>
        <strong>${escapeHtml(brand.tradeName)}</strong>
        ${brand.legalName
          ? `<span>${escapeHtml(brand.legalName)}</span>`
          : ""}
        ${brand.cnpj
          ? `<small>CNPJ ${escapeHtml(brand.cnpj)}</small>`
          : ""}
      </div>

      <div>
        <small>RELATÓRIO TABULAR DE CANVAS</small>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(issuedAt)}</span>
      </div>
    </header>

    <div class="canvas-table-router-company">
      ${brand.address
        ? `<span>${escapeHtml(brand.address)}</span>`
        : ""}
      ${brand.phone
        ? `<span>${escapeHtml(brand.phone)}</span>`
        : ""}
      ${brand.email
        ? `<span>${escapeHtml(brand.email)}</span>`
        : ""}
      ${brand.responsible
        ? `<span>Responsável: ${escapeHtml(brand.responsible)}</span>`
        : ""}
    </div>

    <section class="canvas-table-router-summary">
      <div>
        <small>Canvas</small>
        <strong>${escapeHtml(canvasId || "—")}</strong>
      </div>
      <div>
        <small>Itens</small>
        <strong>${rows.length}</strong>
      </div>
      <div>
        <small>Relações</small>
        <strong>${edges.length}</strong>
      </div>
      <div>
        <small>Formato</small>
        <strong>Tabela plana</strong>
      </div>
    </section>

    <main>
      <table class="canvas-table-router-table">
        <colgroup>
          <col class="canvas-col-order">
          <col class="canvas-col-external">
          <col class="canvas-col-internal">
          <col class="canvas-col-type">
          <col class="canvas-col-title">
          <col class="canvas-col-description">
          <col class="canvas-col-fields">
          <col class="canvas-col-relations">
        </colgroup>

        <thead>
          <tr>
            <th>#</th>
            <th>Identificadores externos</th>
            <th>ID interno</th>
            <th>Tipo</th>
            <th>Item</th>
            <th>Descrição / função</th>
            <th>Campos e propriedades</th>
            <th>Relações</th>
          </tr>
        </thead>

        <tbody>
          ${tableBody(rows)}
        </tbody>
      </table>
    </main>

    <footer class="canvas-table-router-footer">
      <span>${escapeHtml(brand.footer)}</span>
      <strong>${escapeHtml(title)}</strong>
    </footer>
  `;

  document.body.appendChild(root);

  const oldTitle = document.title;
  document.title = `${title} — relatório tabular`;
  document.documentElement.classList.add(PRINT_CLASS);

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    document.documentElement.classList.remove(
      PRINT_CLASS,
    );

    root.remove();
    document.title = oldTitle;
  };

  window.addEventListener(
    "afterprint",
    cleanup,
    {
      once: true,
    },
  );

  window.setTimeout(
    () => window.print(),
    80,
  );

  window.setTimeout(
    cleanup,
    60000,
  );
}

function handleCanvasPdf(event) {
  const button = isPdfButton(event.target);

  if (!button) return;

  const canvas = canvasForButton(button);

  if (!canvas) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  printCanvasTable(canvas);
}

document.addEventListener(
  "click",
  handleCanvasPdf,
  true,
);

window.MacroObrasPrintCanvasTableReport =
  printCanvasTable;

window.MacroObrasResolveCanvasForPdf =
  canvasForButton;
