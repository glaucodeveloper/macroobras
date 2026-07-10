import { availableWorks, items, mobileUsers } from "../data.js";
import { card, formStep, metric, pageHeader, sidePanel } from "../components.js";
import { state } from "../state.js";
import { esc } from "../utils.js";

export function adminAddWork() {
  return `
    ${pageHeader("Adicionar obra", "Cadastre uma nova obra e importe a tabela de itens para começar.", `<button class="btn ghost">Cancelar</button><button class="btn" data-message="save" data-entity="obra" data-value="Obra salva">Salvar obra →</button>`)}
    <div class="grid two">
      ${card("", `
        ${formStep(1, "Dados da obra", `<label>Nome da obra *</label><input placeholder="Ex.: Residencial Vila das Árvores" /><div class="split"><input placeholder="Ex.: OBRA-001" /><input placeholder="Digite o cliente" /></div>`)}
        ${formStep(2, "Importar tabela de medição", `<div class="dropzone">⬆<strong>Arraste e solte sua tabela de medição aqui</strong><button>Selecionar arquivo</button><small>Formatos aceitos: .xlsx, .xls, .csv &nbsp; <u>Baixar modelo</u></small></div>`)}
        ${formStep(3, "Editor de lista de itens", `<div class="editor">${items.map((item, i) => `<p><span>${i + 1}</span>${esc(item.description)}</p>`).join("")}</div><small>Você poderá ajustar, incluir ou remover itens antes de salvar a obra.</small>`)}
      `)}
      ${card("Prévia dos itens importados", `
        <table><thead><tr><th>#</th><th>Descrição do item</th><th>Nível</th></tr></thead><tbody>${items.map((item, i) => `<tr><td>${i + 1}</td><td>${esc(item.description)}</td><td><span class="badge">${item.level}</span></td></tr>`).join("")}</tbody></table>
        <div class="info">ⓘ <div><strong>Medição administrativa criada automaticamente</strong><p>Ao salvar a obra, será criada a medição administrativa com base na tabela importada.</p></div></div>
      `)}
    </div>
  `;
}

export function adminMobileAccess() {
  return `
    ${pageHeader("Acessos do app de medição", "Cadastre email e CPF dos colaboradores permitidos e vincule cada login a uma obra específica.", `<button class="btn" data-message="save" data-entity="acesso-app-medicao" data-value="Acesso do app de medição salvo para obra">Salvar acesso</button>`)}
    <div class="grid two">
      ${card("Novo colaborador autorizado", `
        ${formStep(1, "Identificação", `<div class="split"><input placeholder="Nome do colaborador" /><input placeholder="CPF" /></div><input placeholder="email@empresa.com" />`)}
        ${formStep(2, "Alocação em obra", `<div class="select">▦ ${esc(availableWorks[0]?.name || "Selecione uma obra")}</div><small>O login do app só acessa as obras explicitamente vinculadas.</small>`)}
      `)}
      ${card("Logins vinculados", `
        <table><thead><tr><th>Nome</th><th>Email</th><th>CPF</th><th>Obra</th></tr></thead><tbody>${mobileUsers.map((user) => `<tr><td>${esc(user.name)}</td><td>${esc(user.email)}</td><td>${esc(user.cpf)}</td><td><span class="badge">${esc(availableWorks.find((work) => work.id === user.workId)?.code || "sem obra")}</span></td></tr>`).join("")}</tbody></table>
        <div class="info">ⓘ <p>Use esta tela antes de entregar o endpoint do app de medição aos colaboradores.</p></div>
      `)}
    </div>
  `;
}

