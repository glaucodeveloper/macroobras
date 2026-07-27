import { initialInstallerStatus, initialOkfStatus } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { logo } from "../../ui/components.js";

const steps = [
  { title: "Instalação", caption: "pasta e FTP local" },
  { title: "Colaboradores", caption: "endpoint e acesso" },
  { title: "Archive/OKF", caption: "memória operacional" },
  { title: "Admin", caption: "obras e elementos" },
  { title: "App de medição", caption: "permissões por obra" },
];

export function installerScreen() {
  const step = Math.max(0, Math.min(state.installerStep || 0, steps.length - 1));
  const status = state.installerStatus || initialInstallerStatus;
  const okf = state.okfStatus || initialOkfStatus;

  return `
    <main class="installer-shell">
      <header class="installer-header">
        <div class="installer-brand">
          ${logo()}
          <div>
            <small>Configuração da estação</small>
            <strong>MacroObras Installer</strong>
            <span>Instalação da estação administrativa</span>
          </div>
        </div>
        <a href="?surface=admin">Abrir aplicação</a>
      </header>
      <section class="installer-panel">
        <nav class="installer-steps" aria-label="Etapas de instalação">
          ${steps.map((item, index) => `<button class="${index === step ? "active" : index < step ? "done" : ""}" data-message="installer-step" data-step="${index}"><b>${index + 1}</b><span>${esc(item.title)}</span><small>${esc(item.caption)}</small></button>`).join("")}
        </nav>
        <div class="installer-stage">${renderStep(step, status, okf)}</div>
        <footer class="installer-actions">
          <button class="btn ghost" data-message="installer-prev">Voltar</button>
          <button class="btn ghost" data-message="installer-status">Verificar</button>
          <button class="btn" data-message="${step === steps.length - 1 ? "installer-run" : "installer-next"}">${step === steps.length - 1 ? "Concluir" : "Continuar"}</button>
        </footer>
      </section>
    </main>
  `;
}

function renderStep(step, status, okf) {
  const views = [
    installFolderStep(status),
    collaboratorEndpointStep(status),
    archiveOkfStep(status, okf),
    adminIntroStep(okf),
    mobileIntroStep(status),
  ];
  return views[step] || views[0];
}

function installFolderStep(status) {
  return installerCard("Pasta de instalação e FTP local", "Escolha apenas a pasta onde a estação MacroObras será instalada e disponibilize essa pasta para transmissão na rede local.", `
    ${inputRow("Pasta de instalação", "installDir", status.installDir || "/opt/macroobras")}
    <div class="install-grid two-cols">
      <div class="endpoint-card">
        <strong>Transmissão FTP local</strong>
        <p>Exponha a pasta escolhida para computadores da mesma rede, sem publicar nada fora da rede interna.</p>
        <code>ftp://${esc(status.ftpHost || "192.168.0.24")}:${esc(status.ftpPort || "2121")}/macroobras</code>
        <button class="btn ghost" data-message="save" data-entity="ftp-local" data-value="Transmissão FTP local preparada">Preparar transmissão</button>
      </div>
      <div class="visual-guide">
        <span>1</span><p>Escolha a pasta</p>
        <span>2</span><p>Ative a transmissão local</p>
        <span>3</span><p>Compartilhe o endereço FTP na rede interna</p>
      </div>
    </div>
    <div class="installer-note">A interface registra a configuração e apresenta o endpoint local; o backend da estação executa a transmissão.</div>
  `);
}

function collaboratorEndpointStep(status) {
  return installerCard("Endpoint de colaboradores", "Esta etapa apresenta o endereço que o mestre de obras usará para acessar o aplicativo de campo.", `
    <div class="endpoint-card wide">
      <strong>Endpoint de colaboradores</strong>
      <code>${esc(status.collaboratorEndpoint || "https://colaboradores.macroobras.local/twa")}</code>
      <p>Use o print desta tela para orientar o usuário: esse endereço abre o app de medição, bloqueia fluxos sem obra e respeita os logins autorizados pela administração.</p>
    </div>
    <div class="installer-note">Esta tela só mostra o endpoint e aponta a funcionalidade para o usuário.</div>
  `);
}

function archiveOkfStep(status, okf) {
  return installerCard("Archive e OKF", "O Archive preserva evidências e o OKF organiza o conhecimento operacional que nasce das obras.", `
    <div class="install-grid two-cols">
      <div class="endpoint-card">
        <strong>Archive</strong>
        <code>${esc(status.archiveEndpoint || "file:///opt/macroobras/archive")}</code>
        <p>Guarda prints, anexos, tabelas importadas, diários e medições para auditoria local.</p>
      </div>
      <div class="endpoint-card">
        <strong>OKF</strong>
        <code>macroobras/knowledge</code>
        <p>Conecta cadastros, elementos de obra, dependências e rotinas para reaproveitar conhecimento nas próximas operações.</p>
      </div>
    </div>
    <div class="endpoint-card wide">
      <strong>Servidor Llama local</strong>
      <code>llama://127.0.0.1:11434/gemma4eb</code>
      <p>O modelo gemma4eb roda na estação para apoiar leitura do Archive, busca no OKF e sugestões operacionais sem enviar dados da obra para fora.</p>
    </div>
    <div class="installer-note">Status OKF: ${esc(okf.mensagem || "Aguardando introdução")}</div>
    <button class="btn ghost" data-message="prepare-okf">Introduzir Archive/OKF</button>
  `);
}

function adminIntroStep(okf) {
  return installerCard("Introdução administrativa", "A administração começa cadastrando obras, importando tabelas de medição e compondo elementos de obra reutilizáveis.", `
    <div class="install-grid">
      <div class="install-step"><header><span>1</span><h2>Obras</h2></header><p>Cadastre nomes de obras e importe tabelas de medição quando existirem.</p></div>
      <div class="install-step"><header><span>2</span><h2>Elementos</h2></header><p>Registre atividades predispostas, materiais, requisitos e dependências.</p></div>
      <div class="install-step"><header><span>3</span><h2>Equipe</h2></header><p>Autorize colaboradores por email/CPF e aloque cada login a obras específicas.</p></div>
    </div>
    <div class="installer-note">${esc(okf.mensagem || "OKF aguardando introdução visual")}</div>
  `);
}

function mobileIntroStep(status) {
  return installerCard("Introdução do app de medição", "Antes de distribuir o acesso do app de medição, cadastre email e CPF de cada colaborador e vincule cada login a uma obra.", `
    <div class="install-grid">
      <div class="install-step"><header><span>1</span><h2>Cadastrar login</h2></header><p>Informe email, CPF e nome do colaborador autorizado.</p></div>
      <div class="install-step"><header><span>2</span><h2>Vincular obra</h2></header><p>Escolha a obra que aquele login pode acessar no campo.</p></div>
      <div class="install-step"><header><span>3</span><h2>Usar endpoint</h2></header><p>O colaborador entra pelo endpoint apresentado e só vê os fluxos liberados para a obra.</p></div>
    </div>
    <dl>
      <dt>Admin</dt><dd>?surface=admin</dd>
      <dt>App de medição</dt><dd>?surface=twa</dd>
      <dt>Mensagem</dt><dd>${esc(status.message || "Introdução concluída")}</dd>
    </dl>
  `);
}

function installerCard(title, subtitle, body) {
  return `<article class="installer-card"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p>${body}</article>`;
}

function inputRow(label, name, value) {
  return `<label class="installer-field"><span>${esc(label)}</span><input data-installer-field="${esc(name)}" value="${esc(value)}" /></label>`;
}
