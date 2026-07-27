import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

export function adminAccessConfig() {
  const customization = state.customization || {};
  return `${pageHeader("Configuração de login", "Ajuste o acesso administrativo por email e CPF, e mantenha a autorização GitHub da máquina ao lado.")}
    <div class="grid two access-config-grid">
      ${card("Credenciais administrativas", `<form data-login-config-form><label>Nome do administrador<input data-login-field="name" value="${esc(state.authUser?.name || "Administrador")}"></label><label>Email de login<input type="email" autocomplete="email" data-login-field="email" value="${esc(customization.adminLoginEmail || "")}" placeholder="admin@empresa.com"></label><label>CPF de login<input data-login-field="cpf" inputmode="numeric" autocomplete="off" value="${esc(customization.adminLoginCpf || "")}" placeholder="000.000.000-00"></label><button class="btn" type="button" data-message="save-login-config">Salvar login</button></form>`)}
      ${card("Autorização da máquina", `<form data-auth-form="machine-update"><input class="credential-username-proxy" type="text" name="username" autocomplete="username" value="macroobras-machine" aria-label="Identificador da máquina" tabindex="-1" readonly><label>Repositório autorizado<input value="glaucodeveloper/erp-da-construcao-maximus-empreendimentos" readonly></label><label>Token da máquina<input type="password" name="machine-token-update" autocomplete="new-password" placeholder="Substituir token GitHub" data-machine-github-token></label><button class="btn" type="button" data-message="save-machine-token">Atualizar autorização</button></form>`)}
    </div>`;
}
