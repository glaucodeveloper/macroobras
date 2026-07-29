import { availableWorks } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statuses = ["Todas", "Solicitação", "Aguardando autorização", "Autorizada", "Pedido emitido", "Aguardando entrega", "Entregue com foto"];
const workOf = (flow) => availableWorks.find((work) => work.id === flow.workId);
const origin = (flow) => flow.inventoryMovementId ? "Inventário" : flow.ticketId ? "Ticket" : flow.itemId ? "Item da obra" : flow.originLabel || "Administrativa";
const slug = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

function visibleFlows() {
  const filter = state.purchaseStatusFilter || "Todas";
  return filter === "Todas" ? state.purchaseFlows || [] : (state.purchaseFlows || []).filter((flow) => flow.status === filter);
}

function rows(flows, selectedId) {
  if (!flows.length) return `<tr><td colspan="10"><div class="purchase-sheet-empty"><strong>Nenhuma compra neste estado</strong><p>Crie uma compra avulsa ou gere uma solicitação por inventário, ticket ou canvas.</p></div></td></tr>`;
  return flows.map((flow, index) => {
    const linkedWork = workOf(flow);
    const estimated = Number(flow.quoted || flow.estimated || 0);
    const file = flow.orderFile || flow.deliveryEvidence || "";
    return `<tr class="${flow.id === selectedId ? "is-selected" : ""}">
      <td><span class="purchase-row-index">${String(index + 1).padStart(2, "0")}</span></td>
      <td><button class="purchase-row-main" data-message="select-purchase" data-flow-id="${esc(flow.id)}"><small>${esc(origin(flow))}</small><strong>${esc(flow.title)}</strong><span>${esc(flow.material || "Material não informado")}</span></button></td>
      <td><strong>${esc(linkedWork?.code || "GERAL")}</strong><small>${esc(linkedWork?.name || "Sem obra vinculada")}</small></td>
      <td><strong>${esc(flow.requester || "Administração")}</strong><small>solicitante</small></td>
      <td><strong>${flow.quantity ? `${esc(String(flow.quantity))} ${esc(flow.unit || "")}` : "—"}</strong><small>quantidade</small></td>
      <td><strong>${money(estimated)}</strong><small>previsto / cotado</small></td>
      <td><strong>${money(flow.paid || 0)}</strong><small>gastos</small></td>
      <td><span class="purchase-sheet-status ${slug(flow.status)}">${esc(flow.status)}</span></td>
      <td>${file ? `<button class="purchase-file-button" data-message="open-operational-ticket" data-source-key="purchase-file:${esc(flow.id)}" data-ticket-title="Conferir arquivo da compra" data-ticket-description="${esc(file)}" data-work-id="${esc(flow.workId || "")}"><strong>${esc(file)}</strong><small>Abrir ticket</small></button>` : `<span class="purchase-file-missing">Sem arquivo</span>`}</td>
      <td><div class="purchase-row-actions"><button data-message="select-purchase" data-flow-id="${esc(flow.id)}">Detalhes</button>${flow.ticketId ? `<button data-message="open-ticket" data-ticket-id="${esc(flow.ticketId)}">Ticket</button>` : ""}</div></td>
    </tr>`;
  }).join("");
}

function detail(flow) {
  if (!flow) return "";
  const linkedWork = workOf(flow);
  const estimated = Number(flow.quoted || flow.estimated || 0);
  const paid = Number(flow.paid || 0);
  return `<aside class="purchase-detail-drawer">
    <header><div><small>${esc(origin(flow))}</small><h2>${esc(flow.title)}</h2></div><button data-message="close-purchase-detail" aria-label="Fechar detalhes">×</button></header>
    <section class="purchase-detail-work"><span>${esc(linkedWork?.code || "COMPRA GERAL")}</span><strong>${esc(linkedWork?.name || "Sem obra vinculada")}</strong><small>${esc(flow.material || "")}</small></section>
    <dl class="purchase-detail-metrics"><div><dt>Estimado / cotado</dt><dd>${money(estimated)}</dd></div><div><dt>Gastos</dt><dd>${money(paid)}</dd></div><div><dt>Saldo</dt><dd>${money(Math.max(0, estimated - paid))}</dd></div><div><dt>Estado</dt><dd>${esc(flow.status)}</dd></div></dl>
    <section class="purchase-detail-fields"><label><span>Fornecedor</span><input data-flow-field="supplier" value="${esc(flow.supplier || "")}"></label><label><span>Valor cotado</span><input type="number" data-flow-field="quoted" value="${Number(flow.quoted || 0)}"></label><label><span>Arquivo da ordem</span><input data-flow-field="orderFile" value="${esc(flow.orderFile || "")}" placeholder="Nome ou caminho do arquivo"></label></section>
    <footer><button class="btn ghost" data-message="advance-purchase" data-stage="quote">Registrar cotação</button><button class="btn" data-message="approve-purchase">Autorizar</button><button class="btn ghost" data-message="advance-purchase" data-stage="order">Emitir ordem</button></footer>
  </aside>`;
}

export function adminPurchases() {
  const flows = visibleFlows();
  const selected = (state.purchaseFlows || []).find((flow) => flow.id === state.selectedPurchaseFlowId) || null;
  const total = (state.purchaseFlows || []).reduce((sum, flow) => sum + Number(flow.quoted || flow.estimated || 0), 0);
  const paid = (state.purchaseFlows || []).reduce((sum, flow) => sum + Number(flow.paid || 0), 0);
  return `${pageHeader("Compras", "Solicitações gerais ou vinculadas a obra, inventário, ticket, diário e serviço.", `<button class="btn" data-message="create-standalone-purchase">Nova compra avulsa</button><button class="btn ghost" data-message="print-current-report">Exportar / imprimir PDF</button>`)}
    <section class="purchase-report-summary"><article><span>Solicitações</span><strong>${(state.purchaseFlows || []).length}</strong><small>registros</small></article><article><span>Valor representado</span><strong>${money(total)}</strong><small>estimado e cotado</small></article><article><span>Gastos</span><strong>${money(paid)}</strong><small>pagamentos confirmados</small></article><article><span>Com arquivo</span><strong>${(state.purchaseFlows || []).filter((flow) => flow.orderFile || flow.deliveryEvidence).length}</strong><small>ordem, recibo ou comprovante</small></article></section>
    <nav class="purchase-status-tabs">${statuses.map((status) => `<button class="${(state.purchaseStatusFilter || "Todas") === status ? "active" : ""}" data-message="filter-purchases" data-status="${esc(status)}">${esc(status)}</button>`).join("")}</nav>
    <section class="purchase-report-sheet" data-print-report><header><div><small>Maximus Empreendimentos</small><h2>Relatório operacional de compras</h2></div><strong>${money(total)}</strong></header><div class="purchase-report-table-wrap"><table><thead><tr><th>#</th><th>Solicitação</th><th>Obra</th><th>Solicitante</th><th>Quantidade</th><th>Previsto</th><th>Gastos</th><th>Estado</th><th>Arquivo</th><th>Ações</th></tr></thead><tbody>${rows(flows, selected?.id)}</tbody></table></div></section>
    ${detail(selected)}`;
}
