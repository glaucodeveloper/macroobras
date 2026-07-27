import {
  availableWorks,
  budgetImportPreview,
  initialCollaboratorStatus,
  initialOkfStatus,
} from "./data.js";
import { callRpc } from "./api.js";
import { normalizedMobileRoute, renderRoute } from "./router.js";
import { installerScreen } from "../screens/installer/index.js";
import { shell, twaShell } from "../ui/shells.js";
import { geocodeWorkAddress, hydrateGoogleMaps } from "../ui/google-maps.js";
import { hydrateDiagramCanvases } from "../ui/diagram-canvas.js";
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
  document.addEventListener("macroobras:open-work", (event) => updateState({ selectedWorkId: event.detail.workId, route: "admin-work-overview", toast: "" }));

  render();
  pollCollaboratorStatus();
  pollOkfStatus();
  pollInstallerStatus();
  window.setInterval(pollCollaboratorStatus, 7000);
  window.setInterval(pollOkfStatus, 20000);
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

  queueMicrotask(() => {
    hydrateGoogleMaps(root);
    hydrateDiagramCanvases(root);
  });
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
    if (isTwaSurface() && message.route !== "mobile-home" && !selectedWork()) {
      updateState({ route: "mobile-home", toast: dependencyMessage() });
      return;
    }
    updateState({ route: message.route, toast: "" });
    return;
  }

  if (message.type === "open-work") {
    updateState({ selectedWorkId: message.workId, route: "admin-work-overview", toast: "" });
    return;
  }

  if (message.type === "open-work-purchases") {
    const flow = state.purchaseFlows.find((item) => item.workId === message.workId);
    updateState({ selectedWorkId: message.workId, selectedPurchaseFlowId: flow?.id || "", route: "admin-work-purchases", toast: "" });
    return;
  }

  if (message.type === "simulate-budget-import") {
    updateState({ importPreviewReady: true, importFileName: budgetImportPreview.source, toast: "Orçamento sintético reconhecido conforme a estrutura do anexo." });
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

  if (message.type === "locate-work-address") {
    locateWorkAddress();
    return;
  }

  if (message.type === "start-purchase") {
    startPurchaseFlow(message.itemId);
    return;
  }

  if (message.type === "select-purchase" || message.type === "select-work-purchase") {
    const flow = state.purchaseFlows.find((item) => item.id === message.flowId);
    updateState({ selectedPurchaseFlowId: message.flowId, selectedWorkId: flow?.workId || state.selectedWorkId, route: "admin-work-purchases", toast: "" });
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

  if (message.type === "start-mobile-platform") {
    startMobilePlatform();
    return;
  }

  if (message.type === "refresh-mobile-platform") {
    pollCollaboratorStatus(true);
    return;
  }

  if (message.type === "copy-mobile-url") {
    copyMobileUrl();
    return;
  }

  if (message.type === "open-mobile-preview") {
    const localUrl = state.collaboratorStatus?.localAppUrl || "http://127.0.0.1:7654/?surface=twa";
    window.open(localUrl, "_blank", "noopener,noreferrer");
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
  if (target.matches("[data-visit-duration]")) {
    state.visitDurations[target.dataset.visitDuration] = target.value;
    return;
  }
  if (target.matches("[data-work-address]")) {
    state.workAddress = target.value;
    return;
  }
  if (target.matches("[data-flow-field]")) {
    const flow = selectedPurchaseFlow();
    if (!flow) return;
    const field = target.dataset.flowField;
    flow[field] = target.type === "number" ? Number(target.value || 0) : target.value;
  }
}

async function locateWorkAddress() {
  const input = document.querySelector("[data-work-address]");
  const address = input?.value?.trim();
  if (!address) {
    updateState({ toast: "Informe o endereço da obra." });
    return;
  }
  updateState({ toast: "Localizando endereço no Google Maps…" });
  try {
    const result = await geocodeWorkAddress(address);
    updateState({ workAddress: result.address, workCoordinates: result.coordinates, toast: `Endereço localizado: ${result.address}` });
  } catch (error) {
    updateState({ toast: error.message || "Endereço não localizado." });
  }
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
  updateState({ purchaseFlows: [flow, ...state.purchaseFlows], selectedPurchaseFlowId: id, selectedBudgetItemId: item.id, route: "admin-work-purchases", toast: "Fluxo de compra iniciado a partir do item da planilha." });
}

function patchSelectedFlow(patch, toast) {
  const selected = selectedPurchaseFlow();
  if (!selected) return;
  updateState({ purchaseFlows: state.purchaseFlows.map((flow) => flow.id === selected.id ? { ...flow, ...patch } : flow), toast });
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
    patchSelectedFlow({ transport: flow.transport === "Não iniciado" ? "Em rota" : flow.transport, status: "Aguardando entrega" }, "Transporte atualizado. O sticker de entrega aguarda foto do mestre.");
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

async function startMobilePlatform() {
  updateState({ toast: "Iniciando túnel ngrok para a plataforma mobile…" });
  try {
    const response = await callRpc("iniciarPlataformaMobile");
    const data = response?.data || response || {};
    applyCollaboratorStatus(data, data.mensagem || "Solicitação de publicação enviada ao ngrok.");
    window.setTimeout(() => pollCollaboratorStatus(true), 1400);
  } catch (error) {
    updateState({ toast: "Não foi possível iniciar o ngrok. Confira o authtoken e MACROOBRAS_ENABLE_NGROK=1." });
  }
}

async function copyMobileUrl() {
  const input = document.querySelector("[data-platform-url]");
  const value = input?.value || state.collaboratorStatus?.publicAppUrl || state.collaboratorStatus?.localAppUrl;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    updateState({ toast: "Link da plataforma mobile copiado." });
  } catch (error) {
    input?.select();
    document.execCommand?.("copy");
    updateState({ toast: "Link selecionado para cópia." });
  }
}

function normalizeCollaboratorStatus(data = {}) {
  return {
    available: Boolean(data.disponivel ?? data.available),
    enabled: Boolean(data.habilitado ?? data.enabled),
    running: Boolean(data.processoAtivo ?? data.running),
    ngrokInstalled: Boolean(data.ngrokInstalado ?? data.ngrokInstalled),
    localActive: Boolean(data.localAtivo ?? data.localActive ?? true),
    localAppUrl: data.localAppUrl || data.localBaseUrl?.replace(/\/api\/colaboradores$/, "/?surface=twa") || initialCollaboratorStatus.localAppUrl,
    publicAppUrl: data.publicAppUrl || data.baseUrl?.replace(/\/api\/colaboradores$/, "/?surface=twa") || "",
    localApiUrl: data.localApiUrl || data.localBaseUrl || initialCollaboratorStatus.localApiUrl,
    publicApiUrl: data.publicApiUrl || data.baseUrl || "",
    message: data.mensagem || data.message || initialCollaboratorStatus.message,
  };
}

function applyCollaboratorStatus(data, toast = "") {
  const next = normalizeCollaboratorStatus(data);
  const changed = JSON.stringify(next) !== JSON.stringify(state.collaboratorStatus);
  if (changed || toast) updateState({ collaboratorStatus: next, toast: toast || state.toast });
}

async function pollCollaboratorStatus(forceToast = false) {
  try {
    let response;
    try {
      response = await callRpc("obterStatusPlataformaMobile");
    } catch (error) {
      response = await callRpc("obterRotaPublicaColaborador");
    }
    const data = response?.data || response || {};
    const next = normalizeCollaboratorStatus(data);
    if (JSON.stringify(next) !== JSON.stringify(state.collaboratorStatus)) {
      updateState({ collaboratorStatus: next, toast: forceToast ? "Status da plataforma mobile atualizado." : state.toast });
    } else if (forceToast) {
      updateState({ toast: "Status da plataforma mobile atualizado." });
    }
  } catch (error) {
    const next = { ...initialCollaboratorStatus, message: "Aguardando backend da estação" };
    if (JSON.stringify(next) !== JSON.stringify(state.collaboratorStatus)) updateState({ collaboratorStatus: next });
  }
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

async function pollOkfStatus() {
  if (isTwaSurface()) return;
  try {
    const response = await callRpc("obterStatusOkf");
    const next = response?.data || initialOkfStatus;
    if (JSON.stringify(next) !== JSON.stringify(state.okfStatus)) updateState({ okfStatus: next });
  } catch (error) {
    const next = { ...initialOkfStatus, mensagem: "Backend ainda não expôs o status OKF" };
    if (JSON.stringify(next) !== JSON.stringify(state.okfStatus)) updateState({ okfStatus: next });
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
  updateState({ toast: "Preparando OKF…" });
  try {
    const response = await callRpc("prepararOkf");
    const data = response?.data || {};
    updateState({ okfStatus: data.status || state.okfStatus, toast: data.mensagem || "OKF processado" });
  } catch (error) {
    updateState({ toast: "Falha ao preparar OKF pelo backend Nim" });
  }
}

async function runInstaller() {
  updateState({ toast: "Executando instalação…" });
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
