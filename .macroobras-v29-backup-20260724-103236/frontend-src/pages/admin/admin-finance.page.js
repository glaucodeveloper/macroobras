// MacroObras page architecture v27
// Página: admin-finance

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

function progress(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="progress-track"><span style="width:${safe}%"></span></div>`;
}

function kpi(label, value, detail, tone = "blue") {
  return `<article class="metric-card ${tone}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(detail)}</span></article>`;
}

export function adminFinance() {
  const total = availableWorks.reduce((sum, work) => sum + Number(work.budget || 0), 0);
  const executed = availableWorks.reduce((sum, work) => sum + Number(work.budget || 0) * Number(work.progress || 0) / 100, 0);
  return `${pageHeader("Financeiro", "Quantitativo de valor das obras e evolução registrada por data.")}
    <section class="metric-grid compact">${kpi("Valor total das obras", money(total), `${availableWorks.length} obras`)}${kpi("Valor proporcional executado", money(executed), percent(executed / total * 100), "green")}</section>
    <section class="finance-work-grid">${availableWorks.map((work) => `<article class="finance-work-card"><header><div><small>${esc(work.code)}</small><h2>${esc(work.name)}</h2><span>Incluída em ${esc(work.includedAt || "—")}</span></div><strong>${money(work.budget)}</strong></header><div class="finance-progress-summary"><span><small>Progresso atual</small><b>${percent(work.progress)}</b></span><span><small>Valor proporcional</small><b>${money(work.budget * work.progress / 100)}</b></span></div><div class="vertical-progress-timeline">${(work.progressHistory || []).map((entry, index) => `<div class="finance-timeline-entry"><i></i><time>${esc(entry.date)}</time><span><strong>${percent(entry.progress)}</strong><small>${money(work.budget * entry.progress / 100)}</small></span></div>`).join("")}</div></article>`).join("")}</section>`;
}

export default adminFinance;
