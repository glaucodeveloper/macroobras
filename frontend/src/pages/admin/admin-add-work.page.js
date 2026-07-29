import { budgetImportPreview } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { pricedPercentageMap, formatPercent } from "../../core/work-metrics.js";
import { card, formStep, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function map(address) {
  return `<div class="google-map compact" data-google-map="address" data-address="${esc(address)}" data-compact="true">
    <div class="map-loading">
      <span></span>
      <strong>Carregando Google Maps</strong>
      <small>Localização da nova obra</small>
    </div>
  </div>`;
}

export function adminAddWork() {
  const preview = state.importPreviewReady ? budgetImportPreview : null;
  const address = state.workAddress || "Estádio Municipal, Buerarema, Bahia";
  const weights = pricedPercentageMap({
    budget: budgetImportPreview.total,
    items: budgetImportPreview.items,
  });

  return `${pageHeader(
    "Adicionar obra",
    "A planilha gera a obra, o canvas dos itens e os pesos financeiros, sem relações automáticas.",
    `<button class="btn ghost" data-message="navigate" data-route="admin-works">Cancelar</button>
     <button class="btn" data-message="save-imported-work">Criar obra e canvas</button>`,
  )}
    ${card("", `
      <div class="add-work-layout">
        <header class="add-work-header">
          <section class="add-work-block">
            ${formStep(1, "Endereço", `
              <label>Endereço da obra</label>
              <div class="address-field">
                <input data-work-address value="${esc(address)}" placeholder="Rua, número, município e estado">
                <button class="btn ghost" data-message="locate-work-address">Localizar</button>
              </div>
              <small>A obra será incluída como local natural do Inventário.</small>
              <div class="address-preview">${map(address)}</div>
            `)}
          </section>

          <section class="add-work-block">
            ${formStep(2, "Planilha orçamentária", `
              <label class="dropzone import-zone">
                <input type="file" accept=".xlsx,.xls,.csv,.pdf" data-message="budget-file">
                <span>⇧</span>
                <strong>${esc(state.importFileName || "Selecionar orçamento sintético")}</strong>
                <small>PDF, XLSX, XLS ou CSV.</small>
              </label>
              <button class="btn ghost full" data-message="simulate-budget-import">Carregar prévia do anexo</button>
            `)}
            <div class="format-spec">
              <strong>Regra percentual</strong>
              <p><b>Porcentagem apreçada = valor do item ÷ orçamento total × 100.</b></p>
              <p>A soma dos itens é ajustada para 100,00% após o arredondamento.</p>
            </div>
          </section>
        </header>

        <section class="add-work-body">
          ${preview ? `
            <div class="import-detected">
              <small>Obra detectada</small>
              <strong>${esc(preview.workName)}</strong>
              <span>Cliente: ${esc(preview.client)}</span>
            </div>
            <div class="import-total">
              <span>Orçamento total</span>
              <strong>${money(preview.total)}</strong>
              <small>Porcentagem apreçada total: 100,00%</small>
            </div>
            <div class="table-scroll import-table">
              <table>
                <thead>
                  <tr>
                    <th>Descrição do item</th>
                    <th>Orçamento alocado</th>
                    <th>Porcentagem apreçada</th>
                  </tr>
                </thead>
                <tbody>
                  ${preview.items.map((item) => `
                    <tr>
                      <td>${esc(item.description)}</td>
                      <td>${money(item.budget)}</td>
                      <td><strong>${formatPercent(weights.get(item.id) || 0, 2)}</strong></td>
                    </tr>
                  `).join("")}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th>${money(preview.total)}</th>
                    <th>100,00%</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          ` : `
            <div class="empty-state wide">
              <b>01</b>
              <h3>Aguardando planilha</h3>
              <p>A prévia exibirá orçamento e porcentagem apreçada de cada item.</p>
            </div>
          `}
        </section>
      </div>
    `, "add-work-card")}`;
}
