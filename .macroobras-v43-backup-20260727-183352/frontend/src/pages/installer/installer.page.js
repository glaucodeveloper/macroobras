import { initialInstallerStatus } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";

const steps = [
  {
    title: "Autorização",
    caption: "token GitHub da máquina",
  },
  {
    title: "Pasta e FTP",
    caption: "transmissão na rede local",
  },
  {
    title: "Concluir",
    caption: "primeiro administrador",
  },
];

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || "").trim()
  );
}

function validCpf(value) {
  const digits = digitsOnly(value);

  if (
    digits.length !== 11
    || /^(\d)\1{10}$/.test(digits)
  ) {
    return false;
  }

  const calculate = (length) => {
    let sum = 0;

    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }

    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculate(9) === Number(digits[9])
    && calculate(10) === Number(digits[10])
  );
}

function adminDraft(status) {
  return {
    name: String(
      state.installerAdminName
        || sessionStorage.getItem(
          "macroobras.installerAdminName"
        )
        || status.githubLogin
        || "Administrador"
    ).trim(),
    email: String(
      state.installerAdminEmail
        || sessionStorage.getItem(
          "macroobras.installerAdminEmail"
        )
        || ""
    ).trim(),
    cpf: String(
      state.installerAdminCpf
        || sessionStorage.getItem(
          "macroobras.installerAdminCpf"
        )
        || ""
    ).trim(),
  };
}

function adminValidation(status) {
  const draft = adminDraft(status);

  if (draft.name.length < 2) {
    return {
      valid: false,
      message: "Informe o nome do administrador.",
    };
  }

  if (!validEmail(draft.email)) {
    return {
      valid: false,
      message: "Informe um email administrativo válido.",
    };
  }

  if (!validCpf(draft.cpf)) {
    return {
      valid: false,
      message: "Informe um CPF válido.",
    };
  }

  return {
    valid: true,
    message: "Dados do administrador prontos para criação.",
  };
}

export function installerScreen() {
  const status =
    state.installerStatus
      || initialInstallerStatus;
  const step = Math.max(
    0,
    Math.min(
      Number(state.installerStep || 0),
      steps.length - 1
    )
  );

  return `<main class="installer-shell first-access-installer">
    <header class="installer-header">
      <div>
        <strong>ERP da construção Maximus Empreendimentos</strong>
        <span>Configuração inicial da estação</span>
      </div>
      <small>
        Executada somente quando ainda não existe usuário administrador
      </small>
    </header>

    <section class="installer-panel">
      <nav
        class="installer-steps"
        aria-label="Etapas de configuração"
      >
        ${steps.map((item, index) => `
          <button
            class="${
              index === step
                ? "active"
                : index < step
                  ? "done"
                  : ""
            }"
            data-message="installer-step"
            data-step="${index}"
            ${
              index > step
              && !status.githubAuthorized
                ? "disabled"
                : ""
            }
          >
            <b>${index + 1}</b>
            <span>${esc(item.title)}</span>
            <small>${esc(item.caption)}</small>
          </button>
        `).join("")}
      </nav>

      <div class="installer-stage">
        ${renderStep(step, status)}
      </div>

      <footer class="installer-actions">
        <button
          class="btn ghost"
          data-message="installer-prev"
          ${step === 0 ? "disabled" : ""}
        >
          Voltar
        </button>

        <button
          class="btn ghost"
          data-message="installer-status"
        >
          Verificar
        </button>

        ${
          step < steps.length - 1
            ? `<button
                class="btn"
                data-message="installer-next"
                ${!canContinue(step, status) ? "disabled" : ""}
              >
                Continuar
              </button>`
            : `<button
                class="btn"
                data-message="installer-run"
                ${!canContinue(step, status) ? "disabled" : ""}
              >
                Criar administrador e abrir
              </button>`
        }
      </footer>
    </section>
  </main>`;
}

function canContinue(step, status) {
  if (step === 0) {
    return Boolean(status.githubAuthorized);
  }

  if (step === 1) {
    return Boolean(
      status.pathReady
      && status.ftpVerified
    );
  }

  return adminValidation(status).valid;
}

function renderStep(step, status) {
  return [
    authorizationStep(status),
    folderFtpStep(status),
    finishStep(status),
  ][step];
}

