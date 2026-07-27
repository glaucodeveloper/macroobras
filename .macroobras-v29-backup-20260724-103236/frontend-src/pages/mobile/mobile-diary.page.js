// MacroObras page architecture v27
// Página: mobile-diary

import { items } from "../../core/data.js";
import { selectedMobileAccess, selectedWork, state } from "../../core/machine-state.js";
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

export default mobileDiary;
