import { availableWorks, items } from "../data.js";
import { card, formStep, mobileHeader } from "../components.js";
import { state, selectedWork } from "../state.js";
import { esc } from "../utils.js";

function workSelector() {
  return card("Selecionar obra", `
    <div class="work-list">
      ${availableWorks.map((work) => `<button data-message="select-work" data-work-id="${esc(work.id)}"><strong>${esc(work.name)}</strong><small>${esc(work.code)}</small></button>`).join("")}
    </div>
    <div class="info">ⓘ <p>Os fluxos do mestre só ficam disponíveis depois que uma obra estiver selecionada.</p></div>
  `);
}

function loginGate() {
  return `
    ${mobileHeader("MacroObras", "Acesso autorizado")}
    <section class="mobile-page">
      ${card("Cadastro do colaborador", `
        <label>Email autorizado</label><input placeholder="email@empresa.com" />
        <label>CPF autorizado</label><input placeholder="000.000.000-00" />
        <div class="info">ⓘ <p>O acesso precisa ter sido cadastrado na administração e vinculado a uma obra.</p></div>
      `)}
      <button class="mobile-cta" data-message="mobile-login">Entrar</button>
      ${mobileNav("Painel")}
    </section>
  `;
}

function dependencyNotice() {
  return `
    ${mobileHeader("MacroObras", "Selecione uma obra")}
    <section class="mobile-page">
      ${workSelector()}
      ${mobileNav("Painel")}
    </section>
  `;
}

export function mobileHome() {
  if (!state.mobileAuthenticated) return loginGate();

  const work = selectedWork();
  if (!work) {
    return `
      ${mobileHeader("MacroObras", "Selecione uma obra vinculada")}
      <section class="mobile-page">
        ${workSelector()}
        ${card("Fluxos bloqueados", `<p>Serviços, rotinas, cronograma, diário, compras e recibos dependem de uma obra ativa.</p>`)}
        ${mobileNav("Painel")}
      </section>
    `;
  }

  const actions = [
    { label: "Criar rotina", icon: "R", type: "navigate", route: "mobile-routine" },
    { label: "Cronograma do dia", icon: "C", type: "navigate", route: "mobile-day" },
    { label: "Registrar diário", icon: "D", type: "navigate", route: "mobile-diary" },
  ];

  return `
    ${mobileHeader("MacroObras", work.name)}
    <section class="mobile-page">
      ${card("", `<div class="sync"><strong>Hoje, 24 de maio</strong><span>Sincronizado há 2 min</span></div>`)}
      <div class="action-grid">${actions.map((action) => `<button data-message="${esc(action.type)}" data-route="${esc(action.route || "")}" data-entity="colaborador" data-value="${esc(`${action.label} aberto`)}" data-requires="work"><b>${esc(action.icon)}</b><span>${esc(action.label)}</span></button>`).join("")}</div>
      ${card("Alertas", `<p>Administração alterou o cronograma da semana.</p><p>Diário de 22/05 enviado para medição.</p><p>3 serviços aguardam evidências.</p>`)}
      ${mobileNav("Painel")}
    </section>
  `;
}

export function mobileRoutine() {
  const work = selectedWork();
  if (!work) return dependencyNotice();

  return `
    ${mobileHeader("Criar rotina")}
    <section class="mobile-page">
      ${card("", `${formStep(1, "Nome da rotina", `<input placeholder="Ex.: Rotina de estrutura e alvenaria" />`)}${formStep(2, "Obra", `<div class="select">▦ ${esc(work.name)}</div>`)}${formStep(3, "Rotativa", `<p>A rotina se repetirá automaticamente conforme o período definido.</p><label class="toggle"><input checked type="checkbox" /><span></span></label>`)}`)}
      ${card("", `${formStep(4, "Serviços da rotina", `<div class="service-line">Concretar sapatas da frente norte ×</div><div class="service-line">Levantar alvenaria do térreo ×</div><div class="add-line">＋ Buscar e adicionar serviços</div>`)}${formStep(5, "Observações", `<textarea placeholder="Ex.: Observações, detalhes importantes, restrições, etc."></textarea>`)}`)}
      <button class="mobile-cta" data-message="save" data-entity="rotina" data-value="Rotina cadastrada" data-requires="work">Salvar rotina</button>
      ${mobileNav("Rotina")}
    </section>
  `;
}

export function mobileDay() {
  const work = selectedWork();
  if (!work) return dependencyNotice();
  const entries = [
    {
      id: "manha-fundacao",
      title: "Rotina de fundação",
      tag: "Turno da manhã",
      place: "Bloco A - Pavimento Térreo",
      time: "07:00 - 12:00",
      tone: "blue",
      routines: [
        { name: "Concretar sapatas da frente norte", team: "Equipe 1", status: "Aplicada" },
        { name: "Conferir ferragem das vigas baldrames", team: "Equipe 2", status: "Aplicada" },
      ],
    },
    {
      id: "tarde-reboco",
      title: "Reboco corredor térreo",
      tag: "Turno da tarde",
      place: "Bloco A - Pavimento Térreo",
      time: "13:00 - 17:00",
      tone: "orange",
      routines: [
        { name: "Chapisco do corredor principal", team: "Equipe 3", status: "Aplicada" },
        { name: "Revisão de prumo e acabamento", team: "Equipe 3", status: "Planejada" },
      ],
    },
    {
      id: "apoio-impermeabilizacao",
      title: "Impermeabilização banheiro 101",
      tag: "Apoio pontual",
      place: "Bloco B - 1º Pavimento - Sala 101",
      time: "09:00 - 11:00",
      tone: "green",
      routines: [
        { name: "Preparar base do box", team: "Equipe 4", status: "Aplicada" },
      ],
    },
  ];

  return `
    ${mobileHeader("Cronograma do dia", "24 de maio de 2024")}
    <section class="mobile-page">
      <div class="info">ⓘ Alterações nas alocações do dia serão comunicadas à administração.</div>
      ${entries.map((entry) => timeline(entry)).join("")}
      <button class="mobile-cta" data-message="save" data-entity="cronograma" data-value="Item de cronograma cadastrado" data-requires="work">Adicionar item ao cronograma</button>
      ${mobileNav("Hoje")}
    </section>
  `;
}

