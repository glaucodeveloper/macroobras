import { getDiagramModel } from "./diagram-canvas.js";

const PRINT_CLASS =
  "macroobras-graph-ghost-table-printing";

const GHOST_SELECTOR =
  "[data-macroobras-graph-ghost-report]";

const PDF_BUTTON_SELECTOR = [
  "button",
  "a",
  "[role='button']",
].join(",");

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

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function isVisible(element) {
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

function isPdfButton(target) {
  const button = target?.closest?.(
    PDF_BUTTON_SELECTOR,
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
      "[data-graph-pdf]",
      "[data-canvas-report-button]",
      "[data-export-pdf]",
      "[data-print-pdf]",
      "[data-component-pdf]",
      "[data-message*='pdf' i]",
      "[data-action*='pdf' i]",
      "[data-format='pdf' i]",
    ].join(","),
  );

  const textual = [
    "relatorio pdf",
    "exportar pdf",
    "exportar em pdf",
    "exportar / imprimir pdf",
    "imprimir pdf",
    "baixar pdf",
    "salvar como pdf",
  ].some((term) => label.includes(term));

  return explicit || textual
    ? button
    : null;
}

function explicitGraph(button) {
  const selectors = [
    button.dataset.graphTarget,
    button.dataset.printTarget,
    button.dataset.pdfTarget,
    button.dataset.exportTarget,
    button.dataset.componentTarget,
  ].filter(Boolean);

  const controlled = button.getAttribute(
    "aria-controls",
  );

  if (controlled) {
    selectors.push(`#${CSS.escape(controlled)}`);
  }

  for (const selector of selectors) {
    try {
      const target = document.querySelector(selector);

      if (!target) continue;

      if (
        target.matches?.(
          "[data-interactive-diagram]",
        )
      ) {
        return target;
      }

      const nested = target.querySelector?.(
        "[data-interactive-diagram]",
      );

      if (nested) return nested;
    } catch {
      // Seletor inválido; continua pela resolução estrutural.
    }
  }

  return null;
}

function graphFromLocalContext(button) {
  const host = button.closest(
    [
      "[data-graph-component]",
      "[data-print-component]",
      "[data-pdf-component]",
      ".interactive-diagram-card",
      ".card",
      ".panel",
      "article",
      "section",
    ].join(","),
  );

  return host?.querySelector?.(
    "[data-interactive-diagram]",
  ) || null;
}

function currentWorkspace() {
  return document.querySelector(
    ".workspace, main, [role='main']",
  );
}

function graphFromPage(button) {
  const workspace =
    button.closest(
      ".workspace, main, [role='main']",
    )
    || currentWorkspace();

  const graphs = Array.from(
    workspace?.querySelectorAll?.(
      "[data-interactive-diagram]",
    ) || [],
  ).filter(isVisible);

  if (graphs.length === 1) {
    return graphs[0];
  }

  const title = normalized(
    document.querySelector(
      ".page-header h1, .page-heading h1, main h1",
    )?.textContent,
  );

  if (title === "rh") {
    return (
      workspace?.querySelector?.(
        '[data-interactive-diagram="rh-main"]',
      )
      || graphs[0]
      || null
    );
  }

  return null;
}

function graphForButton(button) {
  return (
    explicitGraph(button)
    || graphFromLocalContext(button)
    || graphFromPage(button)
  );
}

function graphModel(graph) {
  const diagramId =
    graph.dataset.interactiveDiagram || "";

  const liveModel = diagramId
    ? getDiagramModel(diagramId)
    : null;

  if (
    liveModel
    && Array.isArray(liveModel.nodes)
  ) {
    return {
      diagramId,
      model: structuredClone(liveModel),
      source: "runtime",
    };
  }

  const script = graph.querySelector(
    'script[type="application/json"]',
  );

  try {
    const parsed = JSON.parse(
      script?.textContent
      || '{"nodes":[],"edges":[]}',
    );

    return {
      diagramId,
      model: parsed,
      source: "embedded-json",
    };
  } catch {
    return {
      diagramId,
      model: {
        nodes: [],
        edges: [],
      },
      source: "empty",
    };
  }
}

