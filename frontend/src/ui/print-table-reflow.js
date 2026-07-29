const PRINT_ROOT_SELECTOR = [
  "[data-macroobras-component-print-document]",
  "[data-purchases-table-print-document]",
  "[data-canvas-table-router-document]",
  "[data-macroobras-print-document]",
  ".macroobras-component-print-document",
  ".macroobras-purchases-table-print-document",
  ".macroobras-canvas-table-router-document",
  ".canvas-report-document",
].join(",");

const SCROLL_SELECTOR = [
  "[data-scroll]",
  "[data-table-scroll]",
  "[data-print-scroll]",
  ".table-scroll",
  ".table-container",
  ".table-wrapper",
  ".data-table-wrapper",
  ".rh-people-table-scroll",
  ".purchase-board",
  ".purchase-board-list",
  "[class*='scroll']",
  "[class*='overflow']",
  "[class*='viewport']",
].join(",");

let observerInstalled = false;

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function headerLabels(table) {
  const headings = Array.from(
    table.querySelectorAll("thead tr:last-child th"),
  ).map((heading, index) => (
    normalize(heading.textContent)
    || `Campo ${index + 1}`
  ));

  if (headings.length) {
    return headings;
  }

  const firstRow = table.querySelector("tr");

  return Array.from(
    firstRow?.children || [],
  ).map((cell, index) => (
    normalize(cell.textContent)
    || `Campo ${index + 1}`
  ));
}

function tableColumnCount(table) {
  const headingCount = table.querySelectorAll(
    "thead tr:last-child th",
  ).length;

  if (headingCount) {
    return headingCount;
  }

  return table.querySelector("tr")?.children.length || 0;
}

function belongsToScrollRegion(table) {
  const region = table.closest(SCROLL_SELECTOR);

  if (region) {
    return true;
  }

  const width = Number(table.scrollWidth || 0);
  const client = Number(table.clientWidth || 0);

  return Boolean(
    width
    && client
    && width > client + 4
  );
}

function shouldReflow(table) {
  if (table.matches("[data-print-keep-table]")) {
    return false;
  }

  if (table.matches("[data-print-reflow]")) {
    return true;
  }

  const columns = tableColumnCount(table);

  return (
    belongsToScrollRegion(table)
    || columns >= 8
  );
}

function addCellLabels(table) {
  const labels = headerLabels(table);

  table.querySelectorAll("tbody tr").forEach(
    (row) => {
      Array.from(row.children).forEach(
        (cell, index) => {
          if (!cell.matches("td, th")) return;

          const label =
            labels[index]
            || cell.dataset.label
            || `Campo ${index + 1}`;

          cell.dataset.printLabel = label;
        },
      );
    },
  );
}

function clearInlineConstraints(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  [
    "width",
    "min-width",
    "max-width",
    "height",
    "min-height",
    "max-height",
    "overflow",
    "overflow-x",
    "overflow-y",
    "white-space",
    "transform",
  ].forEach((property) => {
    element.style.removeProperty(property);
  });
}

function expandScrollRegions(root) {
  root.querySelectorAll(SCROLL_SELECTOR).forEach(
    (region) => {
      region.classList.add(
        "macroobras-print-scroll-expanded",
      );

      clearInlineConstraints(region);
    },
  );
}

function prepareTable(table) {
  if (
    table.dataset.printTablePrepared === "true"
  ) {
    return;
  }

  table.dataset.printTablePrepared = "true";
  table.classList.add("macroobras-print-table");

  clearInlineConstraints(table);
  addCellLabels(table);

  if (shouldReflow(table)) {
    table.classList.add(
      "macroobras-print-table-reflow",
    );

    table.dataset.printLayout =
      "cells-down";
  } else {
    table.classList.add(
      "macroobras-print-table-standard",
    );
  }
}

function preparePrintRoot(root) {
  if (!(root instanceof Element)) return;

  expandScrollRegions(root);

  root.querySelectorAll("table").forEach(
    prepareTable,
  );

  if (root.matches("table")) {
    prepareTable(root);
  }

  root.dataset.printTablesPrepared = "true";
}

function scanDocument() {
  document.querySelectorAll(
    PRINT_ROOT_SELECTOR,
  ).forEach(preparePrintRoot);
}

function installObserver() {
  if (observerInstalled) return;

  observerInstalled = true;

  const observer = new MutationObserver(
    (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) {
            continue;
          }

          if (node.matches(PRINT_ROOT_SELECTOR)) {
            preparePrintRoot(node);
          }

          node.querySelectorAll?.(
            PRINT_ROOT_SELECTOR,
          ).forEach(preparePrintRoot);
        }
      }
    },
  );

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
    },
  );

  window.addEventListener(
    "beforeprint",
    scanDocument,
  );

  scanDocument();
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

window.MacroObrasPreparePrintTables =
  scanDocument;
