import { availableWorks } from "../../core/data.js";
import { selectedWork, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import {
  formatPercent,
  itemOfficialPercentage,
  itemPricedPercentage,
  workOfficialPercentage,
} from "../../core/work-metrics.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function defaultDate(index) {
  const date = new Date();
  date.setDate(date.getDate() + index * 2);
  return date.toISOString().slice(0, 10);
}

function modelFor(work) {
  const id = `work-services-${work.id}`;
  const columns = work.items.length > 8 ? 4 : 3;
  const generated = work.items.map((item, index) => ({
    id: `work-service-${work.id}-${item.id}`,
    itemId: item.id,
    workId: work.id,
    kind: "Serviço da obra",
    title: item.description,
    description: `Orçamento alocado: ${money(item.budget)}`,
    observations: "",
    editableTitle: true,
    fields: [
      { name: "Data inicial", value: defaultDate(index) },
      { name: "Duração", value: `${Math.max(1, Math.round(Number(item.budget || 0) / 160000))} dias` },
      { name: "Porcentagem apreçada", value: formatPercent(itemPricedPercentage(work, item), 2) },
      { name: "Anexos", value: String(state.diaryAttachmentCounts?.[`${work.id}:${item.id}`] || 0) },
    ],
    budget: item.budget,
    x: 55 + (index % columns) * 330,
    y: 55 + Math.floor(index / columns) * 250,
  }));
  const saved = state.diagramModels?.[id];
  if (!saved?.nodes?.length) return { nodes: generated, edges: [] };

  const savedById = new Map(saved.nodes.map((node) => [node.id, node]));
  const generatedIds = new Set(generated.map((node) => node.id));
  return {
    nodes: [
      ...generated.map((node) => ({ ...node, ...(savedById.get(node.id) || {}), itemId: node.itemId, workId: node.workId })),
      ...saved.nodes.filter((node) => !generatedIds.has(node.id)),
    ],
    edges: Array.isArray(saved.edges) ? saved.edges : [],
  };
}

function selectedNode(model, diagramId) {
  if (state.selectedDiagramNode?.diagramId !== diagramId) return null;
  return model.nodes.find((node) => node.id === state.selectedDiagramNode.nodeId) || null;
}

function editor(work, diagramId, node) {
  if (!node) {
    return `<div class="diagram-details-empty">
      <b>Selecione um serviço ou material</b>
      <p>O “+” lateral cria material ou inicia uma relação. Nenhuma relação é presumida.</p>
    </div>`;
  }

  const item = work.items.find((candidate) => candidate.id === node.itemId);
  return `<div class="diagram-details-hero">
      <small>${esc(node.kind || "Registro")}</small>
      <strong>${esc(node.title || "")}</strong>
      <span>${esc(work.name)}</span>
    </div>

    <form
      class="diagram-record-form"
      data-diagram-record-form
      data-diagram-id="${esc(diagramId)}"
      data-diagram-node-id="${esc(node.id)}"
    >
      <label><span>Nome</span><input data-diagram-record-field="title" value="${esc(node.title || "")}"></label>
      <label><span>Descrição</span><textarea data-diagram-record-field="description">${esc(node.description || "")}</textarea></label>
      <label><span>Observação</span><textarea data-diagram-record-field="observations">${esc(node.observations || "")}</textarea></label>

      <fieldset>
        <legend>${item ? "Planejamento do serviço" : "Material ou requisito"}</legend>
        ${(node.fields || []).map((field) => `
          <label>
            <span>${esc(field.name || "Campo")}</span>
            <input
              data-diagram-field-value="${esc(field.name || "Campo")}"
              value="${esc(field.value || "")}"
              ${field.name === "Porcentagem apreçada" ? "readonly" : ""}
            >
          </label>
        `).join("")}
      </fieldset>

      ${item ? `
        <div class="service-percentage-summary">
          <span>Porcentagem apreçada<strong>${formatPercent(itemPricedPercentage(work, item), 2)}</strong></span>
          <span>Medição oficial<strong>${formatPercent(itemOfficialPercentage(state, work.id, item.id), 2)}</strong></span>
        </div>
      ` : ""}

      <button class="btn full" type="button" data-message="save-diagram-record">Salvar alterações</button>
    </form>

    <div class="diagram-details-actions">
      ${item ? `
        <button
          class="btn"
          data-message="open-item-diary"
          data-work-id="${esc(work.id)}"
          data-item-id="${esc(item.id)}"
        >
          Abrir dia e serviço no diário
        </button>
      ` : ""}
      <button
        class="btn ghost"
        data-message="create-purchase-from-diagram"
        data-diagram-id="${esc(diagramId)}"
        data-node-id="${esc(node.id)}"
      >
        Enviar ordem de compra
      </button>
    </div>`;
}

export function adminWorkItems() {
  const work = selectedWork() || availableWorks[0];
  const diagramId = `work-services-${work.id}`;
  const model = modelFor(work);
  const node = selectedNode(model, diagramId);

  return `${pageHeader(
    "Itens de execução",
    "Canvas dos serviços. O peso financeiro e a medição são percentuais distintos.",
    `<button class="btn ghost" data-message="print-current-report">Exportar / imprimir PDF</button>`,
  )}
    <div class="work-context">
      <div>
        <small>Obra ativa</small>
        <strong>${esc(work.name)}</strong>
        <span>${esc(work.address)}</span>
      </div>
      <div>
        <span class="status-pill em-execucao">${esc(work.status)}</span>
        <strong>${formatPercent(workOfficialPercentage(state, work), 2)}</strong>
      </div>
    </div>

    <section
      class="diagram-library-layout work-service-layout"
      data-print-report
      data-print-title="Itens de execução - ${esc(work.code)}"
    >
      ${card("Canvas dos serviços", `
        <div class="diagram-help">
          <span><b>1</b> Arraste os cards</span>
          <span><b>2</b> Clique no “+” lateral para material</span>
          <span><b>3</b> Arraste o “+” para relacionar</span>
          <span><b>4</b> Duplo clique na linha para remover</span>
        </div>
        <div
          class="interactive-diagram work-services-diagram"
          data-interactive-diagram="${esc(diagramId)}"
          data-selected-node-id="${esc(node?.id || "")}"
          data-empty-drop-kind="Material"
          data-default-edge-label="requer"
          data-fit-on-load="true"
          data-wheel-zoom="true"
          data-print-title="Relações dos serviços - ${esc(work.code)}"
        >
          <svg data-diagram-svg></svg>
          <div data-node-layer></div>
          <script type="application/json">${JSON.stringify(model)}</script>
        </div>
      `, "interactive-diagram-card")}

      ${card("Dados do card", editor(work, diagramId, node), "diagram-details-card")}
    </section>`;
}
