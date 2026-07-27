import {
  availableWorks,
  budgetImportPreview,
  initialCollaboratorStatus,
  initialOkfStatus,
} from "./data.js";
import { callRpc } from "./api.js";
import { renderRoute, normalizedMobileRoute } from "./router.js";
import { installerScreen } from "../screens/installer/index.js";
import { shell, twaShell } from "../ui/shells.js";
import {
  configureStateRenderer,
  dependencyMessage,
  isInstallerSurface,
  isTwaSurface,
  selectedPurchaseFlow,
  selectedWork,
  state,
  updateState,
} from "./state.js";

export function initApp() {
  const root = document.querySelector("#app");
  if (!root) return;

  configureStateRenderer(render);
  root.addEventListener("click", handleClick);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("change", handleChange);
  root.addEventListener("input", handleInput);
  render();
  pollCollaboratorStatus();
  pollOkfStatus();
  pollInstallerStatus();
  window.setInterval(pollCollaboratorStatus, 5000);
  window.setInterval(pollOkfStatus, 15000);
}

function render() {
  const root = document.querySelector("#app");
  if (!root) return;

  const route = isTwaSurface() ? normalizedMobileRoute(state.route) : state.route;
  if (isInstallerSurface()) {
    root.innerHTML = installerScreen();
    return;
  }

  const screen = renderRoute(route);
  root.innerHTML = isTwaSurface()
    ? twaShell({ id: "macroobras-app", state: { ...state, route }, screen })
    : shell({ id: "macroobras-app", state, screen });
}

function handleClick(event) {
  const target = event.target.closest("[data-message], button");
  if (!target) return;
  const message = normalizeMessage(target, event);

  if (message.type === "select-work") {
    updateState({ selectedWorkId: message.workId, route: "mobile-home", toast: "Obra selecionada." });
    return;
  }

  if (message.type === "mobile-login") {
    updateState({ mobileAuthenticated: true, toast: "Login autorizado. Selecione a obra vinculada." });
    return;
  }

  if (message.type === "navigate") {
    if (!isTwaSurface() && String(message.route).startsWith("mobile-")) {
      sessionStorage.setItem("macroobras.mobileRoute", message.route);
      const url = new URL(window.location.href);
      url.searchParams.set("surface", "twa");
      window.open(url.toString(), "_blank", "noopener,noreferrer");
      updateState({ toast: "Acesso de campo aberto em uma nova janela." });
      return;
    }
    if (isTwaSurface() && message.route !== "mobile-home" && !selectedWork()) {
      updateState({ route: "mobile-home", toast: dependencyMessage() });
      return;
    }
    updateState({ route: message.route, toast: "" });
    return;
  }

  if (message.type === "open-work") {
    updateState({ selectedWorkId: message.workId, workPageTab: "overview", route: "admin-work", toast: "" });
    return;
  }

  if (message.type === "open-work-tab") {
    updateState({ workPageTab: message.tab || "overview", route: "admin-work", toast: "" });
    return;
  }

  if (message.type === "simulate-budget-import") {
    updateState({ importPreviewReady: true, importFileName: budgetImportPreview.source, toast: "Planilha orçamentária resumida reconhecida." });
    return;
  }

  if (message.type === "save-imported-work") {
    if (!state.importPreviewReady) {
      updateState({ toast: "Importe uma planilha orçamentária antes de criar a obra." });
      return;
    }
    updateState({ route: "admin-works", toast: "Obra criada pelo endereço e pelos itens da planilha." });
    return;
  }

  if (message.type === "start-purchase") {
    startPurchaseFlow(message.itemId);
    return;
  }

  if (message.type === "select-purchase") {
    updateState({ selectedPurchaseFlowId: message.flowId, route: "admin-purchases", toast: "" });
    return;
  }

  if (message.type === "approve-purchase") {
    patchSelectedFlow({ authorized: true, status: "Autorizada" }, "Compra autorizada pelo administrador.");
    return;
  }

  if (message.type === "advance-purchase") {
    advancePurchase(message.stage);
    return;
  }

  if (message.type === "generate-visit-plan") {
    generateVisitPlan();
    return;
  }

  if (message.type === "select-visit-plan") {
    updateState({ selectedVisitPlanId: message.planId, toast: "Calendário de visita selecionado." });
    return;
  }

  if (message.type === "save-node-plan") {
    updateState({ toast: "Diagrama salvo. O calendário da obra foi regenerado pelas datas dos nós." });
    return;
  }

  if (message.type === "confirm-delivery") {
    confirmDelivery();
    return;
  }

  if (message.type === "toggle-day-entry") {
    if (!canRunMessage(message)) return;
    const entryId = message.entryId || "";
    updateState({ mobileDayExpandedId: state.mobileDayExpandedId === entryId ? "" : entryId, toast: "" });
    return;
  }

  if (message.type === "save") {
    saveAction(message);
    return;
  }

  if (message.type === "installer-step") {
    updateState({ installerStep: Number(message.step || 0), toast: "" });
    return;
  }
  if (message.type === "installer-prev") {
    updateState({ installerStep: Math.max(0, (state.installerStep || 0) - 1), toast: "" });
    return;
  }
  if (message.type === "installer-next") {
    updateState({ installerStep: Math.min(4, (state.installerStep || 0) + 1), toast: "" });
    return;
  }
  if (message.type === "installer-status") {
    pollInstallerStatus();
    return;
  }
  if (message.type === "installer-run") {
    runInstaller();
    return;
  }
  if (message.type === "prepare-okf") {
    prepareOkfFromWizard();
    return;
  }
  if (message.type === "add-work-element") addTemporaryWorkElement();
}

