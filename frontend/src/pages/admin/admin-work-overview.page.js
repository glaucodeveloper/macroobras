import { availableWorks } from "../../core/data.js";
import { selectedWork, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { formatPercent, measurementRows, workOfficialPercentage } from "../../core/work-metrics.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function deleteDialog(work) {
  const stage = Number(state.deleteWorkStage || 0);
  if (!stage) return "";

  if (stage === 1) {
    return `<div class="danger-dialog-backdrop">
      <section class="danger-dialog">
        <header><small>Primeira confirmação</small><h2>Preparar exclusão da obra</h2></header>
        <p>A exclusão remove registros vinculados nesta estação.</p>
        <label class="danger-export-option">
          <input type="checkbox" data-delete-work-export checked>
          <span>Exportar dados JSON e planilha CSV antes de continuar</span>
        </label>
        <footer>
          <button class="btn ghost" data-message="cancel-delete-work">Cancelar</button>
          <button class="btn danger" data-message="continue-delete-work">Continuar</button>
        </footer>
      </section>
    </div>`;
  }

  return `<div class="danger-dialog-backdrop">
    <section class="danger-dialog final">
      <header><small>Segunda confirmação</small><h2>Excluir definitivamente</h2></header>
      <p>Digite o código <strong>${esc(work.code)}</strong> para confirmar.</p>
      <input data-delete-work-code placeholder="${esc(work.code)}" autocomplete="off">
      <footer>
        <button class="btn ghost" data-message="cancel-delete-work">Cancelar</button>
        <button class="btn danger" data-message="confirm-delete-work" data-work-id="${esc(work.id)}">Excluir obra</button>
      </footer>
    </section>
  </div>`;
}

export function adminWorkOverview() {
  const work = selectedWork() || availableWorks[0];
  const rows = measurementRows(state, work);
  const executed = rows.reduce((sum, row) => sum + row.executedValue, 0);
  const percentage = workOfficialPercentage(state, work);
  const accessCount = (state.encarregadoAccesses || [])
    .filter((access) => access.workId === work.id).length;

  return `${pageHeader(
    "Visão geral",
    "Resumo operacional calculado a partir das medições oficializadas.",
    `<button class="btn ghost" data-message="export-current-work" data-work-id="${esc(work.id)}">Exportar obra</button>
     <button class="btn ghost danger" data-message="request-delete-work" data-work-id="${esc(work.id)}">Excluir obra</button>
     <button class="btn" data-message="navigate" data-route="admin-work-items">Ver itens</button>`,
  )}
    <section class="overview-grid">
      ${card("Localização", `
        <div class="google-map" data-google-map="work" data-work-id="${esc(work.id)}">
          <div class="map-loading"><span></span><strong>Carregando Google Maps</strong><small>Localização da obra</small></div>
        </div>
      `, "map-card single-map")}
      ${card("Dados da planilha", `
        <dl class="facts">
          <div><dt>Cliente</dt><dd>${esc(work.client)}</dd></div>
          <div><dt>Orçamento</dt><dd>${money(work.budget)}</dd></div>
          <div><dt>Valor executado oficial</dt><dd>${money(executed)}</dd></div>
          <div><dt>Origem</dt><dd>${esc(work.source || "Planilha orçamentária")}</dd></div>
        </dl>
      `)}
    </section>

    <section class="metric-grid compact">
      <article class="metric-card blue"><small>Itens de execução</small><strong>${work.items.length}</strong><span>serviços importados</span></article>
      <article class="metric-card green"><small>Medição oficial</small><strong>${formatPercent(percentage, 2)}</strong><span>ponderada pelo orçamento</span></article>
      <article class="metric-card cyan"><small>Acessos de campo</small><strong>${accessCount}</strong><span>encarregados vinculados</span></article>
      <article class="metric-card orange"><small>Saldo da obra</small><strong>${money(Math.max(0, work.budget - executed))}</strong><span>orçamento menos execução oficial</span></article>
    </section>

    ${deleteDialog(work)}`;
}
