// MacroObras page architecture v27
// Página: admin-rh

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

const workById = (id) => availableWorks.find((work) => work.id === id);

export function adminRh() {
  const seed = state.rhModel || {
    nodes: [
      { id: "rh-admin", kind: "Entidade", title: "Administração", description: "Autoriza compras", observations: "", fields: [], x: 390, y: 42 },
      { id: "rh-eng", kind: "Equipe", title: "Engenharia", description: "Responsabilidade técnica", observations: "", fields: [], x: 70, y: 300 },
      { id: "rh-field", kind: "Equipe", title: "Encarregados", description: "Operação de campo", observations: "", fields: [], x: 390, y: 310 },
      { id: "rh-buy", kind: "Função", title: "Compras", description: "Cotação e pedidos", observations: "", fields: [], x: 710, y: 300 },
      ...mobileUsers.map((user, index) => ({ id: `rh-person-${index + 1}`, kind: "Pessoa", title: user.name, description: "Encarregado de obra", observations: "", fields: [{ name: "Email", value: user.email }, { name: "CPF", value: user.cpf }, { name: "Obra", value: workById(user.workId)?.name || "" }], x: 390 + index * 310, y: 585 })),
    ],
    edges: [
      { id: "rh-e1", from: "rh-admin", to: "rh-eng", label: "supervisiona" },
      { id: "rh-e2", from: "rh-admin", to: "rh-field", label: "coordena" },
      { id: "rh-e3", from: "rh-admin", to: "rh-buy", label: "autoriza" },
      ...mobileUsers.map((user, index) => ({ id: `rh-access-${index + 1}`, from: "rh-field", to: `rh-person-${index + 1}`, label: "identifica encarregado" })),
    ],
  };
  return `${pageHeader("RH", "Equipes, funções e relações operacionais em um organograma editável.", `<button class="btn" data-message="add-rh-entity">Adicionar entidade</button>`)}
    ${card("Organograma operacional", `<div class="interactive-diagram rh-diagram" data-interactive-diagram="rh-main"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(seed)}</script></div>`, "interactive-diagram-card")}
    ${card("Cadastros", `<table><thead><tr><th>Nome</th><th>Função</th><th>Obra</th><th>Acesso</th></tr></thead><tbody>${mobileUsers.map((user, index) => `<tr><td>${esc(user.name)}</td><td>${index ? "Encarregada" : "Encarregado"}</td><td>${esc(workById(user.workId)?.name || "")}</td><td>${esc(user.email)}</td></tr>`).join("")}</tbody></table>`)}`;
}

export default adminRh;
