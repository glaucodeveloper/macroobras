// MacroObras page architecture v27
// Página: admin-work-calendar

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

export function adminWorkCalendar() {
  const work = activeWork();
  const days = ["Seg 03/08", "Ter 04/08", "Qua 05/08", "Qui 06/08", "Sex 07/08", "Sáb 08/08"];
  const rows = work.items.slice(0, 6);
  return `${workHeader(work, "Calendário", "Visualização gerada pelas datas preenchidas no Cronograma.", `<button class="btn ghost">Exportar</button><button class="btn" data-message="navigate" data-route="admin-work-planning">Editar cronograma</button>`)}
    <div class="calendar-origin"><b>↗</b><span>Origem</span><strong>Cronograma</strong><small>Arraste o fundo da grade para navegar horizontal e verticalmente.</small></div>
    ${card("Semana da obra", `<div class="node-calendar pan-surface" data-pan-surface><div class="calendar-head"><strong>Item</strong>${days.map((day) => `<strong>${day}</strong>`).join("")}</div>${rows.map((item, rowIndex) => `<div class="calendar-row"><aside><strong>${esc(item.description)}</strong><small>${money(item.budget)}</small></aside>${days.map((day, dayIndex) => `<div>${dayIndex === rowIndex % days.length ? `<span class="calendar-allocation tone-${rowIndex % 4}"><b>${esc(item.description)}</b><small>Data do quadro</small></span>` : ""}</div>`).join("")}</div>`).join("")}</div>`)} `;
}

export default adminWorkCalendar;
