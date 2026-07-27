const diagrams = new Map();

const htmlEscape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
})[character]);

function createModel(id, seed) {
  if (diagrams.has(id)) return diagrams.get(id);
  const model = {
    nodes: (seed.nodes || []).map((node) => ({ ...node })),
    edges: (seed.edges || []).map((edge) => ({ ...edge })),
  };
  diagrams.set(id, model);
  return model;
}

function portPoint(node, canvasRect, side) {
  const rect = node.getBoundingClientRect();
  return {
    x: (side === "source" ? rect.right : rect.left) - canvasRect.left,
    y: rect.top - canvasRect.top + rect.height / 2,
  };
}

function pathD(source, target) {
  const distance = Math.abs(target.x - source.x);
  const direction = target.x >= source.x ? 1 : -1;
  const bend = Math.max(68, distance * 0.48);
  return `M ${source.x} ${source.y} C ${source.x + bend * direction} ${source.y}, ${target.x - bend * direction} ${target.y}, ${target.x} ${target.y}`;
}

function targetAtPoint(canvas, clientX, clientY) {
  const stack = document.elementsFromPoint(clientX, clientY);
  return stack.map((element) => element.closest?.("[data-diagram-node]")).find((element) => element && canvas.contains(element)) || null;
}

function updateEdges(canvas, model) {
  const canvasRect = canvas.getBoundingClientRect();
  model.edges.forEach((edge) => {
    const sourceNode = canvas.querySelector(`[data-node-id="${CSS.escape(edge.from)}"]`);
    const targetNode = canvas.querySelector(`[data-node-id="${CSS.escape(edge.to)}"]`);
    const path = canvas.querySelector(`[data-edge-path="${CSS.escape(edge.id)}"]`);
    const label = canvas.querySelector(`[data-edge-label="${CSS.escape(edge.id)}"]`);
    if (!sourceNode || !targetNode || !path || !label) return;
    const source = portPoint(sourceNode, canvasRect, "source");
    const target = portPoint(targetNode, canvasRect, "target");
    path.setAttribute("d", pathD(source, target));
    label.style.left = `${(source.x + target.x) / 2}px`;
    label.style.top = `${(source.y + target.y) / 2}px`;
  });
}

function addEdge(canvas, model, from, to) {
  if (!to || from === to) return null;
  const duplicate = model.edges.some((edge) => edge.from === from && edge.to === to);
  if (duplicate) return null;
  const edge = { id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, from, to, label: "relação" };
  model.edges.push(edge);
  renderDiagram(canvas, model);
  requestAnimationFrame(() => canvas.querySelector(`[data-edge-label="${CSS.escape(edge.id)}"]`)?.select());
  return edge;
}

function bindNodeDrag(canvas, model) {
  canvas.querySelectorAll("[data-diagram-node]").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("input,button,[data-edge-handle]")) return;
      event.preventDefault();
      const nodeRect = node.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const offsetX = event.clientX - nodeRect.left;
      const offsetY = event.clientY - nodeRect.top;
      node.classList.add("dragging");

      const move = (moveEvent) => {
        const x = Math.max(8, Math.min(canvasRect.width - nodeRect.width - 8, moveEvent.clientX - canvasRect.left - offsetX));
        const y = Math.max(8, Math.min(canvasRect.height - nodeRect.height - 8, moveEvent.clientY - canvasRect.top - offsetY));
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        const data = model.nodes.find((item) => item.id === node.dataset.nodeId);
        if (data) {
          data.x = x;
          data.y = y;
        }
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
      const source = portPoint(sourceNode, canvasRect, "source");
      const preview = canvas.querySelector("[data-edge-preview]");
      preview.hidden = false;
      canvas.classList.add("creating-edge");

      const move = (moveEvent) => {
        const targetPoint = { x: moveEvent.clientX - canvasRect.left, y: moveEvent.clientY - canvasRect.top };
        preview.setAttribute("d", pathD(source, targetPoint));
        const target = targetAtPoint(canvas, moveEvent.clientX, moveEvent.clientY);
        canvas.querySelectorAll("[data-diagram-node]").forEach((node) => node.classList.toggle("edge-target", node === target && node !== sourceNode));
      };

      const up = (upEvent) => {
        const target = targetAtPoint(canvas, upEvent.clientX, upEvent.clientY);
        preview.hidden = true;
        preview.removeAttribute("d");
        canvas.classList.remove("creating-edge");
        canvas.querySelectorAll(".edge-target").forEach((node) => node.classList.remove("edge-target"));
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        addEdge(canvas, model, sourceNode.dataset.nodeId, target?.dataset.nodeId);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  });
}

function bindNodeInputs(canvas, model) {
  canvas.querySelectorAll("[data-node-date]").forEach((input) => {
    input.addEventListener("input", () => {
      const node = model.nodes.find((item) => item.id === input.dataset.nodeDate);
      if (node) node.date = input.value;
      canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", { bubbles: true, detail: { model } }));
    });
  });
}

function renderDiagram(canvas, model) {
  const svg = canvas.querySelector("[data-diagram-svg]");
  const nodeLayer = canvas.querySelector("[data-node-layer]");
  const markerId = `diagram-arrow-${canvas.dataset.interactiveDiagram.replace(/[^a-z0-9_-]/gi, "-")}`;

  svg.innerHTML = `
    <defs><marker id="${markerId}" markerWidth="11" markerHeight="11" refX="9" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L10,4 z"></path></marker></defs>
    ${model.edges.map((edge) => `<path class="diagram-edge" data-edge-path="${htmlEscape(edge.id)}" marker-end="url(#${markerId})"></path>`).join("")}
    <path class="diagram-edge-preview" data-edge-preview hidden marker-end="url(#${markerId})"></path>`;

  nodeLayer.innerHTML = model.nodes.map((node) => `
    <article class="interactive-node" data-diagram-node data-node-id="${htmlEscape(node.id)}" style="left:${Number(node.x || 0)}px;top:${Number(node.y || 0)}px">
      <span class="edge-port in" aria-hidden="true"></span>
      <header><small>${htmlEscape(node.kind || "Quadro")}</small><strong>${htmlEscape(node.title)}</strong></header>
      <p>${htmlEscape(node.description || "")}</p>
      <label>Data<input data-node-date="${htmlEscape(node.id)}" type="date" value="${htmlEscape(node.date || "")}"></label>
      <button class="edge-port out" data-edge-handle type="button" aria-label="Arrastar nova seta a partir deste quadro"><span>＋</span></button>
    </article>`).join("");

  canvas.querySelectorAll("[data-edge-label]").forEach((element) => element.remove());
  model.edges.forEach((edge) => {
    const input = document.createElement("input");
    input.className = "diagram-edge-label";
    input.dataset.edgeLabel = edge.id;
    input.value = edge.label || "relação";
    input.title = "Edite a relação entre os quadros";
    input.setAttribute("aria-label", "Relação entre quadros");
    input.addEventListener("input", () => {
      edge.label = input.value;
      canvas.dispatchEvent(new CustomEvent("macroobras:diagram-change", { bubbles: true, detail: { model } }));
    });
    input.addEventListener("dblclick", () => {
      model.edges = model.edges.filter((item) => item.id !== edge.id);
      renderDiagram(canvas, model);
    });
    canvas.appendChild(input);
  });

  bindNodeDrag(canvas, model);
  bindEdgeDrag(canvas, model);
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
