import { items } from "../../core/data.js";
import { selectedMobileAccess, selectedWork, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, formStep, mobileHeader } from "../../ui/components.js";

function accessContext() {
  const access = selectedMobileAccess();
  const work = selectedWork();
  return { access, work };
}

function invalidAccessGate() {
  return `${mobileHeader("MacroObras", "Acesso do encarregado")}<section class="mobile-page">
    ${card("Acesso não identificado", `<p>Esta versão de campo precisa ser aberta pelo botão <b>Abrir como encarregado</b> dentro da página administrativa da obra.</p><div class="info">O endereço deve conter a identificação do acesso e da obra permitida.</div>`)}
  </section>`;
}

function loginGate() {
  const { access, work } = accessContext();
  if (!access || !work || access.workId !== work.id) return invalidAccessGate();
  return `${mobileHeader("MacroObras", "Acesso do encarregado de obra")}<section class="mobile-page">
    <div class="mobile-online-note"><i></i><span>Acesso individual emitido pela administração da obra.</span></div>
    ${card("Obra autorizada", `<strong>${esc(work.name)}</strong><small>${esc(work.address)}</small><div class="mobile-access-person"><span>Encarregado</span><b>${esc(access.name)}</b></div>`)}
    ${card("Entrar", `<label>Email autorizado</label><input data-mobile-email type="email" autocomplete="username" placeholder="email@empresa.com"><label>CPF autorizado</label><input data-mobile-cpf inputmode="numeric" autocomplete="off" placeholder="000.000.000-00"><div class="info">Use a identificação cadastrada no organograma de RH e vinculada a esta obra.</div>`)}
    <button class="mobile-cta" data-message="mobile-login">Entrar nesta obra</button>
  </section>`;
}

function dependencyNotice() {
  return `${mobileHeader("MacroObras", "Acesso inválido")}<section class="mobile-page">${card("Obra não disponível", `<p>O vínculo administrativo deste acesso não aponta para uma obra ativa.</p>`)}<button class="mobile-cta" data-message="mobile-logout">Voltar ao login</button></section>`;
}

export function mobileHome() {
  if (!state.mobileAuthenticated) return loginGate();
  const { access, work } = accessContext();
  if (!access || !work || access.workId !== work.id) return dependencyNotice();
  const pendingDeliveries = state.purchaseFlows.filter((flow) => flow.workId === work.id && !flow.delivered).length;
  return `${mobileHeader("MacroObras", work.name)}<section class="mobile-page">
    ${card("Acesso ativo", `<div class="mobile-access-summary"><span>Encarregado</span><strong>${esc(access.name)}</strong><small>${esc(access.email)}</small></div><button class="btn ghost full" data-message="mobile-logout">Sair deste acesso</button>`)}
    ${card("Hoje", `<div class="sync"><strong>23 de julho de 2026</strong><span><i></i> Sincronizado agora</span></div>`)}
    <div class="action-grid"><button data-message="navigate" data-route="mobile-routine"><b>R</b><span>Criar rotina</span></button><button data-message="navigate" data-route="mobile-day"><b>C</b><span>Cronograma</span></button><button data-message="navigate" data-route="mobile-deliveries"><b>E</b><span>Entregas <em>${pendingDeliveries}</em></span></button><button data-message="navigate" data-route="mobile-diary"><b>D</b><span>Diário</span></button></div>
    ${card("Alertas", `<p><b>${pendingDeliveries}</b> entrega(s) aguardando foto de comprovação.</p><p>A administração atualizou o cronograma desta obra.</p>`)}
    ${mobileNav("Painel")}
  </section>`;
}

export function mobileRoutine() {
  const { access, work } = accessContext();
  if (!state.mobileAuthenticated) return loginGate();
  if (!access || !work) return dependencyNotice();
  return `${mobileHeader("Criar rotina", work.name)}<section class="mobile-page">${card("", `${formStep(1, "Nome da rotina", `<input placeholder="Ex.: Rotina de estrutura">`)}${formStep(2, "Obra", `<div class="select">${esc(work.name)}</div>`)}${formStep(3, "Serviços", `<div class="chips">${work.items.slice(0, 4).map((item) => `<span>${esc(item.description)}</span>`).join("")}<button>＋ Selecionar serviços</button></div>`)}`)}<button class="mobile-cta" data-message="save" data-entity="rotina" data-value="Rotina cadastrada" data-requires="work">Salvar rotina</button>${mobileNav("Rotina")}</section>`;
}

