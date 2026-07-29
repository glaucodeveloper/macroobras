function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[ch]);
}

function config() {
  try {
    const value = JSON.parse(localStorage.getItem("macroobras.customization") || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function materialize(root) {
  root.querySelectorAll("input,textarea,select").forEach((control) => {
    const value = document.createElement("span");
    value.className = "print-control-value";
    value.textContent = control.tagName === "SELECT"
      ? control.selectedOptions?.[0]?.textContent || ""
      : control.value || "";
    control.replaceWith(value);
  });
  root.querySelectorAll(
    "button,.diagram-export-toolbar,[data-local-diagram-action],.node-actions,.edge-port"
  ).forEach((element) => element.remove());
  root.querySelectorAll("[data-interactive-diagram]").forEach((canvas) => {
    const svg = canvas.querySelector("[data-diagram-svg]");
    const layer = canvas.querySelector("[data-node-layer]");
    const width = Math.max(
      parseFloat(svg?.style.width) || 0,
      parseFloat(layer?.style.width) || 0,
      canvas.scrollWidth || 0,
    );
    const height = Math.max(
      parseFloat(svg?.style.height) || 0,
      parseFloat(layer?.style.height) || 0,
      canvas.scrollHeight || 0,
    );
    canvas.style.overflow = "visible";
    canvas.style.width = `${width || 1600}px`;
    canvas.style.height = `${height || 1000}px`;
    if (svg) svg.style.zoom = "1";
    if (layer) layer.style.zoom = "1";
  });
}

function letterheadMarkup(title, subtitle = "") {
  const c = config();
  const trade = c.letterheadTradeName || c.stationName || "Maximus Empreendimentos";
  const legal = c.letterheadLegalName || trade;
  const logo = c.letterheadLogoDataUrl
    ? `<img src="${esc(c.letterheadLogoDataUrl)}" alt="Marca">`
    : `<span>${esc(c.letterheadLogoText || "ME")}</span>`;
  const contacts = [
    c.letterheadCnpj ? `CNPJ ${c.letterheadCnpj}` : "",
    c.letterheadPhone || "",
    c.letterheadEmail || c.adminLoginEmail || "",
  ].filter(Boolean).join(" · ");

  return `<header class="branded-print-header">
    <div class="branded-print-company">
      <div class="branded-print-logo">${logo}</div>
      <div>
        <small>${esc(legal)}</small>
        <strong>${esc(trade)}</strong>
        <span>${esc(c.letterheadAddress || "")}</span>
        <em>${esc(contacts)}</em>
      </div>
    </div>
    <div class="branded-print-document">
      <small>${esc(c.letterheadDocumentCode || "MO")}</small>
      <strong>${esc(title)}</strong>
      <span>${esc(subtitle)}</span>
      <em>${esc(new Date().toLocaleString("pt-BR"))}</em>
    </div>
  </header>`;
}

function footerMarkup() {
  const c = config();
  return `<footer class="branded-print-footer">
    <div>
      <strong>${esc(c.letterheadResponsible || "Administração")}</strong>
      <span>${esc(c.letterheadFooter || "Documento emitido pelo MacroObras.")}</span>
    </div>
    <span class="print-page-number"></span>
  </footer>`;
}

export function printBrandedElement(target, options = {}) {
  if (!target) return false;
  const clone = target.cloneNode(true);
  materialize(clone);
  const shell = document.createElement("section");
  shell.className = `branded-print-shell ${options.orientation || "landscape"}`;
  shell.innerHTML = letterheadMarkup(
    options.title || target.dataset.printTitle || "Relatório operacional",
    options.subtitle || "",
  );
  const body = document.createElement("main");
  body.className = "branded-print-body";
  body.appendChild(clone);
  shell.appendChild(body);
  shell.insertAdjacentHTML("beforeend", footerMarkup());
  document.body.appendChild(shell);
  document.body.classList.add("printing-branded-document");

  const cleanup = () => {
    shell.remove();
    document.body.classList.remove("printing-branded-document");
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  window.setTimeout(cleanup, 1800);
  return true;
}

export function printCurrentReport(root = document) {
  const targets = [...root.querySelectorAll("[data-print-report]")];
  let target = targets[0] || root.querySelector(".workspace,main");
  if (targets.length > 1) {
    target = document.createElement("div");
    target.className = "branded-report-stack";
    targets.forEach((item) => target.appendChild(item.cloneNode(true)));
  }
  const title = document.querySelector(".page-header h1,.page-title h1")?.textContent
    || "Relatório operacional";
  return printBrandedElement(target, { title });
}

export function printLetterheadPreview() {
  return printBrandedElement(
    document.querySelector("[data-letterhead-preview]"),
    { title: "Modelo timbrado", subtitle: "Prévia institucional", orientation: "portrait" },
  );
}
