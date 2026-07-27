import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";

function authStatusMarkup() {
  const message = String(state.toast || "").trim();
  return `<div class="auth-form-status" data-auth-status data-tone="info" ${message ? "" : "hidden"} role="status" aria-live="polite">${esc(message)}</div>`;
}

export function adminLogin() {
  const customization = state.customization || {};
  return `<main class="admin-login-page">
    <form class="admin-login-card" data-auth-form="contact">
      <div class="login-brand"><strong>ERP da construção Maximus Empreendimentos</strong><span>Acesso administrativo</span></div>
      <h1>Entrar na estação</h1>
      <p>A máquina já foi autorizada pelo GitHub. Identifique o usuário pelo email e CPF cadastrados ou continue com Google.</p>
      <label class="login-field"><span>Email</span><input type="email" name="email" autocomplete="username" data-admin-email value="${esc(customization.adminLoginEmail || "")}" placeholder="admin@empresa.com" required></label>
      <label class="login-field"><span>CPF</span><input type="text" name="cpf" autocomplete="off" inputmode="numeric" data-admin-cpf value="${esc(customization.adminLoginCpf || "")}" placeholder="000.000.000-00" required></label>
      ${authStatusMarkup()}
      <button class="btn full" type="submit" data-message="admin-contact-login">Entrar com email e CPF</button>
      <div class="login-divider"><span>ou</span></div>
      <button class="auth-button google" type="button" data-message="firebase-login" data-provider="google">Continuar com Google</button>
    </form>
  </main>`;
}