function timeline(entry) {
  const expanded = state.mobileDayExpandedId === entry.id;
  return `
    <button class="timeline ${esc(entry.tone)} ${expanded ? "expanded" : ""}" data-message="toggle-day-entry" data-entry-id="${esc(entry.id)}" data-requires="work">
      <span>${esc(entry.tag)}</span>
      <h2>${esc(entry.title)}</h2>
      <p>${esc(entry.place)}</p>
      <p>Equipe vinculada</p>
      <p>${expanded ? "Rotinas aplicadas expandidas" : "Execução planejada"}</p>
      <b>${esc(entry.time)}</b>
    </button>
    ${expanded ? expandedDayEntry(entry) : ""}
  `;
}

function expandedDayEntry(entry) {
  return card("Rotinas aplicadas neste período", `
    <div class="info">ⓘ <p>O clique no card do cronograma abre as rotinas aplicadas do período para criação, edição e remoção.</p></div>
    <div class="day-crud-actions">
      <button class="btn" data-message="save" data-entity="rotina-aplicada" data-value="Rotina aplicada criada" data-requires="work">Nova rotina aplicada</button>
      <button class="btn ghost" data-message="toggle-day-entry" data-entry-id="${esc(entry.id)}" data-requires="work">Fechar expansão</button>
    </div>
    <table class="day-routines-table">
      <thead><tr><th>Rotina aplicada</th><th>Equipe</th><th>Status</th><th>CRUD</th></tr></thead>
      <tbody>
        ${entry.routines.map((routine) => `<tr><td>${esc(routine.name)}</td><td>${esc(routine.team)}</td><td><span class="badge">${esc(routine.status)}</span></td><td><div class="table-actions"><button class="btn ghost" data-message="save" data-entity="rotina-aplicada" data-value="Rotina aplicada atualizada" data-requires="work">Editar rotina aplicada</button><button class="btn ghost" data-message="save" data-entity="rotina-aplicada" data-value="Rotina aplicada removida" data-requires="work">Remover rotina aplicada</button></div></td></tr>`).join("")}
      </tbody>
    </table>
  `, "day-routines-expanded");
}

export function mobileDiary() {
  const work = selectedWork();
  if (!work) return dependencyNotice();

  return `
    ${mobileHeader("Diário de obra", `22 de maio de 2025 - ${work.name}`)}
    <section class="mobile-page">
      ${card("Descrição do dia", `<textarea placeholder="Descreva as atividades realizadas hoje, ocorrências e condições gerais da obra..."></textarea>`)}
      ${card("Serviços executados hoje", `<div class="chips">${items.slice(0, 4).map((item) => `<span>${esc(item.description)}</span>`).join("")}<button>Selecionar serviços</button></div>`)}
      ${card("Confirmação do serviço feito", `
        <p>Use a câmera para apontar o serviço realizado. A confirmação entra no diário e fica disponível como prova na medição.</p>
        <label>Serviço confirmado</label><div class="select">▦ Fundação executada parcialmente</div>
        <label>Foto de confirmação</label><input type="file" accept="image/*" capture="environment" aria-label="Foto de confirmação do serviço" />
        <button class="btn ghost" data-message="save" data-entity="confirmacao-servico" data-value="Confirmação com câmera anexada ao diário" data-requires="work">Anexar foto de confirmação</button>
      `)}
      ${card("Registros do dia", `<button class="btn ghost">Novo registro</button>${["Fundação executada parcialmente no turno da manhã", "Banheiro 101 liberado para impermeabilização", "Recebimento de materiais: tubos e conexões hidráulicas"].map((r) => `<p class="record"><strong>${esc(r)}</strong><small>22/05/2025</small></p>`).join("")}`)}
      ${card("Anexos e evidências", `<div class="photos">${Array.from({ length: 5 }, () => `<button><span>Adicionar foto</span></button>`).join("")}</div>`)}
      <div class="dual"><button class="btn ghost" data-message="save" data-entity="diario" data-value="Registro salvo" data-requires="work">Salvar registro</button><button class="btn" data-message="save" data-entity="diario" data-value="Diário completado com prova para medição" data-requires="work">Completar diário</button></div>
      <div class="info">ⓘ Ao completar o diário, a confirmação por câmera segue como prova para aplicação do progresso da medição.</div>
      ${mobileNav("Diário")}
    </section>
  `;
}

function mobileNav(active) {
  const targets = selectedWork() ? [
    { label: "Painel", icon: "P", route: "mobile-home" },
    { label: "Rotina", icon: "R", route: "mobile-routine" },
    { label: "Hoje", icon: "C", route: "mobile-day" },
    { label: "Diário", icon: "D", route: "mobile-diary" },
  ] : [
    { label: "Painel", icon: "P", route: "mobile-home" },
  ];

  return `<nav class="bottom-nav">${targets.map((item) => `<button class="${item.label === active ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}"><b>${esc(item.icon)}</b><small>${esc(item.label)}</small></button>`).join("")}</nav>`;
}
