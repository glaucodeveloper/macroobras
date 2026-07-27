// MacroObras page architecture v27
// Página: admin-work-diary

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

export function adminWorkDiary() {
  const work = activeWork();
  const seed = diagramSeed(work);
  const diarySeed = {
    nodes: seed.nodes.map((node, index) => ({
      ...node,
      kind: `Registro ${String(index + 1).padStart(2, "0")}`,
      description: `${node.fields?.find((field) => field.name === "Data")?.value || "Sem data"} · item do cronograma`,
      observations: "Registro vinculado ao Cronograma.",
    })),
    edges: seed.edges.map((edge) => ({ ...edge, label: "sequência registrada" })),
  };
  return `${workHeader(work, "Diário de obras", "Área gráfica dos itens do Cronograma e da sequência registrada em campo.")}
    ${card("Fluxo registrado da obra", `<div class="interactive-diagram diary-diagram" data-interactive-diagram="diary-${esc(work.id)}" data-fixed-edges="true" data-hide-node-dates="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(diarySeed)}</script></div>`, "interactive-diagram-card diary-graphic-only")}`;
}

export default adminWorkDiary;
