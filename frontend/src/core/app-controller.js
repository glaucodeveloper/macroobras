import {
  availableWorks,
  budgetImportPreview,
  initialCollaboratorStatus,
  initialOkfStatus,
} from "./data.js";
import { callRpc } from "./api.js";
import { normalizedMobileRoute, renderRoute } from "./router.js";
import { installerScreen } from "../pages/installer/installer.page.js";
import { shell, twaShell } from "../ui/shells.js";
import { geocodeWorkAddress, hydrateGoogleMaps } from "../ui/google-maps.js";
import {
  addNodeToDiagram,
  focusDiagramNode,
  getDiagramModel,
  hydrateDiagramCanvases,
  removeNodeFromDiagram,
  updateDiagramNode,
} from "../ui/diagram-canvas.js";
import { signInWithFirebase, signOutFirebase } from "./firebase-auth.js";
import {
  authDemoMode,
  configureStateRenderer,
  dependencyMessage,
  isInstallerSurface,
  isTwaSurface,
  selectedMobileAccess,
  selectedPurchaseFlow,
  selectedWork,
  state,
  updateState,
} from "./state.js";

const GITHUB_REPOSITORY = "glaucodeveloper/erp-da-construcao-maximus-empreendimentos";
let diagramPersistenceTimer = 0;

function legacyRoot() {
  return document.querySelector("#macroobras-legacy-root") || document.querySelector("#app");
}

function normalizedHexColor(value, fallback = "#0a61d8") {
  const candidate = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback;
}

function mixHexColor(color, target, amount) {
  const source = normalizedHexColor(color).slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  const destination = normalizedHexColor(target).slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  return `#${source.map((channel, index) => Math.round(channel + (destination[index] - channel) * amount).toString(16).padStart(2, "0")).join("")}`;
}

function applyCustomization() {
  const customization = state.customization || {};
  const primary = normalizedHexColor(customization.primaryColor);
  const themePreference = ["light", "dark", "system"].includes(customization.theme)
    ? customization.theme
    : "system";
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const effectiveTheme = themePreference === "system" ? (systemDark ? "dark" : "light") : themePreference;
  const density = customization.density === "compact" ? "compact" : "comfortable";
  const root = document.documentElement;
  const rgb = primary.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16)).join(", ");

  root.dataset.theme = effectiveTheme;
  root.dataset.themePreference = themePreference;
  root.dataset.density = density;
  root.style.setProperty("--mo-blue", primary);
  root.style.setProperty("--mo-blue-dark", mixHexColor(primary, "#000000", 0.46));
  root.style.setProperty("--mo-blue-soft", mixHexColor(primary, "#ffffff", 0.9));
  root.style.setProperty("--mo-primary-rgb", rgb);
  document.title = customization.stationName || "ERP da construção Maximus Empreendimentos";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", effectiveTheme === "dark" ? "#111820" : primary);
}

export function initApp() {
  const root = legacyRoot();
  if (!root) return;

  configureStateRenderer(render);
  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("change", handleChange);
  root.addEventListener("input", handleInput);
  document.addEventListener("macroobras:open-work", (event) => openWorkSection(event.detail?.workId, "admin-work-overview"));
  document.addEventListener("macroobras:open-work-section", (event) => openWorkSection(event.detail?.workId, event.detail?.route));
  document.addEventListener("macroobras:select-work", (event) => selectWorkOnWorksPage(event.detail?.workId));
  document.addEventListener("macroobras:navigate", handleReactNavigate);
  document.addEventListener("macroobras:visit-route-change", handleVisitRouteChange);
  document.addEventListener("macroobras:visit-route-toast", (event) => updateState({ toast: event.detail?.toast || "" }));
  document.addEventListener("macroobras:diagram-change", handleDiagramChange);
  document.addEventListener("macroobras:diagram-node-selected", handleDiagramNodeSelected);
  document.addEventListener("pointerdown", closeUserMenuOutside);

  render();
  void bootstrapApplication();
  window.setInterval(() => {
    if (state.bootstrapChecked && !state.installationRequired && state.authenticated) void pollCollaboratorStatus();
  }, 7000);
  window.setInterval(() => {
    if (state.bootstrapChecked && !state.installationRequired && state.authenticated) void pollOkfStatus();
  }, 20000);
}