function authorizationStep(status) {
  return installerCard(
    "Autorizar esta máquina",
    "O token é verificado pelo GitHub e identifica a estação antes da criação do primeiro administrador.",
    `
      <form
        class="installer-token-form"
        data-auth-form="installer-machine"
      >
        <input
          class="credential-username-proxy"
          type="text"
          name="username"
          autocomplete="username"
          value="macroobras-installer-machine"
          aria-label="Identificador da máquina"
          tabindex="-1"
          readonly
        >

        <label class="installer-field">
          <span>Token de autorização GitHub</span>
          <input
            type="password"
            name="installer-github-token"
            autocomplete="current-password"
            data-installer-github-token
            placeholder="github_pat_… ou ghp_…"
            required
          >
        </label>

        <div
          class="auth-form-status"
          data-auth-status
          data-tone="info"
          hidden
          role="status"
          aria-live="polite"
        ></div>

        <button
          class="btn"
          type="submit"
          data-message="authorize-installer-github"
        >
          Autorizar máquina
        </button>
      </form>

      <div class="installer-status-line ${
        status.githubAuthorized
          ? "ok"
          : ""
      }">
        <b>${status.githubAuthorized ? "✓" : "1"}</b>
        <span>
          <strong>
            ${
              status.githubAuthorized
                ? `Autorizado como ${
                    esc(
                      status.githubLogin
                      || "usuário GitHub"
                    )
                  }`
                : "Aguardando autorização"
            }
          </strong>
          <small>
            ${
              esc(
                status.message
                || "Informe um token com acesso ao repositório da estação."
              )
            }
          </small>
        </span>
      </div>
    `
  );
}

function folderFtpStep(status) {
  const folder =
    status.installDir
      || state.selectedInstallFolder
      || "Nenhuma pasta selecionada";

  return installerCard(
    "Selecionar pasta e verificar FTP",
    "O seletor abre o explorador do sistema. A pasta escolhida é transmitida somente na rede local.",
    `
      <div class="folder-picker-row">
        <div>
          <small>Pasta compartilhada</small>
          <strong>${esc(folder)}</strong>
        </div>

        <button
          class="btn ghost"
          data-message="select-install-folder"
        >
          Escolher pasta
        </button>
      </div>

      <div class="install-grid two-cols">
        <div class="endpoint-card">
          <strong>Transmissão FTP</strong>
          <code>
            ${esc(status.ftpEndpoint || "Aguardando pasta")}
          </code>
          <p>
            O servidor FTP publica exatamente a pasta selecionada.
          </p>
          <button
            class="btn"
            data-message="start-ftp-share"
            ${status.pathReady ? "" : "disabled"}
          >
            Iniciar e verificar FTP
          </button>
        </div>

        <div class="ftp-check-list">
          <span class="${status.pathReady ? "ok" : ""}">
            <b>${status.pathReady ? "✓" : "1"}</b>
            Pasta acessível
          </span>
          <span class="${status.ftpReady ? "ok" : ""}">
            <b>${status.ftpReady ? "✓" : "2"}</b>
            Servidor iniciado
          </span>
          <span class="${status.ftpVerified ? "ok" : ""}">
            <b>${status.ftpVerified ? "✓" : "3"}</b>
            Conexão FTP verificada
          </span>
        </div>
      </div>
    `
  );
}

function finishStep(status) {
  const draft = adminDraft(status);
  const validation = adminValidation(status);

  return installerCard(
    "Criar o primeiro administrador",
    "A instalação será marcada como concluída. Nos próximos acessos a estação abrirá a página de login.",
    `
      <label class="installer-field">
        <span>Nome do administrador</span>
        <input
          autocomplete="name"
          data-installer-admin-name
          value="${esc(draft.name)}"
          required
        >
      </label>

      <label class="installer-field">
        <span>Email administrativo</span>
        <input
          type="email"
          autocomplete="email"
          data-installer-admin-email
          value="${esc(draft.email)}"
          placeholder="admin@empresa.com"
          required
        >
      </label>

      <label class="installer-field">
        <span>CPF administrativo</span>
        <input
          type="text"
          autocomplete="off"
          inputmode="numeric"
          data-installer-admin-cpf
          value="${esc(draft.cpf)}"
          placeholder="000.000.000-00"
          required
        >
      </label>

      <div
        class="installer-status-line ${
          validation.valid
            ? "ok"
            : ""
        }"
        data-installer-admin-validation
      >
        <b>${validation.valid ? "✓" : "3"}</b>
        <span>
          <strong>
            ${
              validation.valid
                ? "Dados verificados"
                : "Cadastro incompleto"
            }
          </strong>
          <small>${esc(validation.message)}</small>
        </span>
      </div>

      <div class="endpoint-card wide">
        <strong>OKF operacional</strong>
        <p>
          O OKF será produzido pelo gráfico de elementos de cada obra.
          Itens, materiais, observações, campos e relações do
          Cronograma formam a memória operacional.
        </p>
      </div>
    `
  );
}

function installerCard(title, subtitle, body) {
  return `<article class="installer-card">
    <h1>${esc(title)}</h1>
    <p>${esc(subtitle)}</p>
    ${body}
  </article>`;
}
