import {
  availableWorks,
  budgetImportPreview,
  initialCollaboratorStatus,
  initialOkfStatus,
  mobileUsers,
} from "./data.js";
import { callRpc } from "./api.js";
import { normalizedMobileRoute, renderRoute } from "./router.js";
import { installerScreen } from "../screens/installer/index.js";
import { shell, twaShell } from "../ui/shells.js";
import { geocodeWorkAddress, hydrateGoogleMaps } from "../ui/google-maps.js";
import { addNodeToDiagram, getDiagramModel, hydrateDiagramCanvases } from "../ui/diagram-canvas.js";
import { signInWithFirebase, signOutFirebase } from "./firebase-auth.js";
import {
  authDemoMode,
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
  document.addEventListener("macroobras:open-work", (event) => openWorkSection(event.detail?.workId, "admin-work-overview"));
  document.addEventListener("macroobras:open-work-section", (event) => openWorkSection(event.detail?.workId, event.detail?.route));
  document.addEventListener("macroobras:visit-route-change", handleVisitRouteChange);
  document.addEventListener("macroobras:visit-route-toast", (event) => updateState({ toast: event.detail?.toast || "" }));
  document.addEventListener("macroobras:diagram-change", handleDiagramChange);
  document.addEventListener("pointerdown", closeUserMenuOutside);

  render();
  void bootstrapApplication();
  window.setInterval(() => {
    if (state.bootstrapChecked && !state.installationRequired) void pollCollaboratorStatus();
  }, 7000);
  window.setInterval(() => {
    if (state.bootstrapChecked && !state.installationRequired) void pollOkfStatus();
  }, 20000);
}

