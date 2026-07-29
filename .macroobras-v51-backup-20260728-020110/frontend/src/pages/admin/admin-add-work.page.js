import { budgetImportPreview } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, formStep, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function map(type = "works", options = {}) {
  const attributes = [
    `data-google-map="${esc(type)}"`,
    options.workId ? `data-work-id="${esc(options.workId)}"` : "",
    options.address ? `data-address="${esc(options.address)}"` : "",
    options.compact ? `data-compact="true"` : "",
  ].filter(Boolean).join(" ");
  return `<div class="google-map ${options.compact ? "compact" : ""}" ${attributes}><div class="map-loading"><span></span><strong>Carregando Google Maps</strong><small>Mapa, marcadores e rotas</small></div></div>`;
}

export function adminAddWork() {
  const preview = state.importPreviewReady ? budgetImportPreview : null;
  const address = state.workAddress || "Estádio Municipal, Buerarema, Bahia";

  return `${pageHeader("Adicionar obra", "A criação recebe somente o endereço e a planilha orçamentária.", `<button class="btn ghost" data-message="navigate" data-route="admin-works">Cancelar</button><button class="btn" data-message="save-imported-work">Criar obra</button>`)}
    <style>
      .add-work-card { padding: 19px; }
      .add-work-layout { display: grid; gap: 18px; }
      .add-work-header { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(320px, .95fr); gap: 18px; align-items: start; }
      .add-work-block { display: grid; gap: 14px; min-width: 0; }
      .add-work-body { display: grid; gap: 16px; padding-top: 6px; }
      .add-work-body .import-detected,
      .add-work-body .import-total { width: 100%; }
      .add-work-body .import-total { padding-top: 0; }
      .add-work-body .table-scroll { width: 100%; overflow: auto; }
      .add-work-body .table-scroll table { width: 100%; }
      .add-work-body .empty-state.wide { min-height: 220px; }
      @media (max-width: 920px) {
        .add-work-header { grid-template-columns: 1fr; }
      }
    </style>
    ${card("", `
      <div class="add-work-layout">
        <header class="add-work-header">
          <section class="add-work-block">
            ${formStep(1, "Endereço", `<label>Endereço da obra</label><div class="address-field"><input data-work-address value="${esc(address)}" placeholder="Rua, número, município e estado"><button class="btn ghost" data-message="locate-work-address">Localizar</button></div><small>Digite o endereço completo e clique em Localizar para posicionar a obra no mapa.</small><div class="address-preview">${map("address", { address, compact: true })}</div>`)}
          </section>
          <section class="add-work-block">
            ${formStep(2, "Planilha orçamentária", `<label class="dropzone import-zone"><input type="file" accept=".xlsx,.xls,.csv,.pdf" data-message="budget-file"><span>⇧</span><strong>${esc(state.importFileName || "Selecionar orçamento sintético")}</strong><small>PDF, XLSX, XLS ou CSV.</small></label><button class="btn ghost full" data-message="simulate-budget-import">Carregar prévia do anexo</button>`)}
            <div class="format-spec"><strong>Formato presumido</strong><code>${budgetImportPreview.columns.join(" · ")}</code><p>${esc(budgetImportPreview.assumption)}</p><p>O item de execução persistido contém somente <b>descrição</b> e <b>orçamento alocado</b>.</p></div>
          </section>
        </header>
        <section class="add-work-body">
          ${preview ? `<div class="import-detected"><small>Obra detectada</small><strong>${esc(preview.workName)}</strong><span>Cliente: ${esc(preview.client)}</span></div><div class="import-total"><span>Orçamento total</span><strong>${money(preview.total)}</strong></div><div class="table-scroll import-table"><table><thead><tr><th>Descrição do item</th><th>Orçamento alocado</th></tr></thead><tbody>${preview.items.map((item) => `<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state wide"><b>01</b><h3>Aguardando planilha</h3><p>A prévia exibirá as linhas de primeiro nível e o valor da coluna Total.</p></div>`}
        </section>
      </div>`, "add-work-card")}`;
}
