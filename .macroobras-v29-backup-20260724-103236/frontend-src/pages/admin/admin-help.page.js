// MacroObras page architecture v27
// Página: admin-help

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

export function adminHelp() {
  const screens = [
    ["01-login.png", "Login administrativo"],
    ["02-painel.png", "Painel"],
    ["03-obras.png", "Obras"],
    ["04-cronograma.png", "Cronograma gráfico"],
    ["05-compras.png", "Compras"],
    ["06-mobile.png", "Acesso do encarregado"],
  ];
  return `${pageHeader("Manual", "Sequência visual de uso da aplicação.")}
    <section class="manual-screenshot-strip">${screens.map(([file, label]) => `<figure><img src="./screens/${file}" alt="${esc(label)}" loading="lazy"><figcaption>${esc(label)}</figcaption></figure>`).join("")}</section>`;
}

export default adminHelp;
