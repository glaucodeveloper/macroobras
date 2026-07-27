// MacroObras page architecture v27
// Página: admin-mobile-platform

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

export function adminMobilePlatform() {
  const platform = state.collaboratorStatus || {};
  const address = platform.publicAppUrl || platform.lanAppUrl || platform.localAppUrl || "Aguardando endereço";
  const online = String(address).startsWith("http");
  return `${pageHeader("Plataforma mobile", "O ngrok permanece ativo automaticamente enquanto a estação estiver aberta.")}
    <section class="mobile-address-only ${online ? "online" : "waiting"}">
      <small>Endereço de acesso do encarregado</small>
      ${online ? `<a href="${esc(address)}" target="_blank" rel="noreferrer">${esc(address)}</a>` : `<strong>${esc(address)}</strong>`}
      <button class="btn ghost" data-message="enable-lan-collaborator">Disponibilizar também na rede local</button>
    </section>`;
}

export default adminMobilePlatform;
