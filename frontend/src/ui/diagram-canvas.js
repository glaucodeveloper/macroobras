const diagramModels = new Map();
const diagramCanvases = new Map();

function htmlEscape(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeNode(node) {
  return {
    observations: "",
    fields: [],
    ...node,
    fields: Array.isArray(node.fields) ? node.fields : [],
  };
}

function createModel(id, seed) {
  if (!diagramModels.has(id)) {
    diagramModels.set(id, {
      nodes: (seed.nodes || []).map(normalizeNode),
      edges: clone(seed.edges || []),
    });
  }
  return diagramModels.get(id);
}

export function getDiagramModel(id) {
  const model = diagramModels.get(id);
  return model ? clone(model) : null;
}

export function addNodeToDiagram(id, node) {
  const model = diagramModels.get(id);
  const canvas = diagramCanvases.get(id);
  if (!model || !canvas) return false;
  model.nodes.push(normalizeNode(node));
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
  requestAnimationFrame(() => canvas.querySelector(`[data-node-title="${CSS.escape(node.id)}"]`)?.focus());
  return true;
}

function scaleOf(canvas) {
  return Math.max(0.55, Math.min(1.85, Number(canvas.dataset.diagramZoom || 1)));
}

function setScale(canvas, value) {
  const scale = Math.max(0.55, Math.min(1.85, Number(value || 1)));
  canvas.dataset.diagramZoom = String(scale);
  const svg = canvas.querySelector("[data-diagram-svg]");
  const layer = canvas.querySelector("[data-node-layer]");
  if (svg) svg.style.zoom = String(scale);
  if (layer) layer.style.zoom = String(scale);
  const indicator = canvas.parentElement?.querySelector("[data-diagram-zoom-value]");
  if (indicator) indicator.textContent = `${Math.round(scale * 100)}%`;
}

function clientToWorld(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = scaleOf(canvas);
  return {
    x: (clientX - rect.left + canvas.scrollLeft) / scale,
    y: (clientY - rect.top + canvas.scrollTop) / scale,
  };
}

function pathD(source, target) {
  const delta = Math.max(70, Math.abs(target.x - source.x) * 0.45);
  return `M ${source.x} ${source.y} C ${source.x + delta} ${source.y}, ${target.x - delta} ${target.y}, ${target.x} ${target.y}`;
}

function nodePoint(canvas, modelNode, side) {
  const element = canvas.querySelector(`[data-node-id="${CSS.escape(modelNode.id)}"]`);
  const width = element?.offsetWidth || 260;
  const height = element?.offsetHeight || 180;
  return {
    x: Number(modelNode.x || 0) + (side === "source" ? width : 0),
    y: Number(modelNode.y || 0) + height / 2,
  };
}

function updateEdges(canvas, model) {
  model.edges.forEach((edge) => {
    const sourceNode = model.nodes.find((node) => node.id === edge.from);
    const targetNode = model.nodes.find((node) => node.id === edge.to);
    const path = canvas.querySelector(`[data-edge-path="${CSS.escape(edge.id)}"]`);
    const label = canvas.querySelector(`[data-edge-label="${CSS.escape(edge.id)}"]`);
    if (!sourceNode || !targetNode || !path) return;
    const source = nodePoint(canvas, sourceNode, "source");
    const target = nodePoint(canvas, targetNode, "target");
    path.setAttribute("d", pathD(source, target));
    if (label) {
      label.style.left = `${(source.x + target.x) / 2}px`;
      label.style.top = `${(source.y + target.y) / 2}px`;
    }
  });
}

function targetAtPoint(canvas, x, y) {
  return document.elementsFromPoint(x, y)
    .map((element) => element.closest?.("[data-diagram-node]"))
    .find((element) => element && canvas.contains(element)) || null;
}

function dispatchChange(canvas, model) {
  canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", {
    bubbles: true,
    detail: { id: canvas.dataset.interactiveDiagram, model: clone(model) },
  }));
}

function addEdge(canvas, model, from, to, label = "relação") {
  if (!from || !to || from === to) return;
  if (model.edges.some((edge) => edge.from === from && edge.to === to)) return;
  model.edges.push({ id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from, to, label });
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
}

