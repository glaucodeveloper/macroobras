const diagramModels = new Map();

function htmlEscape(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function createModel(id, seed) {
  if (!diagramModels.has(id)) diagramModels.set(id, JSON.parse(JSON.stringify(seed)));
  return diagramModels.get(id);
}

function portPoint(node, canvasRect, side, canvas) {
  const rect = node.getBoundingClientRect();
  return {
    x: (side === "source" ? rect.right : rect.left) - canvasRect.left + canvas.scrollLeft,
    y: rect.top + rect.height / 2 - canvasRect.top + canvas.scrollTop,
  };
}

function pathD(source, target) {
  const delta = Math.max(70, Math.abs(target.x - source.x) * 0.45);
  return `M ${source.x} ${source.y} C ${source.x + delta} ${source.y}, ${target.x - delta} ${target.y}, ${target.x} ${target.y}`;
}

function updateEdges(canvas, model) {
  const canvasRect = canvas.getBoundingClientRect();
  model.edges.forEach((edge) => {
    const sourceNode = canvas.querySelector(`[data-node-id="${CSS.escape(edge.from)}"]`);
    const targetNode = canvas.querySelector(`[data-node-id="${CSS.escape(edge.to)}"]`);
    const path = canvas.querySelector(`[data-edge-path="${CSS.escape(edge.id)}"]`);
    const label = canvas.querySelector(`[data-edge-label="${CSS.escape(edge.id)}"]`);
    if (!sourceNode || !targetNode || !path) return;
    const source = portPoint(sourceNode, canvasRect, "source", canvas);
    const target = portPoint(targetNode, canvasRect, "target", canvas);
    path.setAttribute("d", pathD(source, target));
    if (label) {
      label.style.left = `${(source.x + target.x) / 2}px`;
      label.style.top = `${(source.y + target.y) / 2}px`;
    }
  });
}

function targetAtPoint(canvas, x, y) {
  return document.elementsFromPoint(x, y).map((element) => element.closest?.("[data-diagram-node]")).find((element) => element && canvas.contains(element)) || null;
}

function addEdge(canvas, model, from, to, label = "relação") {
  if (!from || !to || from === to) return;
  if (model.edges.some((edge) => edge.from === from && edge.to === to)) return;
  model.edges.push({ id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from, to, label });
  renderDiagram(canvas, model);
  canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", { bubbles: true, detail: { model } }));
}

function addMaterialNode(canvas, model, from, point) {
  const id = `material-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  model.nodes.push({
    id,
    kind: "Material",
    material: true,
    title: "Material necessário",
    description: "Informe o material ou insumo requerido.",
    x: Math.max(18, point.x - 70),
    y: Math.max(18, point.y - 65),
  });
  model.edges.push({ id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from, to: id, label: "requer material" });
  renderDiagram(canvas, model);
  requestAnimationFrame(() => {
    const input = canvas.querySelector(`[data-node-title="${CSS.escape(id)}"]`);
    input?.focus();
    input?.select();
  });
  canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", { bubbles: true, detail: { model } }));
}

function bindNodeDrag(canvas, model) {
  canvas.querySelectorAll("[data-diagram-node]").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("input,textarea,button,[data-edge-handle]")) return;
      event.preventDefault();
      const nodeRect = node.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const offsetX = event.clientX - nodeRect.left;
      const offsetY = event.clientY - nodeRect.top;
      node.classList.add("dragging");
      const move = (moveEvent) => {
        const worldWidth = Math.max(canvas.scrollWidth, 1600);
        const worldHeight = Math.max(canvas.scrollHeight, 1000);
        const x = Math.max(8, Math.min(worldWidth - nodeRect.width - 8, moveEvent.clientX - canvasRect.left + canvas.scrollLeft - offsetX));
        const y = Math.max(8, Math.min(worldHeight - nodeRect.height - 8, moveEvent.clientY - canvasRect.top + canvas.scrollTop - offsetY));
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        const data = model.nodes.find((item) => item.id === node.dataset.nodeId);
        if (data) { data.x = x; data.y = y; }
        updateEdges(canvas, model);
      };
      const up = () => {
        node.classList.remove("dragging");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
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
      const sourceNode = handle.closest("[data-diagram-node]");
      const canvasRect = canvas.getBoundingClientRect();
      const source = portPoint(sourceNode, canvasRect, "source", canvas);
      const preview = canvas.querySelector("[data-edge-preview]");
      preview.hidden = false;
      canvas.classList.add("creating-edge");
      const move = (moveEvent) => {
        const targetPoint = { x: moveEvent.clientX - canvasRect.left + canvas.scrollLeft, y: moveEvent.clientY - canvasRect.top + canvas.scrollTop };
        preview.setAttribute("d", pathD(source, targetPoint));
        const target = targetAtPoint(canvas, moveEvent.clientX, moveEvent.clientY);
        canvas.classList.toggle("material-drop-active", !target && canvas.dataset.allowMaterialDrop === "true");
        canvas.querySelectorAll("[data-diagram-node]").forEach((node) => node.classList.toggle("edge-target", node === target && node !== sourceNode));
      };
      const up = (upEvent) => {
        const target = targetAtPoint(canvas, upEvent.clientX, upEvent.clientY);
        const worldPoint = { x: upEvent.clientX - canvasRect.left + canvas.scrollLeft, y: upEvent.clientY - canvasRect.top + canvas.scrollTop };
        preview.hidden = true;
        preview.removeAttribute("d");
        canvas.classList.remove("creating-edge", "material-drop-active");
        canvas.querySelectorAll(".edge-target").forEach((node) => node.classList.remove("edge-target"));
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (target) addEdge(canvas, model, sourceNode.dataset.nodeId, target.dataset.nodeId);
        else if (canvas.dataset.allowMaterialDrop === "true") addMaterialNode(canvas, model, sourceNode.dataset.nodeId, worldPoint);
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

function bindNodeInputs(canvas, model) {
  canvas.querySelectorAll("[data-node-date]").forEach((input) => input.addEventListener("input", () => {
    const node = model.nodes.find((item) => item.id === input.dataset.nodeDate);
    if (node) node.date = input.value;
    canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", { bubbles: true, detail: { model } }));
  }));
  canvas.querySelectorAll("[data-node-title]").forEach((input) => input.addEventListener("input", () => {
    const node = model.nodes.find((item) => item.id === input.dataset.nodeTitle);
    if (node) node.title = input.value;
    canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", { bubbles: true, detail: { model } }));
  }));
  canvas.querySelectorAll("[data-node-description]").forEach((input) => input.addEventListener("input", () => {
    const node = model.nodes.find((item) => item.id === input.dataset.nodeDescription);
    if (node) node.description = input.value;
    canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", { bubbles: true, detail: { model } }));
  }));
}

function renderDiagram(canvas, model) {
  const svg = canvas.querySelector("[data-diagram-svg]");
  const nodeLayer = canvas.querySelector("[data-node-layer]");
  const fixedEdges = canvas.dataset.fixedEdges === "true";
  const hideNodeDates = canvas.dataset.hideNodeDates === "true";
  const markerId = `diagram-arrow-${canvas.dataset.interactiveDiagram.replace(/[^a-z0-9_-]/gi, "-")}`;
  const worldWidth = Math.max(1600, ...model.nodes.map((node) => Number(node.x || 0) + 360));
  const worldHeight = Math.max(1000, ...model.nodes.map((node) => Number(node.y || 0) + 260));
  svg.style.width = `${worldWidth}px`; svg.style.height = `${worldHeight}px`;
  nodeLayer.style.width = `${worldWidth}px`; nodeLayer.style.height = `${worldHeight}px`;
  svg.innerHTML = `<defs><marker id="${markerId}" markerWidth="11" markerHeight="11" refX="9" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L10,4 z"></path></marker></defs>${model.edges.map((edge) => `<path class="diagram-edge" data-edge-path="${htmlEscape(edge.id)}" marker-end="url(#${markerId})"></path>`).join("")}<path class="diagram-edge-preview" data-edge-preview hidden marker-end="url(#${markerId})"></path>`;
  nodeLayer.innerHTML = model.nodes.map((node) => `<article class="interactive-node ${node.material ? "material-node" : ""}" data-diagram-node data-node-id="${htmlEscape(node.id)}" style="left:${Number(node.x || 0)}px;top:${Number(node.y || 0)}px"><span class="edge-port in" aria-hidden="true"></span><header><small>${htmlEscape(node.kind || "Quadro")}</small>${node.material ? `<input data-node-title="${htmlEscape(node.id)}" value="${htmlEscape(node.title)}" aria-label="Nome do material">` : `<strong>${htmlEscape(node.title)}</strong>`}</header>${node.material ? `<textarea data-node-description="${htmlEscape(node.id)}" aria-label="Descrição do material">${htmlEscape(node.description || "")}</textarea>` : `<p>${htmlEscape(node.description || "")}</p>`}${hideNodeDates || node.material ? "" : `<label>Data<input data-node-date="${htmlEscape(node.id)}" type="date" value="${htmlEscape(node.date || "")}"></label>`}${fixedEdges ? "" : `<button class="edge-port out" data-edge-handle type="button" aria-label="Arrastar nova seta"><span>＋</span></button>`}</article>`).join("");
  canvas.querySelectorAll("[data-edge-label]").forEach((element) => element.remove());
  model.edges.forEach((edge) => {
    const label = fixedEdges ? document.createElement("span") : document.createElement("input");
    label.className = fixedEdges ? "diagram-edge-label fixed" : "diagram-edge-label";
    label.dataset.edgeLabel = edge.id;
    if (fixedEdges) label.textContent = edge.label || "relação";
    else {
      label.value = edge.label || "relação";
      label.title = "Edite a relação entre os quadros";
      label.setAttribute("aria-label", "Relação entre quadros");
      label.addEventListener("input", () => { edge.label = label.value; canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", { bubbles: true, detail: { model } })); });
      label.addEventListener("dblclick", () => { model.edges = model.edges.filter((item) => item.id !== edge.id); renderDiagram(canvas, model); });
    }
    canvas.appendChild(label);
  });
  bindCanvasPan(canvas);
  bindNodeDrag(canvas, model);
  if (!fixedEdges) bindEdgeDrag(canvas, model);
  bindNodeInputs(canvas, model);
  updateEdges(canvas, model);
}

export function hydrateDiagramCanvases(root = document) {
  root.querySelectorAll("[data-interactive-diagram]").forEach((canvas) => {
    if (canvas.dataset.hydrated) return;
    canvas.dataset.hydrated = "true";
    const seed = JSON.parse(canvas.querySelector("script[type='application/json']")?.textContent || '{"nodes":[],"edges":[]}');
    const model = createModel(canvas.dataset.interactiveDiagram, seed);
    renderDiagram(canvas, model);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => updateEdges(canvas, model)) : null;
    observer?.observe(canvas);
  });
}