export function adminElements() {
  const elements = state.temporaryWorkElements || [];
  const active = elements[0] || { name: "", description: "", materials: "", dependencies: [], unlocks: [] };
  return `
    ${pageHeader("Elementos de obra", "Cadastre atividades com materiais, requisitos, dependências e liberações.", `<button class="btn" data-message="add-work-element">Adicionar elemento de obra</button>`)}
    <div class="grid two">
      ${card("Elemento de obra", `
        <label>Nome do elemento</label><input data-element-field="name" placeholder="Ex.: Contrapiso" value="${esc(active.name)}" />
        <div class="element-props">
          <label>Descrição</label><textarea data-element-field="description" placeholder="Descreva o propósito do elemento">${esc(active.description)}</textarea>
          <label>Materiais</label><textarea data-element-field="materials" placeholder="Materiais separados por vírgula">${esc(active.materials)}</textarea>
        </div>
        <div class="info">ⓘ <p>Ao adicionar, o elemento compõe a estrutura da obra para orientar medições, cronogramas e relações operacionais.</p></div>
      `)}
      ${card("Propriedades laterais", `
        <div class="side-lanes">
          <div><h3>Dependências</h3><textarea data-element-field="dependencies" placeholder="Uma por linha">${esc((active.dependencies || []).join("\n"))}</textarea></div>
          <div><h3>Liberações</h3><textarea data-element-field="unlocks" placeholder="Uma por linha">${esc((active.unlocks || []).join("\n"))}</textarea></div>
        </div>
      `)}
    </div>
    ${card("Mapa de dependências", `
      <div class="element-canvas" data-drag-scroll>
        <div class="lane left">
          <h3>Dependências</h3>
          ${elements.flatMap((element) => element.dependencies || []).slice(0, 8).map((item, index) => `<div class="node small" style="top:${40 + index * 78}px;left:${30 + index * 18}px">${esc(item)}</div>`).join("")}
        </div>
        <div class="lane center">
          <h3>Elementos</h3>
          ${elements.map((element, index) => `<div class="node main" style="top:${70 + index * 92}px;left:${480 + index * 44}px"><strong>${esc(element.name)}</strong><small>${esc(element.materials)}</small></div>`).join("")}
        </div>
        <div class="lane right">
          <h3>Liberações</h3>
          ${elements.flatMap((element) => element.unlocks || []).slice(0, 8).map((item, index) => `<div class="node small" style="top:${48 + index * 78}px;left:${940 + index * 22}px">${esc(item)}</div>`).join("")}
        </div>
        <svg class="connectors" width="1260" height="520" viewBox="0 0 1260 520" aria-hidden="true">
          <path d="M220 92 C330 92 360 116 480 116" />
          <path d="M720 116 C820 116 830 96 940 96" />
          <path d="M238 172 C340 172 360 210 526 210" />
          <path d="M770 210 C840 210 850 174 962 174" />
          <path d="M256 252 C350 252 398 300 570 300" />
          <path d="M810 300 C875 300 882 252 984 252" />
        </svg>
      </div>
      <small>Arraste horizontalmente com o mouse para navegar entre dependências à esquerda e liberações à direita.</small>
    `)}
  `;
}

export function adminCalendar() {
  const days = ["Seg 12/05", "Ter 13/05", "Qua 14/05", "Qui 15/05", "Sex 16/05", "Sáb 17/05"];
  const rows = ["Turno da manhã", "Turno da tarde", "Alocação livre"];
  const jobs = ["Rotina de fundação", "Rotina de alvenaria", "Reboco corredor térreo", "Impermeabilização banheiro 101", "Instalação hidráulica", "Carga de entulho"];
  return `
    ${pageHeader("Cronograma da obra", "Visualize e organize rotinas e serviços no calendário da obra.", `<button class="btn ghost">Exportar</button><button class="btn" data-message="save" data-entity="cronograma" data-value="Cronograma cadastral salvo">Novo agendamento +</button>`)}
    <div class="filters"><input value="Residencial Vila das Árvores" /><input value="12 a 18 de mai. de 2025" /><input value="Todos" /><button>Filtros</button></div>
    <div class="calendar-layout">
      ${card("", `<div class="calendar"><div></div>${days.map((d) => `<strong>${d}</strong>`).join("")}${rows.map((row, r) => `<aside>${row}<small>${r === 0 ? "07h - 12h" : r === 1 ? "13h - 18h" : "Apoios pontuais"}</small></aside>${days.map((_, i) => allocation(jobs[(i + r) % jobs.length], r)).join("")}`).join("")}</div>`)}
      <aside class="right-panels">${sidePanel("Itens disponíveis", ["Instalação elétrica", "Contrapiso", "Pintura", "Esquadrias", "Montagem de andaime"])}${sidePanel("Rotinas do mestre", ["Rotina de fundação", "Rotina de alvenaria", "Rotina de instalações", "Rotina de acabamentos"])}${sidePanel("Notificações", ["Cronograma alterado pela administração"])}</aside>
    </div>
    <div class="metrics">${metric("Rotinas agendadas", "8", "na semana")}${metric("Apoios pontuais", "4", "na semana")}${metric("Horas previstas", "37h", "na semana")}${metric("Conflitos", "0", "na semana")}</div>
  `;
}

function allocation(title, tone) {
  return `<div class="allocation tone-${tone}"><strong>${esc(title)}</strong><small>Bloco A</small><span>${tone === 0 ? "Turno da manhã" : tone === 1 ? "3 horas" : "Apoio pontual"}</span></div>`;
}

