// MacroObras page architecture v27
// Página: admin-work-purchases

import {
  availableWorks,
  budgetImportPreview,
  mobileUsers,
} from "../../core/data.js";
import {
  selectedPurchaseFlow,
  selectedVisitPlan,
  selectedWork,
  state,
} from "../../core/machine-state.js";
import { esc } from "../../core/utils.js";
import { card, formStep, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const percent = (value) => `${Math.round(Number(value || 0))}%`;

const workById = (id) => availableWorks.find((work) => work.id === id);

const activeWork = () => selectedWork() || availableWorks[0];

const flowWork = (flow) => workById(flow?.workId);

const flowItem = (flow) => flowWork(flow)?.items.find((item) => item.id === flow?.itemId);

function status(value) {
  const css = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
}

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div>${status(work.status)}<strong>${percent(work.progress)}</strong></div></div>`;
}

function workHeader(work, title, subtitle, actions = "") {
  return `${pageHeader(title, subtitle, actions)}${workContext(work)}`;
}

export function adminWorkPurchases() {
  const work = activeWork();
  const flows = state.purchaseFlows.filter((flow) => flow.workId === work.id);
  const selected = selectedPurchaseFlow();
  const flow = selected?.workId === work.id ? selected : flows[0];
  if (!flow) {
    return `${workHeader(work, "Compras", "Os fluxos são iniciados nos itens de execução.", `<button class="btn" data-message="navigate" data-route="admin-work-items">Escolher item</button>`)}${card("Nenhum fluxo iniciado", `<div class="empty-state"><b>＋</b><h3>Inicie uma compra em Itens de execução</h3><p>O primeiro sticker receberá automaticamente o item e o orçamento da planilha.</p></div>`)}`;
  }
  const item = flowItem(flow);
  const quoteComplete = Number(flow.quoted) > 0;
  return `${workHeader(work, "Compras", "Stickers conectados guiam o fluxo até a comprovação da entrega.", `<button class="btn ghost" data-message="navigate" data-route="admin-work-items">Novo fluxo por item</button>`)}
    <div class="purchase-layout">
      <aside class="purchase-sidebar"><h3>Fluxos da obra</h3>${flows.map((candidate) => `<button class="purchase-row ${candidate.id === flow.id ? "active" : ""}" data-message="select-work-purchase" data-flow-id="${esc(candidate.id)}">${status(candidate.status)}<strong>${esc(candidate.title)}</strong><small>${esc(flowItem(candidate)?.description || "")}</small></button>`).join("")}</aside>
      <section>
        <div class="flow-context"><div><small>Item da planilha</small><strong>${esc(item?.description || "")}</strong></div><div><small>Orçamento alocado</small><strong>${money(item?.budget || 0)}</strong></div><div><small>Valor estimado</small><strong>${money(flow.estimated)}</strong></div><div><small>Saldo do item</small><strong>${money((item?.budget || 0) - (item?.committed || 0))}</strong></div></div>
        <div class="sticker-flow">
          ${sticker("Item de execução", "01", `<p>${esc(item?.description || "")}</p><strong>${money(item?.budget || 0)}</strong><small>Origem: planilha da obra</small>`, "complete")}
          ${sticker("Solicitação", "02", `<label>Material ou serviço<input data-flow-field="material" value="${esc(flow.material)}" placeholder="Descrever"></label><div class="sticker-split"><label>Quantidade<input data-flow-field="quantity" value="${esc(flow.quantity)}"></label><label>Unidade<input data-flow-field="unit" value="${esc(flow.unit)}"></label></div><label>Data necessária<input data-flow-field="neededAt" value="${esc(flow.neededAt)}"></label><label>Solicitante<input data-flow-field="requester" value="${esc(flow.requester)}"></label><label>Valor estimado<input data-flow-field="estimated" value="${Number(flow.estimated || 0)}" type="number" min="0" step="0.01"></label>`, flow.material ? "complete" : "active")}
          ${sticker("Cotação", "03", `<label>Fornecedor<input data-flow-field="supplier" value="${esc(flow.supplier)}" placeholder="Fornecedor"></label><label>Valor cotado<input data-flow-field="quoted" value="${Number(flow.quoted || 0)}" type="number" min="0" step="0.01"></label><button class="sticker-action" data-message="advance-purchase" data-stage="quote">Registrar cotação</button>`, quoteComplete ? "complete" : "active")}
          ${sticker("Autorização", "04", `<p>Exclusiva do administrador no desktop.</p><strong>${flow.authorized ? "Autorizada" : "Aguardando autorização"}</strong><button class="sticker-action" data-message="approve-purchase" ${flow.authorized ? "disabled" : ""}>${flow.authorized ? "Autorizado" : "Autorizar compra"}</button>`, flow.authorized ? "complete" : "locked")}
          ${sticker("Compra", "05", `<label>Pedido<input value="${flow.ordered ? `PED-${flow.id.slice(-4).toUpperCase()}` : ""}" placeholder="Pedido"></label><label>Pagamento<input data-flow-field="paid" value="${Number(flow.paid || 0)}" type="number" min="0" step="0.01"></label><button class="sticker-action" data-message="advance-purchase" data-stage="order">Registrar compra</button>`, flow.ordered ? "complete" : "locked")}
          ${sticker("Transporte", "06", `<label>Situação<input data-flow-field="transport" value="${esc(flow.transport)}"></label><button class="sticker-action" data-message="advance-purchase" data-stage="transport">Atualizar transporte</button>`, flow.transport !== "Não iniciado" ? "complete" : "locked")}
          ${sticker("Entrega", "07", flow.delivered ? `<div class="delivery-proof complete"><b>✓</b><strong>Foto recebida</strong><small>${esc(flow.deliveryEvidence)}</small></div>` : `<div class="delivery-proof empty"><b>＋</b><strong>Lacuna de entrega</strong><small>Preenchida somente pela foto enviada pelo encarregado no acesso mobile.</small></div><button class="sticker-action" data-message="navigate" data-route="admin-work-access">Abrir acessos da obra</button>`, flow.delivered ? "complete" : "waiting")}
        </div>
      </section>
    </div>`;
}

export default adminWorkPurchases;
