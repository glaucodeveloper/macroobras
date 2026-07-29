import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";
import { letterheadSettings } from "./letterhead-settings.js";

function option(value, current, label) {
  return `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(label)}</option>`;
}
function disabled(editing) { return editing ? "" : "disabled"; }
function statusCard(label, value, detail, tone = "neutral") {
  return `<article class="settings-status-card ${esc(tone)}"><span></span><div><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${esc(detail)}</p></div></article>`;
}

/* MACROOBRAS PRINT HISTORY SETTINGS V2 */
function printHistoryCard(records) {
  const items = Array.isArray(records) ? records : [];

  const body = items.length
    ? `<div class="table-scroll">
        <table class="settings-print-history">
          <thead>
            <tr>
              <th>Número</th>
              <th>Documento</th>
              <th>Data e hora</th>
              <th>Usuário</th>
            </tr>
          </thead>
          <tbody>
            ${items.slice(0, 100).map((record) => `
              <tr>
                <td><strong>${esc(record.number || "—")}</strong></td>
                <td>${esc(record.title || record.type || "Documento")}</td>
                <td>${esc(record.dateLabel || record.createdAt || "—")}</td>
                <td>${esc(record.userName || record.userEmail || "Administrador")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`
    : `<div class="empty-state">
        <h3>Nenhuma impressão registrada</h3>
        <p>Relatórios timbrados impressos ou salvos em PDF aparecerão aqui.</p>
      </div>`;

  return card(
    "Registros de impressão",
    body,
    "settings-card settings-print-records-card",
  );
}


export function adminSettings() {
  const printRecords = Array.isArray(state.printRecords) ? state.printRecords : [];

  const installer = state.installerStatus || {};
  const okf = state.okfStatus || {};
  const collaborator = state.collaboratorStatus || {};
  const auth = state.authUser || {};
  const customization = state.customization || {};
  const editing = Boolean(state.settingsEditing);
  const savedAt = customization.savedAt ? new Date(customization.savedAt) : null;
  const savedLabel = savedAt && !Number.isNaN(savedAt.getTime()) ? savedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
  const adminName = customization.adminName || auth.name || "Administrador";
  const adminEmail = customization.adminLoginEmail || auth.email || "";
  const adminCpf = customization.adminLoginCpf || auth.cpf || "";

  return `${pageHeader("Configurações", "Informações da sessão, identidade da estação, aparência e serviços locais.", `<button class="btn ghost" data-message="edit-settings" ${editing ? "disabled" : ""}>Editar</button><button class="btn" data-message="save-settings-top" ${editing ? "" : "disabled"}>Salvar configurações</button>`)}
    <section class="settings-hub">
      <article class="settings-session-panel">
        <header><div><small>Estado inicial da sessão</small><h2>Identidade e configuração ativa</h2></div><span class="${editing ? "editing" : "saved"}">${editing ? "Em edição" : "Configuração salva"}</span></header>
        <form class="settings-session-form" data-settings-form>
          <label><span>Nome do usuário</span><input data-setting-field="adminName" value="${esc(adminName)}" ${disabled(editing)}></label>
          <label><span>Email da sessão</span><input type="email" data-setting-field="adminLoginEmail" value="${esc(adminEmail)}" ${disabled(editing)}></label>
          <label><span>CPF da sessão</span><input data-setting-field="adminLoginCpf" value="${esc(adminCpf)}" ${disabled(editing)}></label>
          <label><span>Nome da estação</span><input data-setting-field="stationName" value="${esc(customization.stationName || "ERP da construção Maximus Empreendimentos")}" ${disabled(editing)}></label>
          <label class="wide"><span>Descrição operacional</span><input data-setting-field="stationSubtitle" value="${esc(customization.stationSubtitle || "Gestão operacional da construção")}" ${disabled(editing)}></label>
        </form>
        <footer><span>${savedLabel ? `Último salvamento: ${esc(savedLabel)}` : "Usando as informações da sessão atual."}</span><strong>${esc(adminName)}</strong></footer>
      </article>

      <section class="settings-status-grid" aria-label="Saúde dos serviços">
        ${statusCard("Autorização da máquina", installer.githubAuthorized ? "Autorizada" : "Atenção necessária", installer.githubAuthorized ? `GitHub: ${installer.githubLogin || "credencial validada"}` : "Valide o token uma única vez no instalador.", installer.githubAuthorized ? "success" : "warning")}
        ${statusCard("Base de conhecimento OKF", okf.pronto ? "Operacional" : okf.configurado ? "Configurando" : "Pendente", okf.mensagem || okf.repoSsh || "Aguardando verificação do backend.", okf.pronto ? "success" : "warning")}
        ${statusCard("Aplicação de campo", collaborator.available ? "Online" : collaborator.localActive ? "Disponível localmente" : "Aguardando serviço", collaborator.publicAppUrl || collaborator.lanAppUrl || collaborator.localAppUrl || "Sem URL publicada.", collaborator.available || collaborator.localActive ? "success" : "neutral")}
        ${statusCard("Persistência", "Ativa", "Sessão, diagramas, tickets, inventário e preferências salvos nesta estação.", "success")}
      </section>

      <section class="settings-main-grid">
        ${card("Aparência e comportamento", `<form data-settings-form class="settings-form"><div class="settings-form-grid">
          <label class="settings-field"><span>Cor principal</span><div class="settings-color-input"><input data-setting-field="primaryColor" type="color" value="${esc(customization.primaryColor || "#0a61d8")}" ${disabled(editing)}><code>${esc(customization.primaryColor || "#0a61d8")}</code></div></label>
          <label class="settings-field"><span>Tema</span><select data-setting-field="theme" ${disabled(editing)}>${option("system", customization.theme || "system", "Seguir o sistema")}${option("light", customization.theme, "Claro")}${option("dark", customization.theme, "Escuro")}</select></label>
          <label class="settings-field"><span>Densidade</span><select data-setting-field="density" ${disabled(editing)}>${option("comfortable", customization.density || "comfortable", "Confortável")}${option("compact", customization.density, "Compacta")}</select></label>
          <label class="settings-field"><span>Subnavegação</span><select data-setting-field="sidebarBehavior" ${disabled(editing)}>${option("hover", customization.sidebarBehavior || "hover", "Abrir ao passar o mouse")}${option("pinned", customization.sidebarBehavior, "Manter fixada")}</select></label>
        </div><div class="settings-card-footer"><small>Use Editar e Salvar configurações no topo da página.</small></div></form>`, "settings-card settings-appearance-card")}
        ${card("Acesso e identidade", `<div class="settings-account"><span>${esc(String(adminName).slice(0, 2).toUpperCase())}</span><div><strong>${esc(adminName)}</strong><small>${esc(adminEmail || "Email não informado")}</small></div></div><div class="settings-link-grid"><button data-message="navigate" data-route="admin-access-config"><strong>Editar login administrativo</strong><span>Nome, email, CPF e token da máquina</span></button><button data-message="navigate" data-route="admin-access"><strong>Gerenciar acessos de campo</strong><span>Encarregados vinculados por obra</span></button><button data-message="logout-admin"><strong>Encerrar sessão</strong><span>Sair com segurança desta estação</span></button></div>`, "settings-card settings-security-card")}
      </section>

      ${printHistoryCard(printRecords)}

      <section class="settings-admin-tools"><header><div><small>Administração do computador</small><h2>Serviços e manutenção</h2></div><p>Atalhos administrativos sem exigir terminal.</p></header><div class="settings-tool-grid">
        <button data-message="open-installer-surface"><span class="settings-tool-index">01</span><strong>Instalação da estação</strong><small>Token GitHub e inicialização.</small><em>${esc(installer.installDir || "Configurar")}</em></button>
        <button data-message="prepare-okf"><span class="settings-tool-index">02</span><strong>Conhecimento e OKF</strong><small>Preparar a base operacional.</small><em>${esc(okf.branch || "main")}</em></button>
        <button data-message="navigate" data-route="admin-mobile-platform"><span class="settings-tool-index">03</span><strong>Plataforma de campo</strong><small>Rede e acesso externo.</small><em>${collaborator.available ? "Online" : "Verificar"}</em></button>
        <button data-message="navigate" data-route="admin-diagram-library"><span class="settings-tool-index">04</span><strong>Modelos de dados</strong><small>Diagramas e relações.</small><em>Diagramas</em></button>
        <button data-message="navigate" data-route="admin-data-transfer"><span class="settings-tool-index">05</span><strong>Importar e exportar</strong><small>Backup operacional.</small><em>Dados</em></button>
        <button data-message="navigate" data-route="admin-help"><span class="settings-tool-index">06</span><strong>Manual e diagnóstico</strong><small>Arquitetura e fluxos.</small><em>Ajuda</em></button>
      </div></section>
      ${letterheadSettings(customization, editing, auth)}
    </section>`;
}
