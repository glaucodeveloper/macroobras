import { availableWorks } from "../../core/data.js";
import { selectedWork, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value) => `${Math.round(Number(value || 0))}%`;
const workById = (id) => availableWorks.find((work) => work.id === id);
const activeWork = () => selectedWork() || availableWorks[0];

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div><span class="status-pill ${esc(String(work.status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">${esc(work.status)}</span><strong>${percent(work.progress)}</strong></div></div>`;
}

function serviceItem(item) {
  return !/administra[cç][aã]o/i.test(String(item.description || ""));
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

function serviceLibrary() {
  return availableWorks.flatMap((work, workIndex) => {
    const baseX = 70 + workIndex * 620;
    const services = work.items.filter(serviceItem);
    return services.map((item, itemIndex) => ({
      id: `library-service-${work.id}-${item.id}`,
      kind: "Serviço",
      compact: true,
      summaryOnly: true,
      title: item.description,
      description: `Obra: ${work.name}`,
      observations: "",
      fields: [
        { name: "Obra", value: work.name },
        { name: "Código", value: work.code },
        { name: "Cliente", value: work.client },
        { name: "Orçamento", value: money(item.budget) },
      ],
      x: baseX + (itemIndex % 2) * 290,
      y: 85 + Math.floor(itemIndex / 2) * 245,
      workId: work.id,
      workName: work.name,
      workCode: work.code,
      workClient: work.client,
      workAddress: work.address,
      itemId: item.id,
      budget: item.budget,
    }));
  });
}

function mergedServiceLibrary() {
  const generated = { nodes: serviceLibrary(), edges: [] };
  const saved = state.diagramModels?.["all-work-elements"];
  if (!saved?.nodes?.length) return generated;
  const savedById = new Map(saved.nodes.map((node) => [node.id, node]));
  const canonicalIds = new Set(generated.nodes.map((node) => node.id));
  return {
    nodes: [
      ...generated.nodes.map((node) => ({ ...node, ...(savedById.get(node.id) || {}), summaryOnly: true })),
      ...saved.nodes.filter((node) => !canonicalIds.has(node.id)).map((node) => ({ ...node, summaryOnly: true })),
    ],
    edges: Array.isArray(saved.edges) ? saved.edges : [],
  };
}

function relationDetails(node, model) {
  const relations = (model?.edges || []).filter((edge) => edge.from === node.id || edge.to === node.id);
  if (!relations.length) {
    return `<div class="diagram-relations-empty">Nenhuma relação registrada. Arraste o “+” lateral para criar o primeiro requisito.</div>`;
  }
  return `<div class="diagram-relation-list">${relations.map((edge) => {
    const outgoing = edge.from === node.id;
    const relatedId = outgoing ? edge.to : edge.from;
    const related = model.nodes.find((item) => item.id === relatedId);
    return `<article><span>${outgoing ? "Saída" : "Entrada"}</span><strong>${esc(edge.label || "relação")}</strong><small>${esc(related?.title || relatedId)}</small></article>`;
  }).join("")}</div>`;
}

function nodeEditor(node) {
  const fields = (node.fields || []).map((field) => `<label><span>${esc(field.name || "Campo")}</span><input data-diagram-field-value="${esc(field.name || "Campo")}" value="${esc(field.value || "")}"></label>`).join("");
  return `<form class="diagram-record-form" data-diagram-record-form data-diagram-id="all-work-elements" data-diagram-node-id="${esc(node.id)}">
    <label><span>Nome do registro</span><input data-diagram-record-field="title" value="${esc(node.title || "")}"></label>
    <label><span>Descrição</span><textarea data-diagram-record-field="description">${esc(node.description || "")}</textarea></label>
    <label><span>Observações operacionais</span><textarea data-diagram-record-field="observations">${esc(node.observations || "")}</textarea></label>
    ${fields ? `<fieldset><legend>Identificação e requisitos</legend>${fields}</fieldset>` : ""}
    <button class="btn full" type="button" data-message="save-diagram-record">Salvar no modelo e no OKF</button>
  </form>`;
}

function serviceDetails(node, model) {
  if (!node) {
    return `<div class="diagram-details-empty"><b>Selecione um serviço ou requisito</b><p>Clique em um card para centralizar o registro e abrir seus dados, relações e edição.</p></div>`;
  }

  const work = workById(node.workId);
  const isRequirement = String(node.kind || "").toLowerCase() === "requisito";
  return `
    <div class="diagram-details-hero">
      <small>${isRequirement ? "Requisito selecionado" : "Serviço selecionado"}</small>
      <strong>${esc(node.title || "")}</strong>
      <span>${esc(work?.name || node.workName || "Registro transversal do sistema")}</span>
    </div>
    <dl class="diagram-details-list">
      <div><dt>Tipo</dt><dd>${esc(node.kind || "Registro")}</dd></div>
      <div><dt>Obra</dt><dd>${esc(work?.name || node.workName || "")}</dd></div>
      <div><dt>Código</dt><dd>${esc(work?.code || node.workCode || "")}</dd></div>
      <div><dt>Cliente</dt><dd>${esc(work?.client || node.workClient || "")}</dd></div>
      <div><dt>Endereço</dt><dd>${esc(work?.address || node.workAddress || "")}</dd></div>
      <div><dt>Item</dt><dd>${esc(node.itemId || "")}</dd></div>
      <div><dt>Orçamento</dt><dd>${money(node.budget || 0)}</dd></div>
    </dl>
    <section class="diagram-details-section"><h3>Relações 1:N</h3>${relationDetails(node, model)}</section>
    ${nodeEditor(node)}
    ${work ? `<div class="diagram-details-actions">
      <button class="btn" data-message="open-work-section" data-work-id="${esc(node.workId || work?.id || "")}" data-route="admin-work-overview">Abrir obra</button>
      <button class="btn ghost" data-message="open-work-section" data-work-id="${esc(node.workId || work?.id || "")}" data-route="admin-work-items">Ver itens</button>
    </div>` : ""}`;
}

export function adminDiagramLibrary() {
  const allWorkElements = mergedServiceLibrary();
  const selectedNodeId = state.selectedDiagramNode?.diagramId === "all-work-elements"
    ? state.selectedDiagramNode.nodeId
    : "";
  const selectedNode = allWorkElements.nodes.find((node) => node.id === selectedNodeId) || null;
  const operational = {
    nodes: [
      { id: "sys-login", kind: "Acesso", title: "Login administrativo", description: "Abre a estação e inicia o ngrok automaticamente", x: 70, y: 70 },
      { id: "sys-work", kind: "Obra", title: "Endereço + planilha", description: "Cria a obra e todos os itens de execução", x: 410, y: 70 },
      { id: "sys-plan", kind: "Cronograma", title: "Relações entre atividades", description: "Itens, datas e materiais necessários", x: 750, y: 70 },
      { id: "sys-calendar", kind: "Calendário", title: "Agenda da obra", description: "Gerada pelas datas do cronograma", x: 1090, y: 70 },
      { id: "sys-field", kind: "Campo", title: "Encarregado de obra mobile", description: "Cronograma, diário e comprovação de entrega", x: 750, y: 330 },
      { id: "sys-measure", kind: "Controle", title: "Medição e progresso", description: "Consolida os registros do diário", x: 1090, y: 330 },
    ],
    edges: [
      { id: "sys-e1", from: "sys-login", to: "sys-work", label: "cadastra" },
      { id: "sys-e2", from: "sys-work", to: "sys-plan", label: "disponibiliza itens" },
      { id: "sys-e3", from: "sys-plan", to: "sys-calendar", label: "gera datas" },
      { id: "sys-e4", from: "sys-plan", to: "sys-field", label: "publica cronograma" },
      { id: "sys-e5", from: "sys-field", to: "sys-measure", label: "envia registros" },
    ],
  };
  const purchases = {
    nodes: [
      { id: "buy-item", kind: "Item", title: "Item de execução", description: "Descrição e orçamento alocado", x: 70, y: 90 },
      { id: "buy-request", kind: "Compra", title: "Solicitação", description: "Material, quantidade, unidade e data", x: 390, y: 90 },
      { id: "buy-approve", kind: "Administração", title: "Autorização", description: "Aprovação exclusiva no desktop", x: 710, y: 90 },
      { id: "buy-delivery", kind: "Campo", title: "Entrega", description: "Foto enviada pelo encarregado", x: 1030, y: 90 },
      { id: "buy-complete", kind: "Controle", title: "Sticker completo", description: "Entrega vinculada à obra e ao item", x: 710, y: 350 },
    ],
    edges: [
      { id: "buy-e1", from: "buy-item", to: "buy-request", label: "inicia fluxo" },
      { id: "buy-e2", from: "buy-request", to: "buy-approve", label: "envia para autorização" },
      { id: "buy-e3", from: "buy-approve", to: "buy-delivery", label: "libera compra" },
      { id: "buy-e4", from: "buy-delivery", to: "buy-complete", label: "comprova com foto" },
    ],
  };

  return `${pageHeader("Modelos de diagramas", "Itens importados, materiais e fluxos visuais de funcionamento da estação.")}
    <div class="diagram-sync-note">Edições neste canvas e no organograma alteram os mesmos dados de OKF do sistema.</div>
    <section class="diagram-library-layout">
      ${card("Serviços de todas as obras", `<div class="diagram-help"><span><b>1</b> O mapa abre enquadrado com todos os serviços</span><span><b>2</b> Clique no “+” para criar um requisito conectado</span><span><b>3</b> Arraste o “+” para posicionar ou conectar outro serviço</span><span><b>4</b> Edite relações e detalhes no painel lateral</span></div><div class="interactive-diagram library-elements-diagram" data-interactive-diagram="all-work-elements" data-selected-node-id="${esc(selectedNode?.id || "")}" data-empty-drop-kind="Requisito" data-default-edge-label="requer" data-summary-nodes="true" data-fit-on-load="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(allWorkElements)}</script></div>`, "interactive-diagram-card")}
      ${card("Detalhes do registro", serviceDetails(selectedNode, allWorkElements), "diagram-details-card")}
    </section>
    ${card("Fluxo operacional do sistema", `<div class="interactive-diagram system-flow-diagram" data-interactive-diagram="system-operational" data-fixed-edges="true" data-hide-node-dates="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(operational)}</script></div>`, "interactive-diagram-card diagram-section-gap")}
    ${card("Fluxo de compra e comprovação", `<div class="interactive-diagram system-flow-diagram" data-interactive-diagram="system-purchases" data-fixed-edges="true" data-hide-node-dates="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(purchases)}</script></div>`, "interactive-diagram-card diagram-section-gap")}`;
}
