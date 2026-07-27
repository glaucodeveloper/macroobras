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

export function focusDiagramNode(id, nodeId) {
  const canvas = diagramCanvases.get(id) || document.querySelector(`[data-interactive-diagram="${CSS.escape(id)}"]`);
  if (!canvas) return;
  const node = canvas.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`);
  if (!node) return;
  const canvasRect = canvas.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const deltaX = (nodeRect.left + nodeRect.width / 2) - (canvasRect.left + canvasRect.width / 2);
  const deltaY = (nodeRect.top + nodeRect.height / 2) - (canvasRect.top + canvasRect.height / 2);
  if (typeof canvas.scrollTo === "function") {
    canvas.scrollTo({ left: canvas.scrollLeft + deltaX, top: canvas.scrollTop + deltaY, behavior: "smooth" });
  } else {
    canvas.scrollLeft += deltaX;
    canvas.scrollTop += deltaY;
  }
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

export function updateDiagramNode(id, nodeId, patch) {
  const model = diagramModels.get(id);
  const canvas = diagramCanvases.get(id);
  const node = model?.nodes.find((item) => item.id === nodeId);
  if (!model || !canvas || !node) return false;
  Object.assign(node, normalizeNode({ ...node, ...patch }));
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
  dispatchSelection(canvas, node);
  return true;
}

export function removeNodeFromDiagram(id, nodeId) {
  const model = diagramModels.get(id);
  const canvas = diagramCanvases.get(id);
  if (!model || !canvas) return false;
  removeDiagramNode(canvas, model, nodeId);
  return true;
}

function scaleOf(canvas) {
  return Math.max(0.28, Math.min(1.85, Number(canvas.dataset.diagramZoom || 1)));
}

function setScale(canvas, value) {
  const scale = Math.max(0.28, Math.min(1.85, Number(value || 1)));
  canvas.dataset.diagramZoom = String(scale);
  const svg = canvas.querySelector("[data-diagram-svg]");
  const layer = canvas.querySelector("[data-node-layer]");
  if (svg) svg.style.zoom = String(scale);
  if (layer) layer.style.zoom = String(scale);
  const indicator = canvas.parentElement?.querySelector("[data-diagram-zoom-value]");
  if (indicator) indicator.textContent = `${Math.round(scale * 100)}%`;
}

function fitDiagramToViewport(canvas, model) {
  if (!model.nodes.length || !canvas.clientWidth || !canvas.clientHeight) return;
  const bounds = model.nodes.reduce((result, node) => {
    const element = canvas.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
    const width = element?.offsetWidth || 278;
    const height = element?.offsetHeight || 190;
    result.minX = Math.min(result.minX, Number(node.x || 0));
    result.minY = Math.min(result.minY, Number(node.y || 0));
    result.maxX = Math.max(result.maxX, Number(node.x || 0) + width);
    result.maxY = Math.max(result.maxY, Number(node.y || 0) + height);
    return result;
  }, { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 });
  const padding = 54;
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
  const nextScale = Math.min(1, (canvas.clientWidth - 24) / contentWidth, (canvas.clientHeight - 24) / contentHeight);
  setScale(canvas, nextScale);
  canvas.scrollLeft = Math.max(0, (bounds.minX - padding) * nextScale);
  canvas.scrollTop = Math.max(0, (bounds.minY - padding) * nextScale);
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

function dispatchSelection(canvas, node) {
  canvas.dispatchEvent(new CustomEvent("macroobras:diagram-node-selected", {
    bubbles: true,
    detail: { id: canvas.dataset.interactiveDiagram, nodeId: node.id, node: clone(node) },
  }));
}

function addEdge(canvas, model, from, to, label = "relação") {
  if (!from || !to || from === to) return;
  if (model.edges.some((edge) => edge.from === from && edge.to === to)) return;
  model.edges.push({ id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from, to, label });
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
}

function removeEdge(canvas, model, edgeId) {
  const index = model.edges.findIndex((edge) => edge.id === edgeId);
  if (index < 0) return;
  model.edges.splice(index, 1);
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
}

function nextNodePosition(node, index = 1) {
  return {
    x: Math.max(18, Number(node.x || 0) + 300 + (index % 2) * 24),
    y: Math.max(18, Number(node.y || 0) + 24),
  };
}

function createNodeFromSource(node, model, canvas = null, point = null) {
  const siblingIndex = model.nodes.filter((item) => item.kind === node.kind).length + 1;
  const position = point
    ? { x: Math.max(18, point.x - 42), y: Math.max(18, point.y - 82) }
    : nextNodePosition(node, siblingIndex);
  const configuredKind = canvas?.dataset.emptyDropKind || "";
  const kind = configuredKind || node.kind || "Quadro";
  const requirement = kind.toLowerCase() === "requisito";
  return normalizeNode({
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    title: requirement ? "Novo requisito" : `Novo ${String(kind).toLowerCase()}`,
    description: requirement ? "Material, serviço ou dependência necessária." : "",
    observations: "",
    fields: requirement
      ? [
        { name: "Tipo", value: "Material" },
        { name: "Quantidade", value: "" },
        { name: "Unidade", value: "" },
      ]
      : [],
    editableTitle: true,
    material: requirement || Boolean(node.material),
    summaryOnly: canvas?.dataset.summaryNodes === "true",
    x: position.x,
    y: position.y,
  });
}

function addDiagramNode(canvas, model, sourceNodeId) {
  const sourceNode = model.nodes.find((item) => item.id === sourceNodeId);
  if (!sourceNode) return;
  const node = createNodeFromSource(sourceNode, model, canvas);
  model.nodes.push(node);
  model.edges.push({
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from: sourceNode.id,
    to: node.id,
    label: canvas.dataset.defaultEdgeLabel || "requer",
  });
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
  requestAnimationFrame(() => {
    const input = canvas.querySelector(`[data-node-title="${CSS.escape(node.id)}"]`);
    input?.focus();
    input?.select?.();
  });
}

function removeDiagramNode(canvas, model, nodeId) {
  const index = model.nodes.findIndex((item) => item.id === nodeId);
  if (index < 0) return;
  model.nodes.splice(index, 1);
  model.edges = model.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
}

function addDroppedNode(canvas, model, sourceNode, point) {
  const node = createNodeFromSource(sourceNode, model, canvas, point);
  model.nodes.push(node);
  model.edges.push({
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from: sourceNode.id,
    to: node.id,
    label: canvas.dataset.defaultEdgeLabel || "requer",
  });
  renderDiagram(canvas, model);
  dispatchChange(canvas, model);
  requestAnimationFrame(() => {
    const input = canvas.querySelector(`[data-node-title="${CSS.escape(node.id)}"]`);
    input?.focus();
    input?.select();
  });
}

function createNodeGhost(canvas, sourceNode) {
  const ghost = document.createElement("article");
  const kind = canvas.dataset.emptyDropKind || sourceNode.kind || "Quadro";
  ghost.className = "diagram-node-ghost";
  ghost.innerHTML = `<small>${htmlEscape(kind)}</small><strong>${htmlEscape(kind.toLowerCase() === "requisito" ? "Novo requisito" : `Novo ${kind.toLowerCase()}`)}</strong><span>Solte para criar e conectar</span>`;
  canvas.querySelector("[data-node-layer]")?.appendChild(ghost);
  return ghost;
}

function positionNodeGhost(ghost, point) {
  const x = Math.max(18, point.x - 42);
  const y = Math.max(18, point.y - 82);
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
  return { x, y };
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
      let dragged = false;
      node.dataset.diagramDragSuppressed = "true";
      canvas.dataset.diagramClickBlockUntil = "0";
      node.classList.add("dragging");
      const move = (moveEvent) => {
        const point = clientToWorld(canvas, moveEvent.clientX, moveEvent.clientY);
        const x = Math.max(8, point.x - offsetX);
        const y = Math.max(8, point.y - offsetY);
        dragged = dragged || Math.abs(x - Number(data.x || 0)) > 1 || Math.abs(y - Number(data.y || 0)) > 1;
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
        if (dragged) {
          canvas.dataset.diagramClickBlockUntil = String(Date.now() + 350);
          window.setTimeout(() => { delete node.dataset.diagramDragSuppressed; }, 0);
        } else {
          delete node.dataset.diagramDragSuppressed;
        }
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
      const ghost = createNodeGhost(canvas, sourceNode);
      const initialPosition = nextNodePosition(sourceNode);
      positionNodeGhost(ghost, { x: initialPosition.x + 42, y: initialPosition.y + 82 });
      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;
      preview.hidden = false;
      canvas.classList.add("creating-edge");
      const move = (moveEvent) => {
        const targetPoint = clientToWorld(canvas, moveEvent.clientX, moveEvent.clientY);
        moved = moved || Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 5;
        const ghostPosition = positionNodeGhost(ghost, targetPoint);
        const target = targetAtPoint(canvas, moveEvent.clientX, moveEvent.clientY);
        const targetNode = model.nodes.find((node) => node.id === target?.dataset.nodeId);
        const destination = targetNode
          ? nodePoint(canvas, targetNode, "target")
          : { x: ghostPosition.x, y: ghostPosition.y + (ghost.offsetHeight || 126) / 2 };
        preview.setAttribute("d", pathD(source, destination));
        ghost.classList.toggle("over-existing", Boolean(targetNode && targetNode.id !== sourceNode.id));
        canvas.classList.toggle("node-drop-active", !target);
        canvas.querySelectorAll("[data-diagram-node]").forEach((node) => node.classList.toggle("edge-target", node === target && node !== sourceElement));
      };
      const cleanup = () => {
        preview.hidden = true;
        preview.removeAttribute("d");
        ghost.remove();
        canvas.classList.remove("creating-edge", "node-drop-active");
        canvas.querySelectorAll(".edge-target").forEach((node) => node.classList.remove("edge-target"));
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
      };
      const up = (upEvent) => {
        const target = targetAtPoint(canvas, upEvent.clientX, upEvent.clientY);
        const worldPoint = clientToWorld(canvas, upEvent.clientX, upEvent.clientY);
        const rect = canvas.getBoundingClientRect();
        const insideCanvas = upEvent.clientX >= rect.left
          && upEvent.clientX <= rect.right
          && upEvent.clientY >= rect.top
          && upEvent.clientY <= rect.bottom;
        cleanup();
        if (!moved) {
          addDiagramNode(canvas, model, sourceNode.id);
          return;
        }
        if (!insideCanvas) return;
        if (target) {
          addEdge(
            canvas,
            model,
            sourceNode.id,
            target.dataset.nodeId,
            canvas.dataset.defaultEdgeLabel || "requer",
          );
        } else {
          addDroppedNode(canvas, model, sourceNode, worldPoint);
        }
      };
      const cancel = () => cleanup();
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
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
    const next = Math.max(0.28, Math.min(1.85, oldScale + (event.deltaY < 0 ? 0.1 : -0.1)));
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
  canvas.querySelectorAll("[data-add-diagram-node]").forEach((button) => button.addEventListener("click", () => {
    addDiagramNode(canvas, model, button.dataset.addDiagramNode || "");
  }));
  canvas.querySelectorAll("[data-delete-diagram-node]").forEach((button) => button.addEventListener("click", () => {
    removeDiagramNode(canvas, model, button.dataset.deleteDiagramNode || "");
  }));
  canvas.querySelectorAll("[data-remove-node-field]").forEach((button) => button.addEventListener("click", () => {
    const node = model.nodes.find((item) => item.id === button.dataset.removeNodeField);
    if (!node) return;
    node.fields.splice(Number(button.dataset.fieldIndex || 0), 1);
    renderDiagram(canvas, model);
    dispatchChange(canvas, model);
  }));
}

function bindNodeSelection(canvas, model) {
  canvas.querySelectorAll("[data-diagram-node]").forEach((nodeElement) => {
    const select = (event) => {
      if (event.target.closest("input,textarea,button,[data-edge-handle]")) return;
      if (Date.now() < Number(canvas.dataset.diagramClickBlockUntil || 0)) return;
      if (nodeElement.dataset.diagramDragSuppressed === "true") return;
      const node = model.nodes.find((item) => item.id === nodeElement.dataset.nodeId);
      if (!node) return;
      dispatchSelection(canvas, node);
    };
    nodeElement.addEventListener("click", select);
    nodeElement.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      select(event);
    });
  });
}

function nodeHtml(node, selectedNodeId = "") {
  const selectedClass = selectedNodeId && node.id === selectedNodeId ? " is-selected" : "";
  const compactClass = node.compact ? " compact-node" : "";
  const fields = (node.fields || []).map((field, index) => `<div class="node-custom-field"><input data-node-field-name="${htmlEscape(node.id)}" data-field-index="${index}" value="${htmlEscape(field.name || "Campo")}" aria-label="Nome do campo"><input data-node-field-value="${htmlEscape(node.id)}" data-field-index="${index}" value="${htmlEscape(field.value || "")}" aria-label="Valor do campo"><button type="button" data-remove-node-field="${htmlEscape(node.id)}" data-field-index="${index}" aria-label="Remover campo">×</button></div>`).join("");
  const summaryFields = (node.fields || []).slice(0, 2).map((field) => `<span><small>${htmlEscape(field.name || "Campo")}</small><b>${htmlEscape(field.value || "Não informado")}</b></span>`).join("");
  const body = node.summaryOnly
    ? `<p class="node-summary">${htmlEscape(node.description || "Registro sem descrição.")}</p>${summaryFields ? `<div class="node-summary-fields">${summaryFields}</div>` : ""}`
    : `${node.material ? `<textarea data-node-description="${htmlEscape(node.id)}" aria-label="Descrição">${htmlEscape(node.description || "")}</textarea>` : `<p>${htmlEscape(node.description || "")}</p>`}
      <label class="node-observations">Observações<textarea data-node-observations="${htmlEscape(node.id)}" placeholder="Observações do quadro">${htmlEscape(node.observations || "")}</textarea></label>
      <div class="node-custom-fields">${fields}</div>`;
  return `<article class="interactive-node ${node.material ? "material-node" : ""}${compactClass}${selectedClass}" data-diagram-node data-node-id="${htmlEscape(node.id)}" style="left:${Number(node.x || 0)}px;top:${Number(node.y || 0)}px" tabindex="0" role="group" aria-label="${htmlEscape(`${node.kind || "Quadro"}: ${node.title || ""}`)}">
    <span class="edge-port in" aria-hidden="true"></span>
    <header>
      <div class="node-header-row">
        <small>${htmlEscape(node.kind || "Quadro")}</small>
        <span class="node-actions">
          ${node.fixed ? "" : `<button type="button" class="node-action node-action-delete" data-delete-diagram-node="${htmlEscape(node.id)}" aria-label="Remover card">×</button>`}
        </span>
      </div>
      ${node.material || node.editableTitle ? `<input data-node-title="${htmlEscape(node.id)}" value="${htmlEscape(node.title)}" aria-label="Título do quadro">` : `<strong>${htmlEscape(node.title)}</strong>`}
    </header>
    ${body}
    ${node.fixed ? "" : `<button class="edge-port out" data-edge-handle data-local-diagram-action type="button" aria-label="Criar ou conectar card" title="Clique para criar; arraste para posicionar ou conectar"><span>＋</span></button>`}
  </article>`;
}

function renderDiagram(canvas, model) {
  const svg = canvas.querySelector("[data-diagram-svg]");
  const nodeLayer = canvas.querySelector("[data-node-layer]");
  const fixedEdges = canvas.dataset.fixedEdges === "true";
  const selectedNodeId = canvas.dataset.selectedNodeId || "";
  model.nodes.forEach((node) => { if (fixedEdges) node.fixed = true; else delete node.fixed; });
  const markerId = `diagram-arrow-${canvas.dataset.interactiveDiagram.replace(/[^a-z0-9_-]/gi, "-")}`;
  const worldWidth = Math.max(1600, ...model.nodes.map((node) => Number(node.x || 0) + 390));
  const worldHeight = Math.max(1000, ...model.nodes.map((node) => Number(node.y || 0) + 330));
  svg.style.width = `${worldWidth}px`;
  svg.style.height = `${worldHeight}px`;
  nodeLayer.style.width = `${worldWidth}px`;
  nodeLayer.style.height = `${worldHeight}px`;
  svg.innerHTML = `<defs><marker id="${markerId}" markerWidth="11" markerHeight="11" refX="9" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L10,4 z"></path></marker></defs>${model.edges.map((edge) => `<path class="diagram-edge" data-edge-path="${htmlEscape(edge.id)}" marker-end="url(#${markerId})"></path>`).join("")}<path class="diagram-edge-preview" data-edge-preview hidden marker-end="url(#${markerId})"></path>`;
  nodeLayer.innerHTML = model.nodes.map((node) => nodeHtml(node, selectedNodeId)).join("");
  model.edges.forEach((edge) => {
    const label = fixedEdges ? document.createElement("span") : document.createElement("div");
    label.className = fixedEdges ? "diagram-edge-label fixed" : "diagram-edge-label";
    label.dataset.edgeLabel = edge.id;
    if (fixedEdges) label.textContent = edge.label || "relação";
    else {
      const input = document.createElement("input");
      input.type = "text";
      input.value = edge.label || "relação";
      input.title = "Edite a relação entre os quadros";
      input.setAttribute("aria-label", "Relação entre quadros");
      input.addEventListener("input", () => { edge.label = input.value; dispatchChange(canvas, model); });
      input.addEventListener("dblclick", () => removeEdge(canvas, model, edge.id));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "diagram-edge-label-delete";
      remove.setAttribute("aria-label", "Remover relação");
      remove.textContent = "×";
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        removeEdge(canvas, model, edge.id);
      });
      label.appendChild(input);
      label.appendChild(remove);
    }
    nodeLayer.appendChild(label);
  });
  setScale(canvas, scaleOf(canvas));
  bindCanvasPan(canvas);
  bindWheelZoom(canvas, model);
  bindNodeDrag(canvas, model);
  if (!fixedEdges) bindEdgeDrag(canvas, model);
  bindInputs(canvas, model);
  bindNodeSelection(canvas, model);
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
    if (canvas.dataset.fitOnLoad === "true" && canvas.dataset.diagramFitted !== "true") {
      canvas.dataset.diagramFitted = "true";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fitDiagramToViewport(canvas, model);
        updateEdges(canvas, model);
      }));
    }
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => updateEdges(canvas, model)) : null;
    observer?.observe(canvas);
  });
}
