// MacroObras page architecture v27
// Página: admin-work-items

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

const activeWork = () => selectedWork() || availableWorks[0];

function status(value) {
  const css = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
}

function progress(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="progress-track"><span style="width:${safe}%"></span></div>`;
}

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div>${status(work.status)}<strong>${percent(work.progress)}</strong></div></div>`;
}

function workHeader(work, title, subtitle, actions = "") {
  return `${pageHeader(title, subtitle, actions)}${workContext(work)}`;
}

export function adminWorkItems() {
  const work = activeWork();
  return `${workHeader(work, "Itens de execução", "Cada item veio da planilha com descrição e orçamento alocado.")}
    ${card("Itens importados", `<div class="table-scroll"><table class="items-table"><thead><tr><th>Descrição</th><th>Orçamento alocado</th><th>Comprometido</th><th>Saldo</th><th>Execução</th><th>Ação</th></tr></thead><tbody>${work.items.map((item) => `<tr><td><strong>${esc(item.description)}</strong></td><td>${money(item.budget)}</td><td>${money(item.committed)}</td><td>${money(item.budget - item.committed)}</td><td>${progress(item.progress)}<small>${percent(item.progress)}</small></td><td><button class="btn small" data-message="start-purchase" data-item-id="${esc(item.id)}">Iniciar compra</button></td></tr>`).join("")}</tbody></table></div>`)} `;
}

export default adminWorkItems;
