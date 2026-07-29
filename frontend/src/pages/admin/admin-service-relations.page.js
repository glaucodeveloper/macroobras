import { availableWorks } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function localServiceId(workId, itemId) {
  return `work-service-${workId}-${itemId}`;
}

function generalServiceId(workId, itemId) {
  return `general-service-${workId}-${itemId}`;
}

function generatedModel() {
  const nodes = [];
  const edges = [];

  availableWorks.forEach((work, workIndex) => {
    const baseX = 60 + workIndex * 760;
    const saved =
      state.diagramModels?.[
        `work-services-${work.id}`
      ];
    const savedNodes =
      Array.isArray(saved?.nodes)
        ? saved.nodes
        : [];
    const savedById = new Map(
      savedNodes.map((node) => [node.id, node])
    );
    const idMap = new Map();

    work.items.forEach((item, index) => {
      const localId =
        localServiceId(work.id, item.id);
      const generalId =
        generalServiceId(work.id, item.id);
      const local = savedById.get(localId);

      idMap.set(localId, generalId);
      idMap.set(item.id, generalId);

      nodes.push({
        id: generalId,
        workId: work.id,
        itemId: item.id,
        kind: "Serviço da obra",
        title:
          local?.title
          || item.description,
        description: work.name,
        observations:
          local?.observations || "",
        compact: true,
        summaryOnly: true,
        fields: [
          {
            name: "Obra",
            value: work.code,
          },
          {
            name: "Orçamento",
            value: money(item.budget),
          },
        ],
        budget: item.budget,
        x: baseX + (index % 2) * 320,
        y: 70 + Math.floor(index / 2) * 220,
      });
    });

    const canonicalLocalIds = new Set(
      work.items.map((item) =>
        localServiceId(work.id, item.id)
      )
    );

    savedNodes
      .filter(
        (node) =>
          !canonicalLocalIds.has(node.id)
      )
      .forEach((node, index) => {
        const generalId =
          `general-extra-${work.id}-${node.id}`;

        idMap.set(node.id, generalId);

        nodes.push({
          ...node,
          id: generalId,
          workId: work.id,
          sourceNodeId: node.id,
          compact: true,
          summaryOnly: true,
          x:
            baseX
            + 80
            + (index % 2) * 320,
          y:
            180
            + Math.ceil(
              work.items.length / 2
            ) * 220
            + Math.floor(index / 2) * 220,
        });
      });

    (saved?.edges || []).forEach(
      (edge, index) => {
        const from = idMap.get(edge.from);
        const to = idMap.get(edge.to);

        if (!from || !to) {
          return;
        }

        edges.push({
          ...edge,
          id:
            `general-work-edge-${
              work.id
            }-${index}-${edge.id}`,
          from,
          to,
        });
      }
    );
  });

  return { nodes, edges };
}

function model() {
  const generated = generatedModel();
  const saved =
    state.diagramModels?.["all-work-services"];

  if (!saved?.nodes?.length) {
    return generated;
  }

  const savedById = new Map(
    saved.nodes.map((node) => [node.id, node])
  );
  const canonicalIds = new Set(
    generated.nodes.map((node) => node.id)
  );
  const generatedEdgeIds = new Set(
    generated.edges.map((edge) => edge.id)
  );

  return {
    nodes: [
      ...generated.nodes.map((node) => ({
        ...node,
        ...(savedById.get(node.id) || {}),
        summaryOnly: true,
        workId: node.workId,
        itemId: node.itemId,
      })),
      ...saved.nodes
        .filter(
          (node) => !canonicalIds.has(node.id)
        )
        .map((node) => ({
          ...node,
          summaryOnly: true,
        })),
    ],
    edges: [
      ...generated.edges,
      ...(saved.edges || []).filter(
        (edge) =>
          !generatedEdgeIds.has(edge.id)
      ),
    ],
  };
}

function selectedNode(currentModel) {
  if (
    state.selectedDiagramNode?.diagramId
    !== "all-work-services"
  ) {
    return null;
  }

  return currentModel.nodes.find(
    (node) =>
      node.id
      === state.selectedDiagramNode.nodeId
  ) || null;
}

function details(node, currentModel) {
  if (!node) {
    return `<div class="diagram-details-empty">
      <b>Relações gerais das obras</b>
      <p>
        Selecione um serviço. Os cards sem vínculos
        permanecem independentes.
      </p>
    </div>`;
  }

  const work = availableWorks.find(
    (candidate) =>
      candidate.id === node.workId
  );
  const relations = currentModel.edges.filter(
    (edge) =>
      edge.from === node.id
      || edge.to === node.id
  );

  return `<div class="diagram-details-hero">
      <small>${esc(node.kind || "Serviço")}</small>
      <strong>${esc(node.title || "")}</strong>
      <span>${esc(work?.name || "")}</span>
    </div>

    <dl class="diagram-details-list">
      <div>
        <dt>Obra</dt>
        <dd>${esc(work?.name || "")}</dd>
      </div>
      <div>
        <dt>Código</dt>
        <dd>${esc(work?.code || "")}</dd>
      </div>
      <div>
        <dt>Item</dt>
        <dd>${esc(node.itemId || "")}</dd>
      </div>
      <div>
        <dt>Orçamento</dt>
        <dd>${money(node.budget || 0)}</dd>
      </div>
    </dl>

    <section class="diagram-details-section">
      <h3>Relações existentes</h3>
      ${
        relations.length
          ? `<div class="diagram-relation-list">
              ${relations.map((edge) => {
                const outgoing =
                  edge.from === node.id;
                const relatedId =
                  outgoing
                    ? edge.to
                    : edge.from;
                const related =
                  currentModel.nodes.find(
                    (item) =>
                      item.id === relatedId
                  );

                return `<article>
                  <span>
                    ${outgoing ? "Saída" : "Entrada"}
                  </span>
                  <strong>
                    ${esc(edge.label || "relação")}
                  </strong>
                  <small>
                    ${esc(related?.title || relatedId)}
                  </small>
                </article>`;
              }).join("")}
            </div>`
          : `<div class="diagram-relations-empty">
              Nenhuma relação registrada.
            </div>`
      }
    </section>

    <div class="diagram-details-actions">
      <button
        class="btn"
        data-message="open-work-section"
        data-work-id="${esc(work?.id || "")}"
        data-route="admin-work-items"
      >
        Abrir canvas da obra
      </button>
    </div>`;
}

export function adminServiceRelations() {
  const currentModel = model();
  const node = selectedNode(currentModel);

  return `${pageHeader(
    "Relações de serviços de obra",
    "Canvas geral dos itens de todas as obras. Vínculos são exibidos apenas quando cadastrados.",
    `<button
      class="btn ghost"
      data-message="print-current-report"
    >
      Imprimir relações
    </button>`
  )}

    <section
      class="diagram-library-layout"
      data-print-report
    >
      ${card(
        "Serviços registrados",
        `<div
          class="interactive-diagram library-elements-diagram"
          data-interactive-diagram="all-work-services"
          data-selected-node-id="${esc(node?.id || "")}"
          data-empty-drop-kind="Material"
          data-default-edge-label="requer"
          data-summary-nodes="true"
          data-fit-on-load="true"
          data-wheel-zoom="true"
        >
          <svg data-diagram-svg></svg>
          <div data-node-layer></div>
          <script type="application/json">${
            JSON.stringify(currentModel)
          }</script>
        </div>`,
        "interactive-diagram-card"
      )}

      ${card(
        "Registro selecionado",
        details(node, currentModel),
        "diagram-details-card"
      )}
    </section>`;
}