function normalizeMessage(target, event) {
  const fallbackValue = target.textContent?.replace(/\s+/g, " ").trim() || "Ação executada";
  return {
    ...target.dataset,
    type: target.dataset.message || "save",
    entity: target.dataset.entity || "interface",
    value: target.dataset.value ?? target.value ?? `${fallbackValue}: ação registrada`,
    checked: target.checked,
    target,
    event,
  };
}

function handleChange(event) {
  const target = event.target;
  if (target.matches('[data-message="budget-file"]')) {
    const file = target.files?.[0];
    if (!file) return;
    updateState({ importFileName: file.name, importPreviewReady: true, toast: "Planilha recebida. Cliente e itens detectados para prévia." });
    return;
  }
  if (target.matches('[data-message="delivery-photo"]')) {
    const file = target.files?.[0];
    updateState({ deliveryPhotoName: file?.name || "", toast: file ? "Foto preparada para comprovação." : "" });
  }
}

function handleInput(event) {
  const target = event.target;
  if (!target.matches("[data-visit-duration]")) return;
  state.visitDurations[target.dataset.visitDuration] = target.value;
}

function startPurchaseFlow(itemId) {
  const work = selectedWork();
  const item = work?.items.find((candidate) => candidate.id === itemId);
  if (!work || !item) {
    updateState({ toast: "Item de execução não localizado." });
    return;
  }
  const id = `compra-${item.id}-${Date.now().toString(36)}`;
  const flow = {
    id,
    workId: work.id,
    itemId: item.id,
    title: `Nova compra — ${item.description}`,
    material: "",
    quantity: "",
    unit: "",
    neededAt: "",
    requester: "Administração",
    estimated: 0,
    supplier: "",
    quoted: 0,
    authorized: false,
    ordered: false,
    paid: 0,
    transport: "Não iniciado",
    delivered: false,
    deliveryEvidence: "",
    status: "Solicitação",
  };
  updateState({ purchaseFlows: [flow, ...state.purchaseFlows], selectedPurchaseFlowId: id, selectedBudgetItemId: item.id, route: "admin-purchases", toast: "Fluxo de compra iniciado a partir do item da planilha." });
}

function patchSelectedFlow(patch, toast) {
  const selected = selectedPurchaseFlow();
  if (!selected) return;
  updateState({
    purchaseFlows: state.purchaseFlows.map((flow) => flow.id === selected.id ? { ...flow, ...patch } : flow),
    toast,
  });
}

function advancePurchase(stage) {
  const flow = selectedPurchaseFlow();
  if (!flow) return;
  if (stage === "quote") {
    patchSelectedFlow({ supplier: flow.supplier || "Fornecedor em seleção", quoted: flow.quoted || flow.estimated || 1, status: "Aguardando autorização" }, "Cotação registrada.");
    return;
  }
  if (stage === "order") {
    if (!flow.authorized) {
      updateState({ toast: "A compra precisa ser autorizada pelo administrador." });
      return;
    }
    patchSelectedFlow({ ordered: true, status: "Pedido emitido" }, "Pedido de compra registrado.");
    return;
  }
  if (stage === "transport") {
    if (!flow.ordered) {
      updateState({ toast: "Registre o pedido antes do transporte." });
      return;
    }
    patchSelectedFlow({ transport: "Em rota", status: "Aguardando entrega" }, "Transporte atualizado. O sticker de entrega aguarda foto de campo.");
  }
}