function render() {
  const root = legacyRoot();
  if (!root) return;
  applyCustomization();
  const route = isTwaSurface() ? normalizedMobileRoute(state.route) : state.route;

  if (!isTwaSurface() && !state.bootstrapChecked) {
    root.innerHTML = `<main class="boot-screen"><div><span></span><strong>Verificando a estação MacroObras</strong><small>Usuários, instalação e acesso da máquina</small></div></main>`;
    return;
  }

  if (isInstallerSurface()) {
    root.innerHTML = installerScreen();
    return;
  }

  if (!isTwaSurface() && !state.machineAuthorized && !authDemoMode()) {
    root.innerHTML = renderRoute("admin-machine-authorization");
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
  if (target.closest("[data-interactive-diagram]") && !target.dataset.message) return;
  if (target.type === "submit") {
    const authForm = target.closest("[data-auth-form]");
    if (authForm) {
      event.preventDefault();
      dispatchAuthForm(authForm);
      return;
    }
  }
  const message = normalizeMessage(target, event);

  if (state.route === "admin-works" && shouldClearWorkSelection(target)) {
    clearWorkSelection();
  }

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

  if (message.type === "admin-machine-token-authorize") {
    void authorizeAdminMachine();
    return;
  }

  if (message.type === "admin-contact-login") {
    void loginAdminWithContact();
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

  if (message.type === "open-installer-surface") {
    window.location.href = "?surface=installer";
    return;
  }

  if (message.type === "focus-encarregado-form") {
    document.querySelector("[data-encarregado-form]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelector("[data-encarregado-person]")?.focus();
    return;
  }

  if (message.type === "save-encarregado-access") {
    void saveEncarregadoAccess();
    return;
  }

  if (message.type === "open-encarregado-access") {
    openEncarregadoAccess(message.accessId);
    return;
  }

  if (message.type === "copy-encarregado-url") {
    void copyEncarregadoAccessUrl(message.accessId);
    return;
  }

  if (message.type === "remove-encarregado-access") {
    void removeEncarregadoAccess(message.accessId);
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

  if (message.type === "save-customization") {
    saveCustomization();
    return;
  }

  if (message.type === "save-login-config") {
    void saveLoginConfig();
    return;
  }

  if (message.type === "select-work") {
    updateState({ selectedWorkId: message.workId, route: "mobile-home", toast: "Obra selecionada." });
    return;
  }

  if (message.type === "mobile-login") {
    void loginMobileAccess();
    return;
  }

  if (message.type === "mobile-logout") {
    sessionStorage.removeItem("macroobras.mobileAuthenticated");
    updateState({ mobileAuthenticated: false, route: "mobile-home", toast: "Acesso encerrado." });
    return;
  }

  if (message.type === "navigate") {
    navigateTo(message.route);
    return;
  }

  if (message.type === "toggle-sidebar") {
    const currentBehavior = state.customization?.sidebarBehavior || "hover";
    const nextBehavior = currentBehavior === "hover" ? "pinned" : "hover";
    updateState({
      customization: {
        ...(state.customization || {}),
        sidebarBehavior: nextBehavior,
        savedAt: new Date().toISOString(),
      },
      sidebarCollapsed: nextBehavior === "hover",
      toast: nextBehavior === "pinned" ? "Subnavegação fixada." : "Subnavegação configurada para abrir ao passar o mouse.",
    });
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

  if (message.type === "select-diary-entry") {
    if (!canRunMessage(message)) return;
    updateState({
      selectedDiaryEntryId: message.entryId || "",
      selectedDiaryDetailId: "",
      toast: "",
    });
    return;
  }

  if (message.type === "open-diary-detail") {
    updateState({ selectedDiaryDetailId: message.detailId || "", toast: "" });
    return;
  }

  if (message.type === "save-diagram-record") {
    saveDiagramRecord(target);
    return;
  }

  if (message.type === "delete-diagram-record") {
    deleteDiagramRecord(target);
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
    updateState({ installerStep: Math.min(2, (state.installerStep || 0) + 1), toast: "" });
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
    "admin-works",
    "admin-work-overview",
    "admin-work-access",
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

function selectWorkOnWorksPage(workId) {
  const work = availableWorks.find((item) => item.id === workId);
  if (!work) return;
  updateState({ selectedWorkId: work.id, route: "admin-works", toast: "" });
}

function clearWorkSelection() {
  if (!state.selectedWorkId) return;
  updateState({ selectedWorkId: "", toast: "" });
}

function shouldClearWorkSelection(target) {
  const workspace = target.closest(".workspace");
  if (!workspace) return false;
  return !target.closest("button, input, textarea, select, a, [data-google-map], .gm-style, .gm-info, [data-diagram-node], [data-interactive-diagram]");
}

function dispatchAuthForm(form) {
  if (!form || form.dataset.authDispatching === "true") return;
  form.dataset.authDispatching = "true";
  const kind = form.dataset.authForm || "";
  let action = null;
  if (kind === "machine") action = authorizeAdminMachine;
  else if (kind === "contact") action = loginAdminWithContact;
  else if (kind === "installer-machine") action = authorizeInstallerGithub;
  else if (kind === "machine-update") action = saveMachineToken;

  if (!action) {
    delete form.dataset.authDispatching;
    return;
  }

  Promise.resolve(action()).finally(() => {
    delete form.dataset.authDispatching;
  });
}

function handleSubmit(event) {
  const form = event.target.closest("[data-auth-form]");
  if (!form) return;
  event.preventDefault();
  dispatchAuthForm(form);
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
  if (target.matches("[data-diary-note]")) {
    const detailId = target.dataset.diaryNote;
    if (!detailId) return;
    state.diaryNotes[detailId] = target.value;
    localStorage.setItem("macroobras.diaryNotes", JSON.stringify(state.diaryNotes || {}));
    return;
  }
  if (target.matches("[data-work-filter]")) {
    updateState({ workFilter: target.value });
    return;
  }
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
  if (isTwaSurface()) return;
  await pollCollaboratorStatus();
}

async function startMobilePlatform() {
  await pollCollaboratorStatus(true);
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
  if (authDemoMode()) return;
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
  if (authDemoMode()) return;
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
  if (authDemoMode()) {
    updateState({
      okfStatus: {
        ...initialOkfStatus,
        configurado: true,
        pronto: true,
        mensagem: "OKF preparado no modo frontend-only.",
      },
      toast: "OKF preparado no modo frontend-only.",
    });
    return;
  }
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
  const adminCpf = document.querySelector("[data-installer-admin-cpf]")?.value?.trim() || "";

  if (!adminEmail || !adminCpf) {
    updateState({ toast: "Informe o email e o CPF do primeiro administrador." });
    return;
  }

  updateState({ toast: "Criando o primeiro administrador…" });
  try {
    const response = await callRpc("executarInstalador", [JSON.stringify({ adminName, adminEmail, adminCpf })]);
    const data = response?.data || response || {};

    if (data.instalado !== true) {
      updateState({
        installerStatus: data.status || state.installerStatus,
        installationRequired: true,
        installationCompleted: false,
        toast: data.mensagem || "A configuração ainda não pôde ser concluída.",
      });
      return;
    }

    localStorage.setItem("macroobras.installationCompleted", "true");
    updateState({
      installerStatus: data.status || state.installerStatus,
      bootstrapChecked: true,
      installationRequired: false,
      installationCompleted: true,
      machineAuthorized: true,
      authenticated: false,
      authUser: null,
      route: "admin-login",
      toast: data.mensagem || "Configuração concluída. Identifique o administrador para entrar.",
    });
    history.replaceState({}, "", "?surface=admin");
    window.setTimeout(() => window.location.replace("?surface=admin"), 100);
  } catch (error) {
    updateState({
      installationRequired: true,
      installationCompleted: false,
      toast: error?.message || "A conexão com a estação foi interrompida antes de criar o administrador.",
    });
  }
}

function addTemporaryWorkElement() {
  const root = legacyRoot();
  const valueOf = (name) => root?.querySelector(`[data-element-field="${name}"]`)?.value?.trim() || "";
  const listOf = (name) => valueOf(name).split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  const name = valueOf("name") || "Elemento de obra";
  updateState({ temporaryWorkElements: [...(state.temporaryWorkElements || []), { name, description: valueOf("description") || "Elemento adicionado pela administração.", materials: valueOf("materials") || "materiais a definir", dependencies: listOf("dependencies"), unlocks: listOf("unlocks") }], toast: `Elemento de obra adicionado: ${name}` });
}

function handleReactNavigate(event) {
  navigateTo(event.detail?.route);
}

function navigateTo(route) {
  if (!route) return;
  if (isTwaSurface() && route !== "mobile-home" && !selectedWork()) {
    updateState({ route: "mobile-home", toast: dependencyMessage() });
    return;
  }
  updateState({ route, userMenuOpen: false, toast: "" });
}


async function bootstrapApplication() {
  if (authDemoMode()) {
    updateState({
      bootstrapChecked: true,
      installationRequired: false,
      installationCompleted: true,
      machineAuthorized: true,
      authenticated: true,
      collaboratorStatus: {
        ...initialCollaboratorStatus,
        available: true,
        enabled: true,
        running: false,
        localActive: true,
        message: "Modo frontend-only ativo.",
      },
      okfStatus: {
        ...initialOkfStatus,
        configurado: true,
        pronto: true,
        localDir: "frontend-demo",
        mensagem: "OKF preparado no modo frontend-only.",
      },
    });
    return;
  }
  if (isTwaSurface()) {
    updateState({ bootstrapChecked: true, installationRequired: false });
    await loadEncarregadoAccesses();
    void pollCollaboratorStatus();
    return;
  }
  try {
    const response = await callRpc("obterStatusBootstrap");
    const data = response?.data || response || {};
    const installationRequired = Boolean(data.primeiroAcesso ?? data.firstAccess ?? !data.instalacaoConcluida);
    if (data.statusInstalador) state.installerStatus = data.statusInstalador;
    const machineAuthorized = Boolean(
      data.statusInstalador?.githubAuthorized
        || data.statusInstalador?.machineAuthorized
        || data.statusInstalador?.autorizado
    );
    updateState({
      bootstrapChecked: true,
      installationRequired,
      installationCompleted: !installationRequired,
      authenticated: installationRequired ? false : state.authenticated,
      machineAuthorized,
      machineTokenConfigured: Boolean(data.statusInstalador?.githubAuthorized),
      route: installationRequired ? "installer" : state.route,
    });
    if (installationRequired) {
      void pollInstallerStatus();
      return;
    }
    if (state.authenticated) {
      void ensureMobilePlatform();
      void loadEncarregadoAccesses();
      void pollCollaboratorStatus();
      void pollOkfStatus();
    }
  } catch (error) {
    const completed = localStorage.getItem("macroobras.installationCompleted") === "true" || new URLSearchParams(location.search).get("surface") === "admin";
    updateState({
      bootstrapChecked: true,
      installationRequired: !completed,
      installationCompleted: completed,
      toast: completed ? "" : "Backend da configuração inicial ainda não respondeu.",
    });
    if (completed && state.authenticated) {
      void loadEncarregadoAccesses();
      void pollCollaboratorStatus();
      void pollOkfStatus();
    }
  }
}

function closeUserMenuOutside(event) {
  if (!state.userMenuOpen || event.target.closest(".user-menu-wrap")) return;
  updateState({ userMenuOpen: false });
}

function setAuthStatus(form, message, tone = "info") {
  const status = form?.querySelector("[data-auth-status]");
  if (!status) return;
  status.hidden = !message;
  status.dataset.tone = tone;
  status.textContent = message || "";
}

function setAuthBusy(form, busy, busyLabel = "Verificando…") {
  const button = form?.querySelector('[type="submit"]');
  if (!button) return;
  if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent.trim();
  button.disabled = Boolean(busy);
  button.setAttribute("aria-busy", String(Boolean(busy)));
  button.textContent = busy ? busyLabel : button.dataset.idleLabel;
}

async function loginWithFirebase(provider) {
  const form = document.querySelector('[data-auth-form="contact"]');
  if (!state.machineAuthorized) {
    setAuthStatus(form, "Autorize a máquina pelo token GitHub antes de entrar.", "error");
    return;
  }
  setAuthStatus(form, "Abrindo autenticação Google…", "info");
  try {
    const user = await signInWithFirebase(provider);
    try {
      await callRpc("registrarSessaoFirebase", [JSON.stringify(user)]);
    } catch {
      // A sessão do Firebase permanece válida se a persistência RPC ficar temporariamente indisponível.
    }
    updateState({ authenticated: true, authUser: user, route: "admin-dashboard", toast: "Acesso autorizado." });
  } catch (error) {
    setAuthStatus(form, error.message || "Não foi possível autenticar pelo Firebase.", "error");
  }
}

async function authorizeAdminMachine() {
  const form = document.querySelector('[data-auth-form="machine"]');
  const input = form?.querySelector("[data-admin-github-token]");
  const token = input?.value?.trim() || "";
  if (!token) {
    setAuthStatus(form, "Informe o token GitHub desta máquina.", "error");
    input?.focus();
    return;
  }

  setAuthStatus(form, "Verificando o token da máquina…", "info");
  setAuthBusy(form, true, "Verificando token…");
  try {
    const response = await callRpc("autenticarAdministradorToken", [JSON.stringify({ token })]);
    const data = response?.data || response || {};
    if (data.autorizado !== true) throw new Error(data.mensagem || "Token não autorizado.");
    input.value = "";
    updateState({
      machineAuthorized: true,
      authenticated: false,
      authUser: null,
      route: "admin-login",
      toast: "Máquina autorizada. Identifique o usuário para continuar.",
    });
  } catch (error) {
    setAuthStatus(form, error.message || "Token GitHub não autorizado.", "error");
    input?.select();
  } finally {
    setAuthBusy(form, false);
  }
}

async function loginAdminWithContact() {
  const form = document.querySelector('[data-auth-form="contact"]');
  const emailInput = form?.querySelector("[data-admin-email]");
  const cpfInput = form?.querySelector("[data-admin-cpf]");
  const email = emailInput?.value?.trim() || "";
  const cpf = cpfInput?.value?.trim() || "";
  if (!email || !cpf) {
    setAuthStatus(form, "Informe o email e o CPF cadastrados.", "error");
    (!email ? emailInput : cpfInput)?.focus();
    return;
  }
  if (!state.machineAuthorized) {
    setAuthStatus(form, "Autorize a máquina antes de identificar o usuário.", "error");
    return;
  }
  setAuthStatus(form, "Verificando email e CPF…", "info");
  setAuthBusy(form, true, "Verificando acesso…");
  try {
    const response = await callRpc("autenticarAdministradorContato", [JSON.stringify({ email, cpf })]);
    const data = response?.data || response || {};
    if (data.autorizado !== true) throw new Error(data.mensagem || "Email ou CPF não autorizado.");
    updateState({
      authenticated: true,
      authUser: {
        name: data.nome || "Administrador",
        email: data.email || email,
        cpf: data.cpf || cpf,
        provider: "email-cpf",
      },
      route: "admin-dashboard",
      toast: "Acesso autorizado.",
    });
  } catch (error) {
    setAuthStatus(form, error.message || "Email ou CPF não autorizado.", "error");
  } finally {
    setAuthBusy(form, false);
  }
}

async function logoutAdmin() {
  await signOutFirebase();
  sessionStorage.removeItem("macroobras.adminAuthenticated");
  updateState({ authenticated: false, authUser: null, userMenuOpen: false, route: "admin-login", toast: "Sessão encerrada." });
}

async function authorizeInstallerGithub() {
  const form = document.querySelector('[data-auth-form="installer-machine"]');
  const input = form?.querySelector("[data-installer-github-token]");
  const token = input?.value?.trim() || "";
  if (!token) {
    setAuthStatus(form, "Informe o token de autorização GitHub.", "error");
    input?.focus();
    return;
  }

  setAuthStatus(form, "Verificando o token no GitHub…", "info");
  setAuthBusy(form, true, "Verificando token…");
  try {
    const response = await callRpc("autorizarInstalacaoGithub", [JSON.stringify({ token, repository: GITHUB_REPOSITORY })]);
    const data = response?.data || response || {};
    if (data.autorizado !== true) throw new Error(data.mensagem || "Token não autorizado.");
    if (input) input.value = "";
    updateState({
      machineAuthorized: true,
      installerStatus: {
        ...(state.installerStatus || {}),
        ...data,
        githubAuthorized: true,
        githubLogin: data.githubLogin || data.login || "GitHub",
        message: data.mensagem || "Máquina autorizada.",
      },
      toast: "Máquina autorizada pelo GitHub.",
    });
  } catch (error) {
    setAuthStatus(form, error.message || "Não foi possível autorizar a máquina.", "error");
    input?.select();
  } finally {
    setAuthBusy(form, false, "Autorizar máquina");
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

async function loadEncarregadoAccesses(workId = "") {
  try {
    const response = await callRpc("listarAcessosEncarregado", [JSON.stringify({ workId })]);
    const data = response?.data || response || {};
    const accesses = Array.isArray(data.acessos) ? data.acessos : [];
    const activeId = state.activeMobileAccessId;
    const active = accesses.find((access) => access.id === activeId);
    updateState({
      encarregadoAccesses: accesses,
      selectedWorkId: isTwaSurface() && active?.workId ? active.workId : state.selectedWorkId,
    });
    return accesses;
  } catch {
    return state.encarregadoAccesses;
  }
}

function mobileAccessUrl(access) {
  const base = state.collaboratorStatus?.publicAppUrl
    || state.collaboratorStatus?.lanAppUrl
    || state.collaboratorStatus?.localAppUrl
    || `${window.location.origin}/?surface=twa`;
  const url = new URL(base, window.location.origin);
  url.searchParams.set("surface", "twa");
  url.searchParams.set("access", access.id);
  url.searchParams.set("work", access.workId);
  return url.toString();
}

async function saveEncarregadoAccess() {
  const work = selectedWork();
  const personSelect = document.querySelector("[data-encarregado-person]");
  const option = personSelect?.selectedOptions?.[0];
  if (!work || !option) {
    updateState({ toast: "Selecione a pessoa do RH dentro da obra." });
    return;
  }
  const payload = {
    personId: option.value || "",
    name: option.textContent?.trim() || "Encarregado",
    email: option.dataset.email || "",
    cpf: option.dataset.cpf || "",
    workId: work.id,
    workName: work.name,
  };
  if (!payload.email || !payload.cpf) {
    updateState({ toast: "A pessoa precisa ter email e CPF registrados no organograma de RH." });
    return;
  }
  updateState({ toast: "Gerando acesso individual do encarregado…" });
  try {
    const response = await callRpc("salvarAcessoEncarregado", [JSON.stringify(payload)]);
    const data = response?.data || response || {};
    const access = data.acesso || data;
    const accesses = state.encarregadoAccesses.filter((item) => item.id !== access.id && !(item.personId === access.personId && item.workId === access.workId));
    updateState({ encarregadoAccesses: [access, ...accesses], toast: data.mensagem || `Acesso gerado para ${payload.name}.` });
  } catch (error) {
    updateState({ toast: error.message || "Não foi possível gerar o acesso do encarregado." });
  }
}

function openEncarregadoAccess(accessId) {
  const access = state.encarregadoAccesses.find((item) => item.id === accessId);
  if (!access) {
    updateState({ toast: "Acesso do encarregado não localizado." });
    return;
  }
  window.open(mobileAccessUrl(access), "_blank", "noopener,noreferrer");
}

async function copyEncarregadoAccessUrl(accessId) {
  const access = state.encarregadoAccesses.find((item) => item.id === accessId);
  if (!access) return;
  const value = mobileAccessUrl(access);
  try {
    await navigator.clipboard.writeText(value);
    updateState({ toast: "Endereço individual copiado." });
  } catch {
    const input = document.querySelector(`[data-access-url="${CSS.escape(accessId)}"]`);
    input?.select();
    document.execCommand?.("copy");
    updateState({ toast: "Endereço selecionado para cópia." });
  }
}

async function removeEncarregadoAccess(accessId) {
  const access = state.encarregadoAccesses.find((item) => item.id === accessId);
  if (!access) return;
  try {
    const response = await callRpc("removerAcessoEncarregado", [JSON.stringify({ id: accessId })]);
    const data = response?.data || response || {};
    updateState({ encarregadoAccesses: state.encarregadoAccesses.filter((item) => item.id !== accessId), toast: data.mensagem || `Vínculo removido: ${access.name}.` });
  } catch (error) {
    updateState({ toast: error.message || "Não foi possível remover o vínculo." });
  }
}

async function loginMobileAccess() {
  const access = selectedMobileAccess();
  const emailInput = document.querySelector("[data-mobile-email]");
  const cpfInput = document.querySelector("[data-mobile-cpf]");
  const email = emailInput?.value?.trim() || "";
  const cpf = cpfInput?.value?.trim() || "";
  if (!access) {
    updateState({ toast: "Este endereço não contém um acesso administrativo válido." });
    return;
  }
  if (!email || !cpf) {
    updateState({ toast: "Informe o email e o CPF cadastrados pela administração." });
    return;
  }
  try {
    const response = await callRpc("autenticarAcessoEncarregado", [JSON.stringify({ id: access.id, workId: access.workId, email, cpf })]);
    const data = response?.data || response || {};
    if (data.autorizado !== true) throw new Error(data.mensagem || "Identificação não autorizada.");
    updateState({
      mobileAuthenticated: true,
      activeMobileAccessId: access.id,
      selectedWorkId: access.workId,
      route: "mobile-home",
      toast: `Acesso autorizado para ${access.name}.`,
    });
  } catch (error) {
    updateState({ toast: error.message || "Email ou CPF não correspondem ao acesso." });
    cpfInput?.select();
  }
}

function handleDiagramChange(event) {
  const id = event.detail?.id;
  const model = event.detail?.model;
  if (!id || !model) return;
  state.diagramModels[id] = model;
  if (id === "rh-main") state.rhModel = model;
  localStorage.setItem("macroobras.diagramModels", JSON.stringify(state.diagramModels || {}));
  window.clearTimeout(diagramPersistenceTimer);
  diagramPersistenceTimer = window.setTimeout(() => {
    void persistDiagramModel(id, model);
  }, 650);
}

function handleDiagramNodeSelected(event) {
  const diagramId = event.detail?.id;
  const node = event.detail?.node;
  if (!diagramId || !node) return;
  updateState({
    selectedDiagramNode: { diagramId, nodeId: node.id, node },
    toast: `${node.title || "Quadro"} selecionado.`,
  });
  queueMicrotask(() => focusDiagramNode(diagramId, node.id));
}

async function persistDiagramModel(id, model) {
  const descriptors = {
    "all-work-elements": {
      obraId: "glossario-servicos",
      obra: "Glossário de serviços e requisitos",
    },
    "rh-main": {
      obraId: "sistema-rh",
      obra: "Organograma operacional de RH",
    },
  };
  const descriptor = descriptors[id];
  if (!descriptor || authDemoMode()) return;
  try {
    await callRpc("salvarOkfElementosObra", [
      JSON.stringify({ ...descriptor, diagrama: model }),
    ]);
  } catch {
    // O armazenamento local recupera a edição quando o repositório OKF está offline.
  }
}

function saveDiagramRecord(trigger) {
  const form = trigger.closest("[data-diagram-record-form]")
    || document.querySelector("[data-diagram-record-form]");
  const diagramId = form?.dataset.diagramId;
  const nodeId = form?.dataset.diagramNodeId;
  if (!form || !diagramId || !nodeId) return;

  const model = getDiagramModel(diagramId) || state.diagramModels?.[diagramId];
  const current = model?.nodes?.find((node) => node.id === nodeId);
  if (!current) {
    updateState({ toast: "O registro selecionado não está mais disponível." });
    return;
  }

  const patch = {};
  form.querySelectorAll("[data-diagram-record-field]").forEach((field) => {
    patch[field.dataset.diagramRecordField] = field.value?.trim?.() ?? field.value;
  });
  const fields = Array.from(form.querySelectorAll("[data-diagram-field-value]")).map((field) => ({
    name: field.dataset.diagramFieldValue || "Campo",
    value: field.value?.trim?.() ?? field.value,
  }));
  if (fields.length) patch.fields = fields;

  if (!updateDiagramNode(diagramId, nodeId, patch)) {
    updateState({ toast: "Não foi possível atualizar o registro no canvas." });
    return;
  }
  updateState({
    selectedDiagramNode: {
      diagramId,
      nodeId,
      node: { ...current, ...patch },
    },
    toast: "Registro salvo; sincronização com o OKF agendada.",
  });
}

function deleteDiagramRecord(trigger) {
  const form = trigger.closest("[data-diagram-record-form]")
    || document.querySelector("[data-diagram-record-form]");
  const diagramId = form?.dataset.diagramId;
  const nodeId = form?.dataset.diagramNodeId;
  if (!diagramId || !nodeId) return;
  if (!removeNodeFromDiagram(diagramId, nodeId)) {
    updateState({ toast: "Não foi possível excluir o registro." });
    return;
  }
  updateState({
    selectedDiagramNode: null,
    toast: "Registro e relações removidos do modelo.",
  });
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

function saveCustomization() {
  const form = document.querySelector("[data-settings-form]");
  if (!form) return;
  const primaryColor = normalizedHexColor(
    form.querySelector('[data-setting-field="primaryColor"]')?.value,
  );
  const customization = {
    ...(state.customization || {}),
    stationName: form.querySelector('[data-setting-field="stationName"]')?.value?.trim() || "ERP da construção Maximus Empreendimentos",
    stationSubtitle: form.querySelector('[data-setting-field="stationSubtitle"]')?.value?.trim() || "Gestão operacional da construção",
    primaryColor,
    theme: form.querySelector('[data-setting-field="theme"]')?.value || "system",
    density: form.querySelector('[data-setting-field="density"]')?.value || "comfortable",
    sidebarBehavior: form.querySelector('[data-setting-field="sidebarBehavior"]')?.value || "hover",
    savedAt: new Date().toISOString(),
  };
  updateState({
    customization,
    sidebarCollapsed: customization.sidebarBehavior === "hover",
    toast: "Aparência e comportamento salvos nesta estação.",
  });
}

async function saveLoginConfig() {
  const form = document.querySelector("[data-login-config-form]");
  if (!form) return;
  const email = form.querySelector('[data-login-field="email"]')?.value?.trim() || "";
  const cpf = form.querySelector('[data-login-field="cpf"]')?.value?.trim() || "";
  const name = form.querySelector('[data-login-field="name"]')?.value?.trim() || state.authUser?.name || "Administrador";
  if (!email || !cpf) {
    updateState({ toast: "Informe email e CPF para salvar o login administrativo." });
    return;
  }
  try {
    const response = await callRpc("salvarConfiguracaoLogin", [JSON.stringify({ email, cpf, name })]);
    const data = response?.data || response || {};
    updateState({
      customization: {
        ...(state.customization || {}),
        adminLoginEmail: data.email || email,
        adminLoginCpf: data.cpf || cpf,
        savedAt: new Date().toISOString(),
      },
      toast: data.mensagem || "Login administrativo atualizado.",
    });
  } catch (error) {
    updateState({ toast: error?.message || "Não foi possível salvar o login administrativo." });
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
