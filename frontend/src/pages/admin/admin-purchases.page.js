import { availableWorks } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function workById(id) {
  return availableWorks.find((work) => work.id === id);
}

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
  return [
    "Solicitação",
    "Aguardando autorização",
    "Autorizada",
    "Pedido emitido",
    "Aguardando entrega",
    "Entregue com foto",
  ].map((stage) => ({
    stage,
    items: flows.filter((flow) => flow.status === stage),
  }));
}

export function adminPurchases() {
  const flows = state.purchaseFlows || [];
  const columns = stageColumns(flows);
  return `${pageHeader("Compras", "Quadro administrativo de solicitações, alocação, espera e recibos das obras.")}
    <section class="metric-grid compact">
      ${card("Solicitações", `<strong>${flows.filter((flow) => flow.status === "Solicitação").length}</strong><span>Entradas iniciais na fila</span>`)}
      ${card("Autorizadas", `<strong>${flows.filter((flow) => flow.authorized).length}</strong><span>Fluxos liberados pelo administrador</span>`)}
      ${card("Em espera", `<strong>${flows.filter((flow) => !flow.delivered).length}</strong><span>Recebendo despacho ou entrega</span>`)}
      ${card("Com recibo", `<strong>${flows.filter((flow) => Boolean(flow.deliveryEvidence)).length}</strong><span>Comprovantes visíveis</span>`)}
    </section>
    <section class="purchase-board">
      ${columns.map(({ stage, items }) => `<article class="purchase-board-column ${stageTone(stage)}"><header><div><small>${esc(stage)}</small><strong>${items.length}</strong></div><span>${money(items.reduce((sum, flow) => sum + Number(flow.quoted || flow.estimated || 0), 0))}</span></header><div class="purchase-board-list">${items.length ? items.map((flow) => { const work = workById(flow.workId); const item = itemByFlow(flow); return `<button class="purchase-board-card" data-message="open-work-section" data-work-id="${esc(flow.workId)}" data-route="admin-work-purchases"><div class="purchase-card-head"><strong>${esc(flow.title)}</strong><span>${esc(work?.name || "")}</span></div><p>${esc(item?.description || flow.material || "")}</p><div class="purchase-card-foot"><b>${money(flow.quoted || flow.estimated)}</b><small>${esc(flow.requester || "Sem responsável")}</small></div>${flow.deliveryEvidence ? `<em>Recibo: ${esc(flow.deliveryEvidence)}</em>` : `<em>${esc(flow.status)}</em>`}</button>`; }).join("") : `<div class="empty-state"><b>＋</b><h3>Nenhuma compra nesta etapa</h3><p>Os fluxos aparecem aqui assim que avançam no quadro da obra.</p></div>`}</div></article>`).join("")}
    </section>`;
}
