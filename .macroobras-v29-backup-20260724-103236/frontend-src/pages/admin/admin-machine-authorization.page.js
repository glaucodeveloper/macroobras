// MacroObras page architecture v27
// Página: admin-machine-authorization

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

export function adminMachineAuthorization() {
  return `<main class="admin-login-page machine-authorization-page">
    <form class="admin-login-card machine-authorization-card" data-auth-form="machine">
      <input class="credential-username-proxy" type="text" name="username" autocomplete="username" value="macroobras-machine" aria-label="Identificador da máquina" tabindex="-1" readonly>
      <div class="login-brand"><strong>MacroObras</strong><span>Autorização da máquina</span></div>
      <h1>Autorizar esta estação</h1>
      <p>Informe o token GitHub vinculado a esta máquina. Após a verificação, a identificação do usuário será solicitada em uma tela separada.</p>
      <label class="login-field"><span>Token GitHub da máquina</span><input type="password" name="github-machine-token" autocomplete="current-password" data-admin-github-token placeholder="github_pat_… ou ghp_…" required></label>
      ${authStatusMarkup()}
      <button class="btn full" type="submit" data-message="admin-machine-token-authorize">Verificar token e continuar</button>
    </form>
  </main>`;
}

export default adminMachineAuthorization;