export function adminMeasurement() {
  const rows = [
    { code: "1.1.01", item: "fundação", unit: "m2", planned: 100, previous: 28, period: 14, accumulated: 42, balance: 58, note: "Concluída etapa de sapatas e vigas baldrames.", diaries: "3 diários" },
    { code: "1.1.02", item: "reboco interno", unit: "m2", planned: 100, previous: 10, period: 8, accumulated: 18, balance: 82, note: "Execução em andamento nos ambientes internos.", diaries: "2 diários" },
    { code: "1.1.03", item: "instalação hidráulica", unit: "vb", planned: 100, previous: 3, period: 5, accumulated: 8, balance: 92, note: "Início da instalação de pontos de água fria.", diaries: "1 diário" },
    { code: "1.1.04", item: "impermeabilização banheiro", unit: "m2", planned: 100, previous: 9, period: 11, accumulated: 20, balance: 80, note: "Impermeabilização de piso e parede em execução.", diaries: "1 diário" },
    { code: "1.1.05", item: "alvenaria térreo", unit: "m2", planned: 100, previous: 22, period: 12, accumulated: 34, balance: 66, note: "Alvenaria concluída no térreo.", diaries: "1 diário" },
  ];
  const proofs = [
    { service: "Fundação executada parcialmente", item: "fundação", diary: "22/05/2025", proof: "Foto por câmera", confirmation: "Confirmado no diário 22/05", application: "Aplicado em 42%" },
    { service: "Reboco corredor térreo", item: "reboco interno", diary: "22/05/2025", proof: "Foto por câmera", confirmation: "Confirmado no diário 22/05", application: "Aplicado em 18%" },
    { service: "Impermeabilização banheiro 101", item: "impermeabilização banheiro", diary: "22/05/2025", proof: "Foto por câmera", confirmation: "Confirmado no diário 22/05", application: "Aplicado em 20%" },
    { service: "Instalação de pontos de água fria", item: "instalação hidráulica", diary: "21/05/2025", proof: "Foto por câmera", confirmation: "Confirmado no diário 21/05", application: "Aplicado em 8%" },
    { service: "Elevação de alvenaria do térreo", item: "alvenaria térreo", diary: "20/05/2025", proof: "Foto por câmera", confirmation: "Confirmado no diário 20/05", application: "Aplicado em 34%" },
  ];
  return `
    ${pageHeader("Medição da obra", "Acompanhe o progresso dos itens com base nos diários completados.", `<div class="mini-info">ⓘ Percentuais persistidos via ORM SQLite.</div>`)}
    <div class="metrics cards">${metric("Itens totais", "5", "itens cadastrados")}${metric("Diários completados", "8", "de 12 diários")}${metric("Última atualização", "Hoje, 10:42", "por Admin")}</div>
    ${card("Tabela de medição espelhada da planilha", `<table class="measurement"><thead><tr><th>Cód.</th><th>Serviço / item</th><th>Unid.</th><th>Previsto</th><th>Anterior</th><th>No período</th><th>Acumulado</th><th>Saldo</th><th>Observação</th><th>Diários</th><th>Ação</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${esc(row.code)}</td><td><strong>${esc(row.item)}</strong></td><td>${esc(row.unit)}</td><td>${row.planned}%</td><td>${row.previous}%</td><td><label class="percent"><input value="${row.period}" />%</label></td><td>${row.accumulated}%</td><td>${row.balance}%</td><td>${esc(row.note)}</td><td><span class="badge">${esc(row.diaries)}</span></td><td><button class="btn ghost" data-message="save" data-entity="medicao" data-value="Medição atualizada com prova de serviço">Aplicar progresso</button></td></tr>`).join("")}</tbody></table><div class="total">Planilha administrativa espelhada do upload <strong>5 linhas correlacionadas</strong></div>`)}
    <div class="grid two">
      ${card("Comparação da medição", `<div class="dropzone tall">⬆<strong>Solte a planilha de percentuais aqui</strong><button>Selecionar planilha</button><small>Colunas esperadas: item, percentual esperado, observação.</small></div>${sidePanel("Preview importado", ["fundação 45%", "reboco interno 18%", "instalação hidráulica 8%"])}<button class="btn" data-message="save" data-entity="comparacao-medicao" data-value="Comparação da medição registrada">Gerar comparação da medição</button>`)}
      ${card("Tabela comparativa", `<table><thead><tr><th>Item</th><th>Admin.</th><th>Planilha</th><th>Diferença</th></tr></thead><tbody>${[["fundação", 35, 45], ["reboco interno", 15, 18], ["instalação hidráulica", 5, 8], ["impermeabilização banheiro", 15, 20]].map(([i, a, e]) => `<tr><td>${esc(i)}</td><td>${a}%</td><td>${e}%</td><td class="warn">${a - e}%</td></tr>`).join("")}</tbody></table><div class="info">ⓘ <p>A comparação é parte da medição e fica vinculada ao percentual administrativo da obra.</p></div>`)}
    </div>
    ${card("Lista longa de provas correlacionadas ao serviço", `
      <div class="info">ⓘ <p>As fotos capturadas no app de medição confirmam o serviço feito, entram no diário e ficam listadas ao fim da página para conferência com a tabela da medição.</p></div>
      <table><thead><tr><th>Serviço feito</th><th>Item da medição</th><th>Diário</th><th>Prova</th><th>Confirmação</th><th>Aplicação</th></tr></thead><tbody>${proofs.map((proof) => `<tr><td>${esc(proof.service)}</td><td>${esc(proof.item)}</td><td>${esc(proof.diary)}</td><td>${esc(proof.proof)}</td><td>${esc(proof.confirmation)}</td><td><button class="btn ghost" data-message="save" data-entity="prova-medicao" data-value="Prova aplicada ao progresso da medição">${esc(proof.application)}</button></td></tr>`).join("")}</tbody></table>
    `)}
  `;
}
