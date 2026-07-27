// MacroObras page architecture v27
// Página: admin-login

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

function authStatusMarkup() {
  const message = String(state.toast || "").trim();
  return `<div class="auth-form-status" data-auth-status data-tone="info" ${message ? "" : "hidden"} role="status" aria-live="polite">${esc(message)}</div>`;
}

function status(value) {
  const css = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
}

export function adminLogin() {
  return `<main class="admin-login-page">
    <form class="admin-login-card" data-auth-form="contact">
      <div class="login-brand"><strong>MacroObras</strong><span>Acesso administrativo</span></div>
      <h1>Entrar na estação</h1>
      <p>A máquina já foi autorizada pelo GitHub. Identifique o usuário pelo email e telefone cadastrados ou continue com Google.</p>
      <label class="login-field"><span>Email</span><input type="email" name="email" autocomplete="email" data-admin-email placeholder="admin@empresa.com" required></label>
      <label class="login-field"><span>Telefone</span><input type="tel" name="phone" autocomplete="tel" inputmode="tel" data-admin-phone placeholder="(77) 99999-9999" required></label>
      ${authStatusMarkup()}
      <button class="btn full" type="submit" data-message="admin-contact-login">Entrar com email e telefone</button>
      <div class="login-divider"><span>ou</span></div>
      <button class="auth-button google" type="button" data-message="firebase-login" data-provider="google">Continuar com Google</button>
    </form>
  </main>`;
}

export default adminLogin;
