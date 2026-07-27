// MacroObras page architecture v27
// Página: admin-diagram-library

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

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function adminDiagramLibrary() {
  const allWorkElements = {
    nodes: availableWorks.flatMap((work, workIndex) => {
      const baseX = 70 + workIndex * 620;
      const workNode = { id: `library-work-${work.id}`, kind: "Obra", title: work.name, description: work.address, observations: "", fields: [{ name: "Código", value: work.code }], x: baseX, y: 55 };
      const itemNodes = work.items.map((item, itemIndex) => ({
        id: `library-item-${work.id}-${item.id}`,
        kind: "Item de execução",
        title: item.description,
        description: `Orçamento alocado: ${money(item.budget)}`,
        observations: "",
        fields: [{ name: "Obra", value: work.name }, { name: "Orçamento", value: money(item.budget) }],
        x: baseX + (itemIndex % 2) * 290,
        y: 255 + Math.floor(itemIndex / 2) * 245,
      }));
      return [workNode, ...itemNodes];
    }),
    edges: availableWorks.flatMap((work) => work.items.map((item) => ({
      id: `library-edge-${work.id}-${item.id}`,
      from: `library-work-${work.id}`,
      to: `library-item-${work.id}-${item.id}`,
      label: "possui item",
    }))),
  };
  const operational = {
    nodes: [
      { id: "sys-login", kind: "Acesso", title: "Login administrativo", description: "Abre a estação e inicia o ngrok automaticamente", x: 70, y: 70 },
      { id: "sys-work", kind: "Obra", title: "Endereço + planilha", description: "Cria a obra e todos os itens de execução", x: 410, y: 70 },
      { id: "sys-plan", kind: "Cronograma", title: "Relações entre atividades", description: "Itens, datas e materiais necessários", x: 750, y: 70 },
      { id: "sys-calendar", kind: "Calendário", title: "Agenda da obra", description: "Gerada pelas datas do cronograma", x: 1090, y: 70 },
      { id: "sys-field", kind: "Campo", title: "Encarregado de obra mobile", description: "Cronograma, diário e comprovação de entrega", x: 750, y: 330 },
      { id: "sys-measure", kind: "Controle", title: "Medição e progresso", description: "Consolida os registros do diário", x: 1090, y: 330 },
    ],
    edges: [
      { id: "sys-e1", from: "sys-login", to: "sys-work", label: "cadastra" },
      { id: "sys-e2", from: "sys-work", to: "sys-plan", label: "disponibiliza itens" },
      { id: "sys-e3", from: "sys-plan", to: "sys-calendar", label: "gera datas" },
      { id: "sys-e4", from: "sys-plan", to: "sys-field", label: "publica cronograma" },
      { id: "sys-e5", from: "sys-field", to: "sys-measure", label: "envia registros" },
    ],
  };
  const purchases = {
    nodes: [
      { id: "buy-item", kind: "Item", title: "Item de execução", description: "Descrição e orçamento alocado", x: 70, y: 90 },
      { id: "buy-request", kind: "Compra", title: "Solicitação", description: "Material, quantidade, unidade e data", x: 390, y: 90 },
      { id: "buy-approve", kind: "Administração", title: "Autorização", description: "Aprovação exclusiva no desktop", x: 710, y: 90 },
      { id: "buy-delivery", kind: "Campo", title: "Entrega", description: "Foto enviada pelo encarregado", x: 1030, y: 90 },
      { id: "buy-complete", kind: "Controle", title: "Sticker completo", description: "Entrega vinculada à obra e ao item", x: 710, y: 350 },
    ],
    edges: [
      { id: "buy-e1", from: "buy-item", to: "buy-request", label: "inicia fluxo" },
      { id: "buy-e2", from: "buy-request", to: "buy-approve", label: "envia para autorização" },
      { id: "buy-e3", from: "buy-approve", to: "buy-delivery", label: "libera compra" },
      { id: "buy-e4", from: "buy-delivery", to: "buy-complete", label: "comprova com foto" },
    ],
  };
  return `${pageHeader("Modelos de diagramas", "Itens importados, materiais e fluxos visuais de funcionamento da estação.")}
    ${card("Elementos de todas as obras", `<div class="diagram-help"><span><b>1</b> Todos os itens importados aparecem como quadros</span><span><b>2</b> Conecte quadros para estabelecer relações</span><span><b>3</b> Solte uma nova linha na área vazia para criar um material</span></div><div class="interactive-diagram library-elements-diagram" data-interactive-diagram="all-work-elements" data-allow-material-drop="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(allWorkElements)}</script></div>`, "interactive-diagram-card")}
    ${card("Fluxo operacional do sistema", `<div class="interactive-diagram system-flow-diagram" data-interactive-diagram="system-operational" data-fixed-edges="true" data-hide-node-dates="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(operational)}</script></div>`, "interactive-diagram-card diagram-section-gap")}
    ${card("Fluxo de compra e comprovação", `<div class="interactive-diagram system-flow-diagram" data-interactive-diagram="system-purchases" data-fixed-edges="true" data-hide-node-dates="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(purchases)}</script></div>`, "interactive-diagram-card diagram-section-gap")}`;
}

export default adminDiagramLibrary;