export function mobileDay() {
  const { access, work } = accessContext();
  if (!state.mobileAuthenticated) return loginGate();
  if (!access || !work) return dependencyNotice();
  const entries = work.items.slice(0, 4).map((item, index) => ({ id: item.id, title: item.description, time: index < 2 ? "07:00 — 12:00" : "13:00 — 17:00", tone: ["blue", "orange", "green", "blue"][index] }));
  return `${mobileHeader("Cronograma do dia", "Gerado pelo Cronograma da obra")}<section class="mobile-page"><div class="info">As atividades abaixo pertencem exclusivamente a ${esc(work.name)}.</div>${entries.map((entry) => `<button class="timeline ${entry.tone}" data-message="toggle-day-entry" data-entry-id="${esc(entry.id)}"><span>${entry.time}</span><h2>${esc(entry.title)}</h2><p>${esc(work.name)}</p><b>›</b></button>`).join("")}${mobileNav("Hoje")}</section>`;
}

export function mobileDeliveries() {
  const { access, work } = accessContext();
  if (!state.mobileAuthenticated) return loginGate();
  if (!access || !work) return dependencyNotice();
  const flows = state.purchaseFlows.filter((flow) => flow.workId === work.id);
  const pending = flows.filter((flow) => !flow.delivered);
  return `${mobileHeader("Entregas de compras", work.name)}<section class="mobile-page">
    ${pending.length ? pending.map((flow) => card(flow.title, `<span class="mobile-purchase-status">${esc(flow.status)}</span><p><strong>${esc(flow.material || "Material ainda não detalhado")}</strong></p><p>${esc(flow.quantity || "Quantidade pendente")} ${esc(flow.unit || "")} · necessário em ${esc(flow.neededAt || "data a definir")}</p><div class="delivery-gap"><b>Foto obrigatória</b><small>O sticker de entrega no desktop permanece lacunado até esta comprovação.</small></div><label class="mobile-file">Foto da entrega<input type="file" accept="image/*" capture="environment" data-message="delivery-photo"><span>Usar câmera</span></label>${state.deliveryPhotoName ? `<div class="selected-photo">${esc(state.deliveryPhotoName)}</div>` : ""}<button class="btn full" data-message="confirm-delivery">Confirmar entrega com foto</button>`)).join("") : card("Entregas concluídas", `<p>Não há stickers aguardando comprovação nesta obra.</p>`)}
    ${flows.filter((flow) => flow.delivered).map((flow) => card(flow.title, `<div class="delivery-complete"><b>✓ Entrega comprovada</b><small>${esc(flow.deliveryEvidence)}</small></div>`)).join("")}
    ${mobileNav("Entregas")}
  </section>`;
}

export function mobileDiary() {
  const { access, work } = accessContext();
  if (!state.mobileAuthenticated) return loginGate();
  if (!access || !work) return dependencyNotice();
  return `${mobileHeader("Diário da obra", work.name)}<section class="mobile-page">${card("Descrição do dia", `<textarea placeholder="Atividades realizadas, ocorrências e condições da obra"></textarea>`)}${card("Serviços executados", `<div class="chips">${items.slice(0, 5).map((item) => `<span>${esc(item.description)}</span>`).join("")}<button>＋ Selecionar serviços</button></div>`)}${card("Evidências", `<label class="mobile-file">Foto de confirmação<input type="file" accept="image/*" capture="environment"><span>Usar câmera</span></label><button class="btn ghost full" data-message="save" data-entity="diario" data-value="Foto anexada">Anexar foto</button>`)}<button class="mobile-cta" data-message="save" data-entity="diario" data-value="Diário completado">Completar diário</button>${mobileNav("Diário")}</section>`;
}

function mobileNav(active) {
  const targets = [
    { label: "Painel", icon: "P", route: "mobile-home" },
    { label: "Rotina", icon: "R", route: "mobile-routine" },
    { label: "Hoje", icon: "C", route: "mobile-day" },
    { label: "Entregas", icon: "E", route: "mobile-deliveries" },
    { label: "Diário", icon: "D", route: "mobile-diary" },
  ];
  return `<nav class="bottom-nav five">${targets.map((item) => `<button class="${item.label === active ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}"><b>${item.icon}</b><small>${item.label}</small></button>`).join("")}</nav>`;
}
