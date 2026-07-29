const htmlEscape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function readObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function letterhead(customization = {}) {
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
    legalName: stored.legalName || stored.razaoSocial || "",
    cnpj: stored.cnpj || "",
    address: stored.address || stored.endereco || "",
    phone: stored.phone || stored.telefone || "",
    email: stored.email || "",
    responsible: stored.responsible || stored.responsavel || "",
    documentCode: stored.documentCode || stored.codigoDocumento || "VIS-ROTA",
    footer:
      stored.footer
      || stored.rodape
      || "Documento operacional emitido pelo MacroObras.",
    acronym: stored.acronym || stored.sigla || "MO",
  };
}

function formatDistance(value) {
  const meters = Number(value || 0);
  return `${(meters / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: meters >= 100000 ? 0 : 1,
    maximumFractionDigits: 1,
  })} km`;
}

function minutesLabel(value) {
  const minutes = Math.max(0, Number(value || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return hours ? `${hours}h ${remainder}min` : `${remainder}min`;
}

function scheduleRows(plan) {
  return (plan.schedule || []).map((entry, index) => `
    <tr>
      <td>${String(index + 1).padStart(2, "0")}</td>
      <td>
        <strong>${htmlEscape(entry.name || "Parada")}</strong>
        <small>${htmlEscape(entry.address || "")}</small>
      </td>
      <td>${htmlEscape(entry.start || "—")} – ${htmlEscape(entry.end || "—")}</td>
      <td>${minutesLabel(entry.durationMinutes)}</td>
      <td>${htmlEscape(entry.workId || "Ponto livre")}</td>
    </tr>
  `).join("");
}

function segmentRows(plan) {
  return (plan.segments || []).map((segment, index) => `
    <tr>
      <td>${String(index + 1).padStart(2, "0")}</td>
      <td>${htmlEscape(segment.fromName || segment.fromId || "Origem")}</td>
      <td>${htmlEscape(segment.toName || segment.toId || "Destino")}</td>
      <td>${formatDistance(segment.distanceMeters)}</td>
      <td>${minutesLabel(Number(segment.durationMillis || 0) / 60000)}</td>
    </tr>
  `).join("");
}

export function printVisitRouteReport({
  plan,
  record,
  customization = {},
}) {
  if (!plan || !record) return;

  document.querySelector("[data-macroobras-print-document]")?.remove();

  const brand = letterhead(customization);
  const documentRoot = document.createElement("section");
  documentRoot.dataset.macroobrasPrintDocument = "true";
  documentRoot.className = "macroobras-print-document";

  documentRoot.innerHTML = `
    <header class="print-letterhead">
      <div class="print-brand">
        <img src="./brand/logo_macroobras_ref.png" alt="">
        <div>
          <strong>${htmlEscape(brand.tradeName)}</strong>
          ${brand.legalName ? `<span>${htmlEscape(brand.legalName)}</span>` : ""}
          ${brand.cnpj ? `<small>CNPJ ${htmlEscape(brand.cnpj)}</small>` : ""}
        </div>
      </div>
      <div class="print-document-id">
        <small>${htmlEscape(brand.documentCode)}</small>
        <strong>${htmlEscape(record.number)}</strong>
        <span>${htmlEscape(record.dateLabel)}</span>
      </div>
    </header>

    <div class="print-company-details">
      ${brand.address ? `<span>${htmlEscape(brand.address)}</span>` : ""}
      ${brand.phone ? `<span>${htmlEscape(brand.phone)}</span>` : ""}
      ${brand.email ? `<span>${htmlEscape(brand.email)}</span>` : ""}
      ${brand.responsible ? `<span>Responsável: ${htmlEscape(brand.responsible)}</span>` : ""}
    </div>

    <main>
      <section class="print-report-heading">
        <div>
          <small>Relatório operacional de visitas</small>
          <h1>${htmlEscape(plan.name || "Rota de visitas")}</h1>
          <p>Traçado, ordem das paradas e horários registrados no cronograma das obras.</p>
        </div>
        <dl>
          <div><dt>Data da rota</dt><dd>${htmlEscape(plan.date || "—")}</dd></div>
          <div><dt>Gerado em</dt><dd>${htmlEscape(plan.generatedAt || record.dateLabel)}</dd></div>
          <div><dt>Usuário</dt><dd>${htmlEscape(record.userName || "Administrador")}</dd></div>
        </dl>
      </section>

      <section class="print-summary-grid">
        <article><small>Distância total</small><strong>${formatDistance(plan.distanceMeters)}</strong></article>
        <article><small>Deslocamento</small><strong>${minutesLabel(plan.travelMinutes)}</strong></article>
        <article><small>Tempo em visitas</small><strong>${minutesLabel(plan.visitMinutes)}</strong></article>
        <article><small>Paradas</small><strong>${Number(plan.schedule?.length || plan.stops?.length || 0)}</strong></article>
      </section>

      <section class="print-table-section">
        <header><h2>Cronograma das visitas</h2><span>Ordem confirmada no mapa</span></header>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Obra ou parada</th>
              <th>Horário</th>
              <th>Duração</th>
              <th>Vínculo</th>
            </tr>
          </thead>
          <tbody>${scheduleRows(plan)}</tbody>
        </table>
      </section>

      <section class="print-table-section">
        <header><h2>Trechos calculados</h2><span>${htmlEscape(plan.source || "Google Routes")}</span></header>
        ${(plan.segments || []).length ? `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Distância</th>
                <th>Tempo</th>
              </tr>
            </thead>
            <tbody>${segmentRows(plan)}</tbody>
          </table>
        ` : `<p class="print-empty">O plano não possui detalhamento individual dos trechos.</p>`}
      </section>
    </main>

    <footer class="print-footer">
      <span>${htmlEscape(brand.footer)}</span>
      <strong>${htmlEscape(record.number)} · ${htmlEscape(record.dateLabel)}</strong>
    </footer>
  `;

  document.body.appendChild(documentRoot);
  document.documentElement.classList.add("macroobras-printing");

  const cleanup = () => {
    document.documentElement.classList.remove("macroobras-printing");
    documentRoot.remove();
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(() => {
    window.print();
    window.setTimeout(cleanup, 1200);
  }, 120);
}
