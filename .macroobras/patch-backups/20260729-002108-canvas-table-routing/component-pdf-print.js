const PRINT_CLASS = "macroobras-component-pdf-printing";
const PRINT_ROOT_SELECTOR =
  "[data-macroobras-component-print-document]";

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
    footer:
      stored.footer
      || stored.rodape
      || "Documento operacional emitido pelo MacroObras.",
  };
}

function isPdfExportButton(element) {
  const button = element?.closest?.(
    "button, a, [role='button']",
  );

  if (!button) return null;

  if (
    button.matches(
      "[data-canvas-report-button],"
      + "[data-macroobras-component-print-ignore]",
    )
  ) {
    return null;
  }

  const dataText = [
    button.dataset.message,
    button.dataset.action,
    button.dataset.export,
    button.dataset.format,
    button.dataset.pdf,
    button.dataset.exportPdf,
    button.dataset.printPdf,
  ].filter(Boolean).join(" ");

  const visibleText = button.textContent || "";
  const label = normalized(
    `${dataText} ${visibleText}`,
  );

  const explicit = button.matches(
    [
      "[data-export-pdf]",
      "[data-print-pdf]",
      "[data-component-pdf]",
      "[data-message*='pdf' i]",
      "[data-action*='pdf' i]",
      "[data-format='pdf' i]",
    ].join(","),
  );

  const textual =
    /exportar(?:\s*\/\s*imprimir)?\s+(?:em\s+)?pdf/.test(label)
    || /imprimir\s+(?:em\s+)?pdf/.test(label)
    || /baixar\s+(?:em\s+)?pdf/.test(label)
    || /salvar\s+(?:como|em)\s+pdf/.test(label);

  return explicit || textual
    ? button
    : null;
}

function queryExplicitTarget(button) {
  const selectors = [
    button.dataset.printTarget,
    button.dataset.pdfTarget,
    button.dataset.exportTarget,
    button.dataset.componentTarget,
    button.getAttribute("href")?.startsWith("#")
      ? button.getAttribute("href")
      : "",
  ].filter(Boolean);

  const controlled = button.getAttribute("aria-controls");

  if (controlled) {
    selectors.push(`#${CSS.escape(controlled)}`);
  }

  for (const selector of selectors) {
    try {
      const target = document.querySelector(selector);

      if (target) return target;
    } catch {
      // Seletor inválido: continua pelas relações estruturais.
    }
  }

  return null;
}