function generateVisitPlan() {
  const durations = availableWorks.reduce((sum, work, index) => sum + Number(state.visitDurations[work.id] || 90 + index * 30), 0);
  const next = state.visitPlans.length + 1;
  const id = `rota-gerada-${Date.now().toString(36)}`;
  const plan = {
    id,
    name: `Rota completa — versão ${next}`,
    date: "01/08/2026",
    workIds: availableWorks.map((work) => work.id),
    travelMinutes: 522,
    visitMinutes: durations,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
  updateState({ visitPlans: [plan, ...state.visitPlans], selectedVisitPlanId: id, toast: "Novo calendário de visitas gerado e adicionado à lista lateral." });
}

function confirmDelivery() {
  const flow = state.purchaseFlows.find((item) => item.workId === state.selectedWorkId && !item.delivered) || selectedPurchaseFlow();
  if (!flow) return;
  if (!state.deliveryPhotoName) {
    updateState({ toast: "Selecione uma foto da entrega antes de confirmar." });
    return;
  }
  updateState({
    purchaseFlows: state.purchaseFlows.map((item) => item.id === flow.id ? { ...item, delivered: true, deliveryEvidence: state.deliveryPhotoName, transport: "Entregue", status: "Entregue com foto" } : item),
    selectedPurchaseFlowId: flow.id,
    deliveryPhotoName: "",
    toast: "Entrega comprovada. O sticker administrativo foi preenchido com a foto.",
  });
}

function needsSelectedWork(message) {
  return message.requires === "work";
}
function canRunMessage(message) {
  if (!needsSelectedWork(message)) return true;
  if (selectedWork()) return true;
  updateState({ route: "mobile-home", toast: dependencyMessage() });
  return false;
}
function saveAction(message) {
  if (!canRunMessage(message)) return;
  updateState({ toast: `${message.value || "Ação registrada"} (${message.entity || "interface"}: salvo)` });
}

async function pollCollaboratorStatus() {
  try {
    const response = await callRpc("obterRotaPublicaColaborador");
    const data = response?.data || {};
    updateState({ collaboratorStatus: { available: Boolean(data.disponivel), localActive: Boolean(data.localAtivo), localBaseUrl: data.localBaseUrl || "", baseUrl: data.baseUrl || "", message: data.mensagem || "" } });
  } catch (error) {
    updateState({ collaboratorStatus: { ...initialCollaboratorStatus, message: "Aguardando backend da estação" } });
  }
}
async function pollOkfStatus() {
  if (isTwaSurface()) return;
  try {
    const response = await callRpc("obterStatusOkf");
    updateState({ okfStatus: response?.data || initialOkfStatus });
  } catch (error) {
    updateState({ okfStatus: { ...initialOkfStatus, mensagem: "Backend ainda não expôs o status OKF" } });
  }
}
async function pollInstallerStatus() {
  if (!isInstallerSurface()) return;
  try {
    const response = await callRpc("obterStatusInstalador");
    updateState({ installerStatus: response?.data || state.installerStatus });
  } catch (error) {
    updateState({ installerStatus: { ...(state.installerStatus || {}), message: "Backend ainda não expôs o instalador Nim" } });
  }
}
async function prepareOkfFromWizard() {
  updateState({ toast: "Preparando OKF..." });
  try {
    const response = await callRpc("prepararOkf");
    const data = response?.data || {};
    updateState({ okfStatus: data.status || state.okfStatus, toast: data.mensagem || "OKF processado" });
  } catch (error) {
    updateState({ toast: "Falha ao preparar OKF pelo backend Nim" });
  }
}
async function runInstaller() {
  updateState({ toast: "Executando instalação..." });
  try {
    const response = await callRpc("executarInstalador");
    const data = response?.data || {};
    updateState({ installerStatus: data.status || state.installerStatus, toast: data.mensagem || "Instalação processada" });
  } catch (error) {
    updateState({ toast: "Falha ao executar instalador Nim" });
  }
}
function addTemporaryWorkElement() {
  const root = document.querySelector("#app");
  const valueOf = (name) => root?.querySelector(`[data-element-field="${name}"]`)?.value?.trim() || "";
  const listOf = (name) => valueOf(name).split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  const name = valueOf("name") || "Elemento de obra";
  updateState({ temporaryWorkElements: [...(state.temporaryWorkElements || []), { name, description: valueOf("description") || "Elemento adicionado pela administração.", materials: valueOf("materials") || "materiais a definir", dependencies: listOf("dependencies"), unlocks: listOf("unlocks") }], toast: `Elemento de obra adicionado: ${name}` });
}
function handlePointerDown(event) {
  const scroller = event.target.closest("[data-drag-scroll]");
  if (!scroller) return;
  const startX = event.clientX;
  const startScrollLeft = scroller.scrollLeft;
  scroller.setPointerCapture?.(event.pointerId);
  scroller.classList.add("dragging");
  const move = (moveEvent) => { scroller.scrollLeft = startScrollLeft - (moveEvent.clientX - startX); };
  const up = () => {
    scroller.classList.remove("dragging");
    scroller.removeEventListener("pointermove", move);
    scroller.removeEventListener("pointerup", up);
    scroller.removeEventListener("pointercancel", up);
  };
  scroller.addEventListener("pointermove", move);
  scroller.addEventListener("pointerup", up);
  scroller.addEventListener("pointercancel", up);
}
