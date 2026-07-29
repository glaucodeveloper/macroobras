import { availableWorks } from "../../core/data.js";
import { selectedWork, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { formatPercent, measurementRows, workOfficialPercentage } from "../../core/work-metrics.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function adminWorkMeasurement() {
  const work = selectedWork() || availableWorks[0];
  const rows = measurementRows(state, work);
  const executed = rows.reduce((sum, row) => sum + row.executedValue, 0);
  const percentage = workOfficialPercentage(state, work);
  const diaryCount = new Set(
    (state.measurementOfficializations || [])
      .filter((entry) => entry.workId === work.id)
      .map((entry) => entry.diaryEntryId)
      .filter(Boolean),
  ).size;

  return `${pageHeader(
    "Medição",
    "Percentuais provenientes dos diários fechados e oficializados, ponderados pelo orçamento.",
    `<button class="btn ghost" data-message="print-current-report">Exportar / imprimir PDF</button>
     <button class="btn" data-message="navigate" data-route="admin-work-diary">Abrir diário</button>`,
  )}
    <div class="work-context">
      <div>
        <small>Obra ativa</small>
        <strong>${esc(work.name)}</strong>
        <span>${esc(work.address)}</span>
      </div>
      <div>
        <span class="status-pill em-execucao">${esc(work.status)}</span>
        <strong>${formatPercent(percentage, 2)}</strong>
      </div>
    </div>

    <section class="measurement-summary-grid" data-print-report data-print-title="Medição - ${esc(work.code)}">
      <article><small>Orçamento</small><strong>${money(work.budget)}</strong></article>
      <article><small>Valor executado oficial</small><strong>${money(executed)}</strong></article>
      <article><small>Medição ponderada</small><strong>${formatPercent(percentage, 2)}</strong></article>
      <article><small>Diários oficializados</small><strong>${diaryCount}</strong></article>
    </section>

    ${card("Medição administrativa", `
      <div class="table-scroll">
        <table class="measurement-official-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Orçamento</th>
              <th>Porcentagem apreçada</th>
              <th>Medição oficial</th>
              <th>Valor executado</th>
              <th>Diários</th>
              <th>Anotação administrativa</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><strong>${esc(row.item.description)}</strong></td>
                <td>${money(row.item.budget)}</td>
                <td><strong>${formatPercent(row.pricedPercentage, 2)}</strong></td>
                <td>
                  <strong>${formatPercent(row.percentage, 2)}</strong>
                  <span class="measurement-progress"><i style="width:${row.percentage}%"></i></span>
                </td>
                <td>${money(row.executedValue)}</td>
                <td>
                  <button class="table-link" data-message="navigate" data-route="admin-work-diary">
                    ${row.diaryCount} diário(s)
                  </button>
                </td>
                <td>${esc(row.note || "Sem anotação oficial.")}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <th>Total da obra</th>
              <th>${money(work.budget)}</th>
              <th>100,00%</th>
              <th>${formatPercent(percentage, 2)}</th>
              <th>${money(executed)}</th>
              <th colspan="2">Medição ponderada pelo valor de cada item.</th>
            </tr>
          </tfoot>
        </table>
      </div>
    `, "measurement-official-card")}`;
}
