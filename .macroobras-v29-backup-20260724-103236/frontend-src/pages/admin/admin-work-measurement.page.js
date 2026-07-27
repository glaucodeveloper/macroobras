// MacroObras page architecture v27
// Página: admin-work-measurement

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

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div>${status(work.status)}<strong>${percent(work.progress)}</strong></div></div>`;
}

function workHeader(work, title, subtitle, actions = "") {
  return `${pageHeader(title, subtitle, actions)}${workContext(work)}`;
}

export function adminWorkMeasurement() {
  const work = activeWork();
  return `${workHeader(work, "Medição", "Execução física e financeira vinculada aos itens e provas do diário.")}
    ${card("Medição administrativa", `<div class="table-scroll"><table><thead><tr><th>Item</th><th>Orçamento</th><th>Execução</th><th>Valor executado</th><th>Diários</th></tr></thead><tbody>${work.items.map((item, index) => `<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td><td><label class="percent-input"><input value="${item.progress}">%</label></td><td>${money(item.budget * item.progress / 100)}</td><td><button class="table-link">${index % 3 + 1} registros</button></td></tr>`).join("")}</tbody></table></div>`)} `;
}

export default adminWorkMeasurement;
