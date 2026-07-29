import { availableWorks } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const workById = (id) => availableWorks.find((work) => work.id === id);

function itemByFlow(flow) {
  const work = workById(flow.workId);
  return work?.items.find((item) => item.id === flow.itemId);
}

function stageTone(stage) {
  if (stage === "Entregue com foto") return "green";
  if (stage === "Aguardando entrega") return "cyan";
  if (stage === "Autorizada" || stage === "Pedido emitido") return "blue";
  return "orange";
}

function stageColumns(flows) {
  return ["Solicitação", "Aguardando autorização", "Autorizada", "Pedido emitido", "Aguardando entrega", "Entregue com foto"].map((stage) => ({
    stage,
    items: flows.filter((flow) => flow.status === stage),
  }));
}

function flowCard(flow) {
  const work = workById(flow.workId);
  const item = itemByFlow(flow);
  const title = item?.description || flow.material || flow.originLabel || "Compra sem item de obra";

  return `<button class="purchase-board-card" data-message="select-purchase" data-flow-id="${esc(flow.id)}">
    <div class="purchase-card-head"><strong>${esc(flow.title)}</strong><span>${esc(work?.name || "Compra geral")}</span></div>
    <p>${esc(title)}</p>
    <div class="purchase-card-foot"><b>${money(flow.quoted || flow.estimated)}</b><small>${esc(flow.requester || "Sem responsável")}</small></div>
    ${flow.orderFile ? `<em>Ordem: ${esc(flow.orderFile)}</em>` : flow.deliveryEvidence ? `<em>Recibo: ${esc(flow.deliveryEvidence)}</em>` : `<em>${esc(flow.status)}</em>`}
  </button>`;
}

export function adminPurchases() {
  const flows = state.purchaseFlows || [];
  const columns = stageColumns(flows);

  return `${pageHeader("Compras", "Solicitações com origem administrativa, inventário, ticket, diário ou item de obra.", `<button class="btn" data-message="create-standalone-purchase">Nova compra avulsa</button><button class="btn ghost" data-message="print-current-report">Imprimir relatório</button>`)}
    <section class="metric-grid compact" data-print-report>
      ${card("Solicitações", `<strong>${flows.filter((flow) => flow.status === "Solicitação").length}</strong><span>Entradas iniciais na fila</span>`)}
      ${card("Autorizadas", `<strong>${flows.filter((flow) => flow.authorized).length}</strong><span>Fluxos liberados pelo administrador</span>`)}
      ${card("Em espera", `<strong>${flows.filter((flow) => !flow.delivered).length}</strong><span>Recebendo despacho ou entrega</span>`)}
      ${card("Com arquivo", `<strong>${flows.filter((flow) => Boolean(flow.deliveryEvidence || flow.orderFile)).length}</strong><span>Ordem, recibo ou comprovante</span>`)}
    </section>
    <section class="purchase-board" data-print-report>
      ${columns.map(({ stage, items }) => `<article class="purchase-board-column ${stageTone(stage)}"><header><div><small>${esc(stage)}</small><strong>${items.length}</strong></div><span>${money(items.reduce((sum, flow) => sum + Number(flow.quoted || flow.estimated || 0), 0))}</span></header><div class="purchase-board-list">${items.length ? items.map(flowCard).join("") : `<div class="empty-state"><b>＋</b><h3>Nenhuma compra nesta etapa</h3><p>Compras podem nascer de itens, tickets, inventário ou solicitação administrativa.</p></div>`}</div></article>`).join("")}
    </section>`;
}
