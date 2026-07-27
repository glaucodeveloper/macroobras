// MacroObras page architecture v27
// Página: admin-purchases

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

const workById = (id) => availableWorks.find((work) => work.id === id);

const flowWork = (flow) => workById(flow?.workId);

const flowItem = (flow) => flowWork(flow)?.items.find((item) => item.id === flow?.itemId);

function status(value) {
  const css = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
}

export function adminPurchases() {
  const flows = state.purchaseFlows || [];
  return `${pageHeader("Compras", "Acompanhamento consolidado dos fluxos iniciados nos itens de execução.")}
    <section class="purchase-summary-grid">${["Solicitação", "Aguardando autorização", "Autorizada", "Aguardando entrega", "Entregue com foto"].map((stage) => `<article><small>${esc(stage)}</small><strong>${flows.filter((flow) => flow.status === stage).length}</strong></article>`).join("")}</section>
    ${card("Fluxos de todas as obras", `<div class="table-scroll"><table><thead><tr><th>Obra</th><th>Item</th><th>Fluxo</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>${flows.map((flow) => { const work = flowWork(flow); const item = flowItem(flow); return `<tr><td>${esc(work?.name || "")}</td><td>${esc(item?.description || "")}</td><td><strong>${esc(flow.title)}</strong></td><td>${money(flow.quoted || flow.estimated)}</td><td>${status(flow.status)}</td><td><button class="btn small" data-message="open-work-section" data-work-id="${esc(flow.workId)}" data-route="admin-work-purchases">Abrir</button></td></tr>`; }).join("")}</tbody></table></div>`)} `;
}

export default adminPurchases;
