import { availableWorks } from "../../core/data.js";
import { selectedWork, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value) => `${Math.round(Number(value || 0))}%`;
const activeWork = () => selectedWork() || availableWorks[0];

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div><span class="status-pill em-execucao">${esc(work.status)}</span><strong>${percent(work.progress)}</strong></div></div>`;
}

function defaultDate(index) {
  const day = 3 + (index * 3) % 25;
  const month = 8 + Math.floor(index / 7);
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function canonicalNodes(work) {
  const columns = work.items.length > 8 ? 4 : 3;
  return work.items.map((item, index) => ({
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
      { name: "Duração", value: `${Math.max(1, Math.round(Number(item.budget || 0) / 180000))} dias` },
      { name: "Porcentagem apreçada", value: `${Math.max(1, Math.min(100, Math.round(Number(item.budget || 0) / Number(work.budget || 1) * 100)))}%` },
    ],
    budget: item.budget,
    committed: item.committed,
    progress: item.progress,
    x: 55 + (index % columns) * 330,
    y: 55 + Math.floor(index / columns) * 250,
  }));
}

function mergedModel(work) {
  const id = `work-services-${work.id}`;
  const generated = canonicalNodes(work);
  const saved = state.diagramModels?.[id];
  if (!saved?.nodes?.length) return { nodes: generated, edges: [] };

  const savedById = new Map(saved.nodes.map((node) => [node.id, node]));
  const canonicalIds = new Set(generated.map((node) => node.id));

  return {
    nodes: [
      ...generated.map((node) => ({ ...node, ...(savedById.get(node.id) || {}), itemId: node.itemId, workId: node.workId, kind: "Serviço da obra" })),
      ...saved.nodes.filter((node) => !canonicalIds.has(node.id)),
    ],
    edges: Array.isArray(saved.edges) ? saved.edges : [],
  };
}

function selectedNode(model, diagramId) {
  if (state.selectedDiagramNode?.diagramId !== diagramId) return null;
  return model.nodes.find((node) => node.id === state.selectedDiagramNode.nodeId) || null;
}

function fieldsEditor(node) {
  return (node.fields || []).map((field) => `<label><span>${esc(field.name || "Campo")}</span><input data-diagram-field-value="${esc(field.name || "Campo")}" value="${esc(field.value || "")}"></label>`).join("");
}

function nodeEditor(work, diagramId, node) {
  if (!node) {
    return `<div class="diagram-details-empty"><b>Selecione um serviço ou material</b><p>Clique em um card para editar datas, observações, requisitos e ações.</p></div>`;
  }

  const isMaterial = String(node.kind || "").toLowerCase().includes("material");

  return `<div class="diagram-details-hero"><small>${esc(node.kind || "Registro")}</small><strong>${esc(node.title || "")}</strong><span>${esc(work.name)}</span></div>
    <form class="diagram-record-form" data-diagram-record-form data-diagram-id="${esc(diagramId)}" data-diagram-node-id="${esc(node.id)}">
      <label><span>Nome</span><input data-diagram-record-field="title" value="${esc(node.title || "")}"></label>
      <label><span>Descrição</span><textarea data-diagram-record-field="description">${esc(node.description || "")}</textarea></label>
      <label><span>Observação</span><textarea data-diagram-record-field="observations">${esc(node.observations || "")}</textarea></label>
      <fieldset><legend>${isMaterial ? "Quantidade e unidade" : "Planejamento do serviço"}</legend>${fieldsEditor(node)}</fieldset>
      <button class="btn full" type="button" data-message="save-diagram-record">Salvar alterações</button>
    </form>
    <div class="diagram-details-actions">
      <button class="btn" data-message="open-item-diary" data-work-id="${esc(work.id)}" data-item-id="${esc(node.itemId || "")}">Abrir no diário</button>
      <button class="btn ghost" data-message="create-purchase-from-diagram" data-diagram-id="${esc(diagramId)}" data-node-id="${esc(node.id)}">Enviar ordem de compra</button>
    </div>`;
}

export function adminWorkItems() {
  const work = activeWork();
  const diagramId = `work-services-${work.id}`;
  const model = mergedModel(work);
  const node = selectedNode(model, diagramId);

  return `${pageHeader("Itens de execução", "Canvas editável dos serviços da obra. Relações aparecem somente quando forem registradas.", `<button class="btn ghost" data-message="print-current-report">Imprimir canvas</button>`)}
    ${workContext(work)}
    <section class="diagram-library-layout work-service-layout" data-print-report>
      ${card("Canvas dos serviços", `<div class="diagram-help"><span><b>1</b> Arraste os cards para organizar a obra</span><span><b>2</b> Clique no “+” lateral para criar material</span><span><b>3</b> Arraste o “+” até outro card para relacionar</span><span><b>4</b> Se não houver relação, o item fica isolado</span></div><div class="interactive-diagram work-services-diagram" data-interactive-diagram="${esc(diagramId)}" data-selected-node-id="${esc(node?.id || "")}" data-empty-drop-kind="Material" data-default-edge-label="requer" data-fit-on-load="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(model)}</script></div>`, "interactive-diagram-card")}
      ${card("Dados do card", nodeEditor(work, diagramId, node), "diagram-details-card")}
    </section>`;
}
