import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

function option(value, current, label) {
  return `<option value="${esc(value)}" ${value === current ? "selected" : ""}>${esc(label)}</option>`;
}

function statusCard(label, value, detail, tone = "neutral") {
  return `<article class="settings-status-card ${esc(tone)}">
    <span></span>
    <div><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${esc(detail)}</p></div>
  </article>`;
}

export function adminSettings() {
  const installer = state.installerStatus || {};
  const okf = state.okfStatus || {};
  const collaborator = state.collaboratorStatus || {};
  const auth = state.authUser || {};
  const customization = state.customization || {};
  const savedAt = customization.savedAt ? new Date(customization.savedAt) : null;
  const savedLabel = savedAt && !Number.isNaN(savedAt.getTime())
    ? savedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "";

  return `${pageHeader(
    "Configurações",
    "Personalize a experiência e administre os serviços desta estação em um único lugar.",
    `<button class="btn ghost" data-message="navigate" data-route="admin-access-config">Login e segurança</button><button class="btn" data-message="open-installer-surface">Administrar instalação</button>`,
  )}
    <section class="settings-hub">
      <article class="settings-hero">
        <div class="settings-hero-copy">
          <small>Central administrativa da estação</small>
          <h2>Uma interface ajustada à sua operação</h2>
          <p>Marca, aparência, acesso, dados e serviços locais são persistidos no computador. As alterações visuais entram em vigor imediatamente após salvar.</p>
          <div class="settings-hero-tags"><span>Tema claro e escuro</span><span>Dados persistentes</span><span>Operação local</span></div>
        </div>
        <div class="settings-hero-summary">
          <div><span>Usuário atual</span><strong>${esc(auth.name || "Administrador")}</strong></div>
          <div><span>Email</span><strong>${esc(auth.email || customization.adminLoginEmail || "—")}</strong></div>
          <div><span>CPF</span><strong>${esc(auth.cpf || customization.adminLoginCpf || "—")}</strong></div>
          <div><span>Última personalização</span><strong>${esc(savedLabel || "Configuração padrão")}</strong></div>
        </div>
      </article>

      <section class="settings-status-grid" aria-label="Saúde dos serviços">
        ${statusCard(
          "Autorização da máquina",
          installer.githubAuthorized ? "Autorizada" : "Atenção necessária",
          installer.githubAuthorized
            ? `GitHub: ${installer.githubLogin || "credencial validada"}`
            : "Valide o token uma única vez no instalador.",
          installer.githubAuthorized ? "success" : "warning",
        )}
        ${statusCard(
          "Base de conhecimento OKF",
          okf.pronto ? "Operacional" : okf.configurado ? "Configurando" : "Pendente",
          okf.mensagem || okf.repoSsh || "Aguardando verificação do backend.",
          okf.pronto ? "success" : "warning",
        )}
        ${statusCard(
          "Aplicação de campo",
          collaborator.available
            ? "Online"
            : collaborator.localActive
              ? "Disponível localmente"
              : "Aguardando serviço",
          collaborator.publicAppUrl
            || collaborator.lanAppUrl
            || collaborator.localAppUrl
            || "Sem URL publicada.",
          collaborator.available || collaborator.localActive ? "success" : "neutral",
        )}
        ${statusCard(
          "Persistência da interface",
          "Ativa",
          "Tema, diagramas, organograma e notas de diário salvos nesta estação.",
          "success",
        )}
      </section>

      <section class="settings-main-grid">
        ${card(
          "Aparência e comportamento",
          `<form data-settings-form class="settings-form">
            <div class="settings-form-grid">
              <label class="settings-field settings-field-wide"><span>Nome da estação</span><input data-setting-field="stationName" value="${esc(customization.stationName || "ERP da construção Maximus Empreendimentos")}"></label>
              <label class="settings-field settings-field-wide"><span>Descrição operacional</span><input data-setting-field="stationSubtitle" value="${esc(customization.stationSubtitle || "Gestão operacional da construção")}"></label>
              <label class="settings-field"><span>Cor principal</span><div class="settings-color-input"><input data-setting-field="primaryColor" type="color" value="${esc(customization.primaryColor || "#0a61d8")}"><code>${esc(customization.primaryColor || "#0a61d8")}</code></div></label>
              <label class="settings-field"><span>Tema</span><select data-setting-field="theme">${option("system", customization.theme || "system", "Seguir o sistema")}${option("light", customization.theme, "Claro")}${option("dark", customization.theme, "Escuro")}</select></label>
              <label class="settings-field"><span>Densidade</span><select data-setting-field="density">${option("comfortable", customization.density || "comfortable", "Confortável")}${option("compact", customization.density, "Compacta")}</select></label>
              <label class="settings-field"><span>Subnavegação</span><select data-setting-field="sidebarBehavior">${option("hover", customization.sidebarBehavior || "hover", "Abrir ao passar o mouse")}${option("pinned", customization.sidebarBehavior, "Manter fixada")}</select></label>
            </div>
            <div class="settings-card-footer"><small>Configurações aplicadas a todas as páginas deste navegador.${savedLabel ? ` Último salvamento: ${esc(savedLabel)}.` : ""}</small><button class="btn" type="button" data-message="save-customization">Aplicar e salvar</button></div>
          </form>`,
          "settings-card settings-appearance-card",
        )}

        ${card(
          "Acesso e identidade",
          `<p class="settings-copy">O login administrativo usa email e CPF. A autorização GitHub pertence à máquina e não bloqueia novamente o usuário após a instalação.</p>
          <div class="settings-account"><span>${esc(String(auth.name || "Administrador").slice(0, 2).toUpperCase())}</span><div><strong>${esc(auth.name || "Administrador")}</strong><small>${esc(auth.email || customization.adminLoginEmail || "Email não informado")}</small></div></div>
          <div class="settings-link-grid">
            <button data-message="navigate" data-route="admin-access-config"><strong>Editar login administrativo</strong><span>Nome, email, CPF e token da máquina</span></button>
            <button data-message="navigate" data-route="admin-access"><strong>Gerenciar acessos de campo</strong><span>Encarregados vinculados por obra</span></button>
            <button data-message="logout-admin"><strong>Encerrar sessão</strong><span>Sair com segurança desta estação</span></button>
          </div>`,
          "settings-card settings-security-card",
        )}
      </section>

      <section class="settings-admin-tools">
        <header><div><small>Administração do computador</small><h2>Serviços e manutenção</h2></div><p>Atalhos para as rotinas técnicas sem exigir uso do terminal.</p></header>
        <div class="settings-tool-grid">
          <button data-message="open-installer-surface"><span class="settings-tool-index">01</span><strong>Instalação da estação</strong><small>Token GitHub, pasta local, FTP e comandos de inicialização.</small><em>${esc(installer.installDir || "Configurar")}</em></button>
          <button data-message="prepare-okf"><span class="settings-tool-index">02</span><strong>Conhecimento e OKF</strong><small>Baixar, preparar e verificar a base operacional da aplicação.</small><em>${esc(okf.branch || "main")}</em></button>
          <button data-message="navigate" data-route="admin-mobile-platform"><span class="settings-tool-index">03</span><strong>Plataforma de campo</strong><small>Publicação local, rede e acesso externo para encarregados.</small><em>${collaborator.available ? "Online" : "Verificar"}</em></button>
          <button data-message="navigate" data-route="admin-diagram-library"><span class="settings-tool-index">04</span><strong>Modelos de dados</strong><small>Glossário de serviços, requisitos e fluxos persistidos em OKF.</small><em>Diagramas</em></button>
          <button data-message="navigate" data-route="admin-data-transfer"><span class="settings-tool-index">05</span><strong>Importar e exportar</strong><small>Backup operacional em CSV e entrada controlada de registros.</small><em>Dados</em></button>
          <button data-message="navigate" data-route="admin-help"><span class="settings-tool-index">06</span><strong>Manual e diagnóstico</strong><small>Fluxos guiados, suporte à operação e informações da estação.</small><em>Ajuda</em></button>
        </div>
      </section>

      <section class="settings-technical-grid">
        ${card(
          "Instalação local",
          `<div class="settings-install-list">
            <div><span>Token GitHub</span><strong>${esc(installer.githubAuthorized ? "Validado" : "Não validado")}</strong></div>
            <div><span>Pasta de instalação</span><strong>${esc(installer.installDir || "Não escolhida")}</strong></div>
            <div><span>Servidor FTP</span><strong>${esc(installer.ftpVerified ? installer.ftpEndpoint || "Verificado" : "Pendente")}</strong></div>
          </div><button class="btn ghost full" type="button" data-message="open-installer-surface">Abrir administração da instalação</button>`,
          "settings-card",
        )}
        ${card(
          "Operação e dados",
          `<div class="settings-install-list">
            <div><span>Repositório OKF</span><strong>${esc(okf.repoSsh || "Não configurado")}</strong></div>
            <div><span>Diretório de conhecimento</span><strong>${esc(okf.knowledgeDir || "Aguardando backend")}</strong></div>
            <div><span>Aplicação de campo</span><strong>${esc(collaborator.localAppUrl || "Não iniciada")}</strong></div>
          </div><div class="settings-inline-actions"><button class="btn ghost" type="button" data-message="refresh-mobile-platform">Atualizar serviços</button><button class="btn ghost" type="button" data-message="export-system-csv" data-export-entity="obras">Exportar backup CSV</button></div>`,
          "settings-card",
        )}
      </section>
    </section>`;
}