function nodeFields(node) {
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

  if (
    node?.fields
    && typeof node.fields === "object"
  ) {
    return Object.entries(node.fields).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );
  }

  return [];
}

const EXTERNAL_NAMES = new Set([
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
  const identifiers = [];

  [
    ["ID externo", node?.externalId],
    ["Identificador externo", node?.externalIdentifier],
    ["Código externo", node?.externalCode],
    ["ID de integração", node?.integrationId],
    ["Referência externa", node?.referenceId],
    ["CPF", node?.cpf],
    ["CNPJ", node?.cnpj],
    ["Matrícula", node?.registration],
    ["E-mail", node?.email],
  ].forEach(([label, value]) => {
    const text = String(value ?? "").trim();

    if (text) {
      identifiers.push(`${label}: ${text}`);
    }
  });

  nodeFields(node).forEach((field) => {
    const value = String(field.value ?? "").trim();

    if (
      value
      && EXTERNAL_NAMES.has(normalized(field.name))
    ) {
      const entry = `${field.name}: ${value}`;

      if (
        !identifiers.some(
          (current) =>
            normalized(current) === normalized(entry),
        )
      ) {
        identifiers.push(entry);
      }
    }
  });

  return identifiers.length
    ? identifiers.join(" · ")
    : "—";
}

function additionalProperties(node) {
  return nodeFields(node)
    .filter(
      (field) =>
        !EXTERNAL_NAMES.has(
          normalized(field.name),
        )
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

function edgeFrom(edge) {
  return String(
    edge?.from
    ?? edge?.fromId
    ?? edge?.source
    ?? "",
  );
}

function edgeTo(edge) {
  return String(
    edge?.to
    ?? edge?.toId
    ?? edge?.target
    ?? "",
  );
}

function edgeLabel(edge) {
  return String(
    edge?.label
    || edge?.description
    || edge?.kind
    || edge?.type
    || "relação",
  );
}

function relationText(node, model, nodesById) {
  const nodeId = String(node.id || "");

  return (
    (Array.isArray(model?.edges)
      ? model.edges
      : []
    )
      .filter((edge) => (
        edgeFrom(edge) === nodeId
        || edgeTo(edge) === nodeId
      ))
      .map((edge) => {
        const from = edgeFrom(edge);
        const to = edgeTo(edge);
        const outgoing = from === nodeId;
        const otherId = outgoing ? to : from;
        const other = nodesById.get(otherId);

        return (
          `${outgoing ? "→" : "←"} `
          + `${nodeLabel(other || { id: otherId })} `
          + `(${edgeLabel(edge)})`
        );
      })
      .join("; ")
    || "—"
  );
}

function orderedNodes(model) {
  return [
    ...(Array.isArray(model?.nodes)
      ? model.nodes
      : []
    ),
  ].sort((left, right) => {
    const leftY = Number(left?.y || 0);
    const rightY = Number(right?.y || 0);
    const leftX = Number(left?.x || 0);
    const rightX = Number(right?.x || 0);

    if (leftY !== rightY) {
      return leftY - rightY;
    }

    if (leftX !== rightX) {
      return leftX - rightX;
    }

    return nodeLabel(left).localeCompare(
      nodeLabel(right),
      "pt-BR",
    );
  });
}

function tableRows(model) {
  const nodes = orderedNodes(model);

  const nodesById = new Map(
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
    item: nodeLabel(node),
    description: nodeDescription(node),
    properties: additionalProperties(node),
    relations: relationText(
      node,
      model,
      nodesById,
    ),
  }));
}

function reportTitle(graph) {
  const card = graph.closest(
    ".card, article, section",
  );

  const local = card?.querySelector(
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

  return local || page || "Relatório do gráfico";
}

function rowsHtml(rows) {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="8" class="graph-ghost-empty">
          Nenhum item foi encontrado no modelo atual do gráfico.
        </td>
      </tr>
    `;
  }

  return rows.map((row) => `
    <tr>
      <td>${String(row.order).padStart(2, "0")}</td>
      <td><strong>${escapeHtml(row.external)}</strong></td>
      <td><code>${escapeHtml(row.internal)}</code></td>
      <td>${escapeHtml(row.type)}</td>
      <td><strong>${escapeHtml(row.item)}</strong></td>
      <td>${escapeHtml(row.description)}</td>
      <td>${escapeHtml(row.properties)}</td>
      <td>${escapeHtml(row.relations)}</td>
    </tr>
  `).join("");
}

function buildGhostReport(graph) {
  const {
    diagramId,
    model,
    source,
  } = graphModel(graph);

  const rows = tableRows(model);
  const relations = Array.isArray(model?.edges)
    ? model.edges.length
    : 0;

  const brand = letterhead();
  const title = reportTitle(graph);
  const emittedAt = new Date().toLocaleString(
    "pt-BR",
  );

  document.querySelector(
    GHOST_SELECTOR,
  )?.remove();

  const ghost = document.createElement("section");

  ghost.dataset.macroobrasGraphGhostReport =
    "true";

  ghost.setAttribute(
    "aria-hidden",
    "true",
  );

  ghost.className =
    "macroobras-graph-ghost-report";

  ghost.innerHTML = `
    <header class="graph-ghost-letterhead">
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
        <small>DADOS DO GRÁFICO</small>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(emittedAt)}</span>
      </div>
    </header>

    <div class="graph-ghost-company">
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

    <section class="graph-ghost-summary">
      <div>
        <small>Gráfico</small>
        <strong>${escapeHtml(diagramId || "—")}</strong>
      </div>
      <div>
        <small>Itens</small>
        <strong>${rows.length}</strong>
      </div>
      <div>
        <small>Relações</small>
        <strong>${relations}</strong>
      </div>
      <div>
        <small>Fonte</small>
        <strong>${escapeHtml(source)}</strong>
      </div>
    </section>

    <main class="graph-ghost-body">
      <table class="graph-ghost-table">
        <colgroup>
          <col class="graph-col-order">
          <col class="graph-col-external">
          <col class="graph-col-internal">
          <col class="graph-col-type">
          <col class="graph-col-item">
          <col class="graph-col-description">
          <col class="graph-col-properties">
          <col class="graph-col-relations">
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
          ${rowsHtml(rows)}
        </tbody>
      </table>
    </main>

    <footer class="graph-ghost-footer">
      <span>${escapeHtml(brand.footer)}</span>
      <strong>${escapeHtml(title)}</strong>
    </footer>
  `;

  document.body.appendChild(ghost);

  return {
    ghost,
    title,
  };
}

function printGraphData(graph) {
  const {
    ghost,
    title,
  } = buildGhostReport(graph);

  const oldTitle = document.title;
  document.title = `${title} — dados do gráfico`;

  document.documentElement.classList.remove(
    "macroobras-component-pdf-printing",
    "macroobras-canvas-report-printing",
    "macroobras-canvas-table-router-printing",
  );

  document.documentElement.classList.add(
    PRINT_CLASS,
  );

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    document.documentElement.classList.remove(
      PRINT_CLASS,
    );

    ghost.remove();
    document.title = oldTitle;
  };

  window.addEventListener(
    "afterprint",
    cleanup,
    {
      once: true,
    },
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });

  window.setTimeout(
    cleanup,
    60000,
  );
}

function interceptGraphPdf(event) {
  const button = isPdfButton(event.target);

  if (!button) return;

  const graph = graphForButton(button);

  if (!graph) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  printGraphData(graph);
}

/*
 * O listener fica em window/capture para executar antes dos
 * antigos impressores registrados em document ou nos botões.
 */
window.addEventListener(
  "click",
  interceptGraphPdf,
  {
    capture: true,
  },
);

window.MacroObrasPrintGraphDataTable =
  printGraphData;

window.MacroObrasResolveGraphForPdf =
  graphForButton;
