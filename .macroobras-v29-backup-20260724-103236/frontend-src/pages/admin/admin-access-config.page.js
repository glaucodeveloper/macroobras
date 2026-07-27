// MacroObras page architecture v27
// Página: admin-access-config

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

export function adminAccessConfig() {
  return `${pageHeader("Configuração de acesso", "Autorização da máquina e autenticação Google pelo Firebase.")}
    <div class="grid two access-config-grid">
      ${card("Máquina autorizada pelo GitHub", `<form data-auth-form="machine-update"><input class="credential-username-proxy" type="text" name="username" autocomplete="username" value="macroobras-machine" aria-label="Identificador da máquina" tabindex="-1" readonly><label>Repositório autorizado<input value="glaucodeveloper/macroobras" readonly></label><label>Token da máquina<input type="password" name="machine-token-update" autocomplete="new-password" placeholder="Substituir token GitHub" data-machine-github-token></label><button class="btn" type="button" data-message="save-machine-token">Atualizar autorização</button></form>`)}
      ${card("Firebase Authentication", `<label>Configuração JSON<textarea data-firebase-config placeholder='{"apiKey":"…","authDomain":"…","projectId":"…"}'></textarea></label><div class="auth-provider-row"><span>Google OAuth</span><b>Firebase</b></div><button class="btn" data-message="save-firebase-config">Salvar configuração</button>`)}
    </div>`;
}

export default adminAccessConfig;
