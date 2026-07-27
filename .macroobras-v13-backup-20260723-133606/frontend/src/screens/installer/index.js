import { initialInstallerStatus } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";

const steps = [
  { title: "Autorização", caption: "token GitHub da máquina" },
  { title: "Pasta e FTP", caption: "transmissão na rede local" },
  { title: "Acesso do encarregado", caption: "endpoint local automático" },
  { title: "Concluir", caption: "primeiro administrador" },
];

export function installerScreen() {
  const status = state.installerStatus || initialInstallerStatus;
  const step = Math.max(0, Math.min(Number(state.installerStep || 0), steps.length - 1));
  return `<main class="installer-shell first-access-installer">
    <header class="installer-header"><div><strong>MacroObras</strong><span>Configuração inicial da estação</span></div><small>Executada somente quando ainda não existe usuário administrador</small></header>
    <section class="installer-panel">
      <nav class="installer-steps" aria-label="Etapas de configuração">${steps.map((item, index) => `<button class="${index === step ? "active" : index < step ? "done" : ""}" data-message="installer-step" data-step="${index}" ${index > step && !status.githubAuthorized ? "disabled" : ""}><b>${index + 1}</b><span>${esc(item.title)}</span><small>${esc(item.caption)}</small></button>`).join("")}</nav>
      <div class="installer-stage">${renderStep(step, status)}</div>
      <footer class="installer-actions"><button class="btn ghost" data-message="installer-prev" ${step === 0 ? "disabled" : ""}>Voltar</button><button class="btn ghost" data-message="installer-status">Verificar</button>${step < steps.length - 1 ? `<button class="btn" data-message="installer-next" ${!canContinue(step, status) ? "disabled" : ""}>Continuar</button>` : `<button class="btn" data-message="installer-run" ${!canContinue(step, status) ? "disabled" : ""}>Criar administrador e abrir</button>`}</footer>
    </section>
  </main>`;
}

function canContinue(step, status) {
  if (step === 0) return Boolean(status.githubAuthorized);
  if (step === 1) return Boolean(status.pathReady && status.ftpVerified);
  if (step === 2) return Boolean(status.endpointReady);
  return Boolean(status.githubAuthorized && status.pathReady && status.ftpVerified && status.endpointReady);
}

function renderStep(step, status) {
  return [authorizationStep(status), folderFtpStep(status), collaboratorStep(status), finishStep(status)][step];
}

function authorizationStep(status) {
  return installerCard("Autorizar esta máquina", "O token é verificado pelo GitHub e identifica o primeiro administrador. Ele não é exportado com os dados da aplicação.", `
    <label class="installer-field"><span>Token de autorização GitHub</span><input type="password" autocomplete="off" data-installer-github-token placeholder="github_pat_… ou ghp_…"></label>
    <button class="btn" data-message="authorize-installer-github">Autorizar máquina</button>
    <div class="installer-status-line ${status.githubAuthorized ? "ok" : ""}"><b>${status.githubAuthorized ? "✓" : "1"}</b><span><strong>${status.githubAuthorized ? `Autorizado como ${esc(status.githubLogin || "usuário GitHub")}` : "Aguardando autorização"}</strong><small>${esc(status.message || "Informe um token com acesso ao repositório da estação.")}</small></span></div>
  `);
}

function folderFtpStep(status) {
  const folder = status.installDir || state.selectedInstallFolder || "Nenhuma pasta selecionada";
  return installerCard("Selecionar pasta e verificar FTP", "O seletor abre o explorador do sistema. A pasta escolhida é transmitida somente na rede local.", `
    <div class="folder-picker-row"><div><small>Pasta compartilhada</small><strong>${esc(folder)}</strong></div><button class="btn ghost" data-message="select-install-folder">Escolher pasta</button></div>
    <div class="install-grid two-cols">
      <div class="endpoint-card"><strong>Transmissão FTP</strong><code>${esc(status.ftpEndpoint || "Aguardando pasta")}</code><p>O servidor FTP publica exatamente a pasta selecionada.</p><button class="btn" data-message="start-ftp-share" ${status.pathReady ? "" : "disabled"}>Iniciar e verificar FTP</button></div>
      <div class="ftp-check-list"><span class="${status.pathReady ? "ok" : ""}"><b>${status.pathReady ? "✓" : "1"}</b>Pasta acessível</span><span class="${status.ftpReady ? "ok" : ""}"><b>${status.ftpReady ? "✓" : "2"}</b>Servidor iniciado</span><span class="${status.ftpVerified ? "ok" : ""}"><b>${status.ftpVerified ? "✓" : "3"}</b>Conexão FTP verificada</span></div>
    </div>
  `);
}

function collaboratorStep(status) {
  return installerCard("Distribuição local do acesso do encarregado", "O endereço é calculado a partir do IP da máquina e só é publicado na rede após solicitação administrativa.", `
    <div class="endpoint-card wide"><strong>Endpoint local da máquina</strong><code>${esc(status.collaboratorEndpoint || "Aguardando distribuição local")}</code><p>O encarregado acessa este endereço pelo celular conectado à mesma rede.</p><button class="btn" data-message="enable-lan-collaborator">Disponibilizar na rede local</button></div>
    <div class="installer-status-line ${status.endpointReady ? "ok" : ""}"><b>${status.endpointReady ? "✓" : "3"}</b><span><strong>${status.endpointReady ? "Endpoint disponível" : "Endpoint ainda local"}</strong><small>${esc(status.endpointMessage || "A administração precisa autorizar a distribuição.")}</small></span></div>
  `);
}

function finishStep(status) {
  return installerCard("Criar o primeiro administrador", "A instalação será marcada como concluída. Nos próximos acessos a estação abrirá a página de login.", `
    <label class="installer-field"><span>Nome do administrador</span><input data-installer-admin-name value="${esc(status.githubLogin || "Administrador")}"></label>
    <label class="installer-field"><span>Email administrativo</span><input type="email" data-installer-admin-email placeholder="admin@empresa.com"></label>
    <div class="endpoint-card wide"><strong>OKF operacional</strong><p>O OKF será produzido pelo gráfico de elementos de cada obra. Itens, materiais, observações, campos e relações do Cronograma formam a memória operacional.</p></div>
  `);
}

function installerCard(title, subtitle, body) {
  return `<article class="installer-card"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p>${body}</article>`;
}
