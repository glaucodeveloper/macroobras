import { availableWorks, mobileUsers } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

function people() {
  const rhNodes = state.diagramModels?.["rh-main"]?.nodes || [];
  const fromRh = rhNodes.filter((node) => String(node.kind || "").toLowerCase().includes("pessoa")).map((node) => ({
    id: node.id,
    name: node.title,
    role: node.fields?.find((field) => field.name === "Função")?.value || node.description || "Colaborador",
  }));
  return fromRh.length ? fromRh : mobileUsers.map((user) => ({ id: user.personId || user.id, accessId: user.id, name: user.name, role: "Equipe de campo" }));
}

function ticketModel() {
  const staff = people();
  const tickets = state.tickets || [];
  const nodes = [
    ...staff.map((person, index) => ({ id: `ticket-person-${person.id}`, personId: person.id, kind: "Funcionário", title: person.name, description: person.role, compact: true, summaryOnly: true, fields: [{ name: "Função", value: person.role }], x: 70, y: 70 + index * 220 })),
    ...tickets.map((ticket, index) => {
      const work = availableWorks.find((item) => item.id === ticket.workId);
      return { id: `ticket-card-${ticket.id}`, ticketId: ticket.id, kind: `Ticket · ${ticket.status}`, title: ticket.title, description: ticket.description || ticket.type, compact: true, summaryOnly: true, fields: [{ name: "Obra", value: work?.code || "Geral" }, { name: "Prazo", value: ticket.dueAt || "Sem prazo" }], x: 430 + (index % 3) * 330, y: 70 + Math.floor(index / 3) * 240 };
    }),
  ];
  const edges = tickets.flatMap((ticket) => {
    const result = [];
    const nodeId = `ticket-card-${ticket.id}`;
    if (ticket.requesterPersonId) result.push({ id: `ticket-requester-${ticket.id}`, from: `ticket-person-${ticket.requesterPersonId}`, to: nodeId, label: "requerente" });
    if (ticket.responsiblePersonId) result.push({ id: `ticket-responsible-${ticket.id}`, from: nodeId, to: `ticket-person-${ticket.responsiblePersonId}`, label: "responsável" });
    return result;
  });
  const saved = state.diagramModels?.["tickets-main"];
  if (!saved?.nodes?.length) return { nodes, edges };
  const savedById = new Map(saved.nodes.map((node) => [node.id, node]));
  const ids = new Set(nodes.map((node) => node.id));
  const edgeIds = new Set(edges.map((edge) => edge.id));
  return {
    nodes: [...nodes.map((node) => ({ ...node, ...(savedById.get(node.id) || {}), ticketId: node.ticketId, personId: node.personId, summaryOnly: true })), ...saved.nodes.filter((node) => !ids.has(node.id)).map((node) => ({ ...node, summaryOnly: true }))],
    edges: [...edges, ...(saved.edges || []).filter((edge) => !edgeIds.has(edge.id))],
  };
}

function ticketForm() {
  const staff = people();
  return `<form class="ticket-create-form" data-ticket-create-form>
    <label><span>Título</span><input data-ticket-field="title" required></label>
    <label><span>Descrição</span><textarea data-ticket-field="description"></textarea></label>
    <div class="form-grid two-cols">
      <label><span>Tipo</span><select data-ticket-field="type"><option>Tarefa administrativa</option><option>Compra</option><option>Transferência de material</option><option>Diário de obra</option><option>Medição</option><option>Documento</option><option>Evidência / anexo</option></select></label>
      <label><span>Prioridade</span><select data-ticket-field="priority"><option>Baixa</option><option selected>Média</option><option>Alta</option><option>Urgente</option></select></label>
      <label><span>Requerente</span><select data-ticket-field="requesterPersonId">${staff.map((person) => `<option value="${esc(person.id)}">${esc(person.name)}</option>`).join("")}</select></label>
      <label><span>Responsável</span><select data-ticket-field="responsiblePersonId">${staff.map((person) => `<option value="${esc(person.id)}">${esc(person.name)}</option>`).join("")}</select></label>
      <label><span>Obra opcional</span><select data-ticket-field="workId"><option value="">Sem obra</option>${availableWorks.map((work) => `<option value="${esc(work.id)}">${esc(work.code)} · ${esc(work.name)}</option>`).join("")}</select></label>
      <label><span>Prazo</span><input type="date" data-ticket-field="dueAt"></label>
    </div><button class="btn full" type="button" data-message="create-ticket">Criar ticket</button>
  </form>`;
}

function ticketList() {
  const staff = people();
  const personById = new Map(staff.map((person) => [person.id, person]));
  return `<div class="ticket-admin-list">${(state.tickets || []).map((ticket) => {
    const responsible = personById.get(ticket.responsiblePersonId);
    const selected = ticket.id === state.selectedTicketId;
    return `<article class="${selected ? "is-selected" : ""}" data-ticket-record="${esc(ticket.id)}"><header><div><small>${esc(ticket.type)} · ${esc(ticket.priority)}</small><strong>${esc(ticket.title)}</strong></div><span>${esc(ticket.status)}</span></header><p>${esc(ticket.description || "")}</p><dl><div><dt>Responsável</dt><dd>${esc(responsible?.name || "Não atribuído")}</dd></div><div><dt>Prazo</dt><dd>${esc(ticket.dueAt || "Sem prazo")}</dd></div></dl><footer><button data-message="select-ticket" data-ticket-id="${esc(ticket.id)}">Abrir</button><button data-message="update-ticket-status" data-ticket-id="${esc(ticket.id)}" data-status="Em andamento">Iniciar</button><button data-message="update-ticket-status" data-ticket-id="${esc(ticket.id)}" data-status="Concluído">Concluir</button></footer></article>`;
  }).join("")}</div>`;
}

export function adminTickets() {
  const model = ticketModel();
  const selectedNodeId = state.selectedTicketId ? `ticket-card-${state.selectedTicketId}` : "";
  return `${pageHeader("Tickets", "Demandas ligadas a funcionários, anexos, inventário, compras e ações operacionais.", `<button class="btn ghost" data-message="print-current-report">Exportar / imprimir PDF</button>`)}
    <section class="ticket-management-layout" data-print-report>
      ${card("Canvas de tickets", `<div class="interactive-diagram tickets-diagram" data-interactive-diagram="tickets-main" data-selected-node-id="${esc(selectedNodeId)}" data-hide-node-dates="true" data-fit-on-load="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(model)}</script></div>`, "interactive-diagram-card")}
      <aside class="ticket-side-column">${card("Novo ticket", ticketForm())}${card("Tickets registrados", ticketList())}</aside>
    </section>`;
}
