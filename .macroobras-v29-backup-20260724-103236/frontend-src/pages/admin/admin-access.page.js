// MacroObras page architecture v27
// Página: admin-access

import {
  availableWorks,
  budgetImportPreview,
  mobileUsers,
} from "../../core/data.js";
import {
  selectedPurchaseFlow,
  selectedVisitPlan,
  selectedWork,
  state,
} from "../../core/machine-state.js";
import { esc } from "../../core/utils.js";
import { card, formStep, pageHeader } from "../../ui/components.js";

const percent = (value) => `${Math.round(Number(value || 0))}%`;

const activeWork = () => selectedWork() || availableWorks[0];

const accessesForWork = (workId) => (state.encarregadoAccesses || []).filter((access) => access.workId === workId);

function encarregadoAccessUrl(access) {
  const base = state.collaboratorStatus?.publicAppUrl
    || state.collaboratorStatus?.lanAppUrl
    || state.collaboratorStatus?.localAppUrl
    || `${window.location.origin}/?surface=twa`;
  const url = new URL(base, window.location.origin);
  url.searchParams.set("surface", "twa");
  url.searchParams.set("access", access.id);
  url.searchParams.set("work", access.workId);
  return url.toString();
}

function status(value) {
  const css = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
}

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div>${status(work.status)}<strong>${percent(work.progress)}</strong></div></div>`;
}

function workHeader(work, title, subtitle, actions = "") {
  return `${pageHeader(title, subtitle, actions)}${workContext(work)}`;
}

function adminWorkAccess() {
  const work = activeWork();
  const graphPeople = (state.rhModel?.nodes || []).filter((node) => String(node.kind || "").toLowerCase() === "pessoa");
  const people = graphPeople.length ? graphPeople.map((node) => ({
    id: node.id,
    name: node.title,
    email: node.fields?.find((field) => String(field.name).toLowerCase() === "email")?.value || "",
    cpf: node.fields?.find((field) => String(field.name).toLowerCase() === "cpf")?.value || "",
  })) : mobileUsers.map((user, index) => ({ id: user.personId || `rh-person-${index + 1}`, name: user.name, email: user.email, cpf: user.cpf }));
  const accesses = accessesForWork(work.id);
  const platform = state.collaboratorStatus || {};
  const platformOrigin = platform.publicAppUrl || platform.lanAppUrl || platform.localAppUrl || "Aguardando publicação da estação";

  return `${workHeader(work, "Acessos do encarregado", "O acesso mobile é criado dentro da obra e permanece limitado a esta obra.", `<button class="btn" data-message="focus-encarregado-form">Novo vínculo</button>`)}
    <section class="work-access-layout">
      ${card("Vincular encarregado", `<div data-encarregado-form>${formStep(1, "Pessoa identificada no RH", `<label>Pessoa do organograma</label><select data-encarregado-person>${people.map((person) => `<option value="${esc(person.id)}" data-email="${esc(person.email)}" data-cpf="${esc(person.cpf)}">${esc(person.name)}</option>`).join("")}</select><small>Email e CPF são lidos da identificação registrada no organograma de RH.</small>`)}${formStep(2, "Obra permitida", `<div class="locked-work-field"><small>Obra</small><strong>${esc(work.name)}</strong><span>${esc(work.code)}</span></div>`)}<button class="btn full" data-message="save-encarregado-access">Gerar acesso para esta obra</button></div>`)}
      ${card("Distribuição do acesso", `<div class="work-access-origin"><small>Base disponível</small><strong>${esc(platformOrigin)}</strong><p>O link individual recebe a identificação do encarregado e da obra. A entrada global sem vínculo não é utilizada.</p></div>`)}
    </section>
    <section class="section-heading"><div><h2>Encarregados vinculados</h2><p>Cada link abre a versão de campo já contextualizada nesta obra e exige email e CPF.</p></div></section>
    <section class="encarregado-access-list">
      ${accesses.length ? accesses.map((access) => `<article class="encarregado-access-card">
        <header><div><small>Encarregado</small><h3>${esc(access.name)}</h3></div>${status(access.status || "Ativo")}</header>
        <dl><div><dt>Obra vinculada</dt><dd>${esc(work.name)}</dd></div><div><dt>Email</dt><dd>${esc(access.email)}</dd></div><div><dt>CPF</dt><dd>${esc(access.cpf)}</dd></div></dl>
        <label>Endereço individual</label><div class="access-url-row"><input readonly value="${esc(encarregadoAccessUrl(access))}" data-access-url="${esc(access.id)}"><button class="btn ghost" data-message="copy-encarregado-url" data-access-id="${esc(access.id)}">Copiar</button></div>
        <footer><button class="btn" data-message="open-encarregado-access" data-access-id="${esc(access.id)}">Abrir como encarregado</button><button class="btn ghost danger" data-message="remove-encarregado-access" data-access-id="${esc(access.id)}">Remover vínculo</button></footer>
      </article>`).join("") : `<div class="empty-state wide"><b>00</b><h3>Nenhum encarregado vinculado</h3><p>Selecione uma pessoa do RH para gerar o primeiro acesso desta obra.</p></div>`}
    </section>`;
}

export function adminAccess() {
  return adminWorkAccess();
}

export default adminAccess;
