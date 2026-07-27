// MacroObras page architecture v27
// Página: admin-data-transfer

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

export function adminDataTransfer() {
  return `${pageHeader("Importar e exportar dados", "Arquivos CSV com codificação UTF-8 e separador por ponto e vírgula.")}
    <div class="grid two">
      ${card("Importar CSV", `<label class="dropzone"><input type="file" accept=".csv,text/csv" data-message="import-system-csv"><span>⇧</span><strong>Selecionar arquivo CSV</strong><small>Obras, itens, compras, pessoas e medições.</small></label>`)}
      ${card("Exportar CSV", `<div class="data-export-list"><button class="btn" data-message="export-system-csv" data-export-entity="obras">Obras e itens</button><button class="btn ghost" data-message="export-system-csv" data-export-entity="compras">Compras</button><button class="btn ghost" data-message="export-system-csv" data-export-entity="rh">RH e acessos</button><button class="btn ghost" data-message="export-system-csv" data-export-entity="medicoes">Medições</button></div>`)}
    </div>`;
}

export default adminDataTransfer;
