// MacroObras page architecture v27
// Página: admin-dashboard

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

export function adminDashboard() {
  const totalBudget = availableWorks.reduce((sum, work) => sum + work.budget, 0);
  const measuredValue = availableWorks.reduce((sum, work) => sum + (work.budget * work.progress / 100), 0);
  const consolidatedProgress = totalBudget ? Math.round(measuredValue / totalBudget * 100) : 0;
  const plans = state.visitPlans || [];
  const diaries = availableWorks.map((work, index) => ({
    work,
    day: String(22 - index).padStart(2, "0"),
    month: "JUL",
    title: index === 0 ? "Preparação da base para grama sintética" : index === 1 ? "Movimentação de terra e regularização" : "Instalação e conferência dos refletores",
    detail: index === 2 ? "Registro com evidência fotográfica" : "Registro diário atualizado pela equipe de campo",
  }));

  return `
    ${pageHeader("Painel", "Resumo de medições, visitas, obras e diários de campo.", `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    <section class="dashboard-module-grid">
      <article class="dashboard-module-card measurement-module" data-message="open-work-section" data-work-id="${esc(availableWorks[0]?.id || "")}" data-route="admin-work-measurement" tabindex="0">
        <header><div><small>Medições</small><h2>Balanço das medições</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${percent(consolidatedProgress)}</strong><span>${money(measuredValue)} medidos de ${money(totalBudget)}</span></div>
        <div class="dashboard-module-list">
          ${availableWorks.map((work) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-measurement"><span><strong>${esc(work.name)}</strong><small>${money(work.budget * work.progress / 100)} medidos</small></span><b>${percent(work.progress)}</b></button>`).join("")}
        </div>
      </article>

      <article class="dashboard-module-card visits-module" data-message="navigate" data-route="admin-visits" tabindex="0">
        <header><div><small>Agenda</small><h2>Visitas programadas</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${plans.length}</strong><span>${plans.length === 1 ? "roteiro salvo" : "roteiros salvos"}</span></div>
        <div class="dashboard-module-list">
          ${plans.length ? plans.map((plan) => `<button data-message="navigate" data-route="admin-visits"><span><strong>${esc(plan.name)}</strong><small>${esc(plan.date)} · ${Math.round((plan.travelMinutes + plan.visitMinutes) / 60)} h previstas</small></span><b>Agenda</b></button>`).join("") : `<div class="dashboard-empty"><strong>Nenhuma visita agendada</strong><small>Abra Visitas para criar o primeiro roteiro.</small></div>`}
        </div>
      </article>

      <article class="dashboard-module-card works-module" data-message="navigate" data-route="admin-works" tabindex="0">
        <header><div><small>Obras</small><h2>Obras cadastradas</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${availableWorks.length}</strong><span>obras com medição ativa</span></div>
        <div class="dashboard-module-list">
          ${availableWorks.map((work) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-overview"><span><strong>${esc(work.name)}</strong><small>${esc(work.address)}</small></span><b>${percent(work.progress)}</b></button>`).join("")}
        </div>
      </article>

      <article class="dashboard-module-card diary-module" data-message="open-work-section" data-work-id="${esc(availableWorks[0]?.id || "")}" data-route="admin-work-diary" tabindex="0">
        <header><div><small>Campo</small><h2>Diários de obras</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${diaries.length}</strong><span>obras com registros recentes</span></div>
        <div class="dashboard-module-list diary-dashboard-list">
          ${diaries.map(({ work, day, month, title, detail }) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-diary"><i><b>${esc(day)}</b><small>${esc(month)}</small></i><span><strong>${esc(title)}</strong><small>${esc(work.name)} · ${esc(detail)}</small></span><em>›</em></button>`).join("")}
        </div>
      </article>
    </section>
  `;
}

export default adminDashboard;
