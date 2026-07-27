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