function addMaterialNode(canvas, model, from, point) {
  const id = `material-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  model.nodes.push(normalizeNode({
    id,
    kind: "Material",
    material: true,
    editableTitle: true,
    title: "Material necessário",
    description: "Requerimento de material ou insumo.",
    observations: "",
    fields: [{ name: "Quantidade", value: "" }],
    x: Math.max(18, point.x - 70),
    y: Math.max(18, point.y - 65),
  }));
  model.edges.push({ id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from, to: id, label: "requer material" });
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
  requestAnimationFrame(() => {
    const input = canvas.querySelector(`[data-node-title="${CSS.escape(id)}"]`);
    input?.focus();
    input?.select();
  });
}

function bindNodeDrag(canvas, model) {
  canvas.querySelectorAll("[data-diagram-node]").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("input,textarea,button,[data-edge-handle]")) return;
      event.preventDefault();
      const data = model.nodes.find((item) => item.id === node.dataset.nodeId);
      if (!data) return;
      const start = clientToWorld(canvas, event.clientX, event.clientY);
      const offsetX = start.x - Number(data.x || 0);
      const offsetY = start.y - Number(data.y || 0);
      node.classList.add("dragging");
      const move = (moveEvent) => {
        const point = clientToWorld(canvas, moveEvent.clientX, moveEvent.clientY);
        const x = Math.max(8, point.x - offsetX);
        const y = Math.max(8, point.y - offsetY);
        data.x = x;
        data.y = y;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        updateEdges(canvas, model);
      };
      const up = () => {
        node.classList.remove("dragging");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        dispatchChange(canvas, model);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  });
}

function bindEdgeDrag(canvas, model) {
  canvas.querySelectorAll("[data-edge-handle]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      const sourceElement = handle.closest("[data-diagram-node]");
      const sourceNode = model.nodes.find((node) => node.id === sourceElement?.dataset.nodeId);
      if (!sourceNode) return;
      const source = nodePoint(canvas, sourceNode, "source");
      const preview = canvas.querySelector("[data-edge-preview]");
      preview.hidden = false;
      canvas.classList.add("creating-edge");
      const move = (moveEvent) => {
        const targetPoint = clientToWorld(canvas, moveEvent.clientX, moveEvent.clientY);
        preview.setAttribute("d", pathD(source, targetPoint));
        const target = targetAtPoint(canvas, moveEvent.clientX, moveEvent.clientY);
        canvas.classList.toggle("material-drop-active", !target && canvas.dataset.allowMaterialDrop === "true");
        canvas.querySelectorAll("[data-diagram-node]").forEach((node) => node.classList.toggle("edge-target", node === target && node !== sourceElement));
      };
      const up = (upEvent) => {
        const target = targetAtPoint(canvas, upEvent.clientX, upEvent.clientY);
        const worldPoint = clientToWorld(canvas, upEvent.clientX, upEvent.clientY);
        preview.hidden = true;
        preview.removeAttribute("d");
        canvas.classList.remove("creating-edge", "material-drop-active");
        canvas.querySelectorAll(".edge-target").forEach((node) => node.classList.remove("edge-target"));
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (target) addEdge(canvas, model, sourceNode.id, target.dataset.nodeId);
        else if (canvas.dataset.allowMaterialDrop === "true") addMaterialNode(canvas, model, sourceNode.id, worldPoint);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  });
}

function bindCanvasPan(canvas) {
  if (canvas.dataset.panBound) return;
  canvas.dataset.panBound = "true";
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("[data-diagram-node], .diagram-edge-label, input, textarea, button")) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = canvas.scrollLeft;
    const startTop = canvas.scrollTop;
    canvas.classList.add("panning");
    const move = (moveEvent) => {
      canvas.scrollLeft = startLeft - (moveEvent.clientX - startX);
      canvas.scrollTop = startTop - (moveEvent.clientY - startY);
    };
    const up = () => {
      canvas.classList.remove("panning");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });
}

function bindWheelZoom(canvas, model) {
  if (canvas.dataset.wheelZoom !== "true" || canvas.dataset.wheelBound) return;
  canvas.dataset.wheelBound = "true";
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const oldScale = scaleOf(canvas);
    const point = clientToWorld(canvas, event.clientX, event.clientY);
    const next = Math.max(0.55, Math.min(1.85, oldScale + (event.deltaY < 0 ? 0.1 : -0.1)));
    setScale(canvas, next);
    const rect = canvas.getBoundingClientRect();
    canvas.scrollLeft = point.x * next - (event.clientX - rect.left);
    canvas.scrollTop = point.y * next - (event.clientY - rect.top);
    updateEdges(canvas, model);
  }, { passive: false });
}

function bindInputs(canvas, model) {
  canvas.querySelectorAll("[data-node-title]").forEach((input) => input.addEventListener("input", () => {
    const node = model.nodes.find((item) => item.id === input.dataset.nodeTitle);
    if (node) node.title = input.value;
    dispatchChange(canvas, model);
  }));
  canvas.querySelectorAll("[data-node-observations]").forEach((input) => input.addEventListener("input", () => {
    const node = model.nodes.find((item) => item.id === input.dataset.nodeObservations);
    if (node) node.observations = input.value;
    dispatchChange(canvas, model);
  }));
  canvas.querySelectorAll("[data-node-description]").forEach((input) => input.addEventListener("input", () => {
    const node = model.nodes.find((item) => item.id === input.dataset.nodeDescription);
    if (node) node.description = input.value;
    dispatchChange(canvas, model);
  }));
  canvas.querySelectorAll("[data-node-field-name], [data-node-field-value]").forEach((input) => input.addEventListener("input", () => {
    const nodeId = input.dataset.nodeFieldName || input.dataset.nodeFieldValue;
    const node = model.nodes.find((item) => item.id === nodeId);
    const field = node?.fields?.[Number(input.dataset.fieldIndex || 0)];
    if (!field) return;
    if (input.dataset.nodeFieldName) field.name = input.value;
    else field.value = input.value;
    dispatchChange(canvas, model);
  }));
  canvas.querySelectorAll("[data-add-node-field]").forEach((button) => button.addEventListener("click", () => {
    const node = model.nodes.find((item) => item.id === button.dataset.addNodeField);
    if (!node) return;
    node.fields ||= [];
    node.fields.push({ name: "Campo", value: "" });
    renderDiagram(canvas, model);
    dispatchChange(canvas, model);
  }));
  canvas.querySelectorAll("[data-remove-node-field]").forEach((button) => button.addEventListener("click", () => {
    const node = model.nodes.find((item) => item.id === button.dataset.removeNodeField);
    if (!node) return;
    node.fields.splice(Number(button.dataset.fieldIndex || 0), 1);
    renderDiagram(canvas, model);
    dispatchChange(canvas, model);
  }));
}

function nodeHtml(node) {
  const fields = (node.fields || []).map((field, index) => `<div class="node-custom-field"><input data-node-field-name="${htmlEscape(node.id)}" data-field-index="${index}" value="${htmlEscape(field.name || "Campo")}" aria-label="Nome do campo"><input data-node-field-value="${htmlEscape(node.id)}" data-field-index="${index}" value="${htmlEscape(field.value || "")}" aria-label="Valor do campo"><button type="button" data-remove-node-field="${htmlEscape(node.id)}" data-field-index="${index}" aria-label="Remover campo">×</button></div>`).join("");
  return `<article class="interactive-node ${node.material ? "material-node" : ""}" data-diagram-node data-node-id="${htmlEscape(node.id)}" style="left:${Number(node.x || 0)}px;top:${Number(node.y || 0)}px">
    <span class="edge-port in" aria-hidden="true"></span>
    <header><small>${htmlEscape(node.kind || "Quadro")}</small>${node.material || node.editableTitle ? `<input data-node-title="${htmlEscape(node.id)}" value="${htmlEscape(node.title)}" aria-label="Título do quadro">` : `<strong>${htmlEscape(node.title)}</strong>`}</header>
    ${node.material ? `<textarea data-node-description="${htmlEscape(node.id)}" aria-label="Descrição">${htmlEscape(node.description || "")}</textarea>` : `<p>${htmlEscape(node.description || "")}</p>`}
    <label class="node-observations">Observações<textarea data-node-observations="${htmlEscape(node.id)}" placeholder="Observações do quadro">${htmlEscape(node.observations || "")}</textarea></label>
    <div class="node-custom-fields">${fields}</div>
    <button type="button" class="add-node-field" data-add-node-field="${htmlEscape(node.id)}">＋ Adicionar campo</button>
    ${node.fixed ? "" : `<button class="edge-port out" data-edge-handle type="button" aria-label="Arrastar nova seta"><span>＋</span></button>`}
  </article>`;
}

function renderDiagram(canvas, model) {
  const svg = canvas.querySelector("[data-diagram-svg]");
  const nodeLayer = canvas.querySelector("[data-node-layer]");
  const fixedEdges = canvas.dataset.fixedEdges === "true";
  model.nodes.forEach((node) => { if (fixedEdges) node.fixed = true; else delete node.fixed; });
  const markerId = `diagram-arrow-${canvas.dataset.interactiveDiagram.replace(/[^a-z0-9_-]/gi, "-")}`;
  const worldWidth = Math.max(1600, ...model.nodes.map((node) => Number(node.x || 0) + 390));
  const worldHeight = Math.max(1000, ...model.nodes.map((node) => Number(node.y || 0) + 330));
  svg.style.width = `${worldWidth}px`;
  svg.style.height = `${worldHeight}px`;
  nodeLayer.style.width = `${worldWidth}px`;
  nodeLayer.style.height = `${worldHeight}px`;
  svg.innerHTML = `<defs><marker id="${markerId}" markerWidth="11" markerHeight="11" refX="9" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L10,4 z"></path></marker></defs>${model.edges.map((edge) => `<path class="diagram-edge" data-edge-path="${htmlEscape(edge.id)}" marker-end="url(#${markerId})"></path>`).join("")}<path class="diagram-edge-preview" data-edge-preview hidden marker-end="url(#${markerId})"></path>`;
  nodeLayer.innerHTML = model.nodes.map(nodeHtml).join("");
  model.edges.forEach((edge) => {
    const label = fixedEdges ? document.createElement("span") : document.createElement("input");
    label.className = fixedEdges ? "diagram-edge-label fixed" : "diagram-edge-label";
    label.dataset.edgeLabel = edge.id;
    if (fixedEdges) label.textContent = edge.label || "relação";
    else {
      label.value = edge.label || "relação";
      label.title = "Edite a relação entre os quadros";
      label.setAttribute("aria-label", "Relação entre quadros");
      label.addEventListener("input", () => { edge.label = label.value; dispatchChange(canvas, model); });
      label.addEventListener("dblclick", () => {
        model.edges = model.edges.filter((item) => item.id !== edge.id);
        renderDiagram(canvas, model);
        dispatchChange(canvas, model);
      });
    }
    nodeLayer.appendChild(label);
  });
  setScale(canvas, scaleOf(canvas));
  bindCanvasPan(canvas);
  bindWheelZoom(canvas, model);
  bindNodeDrag(canvas, model);
  if (!fixedEdges) bindEdgeDrag(canvas, model);
  bindInputs(canvas, model);
  updateEdges(canvas, model);
}

export function hydrateDiagramCanvases(root = document) {
  root.querySelectorAll("[data-interactive-diagram]").forEach((canvas) => {
    if (canvas.dataset.hydrated) return;
    canvas.dataset.hydrated = "true";
    const id = canvas.dataset.interactiveDiagram;
    const seed = JSON.parse(canvas.querySelector("script[type='application/json']")?.textContent || '{"nodes":[],"edges":[]}');
    const model = createModel(id, seed);
    diagramCanvases.set(id, canvas);
    renderDiagram(canvas, model);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => updateEdges(canvas, model)) : null;
    observer?.observe(canvas);
  });
}