function render() {
  const root = document.querySelector("#app");
  if (!root) return;
  const route = isTwaSurface() ? normalizedMobileRoute(state.route) : state.route;

  if (!isTwaSurface() && !state.bootstrapChecked) {
    root.innerHTML = `<main class="boot-screen"><div><span></span><strong>Verificando a estação MacroObras</strong><small>Usuários, instalação e acesso da máquina</small></div></main>`;
    return;
  }

  if (isInstallerSurface()) {
    root.innerHTML = installerScreen();
    return;
  }

  if (!isTwaSurface() && !state.authenticated && !authDemoMode()) {
    root.innerHTML = renderRoute("admin-login");
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
  if (!target || target.matches("[data-map-only]")) return;
  const message = normalizeMessage(target, event);

  if (message.type === "toggle-user-menu") {
    event.stopPropagation();
    updateState({ userMenuOpen: !state.userMenuOpen, toast: "" });
    return;
  }

  if (message.type === "logout-admin") {
    void logoutAdmin();
    return;
  }

  if (message.type === "firebase-login") {
    void loginWithFirebase(message.provider);
    return;
  }

  if (message.type === "admin-token-login") {
    void loginAdminWithToken();
    return;
  }

  if (message.type === "authorize-installer-github") {
    void authorizeInstallerGithub();
    return;
  }

  if (message.type === "select-install-folder") {
    void selectInstallFolder();
    return;
  }

  if (message.type === "start-ftp-share") {
    void startAndVerifyFtp();
    return;
  }

  if (message.type === "enable-lan-collaborator") {
    void enableLanCollaborator();
    return;
  }

  if (message.type === "add-rh-entity") {
    addRhEntity();
    return;
  }

  if (message.type === "save-encarregado-access") {
    saveEncarregadoAccess();
    return;
  }

  if (message.type === "remove-visit-stop") {
    removeVisitStop(message.stopId);
    return;
  }

  if (message.type === "export-system-csv") {
    exportSystemCsv(message.exportEntity || "obras");
    return;
  }

  if (message.type === "save-firebase-config") {
    saveFirebaseConfig();
    return;
  }

  if (message.type === "save-machine-token") {
    void saveMachineToken();
    return;
  }

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
    updateState({ route: message.route, userMenuOpen: false, toast: "" });
    return;
  }

  if (message.type === "toggle-sidebar") {
    updateState({ sidebarCollapsed: !state.sidebarCollapsed, toast: "" });
    return;
  }

  if (message.type === "open-notifications") {
    updateState({ route: "admin-dashboard", toast: "" });
    window.setTimeout(() => document.querySelector("[data-notification-center]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    return;
  }

  if (message.type === "open-work") {
    openWorkSection(message.workId, "admin-work-overview");
    return;
  }

  if (message.type === "open-work-section") {
    openWorkSection(message.workId, message.route);
    return;
  }

  if (message.type === "open-work-purchases") {
    openWorkSection(message.workId, "admin-work-purchases");
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
    void savePlanningGraph();
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
    updateState({ installerStep: Math.min(3, (state.installerStep || 0) + 1), toast: "" });
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

function openWorkSection(workId, route = "admin-work-overview") {
  const work = availableWorks.find((item) => item.id === workId);
  if (!work) {
    updateState({ toast: "Obra da notificação não foi localizada." });
    return;
  }
  const allowed = new Set([
    "admin-work-overview",
    "admin-work-items",
    "admin-work-planning",
    "admin-work-calendar",
    "admin-work-purchases",
    "admin-work-diary",
    "admin-work-measurement",
  ]);
  const targetRoute = allowed.has(route) ? route : "admin-work-overview";
  const patch = { selectedWorkId: work.id, route: targetRoute, toast: "" };
  if (targetRoute === "admin-work-purchases") {
    patch.selectedPurchaseFlowId = state.purchaseFlows.find((item) => item.workId === work.id)?.id || "";
  }
  updateState(patch);
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
    return;
  }
  if (target.matches('[data-message="import-system-csv"]')) {
    const file = target.files?.[0];
    if (file) void importSystemCsv(file);
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.matches("[data-visit-duration]")) {
    const stopId = target.dataset.visitDuration;
    const durationMinutes = Math.max(0, Number(target.value || 0));
    state.visitDurations[stopId] = durationMinutes;
    const stop = state.visitRoute?.stops?.find((item) => item.id === stopId);
    if (stop) stop.durationMinutes = durationMinutes;
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
    patchSelectedFlow({ transport: flow.transport === "Não iniciado" ? "Em rota" : flow.transport, status: "Aguardando entrega" }, "Transporte atualizado. O sticker de entrega aguarda foto do encarregado.");
  }
}

function minutesToClock(totalMinutes) {
  const normalized = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(normalized / 60) % 24;
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function handleVisitRouteChange(event) {
  const route = event.detail?.route;
  if (!route) return;
  updateState({ visitRoute: route, toast: event.detail?.toast || "Traçado de visitas atualizado." });
}

function generateVisitPlan() {
  const route = state.visitRoute || {};
  const stops = Array.isArray(route.stops) ? route.stops : [];
  if (stops.length < 2 || !(route.segments || []).length) {
    updateState({ toast: "Desenhe pelo menos um trecho entre duas paradas antes de gerar o calendário." });
    return;
  }

  const travelMinutes = Math.round(Number(route.totalDurationMillis || 0) / 60000);
  const visitMinutes = stops.reduce((sum, stop) => sum + Number(stop.durationMinutes ?? state.visitDurations[stop.id] ?? 60), 0);
  const segmentByOrigin = new Map((route.segments || []).map((segment) => [segment.fromId, segment]));
  let cursor = 8 * 60;
  const schedule = stops.map((stop, index) => {
    const duration = Number(stop.durationMinutes ?? state.visitDurations[stop.id] ?? 60);
    const start = minutesToClock(cursor);
    const end = minutesToClock(cursor + duration);
    cursor += duration;
    const nextSegment = segmentByOrigin.get(stop.id);
    if (index < stops.length - 1) cursor += Math.round(Number(nextSegment?.durationMillis || 0) / 60000);
    return {
      stopId: stop.id,
      workId: stop.workId || "",
      name: stop.name,
      address: stop.address || "",
      coordinates: stop.coordinates,
      start,
      end,
      durationMinutes: duration,
    };
  });

  const next = state.visitPlans.length + 1;
  const id = `rota-gerada-${Date.now().toString(36)}`;
  const plan = {
    id,
    name: `Rota traçada — versão ${next}`,
    date: new Date().toLocaleDateString("pt-BR"),
    stops: stops.map((stop) => ({ ...stop })),
    workIds: stops.map((stop) => stop.workId).filter(Boolean),
    travelMinutes,
    visitMinutes,
    distanceMeters: Number(route.totalDistanceMeters || 0),
    schedule,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
  updateState({ visitPlans: [plan, ...state.visitPlans], selectedVisitPlanId: id, toast: "Calendário gerado pela ordem desenhada no Google Maps." });
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

async function ensureMobilePlatform() {
  if (isTwaSurface() || isInstallerSurface()) return;
  try {
    const response = await callRpc("iniciarPlataformaMobile");
    const data = response?.data || response || {};
    applyCollaboratorStatus(data);
  } catch (error) {
    // O backend também inicia o túnel no bootstrap. A interface permanece funcional em modo local.
  }
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
    lanActive: Boolean(data.redeLocalAtiva ?? data.lanActive),
    localAppUrl: data.localAppUrl || data.localBaseUrl?.replace(/\/api\/colaboradores$/, "/?surface=twa") || initialCollaboratorStatus.localAppUrl,
    lanAppUrl: data.lanAppUrl || data.redeLocalAppUrl || "",
    publicAppUrl: data.publicAppUrl || data.baseUrl?.replace(/\/api\/colaboradores$/, "/?surface=twa") || "",
    localApiUrl: data.localApiUrl || data.localBaseUrl || initialCollaboratorStatus.localApiUrl,
    lanApiUrl: data.lanApiUrl || data.redeLocalApiUrl || "",
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
  const adminName = document.querySelector("[data-installer-admin-name]")?.value?.trim() || state.installerStatus?.githubLogin || "Administrador";
  const adminEmail = document.querySelector("[data-installer-admin-email]")?.value?.trim() || "";
  updateState({ toast: "Concluindo a configuração inicial…" });
  try {
    const response = await callRpc("executarInstalador", [JSON.stringify({ adminName, adminEmail })]);
    const data = response?.data || response || {};
    localStorage.setItem("macroobras.installationCompleted", "true");
    updateState({
      installerStatus: data.status || state.installerStatus,
      bootstrapChecked: true,
      installationRequired: false,
      installationCompleted: true,
      authenticated: true,
      authUser: { name: adminName, email: adminEmail || "Administrador local", provider: "github-machine" },
      route: "admin-dashboard",
      toast: data.mensagem || "Configuração concluída.",
    });
    history.replaceState({}, "", "?surface=admin");
    void ensureMobilePlatform();
  } catch (error) {
    updateState({ toast: error.message || "Falha ao concluir a configuração inicial." });
  }
}

function addTemporaryWorkElement() {
  const root = document.querySelector("#app");
  const valueOf = (name) => root?.querySelector(`[data-element-field="${name}"]`)?.value?.trim() || "";
  const listOf = (name) => valueOf(name).split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  const name = valueOf("name") || "Elemento de obra";
  updateState({ temporaryWorkElements: [...(state.temporaryWorkElements || []), { name, description: valueOf("description") || "Elemento adicionado pela administração.", materials: valueOf("materials") || "materiais a definir", dependencies: listOf("dependencies"), unlocks: listOf("unlocks") }], toast: `Elemento de obra adicionado: ${name}` });
}


async function bootstrapApplication() {
  if (isTwaSurface()) {
    updateState({ bootstrapChecked: true, installationRequired: false });
    void pollCollaboratorStatus();
    return;
  }
  try {
    const response = await callRpc("obterStatusBootstrap");
    const data = response?.data || response || {};
    const installationRequired = Boolean(data.primeiroAcesso ?? data.firstAccess ?? !data.instalacaoConcluida);
    if (data.statusInstalador) state.installerStatus = data.statusInstalador;
    updateState({
      bootstrapChecked: true,
      installationRequired,
      installationCompleted: !installationRequired,
      authenticated: installationRequired ? false : state.authenticated,
    });
    if (installationRequired) {
      void pollInstallerStatus();
      return;
    }
    void ensureMobilePlatform();
    void pollCollaboratorStatus();
    void pollOkfStatus();
  } catch (error) {
    const completed = localStorage.getItem("macroobras.installationCompleted") === "true" || new URLSearchParams(location.search).get("surface") === "admin";
    updateState({ bootstrapChecked: true, installationRequired: !completed, installationCompleted: completed, toast: completed ? "" : "Backend da configuração inicial ainda não respondeu." });
    if (completed) {
      void pollCollaboratorStatus();
      void pollOkfStatus();
    }
  }
}

function closeUserMenuOutside(event) {
  if (!state.userMenuOpen || event.target.closest(".user-menu-wrap")) return;
  updateState({ userMenuOpen: false });
}

async function loginWithFirebase(provider) {
  updateState({ toast: `Abrindo autenticação ${provider === "github" ? "GitHub" : "Google"}…` });
  try {
    const user = await signInWithFirebase(provider);
    try {
      await callRpc("registrarSessaoFirebase", [JSON.stringify(user)]);
    } catch {
      // A autenticação do Firebase permanece válida mesmo sem persistência RPC no modo preview.
    }
    updateState({ authenticated: true, authUser: user, route: "admin-dashboard", toast: "Acesso autorizado." });
  } catch (error) {
    updateState({ toast: error.message || "Não foi possível autenticar pelo Firebase." });
  }
}

async function loginAdminWithToken() {
  const token = document.querySelector("[data-admin-github-token]")?.value?.trim() || "";
  if (!token) {
    updateState({ toast: "Informe o token GitHub desta máquina." });
    return;
  }
  updateState({ toast: "Verificando token GitHub…" });
  try {
    const response = await callRpc("autenticarAdministradorToken", [JSON.stringify({ token })]);
    const data = response?.data || response || {};
    if (data.autorizado === false) throw new Error(data.mensagem || "Token não autorizado.");
    const user = { name: data.nome || data.login || "Administrador", email: data.email || "GitHub", provider: "github-machine" };
    updateState({ authenticated: true, authUser: user, route: "admin-dashboard", toast: "Máquina autorizada pelo GitHub." });
  } catch (error) {
    updateState({ toast: error.message || "Token GitHub não autorizado." });
  }
}

async function logoutAdmin() {
  await signOutFirebase();
  sessionStorage.removeItem("macroobras.adminAuthenticated");
  updateState({ authenticated: false, authUser: null, userMenuOpen: false, route: "admin-login", toast: "Sessão encerrada." });
}

async function authorizeInstallerGithub() {
  const token = document.querySelector("[data-installer-github-token]")?.value?.trim() || "";
  if (!token) {
    updateState({ toast: "Informe o token de autorização GitHub." });
    return;
  }
  updateState({ toast: "Verificando autorização da máquina…" });
  try {
    const response = await callRpc("autorizarInstalacaoGithub", [JSON.stringify({ token, repository: "glaucodeveloper/macroobras" })]);
    const data = response?.data || response || {};
    if (data.autorizado === false) throw new Error(data.mensagem || "Token não autorizado.");
    updateState({ installerStatus: { ...(state.installerStatus || {}), ...data, githubAuthorized: true, githubLogin: data.githubLogin || data.login || "GitHub", message: data.mensagem || "Máquina autorizada." }, toast: "Máquina autorizada pelo GitHub." });
  } catch (error) {
    updateState({ toast: error.message || "Não foi possível autorizar a máquina." });
  }
}

async function selectInstallFolder() {
  try {
    const response = await callRpc("selecionarPastaInstalacao");
    const data = response?.data || response || {};
    if (!data.installDir) return;
    updateState({ selectedInstallFolder: data.installDir, installerStatus: { ...(state.installerStatus || {}), ...data }, toast: "Pasta selecionada no explorador." });
  } catch (error) {
    updateState({ toast: error.message || "Não foi possível abrir o seletor de pasta." });
  }
}

async function startAndVerifyFtp() {
  const installDir = state.installerStatus?.installDir || state.selectedInstallFolder || "";
  if (!installDir) {
    updateState({ toast: "Escolha a pasta antes de iniciar o FTP." });
    return;
  }
  updateState({ toast: "Iniciando e verificando a transmissão FTP…" });
  try {
    const response = await callRpc("iniciarEVerificarFtp", [JSON.stringify({ installDir })]);
    const data = response?.data || response || {};
    updateState({ installerStatus: { ...(state.installerStatus || {}), ...data }, toast: data.mensagem || "Transmissão FTP verificada." });
  } catch (error) {
    updateState({ toast: error.message || "A transmissão FTP não pôde ser verificada." });
  }
}

async function enableLanCollaborator() {
  updateState({ toast: "Distribuindo o endpoint do encarregado na rede local…" });
  try {
    const response = await callRpc("ativarDistribuicaoLocalColaborador");
    const data = response?.data || response || {};
    if (isInstallerSurface()) {
      updateState({ installerStatus: { ...(state.installerStatus || {}), endpointReady: Boolean(data.redeLocalAtiva ?? data.lanActive ?? true), collaboratorEndpoint: data.lanAppUrl || data.redeLocalAppUrl || data.collaboratorEndpoint || "", endpointMessage: data.mensagem || "Endpoint local disponível." }, toast: data.mensagem || "Endpoint local disponível." });
    } else {
      applyCollaboratorStatus(data, data.mensagem || "Endpoint local disponível.");
    }
  } catch (error) {
    updateState({ toast: error.message || "Não foi possível distribuir o endpoint na rede local." });
  }
}

function addRhEntity() {
  const id = `rh-${Date.now().toString(36)}`;
  const added = addNodeToDiagram("rh-main", {
    id,
    kind: "Pessoa",
    editableTitle: true,
    title: "Nova pessoa",
    description: "Função operacional",
    observations: "",
    fields: [{ name: "Perfil", value: "Encarregado" }, { name: "Obra", value: "" }],
    x: 120 + Math.round(Math.random() * 420),
    y: 180 + Math.round(Math.random() * 300),
  });
  updateState({ toast: added ? "Entidade adicionada ao organograma." : "Abra o organograma para adicionar a entidade." });
}

function saveEncarregadoAccess() {
  const personSelect = document.querySelector("[data-encarregado-person]");
  const workSelect = document.querySelector("[data-encarregado-work]");
  const option = personSelect?.selectedOptions?.[0];
  const workId = workSelect?.value || "";
  if (!option || !workId) {
    updateState({ toast: "Selecione a pessoa do RH e a obra permitida." });
    return;
  }
  const name = option.textContent?.trim() || "Encarregado";
  const email = option.dataset.email || "";
  const cpf = option.dataset.cpf || "";
  const existing = mobileUsers.find((user) => user.email === email && email);
  if (existing) {
    existing.name = name;
    existing.cpf = cpf;
    existing.workId = workId;
  } else {
    mobileUsers.push({ name, email, cpf, workId });
  }
  updateState({ toast: `Acesso do encarregado vinculado à obra: ${name}.` });
}

function handleDiagramChange(event) {
  const id = event.detail?.id;
  const model = event.detail?.model;
  if (!id || !model) return;
  state.diagramModels[id] = model;
  if (id === "rh-main") state.rhModel = model;
}

async function savePlanningGraph() {
  const work = selectedWork();
  if (!work) return;
  const id = `planning-${work.id}`;
  const model = getDiagramModel(id) || state.diagramModels[id];
  if (!model) {
    updateState({ toast: "O Cronograma gráfico ainda não foi carregado." });
    return;
  }
  updateState({ toast: "Salvando Cronograma e atualizando o OKF…" });
  try {
    const response = await callRpc("salvarOkfElementosObra", [JSON.stringify({ obraId: work.id, obra: work.name, diagrama: model })]);
    const data = response?.data || response || {};
    updateState({ toast: data.mensagem || "Cronograma salvo. O OKF foi gerado pelo gráfico de elementos da obra." });
  } catch (error) {
    updateState({ toast: "Cronograma preservado na interface; o backend não confirmou a gravação do OKF." });
  }
}

function removeVisitStop(stopId) {
  const route = state.visitRoute || { stops: [], segments: [] };
  const stop = route.stops.find((item) => item.id === stopId);
  if (!stop) return;
  const removedSegments = route.segments.filter((segment) => segment.fromId === stopId || segment.toId === stopId);
  const remainingSegments = route.segments.filter((segment) => segment.fromId !== stopId && segment.toId !== stopId);
  const next = {
    ...route,
    stops: route.stops.filter((item) => item.id !== stopId),
    segments: remainingSegments,
    totalDistanceMeters: Math.max(0, Number(route.totalDistanceMeters || 0) - removedSegments.reduce((sum, item) => sum + Number(item.distanceMeters || 0), 0)),
    totalDurationMillis: Math.max(0, Number(route.totalDurationMillis || 0) - removedSegments.reduce((sum, item) => sum + Number(item.durationMillis || 0), 0)),
    pendingStopId: route.pendingStopId === stopId ? "" : route.pendingStopId,
  };
  updateState({ visitRoute: next, toast: `Parada removida: ${stop.name}.` });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(name, rows) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(";")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function exportSystemCsv(entity) {
  if (entity === "compras") {
    downloadCsv("macroobras-compras.csv", [["obraId", "itemId", "titulo", "material", "valor", "status"], ...state.purchaseFlows.map((flow) => [flow.workId, flow.itemId, flow.title, flow.material, flow.quoted || flow.estimated, flow.status])]);
  } else if (entity === "rh") {
    const model = getDiagramModel("rh-main") || state.rhModel || { nodes: [] };
    downloadCsv("macroobras-rh.csv", [["id", "tipo", "nome", "funcao", "observacoes"], ...model.nodes.map((node) => [node.id, node.kind, node.title, node.description, node.observations])]);
  } else if (entity === "medicoes") {
    downloadCsv("macroobras-medicoes.csv", [["obraId", "obra", "item", "orcamento", "progresso"], ...availableWorks.flatMap((work) => work.items.map((item) => [work.id, work.name, item.description, item.budget, item.progress]))]);
  } else {
    downloadCsv("macroobras-obras-itens.csv", [["obraId", "obra", "endereco", "cliente", "item", "orcamento"], ...availableWorks.flatMap((work) => work.items.map((item) => [work.id, work.name, work.address, work.client, item.description, item.budget]))]);
  }
  updateState({ toast: "Arquivo CSV exportado." });
}

async function importSystemCsv(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  state.importedCsv = { name: file.name, lines };
  updateState({ toast: `${lines.length - 1} registros CSV preparados para importação.` });
}

function saveFirebaseConfig() {
  const raw = document.querySelector("[data-firebase-config]")?.value?.trim() || "";
  try {
    JSON.parse(raw);
    localStorage.setItem("macroobras.firebaseConfig", raw);
    updateState({ toast: "Configuração Firebase salva nesta estação." });
  } catch {
    updateState({ toast: "Informe um JSON válido da configuração Firebase." });
  }
}

async function saveMachineToken() {
  const token = document.querySelector("[data-machine-github-token]")?.value?.trim() || "";
  if (!token) {
    updateState({ toast: "Informe o novo token GitHub da máquina." });
    return;
  }
  try {
    const response = await callRpc("atualizarTokenMaquina", [JSON.stringify({ token })]);
    const data = response?.data || response || {};
    updateState({ toast: data.mensagem || "Token da máquina atualizado." });
  } catch (error) {
    updateState({ toast: error.message || "Não foi possível atualizar o token." });
  }
}

function handlePointerDown(event) {
  const panSurface = event.target.closest("[data-pan-surface]");
  if (panSurface && !event.target.closest("input,button,a,label")) {
    const startX = event.clientX;
    const startY = event.clientY;
    const startScrollLeft = panSurface.scrollLeft;
    const startScrollTop = panSurface.scrollTop;
    panSurface.setPointerCapture?.(event.pointerId);
    panSurface.classList.add("panning");
    const move = (moveEvent) => {
      panSurface.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
      panSurface.scrollTop = startScrollTop - (moveEvent.clientY - startY);
    };
    const up = () => {
      panSurface.classList.remove("panning");
      panSurface.removeEventListener("pointermove", move);
      panSurface.removeEventListener("pointerup", up);
      panSurface.removeEventListener("pointercancel", up);
    };
    panSurface.addEventListener("pointermove", move);
    panSurface.addEventListener("pointerup", up);
    panSurface.addEventListener("pointercancel", up);
    return;
  }

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
