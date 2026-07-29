import { availableWorks } from "../../core/data.js";
import { selectedMobileAccess, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";

function activePersonIds() {
  const access = selectedMobileAccess();
  return new Set([access?.id, access?.personId].filter(Boolean));
}

function workName(workId) {
  return availableWorks.find((work) => work.id === workId)?.name || "Demanda geral";
}

export function mobileTickets() {
  const personIds = activePersonIds();
  const tickets = (state.tickets || []).filter((ticket) => personIds.has(ticket.responsiblePersonId) || personIds.has(ticket.requesterPersonId));

  return `<section class="mobile-page mobile-tickets-page">
    <header class="mobile-page-header"><div><small>Operação individual</small><h1>Meus tickets</h1></div><span>${tickets.length}</span></header>
    <div class="mobile-ticket-list">${tickets.length ? tickets.map((ticket) => `<article><header><small>${esc(ticket.type)} · ${esc(ticket.priority)}</small><strong>${esc(ticket.title)}</strong></header><p>${esc(ticket.description || "")}</p><dl><div><dt>Obra</dt><dd>${esc(workName(ticket.workId))}</dd></div><div><dt>Prazo</dt><dd>${esc(ticket.dueAt || "Sem prazo")}</dd></div></dl><footer><button data-message="update-ticket-status" data-ticket-id="${esc(ticket.id)}" data-status="Em andamento">Iniciar</button><button data-message="update-ticket-status" data-ticket-id="${esc(ticket.id)}" data-status="Concluído">Concluir</button></footer></article>`).join("") : `<div class="mobile-empty-state"><strong>Nenhum ticket atribuído</strong><p>Novas demandas aparecerão aqui quando forem vinculadas ao seu acesso.</p></div>`}</div>
  </section>`;
}