function visibleElement(element) {
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

function componentFromLocalContext(button) {
  const direct = button.closest(
    [
      "[data-print-component]",
      "[data-pdf-component]",
      ".interactive-diagram-card",
      ".table-card",
      ".report-card",
      ".map-card",
      ".chart-card",
      ".panel",
      ".card",
      "article",
      "section",
    ].join(","),
  );

  if (
    direct
    && !direct.matches(
      ".page-header, .page-heading, .page-actions",
    )
  ) {
    return direct;
  }

  return null;
}

function componentAfterButton(button) {
  const actionHost = button.closest(
    [
      ".page-header",
      ".page-heading",
      ".page-actions",
      ".toolbar",
      ".card-header",
      "header",
    ].join(","),
  );

  if (!actionHost) return null;

  let sibling = actionHost.nextElementSibling;

  while (sibling) {
    if (
      visibleElement(sibling)
      && sibling.matches(
        [
          "[data-print-component]",
          "[data-pdf-component]",
          ".card",
          ".panel",
          ".table-card",
          ".chart-card",
          ".map-card",
          "section",
          "article",
        ].join(","),
      )
    ) {
      return sibling;
    }

    const nested = Array.from(
      sibling.querySelectorAll(
        [
          "[data-print-component]",
          "[data-pdf-component]",
          ".card",
          ".panel",
          ".table-card",
          ".chart-card",
          ".map-card",
          "section",
          "article",
        ].join(","),
      ),
    ).find(visibleElement);

    if (nested) return nested;

    sibling = sibling.nextElementSibling;
  }

  return null;
}

function componentFromWorkspace(button) {
  const workspace = button.closest(
    ".workspace, main, [role='main']",
  ) || document.querySelector(
    ".workspace, main, [role='main']",
  );

  if (!workspace) return null;

  const candidates = Array.from(
    workspace.querySelectorAll(
      [
        ":scope > [data-print-component]",
        ":scope > [data-pdf-component]",
        ":scope > .card",
        ":scope > .panel",
        ":scope > section",
        ":scope > article",
        ":scope > .overview-grid > .card",
        ":scope > .content-grid > .card",
      ].join(","),
    ),
  ).filter(
    (candidate) =>
      visibleElement(candidate)
      && !candidate.contains(button),
  );

  return candidates[0] || null;
}

function resolvePrintTarget(button) {
  return (
    queryExplicitTarget(button)
    || componentFromLocalContext(button)
    || componentAfterButton(button)
    || componentFromWorkspace(button)
  );
}

function componentTitle(target) {
  const heading = target.querySelector(
    [
      ":scope > h1",
      ":scope > h2",
      ":scope > h3",
      ":scope > header h1",
      ":scope > header h2",
      ":scope > header h3",
      ":scope > header strong",
      ".card-title",
    ].join(","),
  );

  const pageHeading = document.querySelector(
    ".page-header h1, .page-heading h1, main h1",
  );

  const local = heading?.textContent?.trim();
  const page = pageHeading?.textContent?.trim();

  if (local && page && normalized(local) !== normalized(page)) {
    return `${page} — ${local}`;
  }

  return local || page || "Relatório";
}

function replaceFormControls(clone) {
  clone.querySelectorAll(
    "input, textarea, select",
  ).forEach((control) => {
    const replacement = document.createElement("span");
    replacement.className = "component-print-field-value";

    if (
      control instanceof HTMLInputElement
      && ["checkbox", "radio"].includes(control.type)
    ) {
      replacement.textContent = control.checked
        ? "Sim"
        : "Não";
    } else if (control instanceof HTMLSelectElement) {
      replacement.textContent =
        control.selectedOptions?.[0]?.textContent
        || control.value
        || "—";
    } else {
      replacement.textContent =
        control.value
        || control.getAttribute("value")
        || "—";
    }

    control.replaceWith(replacement);
  });
}

function removeInteractiveControls(clone) {
  clone.querySelectorAll(
    [
      "[data-export-pdf]",
      "[data-print-pdf]",
      "[data-component-pdf]",
      "[data-canvas-report-button]",
      ".canvas-report-toolbar",
      ".component-print-toolbar",
      ".node-actions",
      ".diagram-edge-label-delete",
      "button",
    ].join(","),
  ).forEach((element) => element.remove());
}

function copyCanvasImages(source, clone) {
  const sourceCanvases = Array.from(
    source.querySelectorAll("canvas"),
  );

  const clonedCanvases = Array.from(
    clone.querySelectorAll("canvas"),
  );

  sourceCanvases.forEach((canvas, index) => {
    const clonedCanvas = clonedCanvases[index];

    if (!clonedCanvas) return;

    try {
      const image = document.createElement("img");
      image.className = "component-print-canvas-image";
      image.src = canvas.toDataURL("image/png");
      image.alt = canvas.getAttribute("aria-label") || "Gráfico";
      clonedCanvas.replaceWith(image);
    } catch {
      clonedCanvas.classList.add(
        "component-print-canvas-unavailable",
      );
    }
  });
}

function copySvgDimensions(source, clone) {
  const sourceSvgs = Array.from(
    source.querySelectorAll("svg"),
  );

  const clonedSvgs = Array.from(
    clone.querySelectorAll("svg"),
  );

  sourceSvgs.forEach((svg, index) => {
    const cloned = clonedSvgs[index];

    if (!cloned) return;

    const rect = svg.getBoundingClientRect();

    if (!cloned.getAttribute("viewBox") && rect.width && rect.height) {
      cloned.setAttribute(
        "viewBox",
        `0 0 ${Math.ceil(rect.width)} ${Math.ceil(rect.height)}`,
      );
    }

    cloned.removeAttribute("width");
    cloned.removeAttribute("height");
  });
}

function markScrollableContent(clone) {
  clone.querySelectorAll("*").forEach((element) => {
    const classText = String(element.className || "");

    if (
      /scroll|overflow|viewport|table-wrap|table-container/i
        .test(classText)
      || element.hasAttribute("data-scroll")
    ) {
      element.classList.add(
        "component-print-expanded-scroll",
      );
    }
  });

  clone.querySelectorAll("table").forEach((table) => {
    table.classList.add("component-print-table");
  });

  clone.querySelectorAll(
    "svg, canvas, img, .chart, .graph, .interactive-diagram",
  ).forEach((graphic) => {
    graphic.classList.add("component-print-graphic");
  });
}

function buildComponentClone(target) {
  const clone = target.cloneNode(true);

  clone.classList.add("component-print-clone");
  clone.removeAttribute("style");

  copyCanvasImages(target, clone);
  copySvgDimensions(target, clone);
  replaceFormControls(clone);
  removeInteractiveControls(clone);
  markScrollableContent(clone);

  return clone;
}

function printComponent(target) {
  const title = componentTitle(target);
  const brand = letterhead();
  const emittedAt = new Date().toLocaleString("pt-BR");
  const oldTitle = document.title;

  document.querySelector(
    PRINT_ROOT_SELECTOR,
  )?.remove();

  const printRoot = document.createElement("section");
  printRoot.dataset.macroobrasComponentPrintDocument = "true";
  printRoot.className =
    "macroobras-component-print-document";

  printRoot.innerHTML = `
    <header class="component-print-letterhead">
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
        <small>RELATÓRIO DE COMPONENTE</small>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(emittedAt)}</span>
      </div>
    </header>

    <div class="component-print-company-data">
      ${brand.address
        ? `<span>${escapeHtml(brand.address)}</span>`
        : ""}
      ${brand.phone
        ? `<span>${escapeHtml(brand.phone)}</span>`
        : ""}
      ${brand.email
        ? `<span>${escapeHtml(brand.email)}</span>`
        : ""}
    </div>

    <main data-component-print-body></main>

    <footer class="component-print-footer">
      <span>${escapeHtml(brand.footer)}</span>
      <strong>${escapeHtml(title)}</strong>
    </footer>
  `;

  const clone = buildComponentClone(target);

  printRoot.querySelector(
    "[data-component-print-body]",
  )?.appendChild(clone);

  document.body.appendChild(printRoot);
  document.documentElement.classList.add(PRINT_CLASS);
  document.title = title;

  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    document.documentElement.classList.remove(
      PRINT_CLASS,
    );

    printRoot.remove();
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

function handlePdfExport(event) {
  const button = isPdfExportButton(event.target);

  if (!button) return;

  const target = resolvePrintTarget(button);

  if (!target) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  printComponent(target);
}

document.addEventListener(
  "click",
  handlePdfExport,
  true,
);

window.MacroObrasPrintComponent =
  printComponent;
