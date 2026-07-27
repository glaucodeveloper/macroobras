// MacroObras page architecture v27
// Página: admin-settings

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

export function adminSettings() {
  return `${pageHeader("Administração", "Acessos, distribuição da estação, dados e referências de uso.")}
    <section class="settings-grid">
      <button data-message="navigate" data-route="admin-diagram-library"><b>↗</b><strong>Modelos de diagramas</strong><span>Reconhecimento visual dos fluxos do sistema.</span></button>
      <button data-message="navigate" data-route="admin-help"><b>?</b><strong>Manual</strong><span>Sequência de prints de uso desde o login.</span></button>
      <button data-message="navigate" data-route="admin-data-transfer"><b>CSV</b><strong>Importar e exportar dados</strong><span>Transferência em arquivos CSV.</span></button>
      <button data-message="navigate" data-route="admin-access-config"><b>⌁</b><strong>Configuração de acesso</strong><span>GitHub e Firebase Authentication.</span></button>
    </section>`;
}

export default adminSettings;
