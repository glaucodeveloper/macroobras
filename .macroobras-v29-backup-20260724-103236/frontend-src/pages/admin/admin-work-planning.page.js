// MacroObras page architecture v27
// Página: admin-work-planning

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

function diagramSeed(work) {
  const columns = work.items.length > 8 ? 4 : 3;
  const nodes = work.items.map((item, index) => ({
    id: item.id,
    kind: "Item da obra",
    title: item.description,
    description: money(item.budget),
    observations: "",
    fields: [{ name: "Data", value: `2026-${String(8 + Math.floor(index / 6)).padStart(2, "0")}-${String(3 + (index * 3) % 25).padStart(2, "0")}` }],
    x: 54 + (index % columns) * 315,
    y: 54 + Math.floor(index / columns) * 225,
  }));
  const edges = nodes.slice(0, -1).filter((_, index) => index < 4).map((node, index) => ({
    id: `seed-${index}`,
    from: node.id,
    to: nodes[index + 1].id,
    label: index % 2 ? "libera atividade" : "precede",
  }));
  return { nodes, edges };
}

export function adminWorkPlanning() {
  const work = activeWork();
  const seed = diagramSeed(work);
  return `${workHeader(work, "Cronograma", "Todos os itens da planilha ficam disponíveis para relações de atividade, datas e requerimentos de materiais.", `<button class="btn" data-message="save-node-plan">Salvar cronograma</button>`)}
    <div class="diagram-help"><span><b>1</b> Arraste o fundo para mover a área</span><span><b>2</b> Arraste os quadros</span><span><b>3</b> Puxe a porta azul até outro quadro</span><span><b>4</b> Solte a linha na área vazia para criar um material</span><span><b>5</b> Edite a relação no meio da seta</span></div>
    ${card("Cronograma gráfico", `<div class="interactive-diagram planning-diagram" data-interactive-diagram="planning-${esc(work.id)}" data-allow-material-drop="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(seed)}</script></div>`, "interactive-diagram-card")}`;
}

export default adminWorkPlanning;
