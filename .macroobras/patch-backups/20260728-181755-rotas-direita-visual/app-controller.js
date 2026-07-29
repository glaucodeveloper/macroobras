import {
  availableWorks,
  budgetImportPreview,
  initialCollaboratorStatus,
  initialOkfStatus,
} from "./data.js";
import { callRpc } from "./api.js";
import {
  itemOfficialPercentage,
  workOfficialPercentage,
} from "./work-metrics.js";
import {
  printCurrentReport,
  printLetterheadPreview,
} from "../ui/branded-print.js";
import { normalizedMobileRoute, renderRoute } from "./router.js";
import { installerScreen } from "../pages/installer/installer.page.js";
import { shell, twaShell } from "../ui/shells.js";
import { geocodeWorkAddress, hydrateGoogleMaps } from "../ui/google-maps.js";
import { hydrateOperationalLayouts } from "../ui/operational-layouts.js";
import {
  addNodeToDiagram,
  focusDiagramNode,
  getDiagramModel,
  hydrateDiagramCanvases,
  removeNodeFromDiagram,
  updateDiagramNode,
} from "../ui/diagram-canvas.js";
import { signInWithFirebase, signOutFirebase } from "./firebase-auth.js";
import { printVisitRouteReport } from "../ui/visit-route-print.js";
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

const GITHUB_REPOSITORY = "glaucodeveloper/macroobras";
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
    hydrateOperationalLayouts(root);
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

/* macroobras-v49-domain-handlers */
if (message.type === "select-inventory-city") {
  updateState({
    selectedInventoryCity: message.city || "",
    toast: "",
  });
  return;
}

if (message.type === "allocate-inventory-material") {
  allocateInventoryMaterial(message.materialId);
  return;
}

if (message.type === "create-ticket") {
  createTicketFromForm();
  return;
}

if (message.type === "update-ticket-status") {
  updateTicketStatus(message.ticketId, message.status);
  return;
}

if (message.type === "create-standalone-purchase") {
  createStandalonePurchase();
  return;
}

if (message.type === "create-purchase-from-diagram") {
  createPurchaseFromDiagram(message.diagramId, message.nodeId);
  return;
}

if (message.type === "open-item-diary") {
  updateState({
    selectedWorkId: message.workId || state.selectedWorkId,
    route: "admin-work-diary",
    selectedDiaryDetailId: "",
    toast: "Diário aberto para localizar o serviço selecionado.",
  });
  return;
}

if (message.type === "print-current-report") {
  window.print();
  return;
}



  /* macroobras-v51-percentages-letterhead-handlers */
  if (message.type === "edit-settings") {
    updateState({ settingsEditing: true, toast: "" });
    return;
  }

  if (message.type === "save-settings-top") {
    saveAllSettings();
    return;
  }

  if (message.type === "print-letterhead-preview") {
    printLetterheadPreview();
    return;
  }

  if (message.type === "remove-letterhead-logo") {
    updateState({
      customization: {
        ...(state.customization || {}),
        letterheadLogoDataUrl: "",
        savedAt: new Date().toISOString(),
      },
      toast: "Logomarca removida.",
    });
    return;
  }

  if (message.type === "print-current-report") {
    printCurrentReport();
    return;
  }

  if (message.type === "close-diary-entry") {
    closeDiaryEntry(message.entryId);
    return;
  }

  if (message.type === "officialize-measurement") {
    officializeMeasurement(message);
    return;
  }

  if (message.type === "open-item-diary") {
    updateState({
      selectedWorkId: message.workId || state.selectedWorkId,
      selectedDiaryDetailId: message.itemId || "",
      route: "admin-work-diary",
      toast: "Diário aberto para localizar o serviço.",
    });
    return;
  }

  if (message.type === "request-delete-work") {
    updateState({
      selectedWorkId: message.workId || state.selectedWorkId,
      deleteWorkStage: 1,
      deleteWorkExportBefore: true,
      toast: "",
    });
    return;
  }

  if (message.type === "continue-delete-work") {
    updateState({
      deleteWorkStage: 2,
      deleteWorkExportBefore: Boolean(
        document.querySelector("[data-delete-work-export]")?.checked
      ),
      toast: "",
    });
    return;
  }

  if (message.type === "cancel-delete-work") {
    updateState({ deleteWorkStage: 0, toast: "" });
    return;
  }

  if (message.type === "confirm-delete-work") {
    deleteCurrentWork(message.workId);
    return;
  }

  if (message.type === "export-current-work") {
    exportCurrentWork(message.workId || state.selectedWorkId);
    return;
  }

  /* macroobras-v50-operational-handlers */
  if (message.type === "select-inventory-location") {
    updateState({ selectedInventoryCity: message.locationId || "", toast: "" });
    return;
  }
  if (message.type === "edit-settings") {
    updateState({ settingsEditing: true, toast: "" });
    return;
  }
  if (message.type === "save-settings-top") {
    saveCustomization();
    updateState({ settingsEditing: false, toast: "Configurações salvas." });
    return;
  }
  if (message.type === "close-works-visit") {
    updateState({ worksVisitOpen: false, toast: "" });
    return;
  }
  if (message.type === "filter-purchases") {
    updateState({ purchaseStatusFilter: message.status || "Todas", selectedPurchaseFlowId: "", toast: "" });
    return;
  }
  if (message.type === "close-purchase-detail") {
    updateState({ selectedPurchaseFlowId: "", toast: "" });
    return;
  }
  if (message.type === "open-ticket" || message.type === "select-ticket") {
    updateState({ route: "admin-tickets", selectedTicketId: message.ticketId || "", toast: "" });
    return;
  }
  if (message.type === "open-operational-ticket") {
    openOperationalTicket(message);
    return;
  }

  if (message.type === "navigate") {
    navigateTo(message.route);
    return;
  }
  if (message.type === "toggle-sidebar") {
    const currentBehavior =
      state.customization?.sidebarBehavior
      || "hover";
    const nextBehavior =
      currentBehavior === "hover"
        ? "pinned"
        : "hover";

    updateState({
      customization: {
        ...(state.customization || {}),
        sidebarBehavior: nextBehavior,
        savedAt: new Date().toISOString(),
      },
      sidebarCollapsed:
        nextBehavior === "hover",
      toast: "",
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
    if (target.closest(".diary-gallery-button, .diary-attachment-gallery")) {
      openOperationalTicket({
        sourceKey: `diary:${state.selectedWorkId}:${message.detailId || "attachment"}`,
        ticketTitle: target.textContent?.replace(/\s+/g, " ").trim() || "Conferir evidência do diário",
        ticketDescription: "Ação de galeria ou anexo do diário de obra.",
        workId: state.selectedWorkId || "",
        detailId: message.detailId || "",
      });
      return;
    }
    updateState({ selectedDiaryDetailId: message.detailId || "", toast: "" });
    return;
  }

  if (message.type === "close-diary-detail") {
    updateState({
      selectedDiaryDetailId: "",
      toast: "",
    });
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
    createImportedWork();
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
    const general = message.type === "select-purchase" || state.route === "admin-purchases" || !flow?.workId;
    updateState({
      selectedPurchaseFlowId: message.flowId,
      selectedWorkId: flow?.workId || state.selectedWorkId,
      route: general ? "admin-purchases" : "admin-work-purchases",
      toast: "",
    });
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

  /* MACROOBRAS WORKS VISIT CRUD HANDLERS V1 */
  if (message.type === "load-works-visit-route") {
    loadWorksVisitRoute();
    return;
  }

  if (message.type === "save-works-visit-route") {
    saveWorksVisitRoute();
    return;
  }

  if (message.type === "delete-works-visit-route") {
    deleteWorksVisitRoute();
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

  if (message.type === "print-visit-plan") {
    printExistingVisitPlan(message.planId);
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
    captureInstallerAdminDraft();
    updateState({ installerStep: Number(message.step || 0), toast: "" });
    return;
  }
  if (message.type === "installer-prev") {
    captureInstallerAdminDraft();
    updateState({ installerStep: Math.max(0, (state.installerStep || 0) - 1), toast: "" });
    return;
  }
  if (message.type === "installer-next") {
    captureInstallerAdminDraft();
    updateState({ installerStep: Math.min(1, (state.installerStep || 0) + 1), toast: "" });
    return;
  }
  if (message.type === "installer-status") {
    const validation =
      refreshInstallerAdminValidation();

    if (!validation.valid) {
      updateState({
        toast: validation.message,
      });
      window.setTimeout(
        () =>
          document.querySelector(
            validation.selector
          )?.focus(),
        0
      );
      return;
    }

    void pollInstallerStatus(true);
    return;
  }
  if (message.type === "installer-run") {
    void runInstaller();
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

  if (target.matches("[data-letterhead-logo-file]")) {
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      updateState({
        customization: {
          ...(state.customization || {}),
          letterheadLogoDataUrl: String(reader.result || ""),
          savedAt: new Date().toISOString(),
        },
        toast: "Logomarca carregada no modelo timbrado.",
      });
    });
    reader.readAsDataURL(file);
    return;
  }

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

  if (
    target.matches(
      "[data-installer-admin-name], "
      + "[data-installer-admin-email], "
      + "[data-installer-admin-cpf]"
    )
  ) {
    if (
      target.matches(
        "[data-installer-admin-name]"
      )
    ) {
      state.installerAdminName =
        target.value;
    } else if (
      target.matches(
        "[data-installer-admin-email]"
      )
    ) {
      state.installerAdminEmail =
        target.value;
    } else {
      state.installerAdminCpf =
        target.value;
    }

    refreshInstallerAdminValidation();
    return;
  }
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

/* MACROOBRAS VISIT PRINT HELPERS V1 */
function nextPrintRecordNumber() {
  const now = new Date();
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const sequence = (state.printRecords || [])
    .filter((record) => String(record.number || "").startsWith(`IMP-${day}-`))
    .length + 1;
  return `IMP-${day}-${String(sequence).padStart(4, "0")}`;
}

function createPrintRecord(plan) {
  const now = new Date();
  return {
    id: `print-${Date.now().toString(36)}`,
    number: nextPrintRecordNumber(),
    type: "visit-route",
    title: plan.name || "Rota de visitas",
    entityId: plan.id,
    createdAt: now.toISOString(),
    dateLabel: now.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }),
    userName: state.authUser?.name || "Administrador",
    userEmail: state.authUser?.email || state.customization?.adminLoginEmail || "",
  };
}

function printPlanWithRecord(plan) {
  if (!plan) {
    updateState({ toast: "Selecione uma rota antes de imprimir." });
    return;
  }

  const record = createPrintRecord(plan);
  updateState({
    printRecords: [record, ...(state.printRecords || [])].slice(0, 500),
    toast: `Impressão registrada como ${record.number}.`,
  });

  window.setTimeout(() => {
    printVisitRouteReport({
      plan,
      record,
      customization: state.customization || {},
    });
  }, 80);
}

function printExistingVisitPlan(planId) {
  const plan = (state.visitPlans || []).find((item) => item.id === planId)
    || selectedVisitPlan();
  printPlanWithRecord(plan);
}

/* MACROOBRAS WORKS VISIT CRUD V1 */
function worksVisitSelectedPlanId() {
  return document.querySelector("[data-works-visit-plan-select]")?.value
    || state.selectedVisitPlanId
    || "";
}

function worksVisitRouteName(existing = null) {
  return document.querySelector("[data-works-visit-route-name]")?.value?.trim()
    || existing?.name
    || `Rota de visitas ${new Date().toLocaleDateString("pt-BR")}`;
}

function workStopFromId(workId) {
  const work = availableWorks.find((item) => item.id === workId);
  if (!work) return null;

  return {
    id: `work:${work.id}`,
    kind: "work",
    workId: work.id,
    name: work.name,
    address: work.address,
    coordinates: work.coordinates,
    durationMinutes: Number(state.visitDurations[`work:${work.id}`] ?? 60),
  };
}

function scheduleForVisitRoute(route) {
  const stops = Array.isArray(route.stops) ? route.stops : [];
  const segmentByOrigin = new Map(
    (route.segments || []).map((segment) => [segment.fromId, segment]),
  );

  let cursor = 8 * 60;

  return stops.map((stop, index) => {
    const durationMinutes = Number(
      stop.durationMinutes
      ?? state.visitDurations[stop.id]
      ?? 60
    );

    const start = minutesToClock(cursor);
    const end = minutesToClock(cursor + durationMinutes);
    cursor += durationMinutes;

    const segment = segmentByOrigin.get(stop.id);

    if (index < stops.length - 1) {
      cursor += Math.round(Number(segment?.durationMillis || 0) / 60000);
    }

    return {
      stopId: stop.id,
      workId: stop.workId || "",
      name: stop.name || "Parada",
      address: stop.address || "",
      coordinates: stop.coordinates,
      start,
      end,
      durationMinutes,
    };
  });
}

function planFromCurrentVisitRoute(id, name) {
  const route = state.visitRoute || {};
  const stops = Array.isArray(route.stops) ? route.stops : [];
  const now = new Date();
  const travelMinutes = Math.round(
    Number(route.totalDurationMillis || 0) / 60000,
  );
  const visitMinutes = stops.reduce(
    (sum, stop) => sum + Number(
      stop.durationMinutes
      ?? state.visitDurations[stop.id]
      ?? 60
    ),
    0,
  );

  return {
    id,
    name,
    date: now.toLocaleDateString("pt-BR"),
    dateIso: now.toISOString().slice(0, 10),
    stops: stops.map((stop) => ({ ...stop })),
    workIds: stops.map((stop) => stop.workId).filter(Boolean),
    segments: (route.segments || []).map((segment) => ({ ...segment })),
    travelMinutes,
    visitMinutes,
    distanceMeters: Number(route.totalDistanceMeters || 0),
    totalDurationMillis: Number(route.totalDurationMillis || 0),
    schedule: scheduleForVisitRoute(route),
    generatedAt: now.toLocaleString("pt-BR"),
    generatedAtIso: now.toISOString(),
    source: route.segments?.length
      ? "Google Routes · vias rodoviárias"
      : "Traçado local",
  };
}

function persistVisitPlans(plans) {
  try {
    localStorage.setItem(
      "macroobras.visitPlans",
      JSON.stringify(plans || []),
    );
  } catch {
    // A atualização de estado continua válida mesmo sem armazenamento local.
  }
}

function loadWorksVisitRoute() {
  const id = worksVisitSelectedPlanId();
  const plan = (state.visitPlans || []).find((item) => item.id === id);

  if (!plan) {
    updateState({
      toast: "Selecione uma rota registrada para carregar no mapa.",
    });
    return;
  }

  const stops = Array.isArray(plan.stops) && plan.stops.length
    ? plan.stops.map((stop) => ({ ...stop }))
    : (plan.workIds || []).map(workStopFromId).filter(Boolean);

  const route = {
    stops,
    segments: Array.isArray(plan.segments)
      ? plan.segments.map((segment) => ({ ...segment }))
      : [],
    totalDistanceMeters: Number(
      plan.distanceMeters
      || plan.totalDistanceMeters
      || 0
    ),
    totalDurationMillis: Number(
      plan.totalDurationMillis
      || Number(plan.travelMinutes || 0) * 60000
      || 0
    ),
    pendingStopId: "",
  };

  updateState({
    selectedVisitPlanId: plan.id,
    visitRoute: route,
    toast: `Rota carregada: ${plan.name}.`,
  });
}

function saveWorksVisitRoute() {
  const route = state.visitRoute || {};
  const stops = Array.isArray(route.stops) ? route.stops : [];

  if (!stops.length) {
    updateState({
      toast: "Adicione ao menos uma parada antes de salvar a rota.",
    });
    return;
  }

  const selectedId = worksVisitSelectedPlanId();
  const existing = (state.visitPlans || []).find(
    (plan) => plan.id === selectedId,
  );

  const id = existing?.id
    || `rota-visita-${Date.now().toString(36)}`;

  const plan = planFromCurrentVisitRoute(
    id,
    worksVisitRouteName(existing),
  );

  const plans = existing
    ? (state.visitPlans || []).map(
      (item) => item.id === existing.id ? plan : item,
    )
    : [plan, ...(state.visitPlans || [])];

  persistVisitPlans(plans);

  updateState({
    visitPlans: plans,
    selectedVisitPlanId: id,
    toast: existing
      ? `Rota atualizada: ${plan.name}.`
      : `Rota criada: ${plan.name}.`,
  });
}

function deleteWorksVisitRoute() {
  const id = worksVisitSelectedPlanId();

  if (!id) {
    updateState({
      toast: "Selecione uma rota registrada para excluir.",
    });
    return;
  }

  const plan = (state.visitPlans || []).find((item) => item.id === id);

  if (!plan) {
    updateState({
      toast: "A rota selecionada não foi encontrada.",
    });
    return;
  }

  const plans = (state.visitPlans || []).filter(
    (item) => item.id !== id,
  );

  persistVisitPlans(plans);

  updateState({
    visitPlans: plans,
    selectedVisitPlanId: "",
    visitRoute: {
      stops: [],
      segments: [],
      totalDistanceMeters: 0,
      totalDurationMillis: 0,
      pendingStopId: "",
    },
    toast: `Rota excluída: ${plan.name}.`,
  });
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

  const next = (state.visitPlans || []).length + 1;
  const id = `rota-gerada-${Date.now().toString(36)}`;
  const now = new Date();
  const plan = {
    id,
    name: `Rota traçada — versão ${next}`,
    date: now.toLocaleDateString("pt-BR"),
    dateIso: now.toISOString().slice(0, 10),
    stops: stops.map((stop) => ({ ...stop })),
    workIds: stops.map((stop) => stop.workId).filter(Boolean),
    travelMinutes,
    visitMinutes,
    distanceMeters: Number(route.totalDistanceMeters || 0),
    totalDurationMillis: Number(route.totalDurationMillis || 0),
    segments: (route.segments || []).map((segment) => ({ ...segment })),
    source: route.segments?.length ? "Google Routes · vias rodoviárias" : "Traçado local",
    schedule,
    generatedAt: now.toLocaleString("pt-BR"),
    generatedAtIso: now.toISOString(),
  };

  updateState({
    visitPlans: [plan, ...(state.visitPlans || [])],
    selectedVisitPlanId: id,
    toast: "Visitas registradas nos cronogramas das obras. Preparando relatório para PDF.",
  });

  window.setTimeout(() => printPlanWithRecord(plan), 100);
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

function digitsOnlyInstallerValue(value) {
  return String(value || "").replace(/\D/g, "");
}

function validInstallerEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || "").trim()
  );
}

function validInstallerCpf(value) {
  const digits =
    digitsOnlyInstallerValue(value);

  if (
    digits.length !== 11
    || /^(\d)\1{10}$/.test(digits)
  ) {
    return false;
  }

  const calculate = (length) => {
    let sum = 0;

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      sum +=
        Number(digits[index])
        * (length + 1 - index);
    }

    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculate(9) === Number(digits[9])
    && calculate(10) === Number(digits[10])
  );
}

function captureInstallerAdminDraft() {
  const nameInput =
    document.querySelector(
      "[data-installer-admin-name]"
    );
  const emailInput =
    document.querySelector(
      "[data-installer-admin-email]"
    );
  const cpfInput =
    document.querySelector(
      "[data-installer-admin-cpf]"
    );

  if (nameInput) {
    state.installerAdminName =
      nameInput.value;
  }

  if (emailInput) {
    state.installerAdminEmail =
      emailInput.value;
  }

  if (cpfInput) {
    state.installerAdminCpf =
      cpfInput.value;
  }

  const draft = {
    adminName: String(
      state.installerAdminName
        || state.installerStatus?.githubLogin
        || "Administrador"
    ).trim(),
    adminEmail: String(
      state.installerAdminEmail
        || ""
    ).trim(),
    adminCpf: String(
      state.installerAdminCpf
        || ""
    ).trim(),
  };

  sessionStorage.setItem(
    "macroobras.installerAdminName",
    draft.adminName
  );
  sessionStorage.setItem(
    "macroobras.installerAdminEmail",
    draft.adminEmail
  );
  sessionStorage.setItem(
    "macroobras.installerAdminCpf",
    draft.adminCpf
  );

  return draft;
}

function validateInstallerAdminDraft(
  draft = captureInstallerAdminDraft()
) {
  if (draft.adminName.length < 2) {
    return {
      valid: false,
      message:
        "Informe o nome do administrador.",
      selector:
        "[data-installer-admin-name]",
    };
  }

  if (!validInstallerEmail(draft.adminEmail)) {
    return {
      valid: false,
      message:
        "Informe um email administrativo válido.",
      selector:
        "[data-installer-admin-email]",
    };
  }

  if (!validInstallerCpf(draft.adminCpf)) {
    return {
      valid: false,
      message:
        "Informe um CPF válido.",
      selector:
        "[data-installer-admin-cpf]",
    };
  }

  return {
    valid: true,
    message:
      "Dados do administrador prontos para criação.",
    selector: "",
  };
}

function refreshInstallerAdminValidation() {
  const draft =
    captureInstallerAdminDraft();
  const validation =
    validateInstallerAdminDraft(draft);
  const button =
    document.querySelector(
      '[data-message="installer-run"]'
    );
  const status =
    document.querySelector(
      "[data-installer-admin-validation]"
    );

  if (button) {
    button.disabled = !validation.valid;
    button.setAttribute(
      "aria-disabled",
      String(!validation.valid)
    );
  }

  if (status) {
    status.classList.toggle(
      "ok",
      validation.valid
    );

    const badge =
      status.querySelector("b");
    const title =
      status.querySelector("strong");
    const detail =
      status.querySelector("small");

    if (badge) {
      badge.textContent =
        validation.valid ? "✓" : "3";
    }

    if (title) {
      title.textContent =
        validation.valid
          ? "Dados verificados"
          : "Cadastro incompleto";
    }

    if (detail) {
      detail.textContent =
        validation.message;
    }
  }

  return validation;
}

async function pollInstallerStatus(
  announce = false
) {
  if (!isInstallerSurface()) return;

  captureInstallerAdminDraft();

  try {
    const response =
      await callRpc(
        "obterStatusInstalador"
      );

    updateState({
      installerStatus:
        response?.data
          || state.installerStatus,
      toast:
        announce
          ? "Dados do administrador verificados."
          : state.toast,
    });
  } catch (error) {
    updateState({
      installerStatus: {
        ...(state.installerStatus || {}),
        message:
          "Backend ainda não expôs o instalador Nim",
      },
      toast:
        announce
          ? error?.message
            || "Não foi possível verificar o instalador."
          : state.toast,
    });
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
  const draft =
    captureInstallerAdminDraft();
  const validation =
    validateInstallerAdminDraft(draft);

  if (!validation.valid) {
    updateState({
      toast: validation.message,
    });

    window.setTimeout(
      () =>
        document.querySelector(
          validation.selector
        )?.focus(),
      0
    );
    return;
  }

  updateState({
    toast:
      "Criando o primeiro administrador…",
  });

  try {
    const response =
      await callRpc(
        "executarInstalador",
        [
          JSON.stringify(draft),
        ]
      );
    const data =
      response?.data
        || response
        || {};

    if (data.instalado !== true) {
      updateState({
        installerStatus:
          data.status
            || state.installerStatus,
        installationRequired: true,
        installationCompleted: false,
        toast:
          data.mensagem
            || "A configuração ainda não pôde ser concluída.",
      });
      return;
    }

    localStorage.setItem(
      "macroobras.installationCompleted",
      "true"
    );
    sessionStorage.removeItem(
      "macroobras.installerAdminName"
    );
    sessionStorage.removeItem(
      "macroobras.installerAdminEmail"
    );
    sessionStorage.removeItem(
      "macroobras.installerAdminCpf"
    );
    sessionStorage.removeItem(
      "macroobras.installerStep"
    );

    updateState({
      installerStatus:
        data.status
          || state.installerStatus,
      bootstrapChecked: true,
      installationRequired: false,
      installationCompleted: true,
      machineAuthorized: true,
      authenticated: false,
      authUser: null,
      route: "admin-login",
      toast:
        data.mensagem
          || "Configuração concluída. Identifique o administrador para entrar.",
    });

    history.replaceState(
      {},
      "",
      "?surface=admin"
    );

    window.setTimeout(
      () =>
        window.location.replace(
          "?surface=admin"
        ),
      100
    );
  } catch (error) {
    updateState({
      installationRequired: true,
      installationCompleted: false,
      toast:
        error?.message
          || "A conexão com a estação foi interrompida antes de criar o administrador.",
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

/* macroobras-v49-domain-functions */

function persistDomainState(patch, toast = "") {
  updateState({ ...patch, toast });
}

function createStandalonePurchase() {
  const id = `compra-avulsa-${Date.now().toString(36)}`;
  const flow = {
    id,
    workId: "",
    itemId: "",
    ticketId: "",
    inventoryMovementId: "",
    originLabel: "Solicitação administrativa",
    title: "Nova compra avulsa",
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
    orderFile: "",
    paid: 0,
    transport: "Não iniciado",
    delivered: false,
    deliveryEvidence: "",
    status: "Solicitação",
  };

  persistDomainState(
    {
      purchaseFlows: [
        flow,
        ...(state.purchaseFlows || []),
      ],
      selectedPurchaseFlowId: id,
      route: "admin-purchases",
    },
    "Compra avulsa criada sem item de obra obrigatório."
  );
}

function createPurchaseFromDiagram(diagramId, nodeId) {
  const model = state.diagramModels?.[diagramId];
  const node =
    model?.nodes?.find((item) => item.id === nodeId)
    || state.selectedDiagramNode?.node;

  if (!node) {
    updateState({
      toast: "Selecione um serviço ou material.",
    });
    return;
  }

  const quantityField = node.fields?.find((field) =>
    String(field.name)
      .toLowerCase()
      .includes("quantidade")
  );
  const unitField = node.fields?.find((field) =>
    String(field.name)
      .toLowerCase()
      .includes("unidade")
  );

  const id = `compra-diagrama-${Date.now().toString(36)}`;
  const flow = {
    id,
    workId: node.workId || state.selectedWorkId || "",
    itemId: node.itemId || "",
    ticketId: "",
    inventoryMovementId: "",
    originLabel: `Canvas: ${node.kind || "registro"}`,
    title: `Ordem de compra — ${node.title || "material"}`,
    material: node.title || "",
    quantity: quantityField?.value || "",
    unit: unitField?.value || "",
    neededAt: "",
    requester: "Administração",
    estimated: Number(node.estimatedValue || 0),
    supplier: "",
    quoted: 0,
    authorized: false,
    ordered: false,
    orderFile: "",
    paid: 0,
    transport: "Não iniciado",
    delivered: false,
    deliveryEvidence: "",
    status: "Solicitação",
  };

  persistDomainState(
    {
      purchaseFlows: [
        flow,
        ...(state.purchaseFlows || []),
      ],
      selectedPurchaseFlowId: id,
      route: "admin-purchases",
    },
    "Ordem de compra criada a partir do card."
  );
}

function allocateInventoryMaterial(materialId) {
  const material = (state.inventoryMaterials || []).find(
    (item) => item.id === materialId
  );
  const escapedId = CSS.escape(materialId || "");
  const quantityInput = document.querySelector(
    `[data-inventory-quantity="${escapedId}"]`
  );
  const workSelect = document.querySelector(
    `[data-inventory-work="${escapedId}"]`
  );
  const quantity = Math.max(
    0,
    Number(quantityInput?.value || 0)
  );
  const workId = workSelect?.value || "";

  if (!material) {
    updateState({
      toast: "Material de inventário não localizado.",
    });
    return;
  }

  if (!workId || quantity <= 0) {
    updateState({
      toast: "Informe quantidade e obra de destino.",
    });
    return;
  }

  const free = Math.max(
    0,
    Number(material.availableQuantity || 0)
      - Number(material.reservedQuantity || 0)
  );
  const allocated = Math.min(free, quantity);
  const shortage = Math.max(0, quantity - allocated);
  const ticketId =
    `ticket-inventory-${Date.now().toString(36)}`;

  const ticket = {
    id: ticketId,
    title: `Alocar ${material.description}`,
    description:
      `${quantity} ${material.unit} para a obra selecionada.`,
    type: "Transferência de material",
    requesterPersonId: "",
    responsiblePersonId: "",
    approverPersonId: "",
    workId,
    workItemId: "",
    inventoryMaterialId: material.id,
    priority: shortage > 0 ? "Alta" : "Média",
    status:
      shortage > 0
        ? "Pendente de compra"
        : "Pendente",
    scheduledAt: "",
    dueAt: "",
    requirements: [
      "Confirmar separação",
      "Registrar saída do depósito",
      "Confirmar recebimento na obra",
    ],
    attachments: [],
    requestedQuantity: quantity,
    allocatedQuantity: allocated,
    shortageQuantity: shortage,
  };

  const nextMaterials = (state.inventoryMaterials || []).map(
    (item) =>
      item.id === material.id
        ? {
            ...item,
            reservedQuantity:
              Number(item.reservedQuantity || 0)
              + allocated,
          }
        : item
  );

  const patch = {
    inventoryMaterials: nextMaterials,
    tickets: [
      ticket,
      ...(state.tickets || []),
    ],
    selectedTicketId: ticketId,
  };

  if (shortage > 0) {
    const purchaseId =
      `compra-inventory-${Date.now().toString(36)}`;

    patch.purchaseFlows = [
      {
        id: purchaseId,
        workId,
        itemId: "",
        ticketId,
        inventoryMovementId: ticketId,
        originLabel: "Inventário insuficiente",
        title: `Reposição — ${material.description}`,
        material: material.description,
        quantity: shortage,
        unit: material.unit,
        neededAt: "",
        requester: "Inventário",
        estimated:
          shortage
          * Number(material.averageUnitValue || 0),
        supplier: "",
        quoted: 0,
        authorized: false,
        ordered: false,
        orderFile: "",
        paid: 0,
        transport: "Não iniciado",
        delivered: false,
        deliveryEvidence: "",
        status: "Solicitação",
      },
      ...(state.purchaseFlows || []),
    ];
  }

  persistDomainState(
    patch,
    shortage > 0
      ? `Ticket criado. Faltam ${
          shortage.toLocaleString("pt-BR")
        } ${material.unit}; solicitação de compra gerada.`
      : "Ticket de alocação criado com reserva do inventário."
  );
}

function createTicketFromForm() {
  const form = document.querySelector(
    "[data-ticket-create-form]"
  );

  if (!form) {
    return;
  }

  const read = (field) =>
    form.querySelector(
      `[data-ticket-field="${field}"]`
    )?.value?.trim() || "";

  const title = read("title");

  if (!title) {
    updateState({
      toast: "Informe o título do ticket.",
    });
    form.querySelector(
      '[data-ticket-field="title"]'
    )?.focus();
    return;
  }

  const id = `ticket-${Date.now().toString(36)}`;
  const ticket = {
    id,
    title,
    description: read("description"),
    type: read("type") || "Tarefa administrativa",
    requesterPersonId: read("requesterPersonId"),
    responsiblePersonId: read("responsiblePersonId"),
    approverPersonId: "",
    workId: read("workId"),
    workItemId: "",
    inventoryMaterialId: "",
    purchaseId: "",
    priority: read("priority") || "Média",
    status: "Pendente",
    scheduledAt: "",
    dueAt: read("dueAt"),
    requirements: [],
    attachments: [],
  };

  persistDomainState(
    {
      tickets: [
        ticket,
        ...(state.tickets || []),
      ],
      selectedTicketId: id,
    },
    "Ticket criado e vinculado ao responsável."
  );
}

function updateTicketStatus(ticketId, status) {
  if (!ticketId || !status) {
    return;
  }

  const exists = (state.tickets || []).some(
    (ticket) => ticket.id === ticketId
  );

  if (!exists) {
    updateState({
      toast: "Ticket não localizado.",
    });
    return;
  }

  persistDomainState(
    {
      tickets: (state.tickets || []).map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status,
              updatedAt: new Date().toISOString(),
            }
          : ticket
      ),
      selectedTicketId: ticketId,
    },
    `Ticket marcado como ${status}.`
  );
}

/* macroobras-v50-operational-functions */
function openOperationalTicket(message) {
  const sourceKey = message.sourceKey || `action:${Date.now().toString(36)}`;
  const existing = (state.tickets || []).find((ticket) => ticket.sourceKey === sourceKey);
  if (existing) {
    updateState({ route: "admin-tickets", selectedTicketId: existing.id, toast: "" });
    return;
  }
  const id = `ticket-action-${Date.now().toString(36)}`;
  const ticket = {
    id,
    sourceKey,
    title: message.ticketTitle || "Ação operacional",
    description: message.ticketDescription || "Ação com estado vinculada ao sistema.",
    type: "Evidência / anexo",
    requesterPersonId: "",
    responsiblePersonId: "",
    approverPersonId: "",
    workId: message.workId || state.selectedWorkId || "",
    workItemId: "",
    inventoryMaterialId: "",
    purchaseId: "",
    priority: "Média",
    status: "Pendente",
    scheduledAt: "",
    dueAt: "",
    requirements: ["Conferir o registro", "Atualizar o estado", "Anexar evidência quando necessário"],
    attachments: [],
    detailId: message.detailId || "",
  };
  updateState({ tickets: [ticket, ...(state.tickets || [])], route: "admin-tickets", selectedTicketId: id, toast: "Ticket criado para representar a ação." });
}

function openIntegratedWorkVisit(workId) {
  const work = availableWorks.find((item) => item.id === workId);
  if (!work) {
    updateState({ toast: "Obra da visita não localizada." });
    return;
  }
  const stopId = `work:${work.id}`;
  const current = state.visitRoute || {};
  const alreadyPresent = (current.stops || []).some((stop) => stop.id === stopId || stop.workId === work.id);
  const visitRoute = alreadyPresent ? current : {
    stops: [...(current.stops || []), {
      id: stopId,
      kind: "work",
      workId: work.id,
      name: work.name,
      address: work.address,
      coordinates: work.coordinates,
      durationMinutes: Number(state.visitDurations?.[stopId] || 60),
    }],
    segments: current.segments || [],
    totalDistanceMeters: Number(current.totalDistanceMeters || 0),
    totalDurationMillis: Number(current.totalDurationMillis || 0),
    pendingStopId: "",
  };
  updateState({ selectedWorkId: work.id, route: "admin-works", worksVisitOpen: true, visitRoute, toast: "" });
}


document.addEventListener("macroobras:open-work-visit", (event) => {
  openIntegratedWorkVisit(event.detail?.workId);
});

document.addEventListener("macroobras:select-inventory-location", (event) => {
  updateState({ selectedInventoryCity: event.detail?.locationId || "", toast: "" });
});

/* macroobras-v51-percentages-letterhead-functions */

function saveAllSettings() {
  const values = { ...(state.customization || {}) };
  document.querySelectorAll("[data-setting-field]").forEach((field) => {
    const key = field.dataset.settingField;
    if (!key) return;
    values[key] = field.type === "checkbox" ? Boolean(field.checked) : field.value;
  });
  values.savedAt = new Date().toISOString();
  updateState({ customization: values, settingsEditing: false, toast: "Configurações salvas." });
}

function createImportedWork() {
  if (!state.importPreviewReady) {
    updateState({ toast: "Importe uma planilha antes de criar a obra." });
    return;
  }

  const id = `obra-importada-${Date.now().toString(36)}`;
  const code = `OBR-${String(availableWorks.length + 1).padStart(3, "0")}`;
  const total = Number(budgetImportPreview.total || 0);
  const items = budgetImportPreview.items.map((item, index) => ({
    id: `${id}-item-${index + 1}`,
    sourceId: item.id,
    description: item.description,
    budget: Number(item.budget || 0),
    committed: 0,
    purchased: 0,
    paid: 0,
    progress: 0,
    pricedPercentage: total > 0 ? Number(item.budget || 0) / total * 100 : 0,
  }));
  const work = {
    id,
    name: budgetImportPreview.workName,
    code,
    client: budgetImportPreview.client,
    address: state.workAddress || "Endereço não informado",
    coordinates: state.workCoordinates || null,
    progress: 0,
    budget: total,
    paid: 0,
    status: "Em planejamento",
    includedAt: new Date().toLocaleDateString("pt-BR"),
    progressHistory: [],
    nextMilestone: "Planejar o primeiro serviço",
    source: state.importFileName || budgetImportPreview.source,
    items,
  };
  const columns = items.length > 8 ? 4 : 3;
  const nodes = items.map((item, index) => ({
    id: `work-service-${id}-${item.id}`,
    itemId: item.id,
    workId: id,
    kind: "Serviço da obra",
    title: item.description,
    description: `Orçamento alocado: ${Number(item.budget || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`,
    observations: "",
    editableTitle: true,
    fields: [
      {
        name: "Data inicial",
        value: new Date(Date.now() + index * 2 * 86400000).toISOString().slice(0, 10),
      },
      {
        name: "Duração",
        value: `${Math.max(1, Math.round(Number(item.budget || 0) / 160000))} dias`,
      },
      {
        name: "Porcentagem apreçada",
        value: `${Number(item.pricedPercentage || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%`,
      },
      { name: "Anexos", value: "0" },
    ],
    budget: item.budget,
    x: 55 + (index % columns) * 330,
    y: 55 + Math.floor(index / columns) * 250,
  }));

  availableWorks.push(work);
  updateState({
    customWorks: [...(state.customWorks || []), work],
    diagramModels: {
      ...(state.diagramModels || {}),
      [`work-services-${id}`]: { nodes, edges: [] },
    },
    selectedWorkId: id,
    route: "admin-work-items",
    importPreviewReady: false,
    importFileName: "",
    toast: "Obra criada com canvas e porcentagens apreçadas.",
  });
}

function closeDiaryEntry(entryId) {
  if (!entryId) return;
  updateState({
    closedDiaryEntries: {
      ...(state.closedDiaryEntries || {}),
      [entryId]: true,
    },
    toast: "Diário fechado. Os serviços podem ser oficializados.",
  });
}

function officializeMeasurement(message) {
  const work = availableWorks.find(
    (item) => item.id === (message.workId || state.selectedWorkId)
  );
  const item = work?.items?.find((candidate) => candidate.id === message.itemId);
  if (!work || !item) {
    updateState({ toast: "Serviço da medição não localizado." });
    return;
  }
  if (!state.closedDiaryEntries?.[message.entryId]) {
    updateState({ toast: "Feche o diário antes de oficializar a medição." });
    return;
  }

  const percentage = Math.max(
    0,
    Math.min(100, Number(document.querySelector("[data-officialization-percent]")?.value || 0)),
  );
  const service = document.querySelector("[data-officialization-service]")?.value?.trim()
    || item.description;
  const administrativeNote = document.querySelector("[data-officialization-note]")?.value?.trim()
    || "";
  const entry = {
    id: `measurement-${work.id}-${item.id}-${Date.now().toString(36)}`,
    workId: work.id,
    itemId: item.id,
    diaryEntryId: message.entryId || "",
    detailId: message.detailId || "",
    percentage,
    service,
    administrativeNote,
    status: "official",
    source: "diary",
    officializedAt: new Date().toISOString(),
  };
  const next = [...(state.measurementOfficializations || []), entry];
  item.progress = itemOfficialPercentage(
    { ...state, measurementOfficializations: next },
    work.id,
    item.id,
  );
  work.progress = workOfficialPercentage(
    { ...state, measurementOfficializations: next },
    work,
  );

  updateState({
    measurementOfficializations: next,
    customWorks: (state.customWorks || []).map((candidate) =>
      candidate.id === work.id
        ? { ...work, items: work.items.map((workItem) => ({ ...workItem })) }
        : candidate
    ),
    toast: `Medição oficializada em ${percentage.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%.`,
  });
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function workCsv(work) {
  const lines = [
    ["codigo", "obra", "item", "orcamento", "porcentagem_aprecada", "medicao_oficial"],
    ...(work.items || []).map((item) => [
      work.code,
      work.name,
      item.description,
      Number(item.budget || 0),
      Number(item.pricedPercentage || 0),
      itemOfficialPercentage(state, work.id, item.id),
    ]),
  ];
  return lines.map((row) =>
    row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")
  ).join("\n");
}

function exportCurrentWork(workId) {
  const work = availableWorks.find((item) => item.id === (workId || state.selectedWorkId));
  if (!work) {
    updateState({ toast: "Obra não localizada." });
    return;
  }
  const slug = String(work.code || work.id).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const payload = {
    work,
    diagram: state.diagramModels?.[`work-services-${work.id}`] || null,
    measurements: (state.measurementOfficializations || []).filter((entry) => entry.workId === work.id),
    purchases: (state.purchaseFlows || []).filter((flow) => flow.workId === work.id),
    tickets: (state.tickets || []).filter((ticket) => ticket.workId === work.id),
  };
  downloadFile(`${slug}-dados.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  downloadFile(`${slug}-itens.csv`, workCsv(work), "text/csv;charset=utf-8");
  updateState({ toast: "Dados e planilha da obra exportados." });
}

function deleteCurrentWork(workId) {
  const work = availableWorks.find((item) => item.id === (workId || state.selectedWorkId));
  const typed = document.querySelector("[data-delete-work-code]")?.value?.trim() || "";
  if (!work) {
    updateState({ deleteWorkStage: 0, toast: "Obra não localizada." });
    return;
  }
  if (typed !== work.code) {
    updateState({ toast: "Digite exatamente o código da obra." });
    return;
  }
  if (state.deleteWorkExportBefore) exportCurrentWork(work.id);

  const index = availableWorks.findIndex((item) => item.id === work.id);
  if (index >= 0) availableWorks.splice(index, 1);

  const diagramModels = { ...(state.diagramModels || {}) };
  delete diagramModels[`work-services-${work.id}`];
  delete diagramModels[`planning-${work.id}`];

  updateState({
    customWorks: (state.customWorks || []).filter((item) => item.id !== work.id),
    deletedWorkIds: [...new Set([...(state.deletedWorkIds || []), work.id])],
    diagramModels,
    measurementOfficializations: (state.measurementOfficializations || [])
      .filter((entry) => entry.workId !== work.id),
    purchaseFlows: (state.purchaseFlows || []).filter((flow) => flow.workId !== work.id),
    tickets: (state.tickets || []).filter((ticket) => ticket.workId !== work.id),
    encarregadoAccesses: (state.encarregadoAccesses || [])
      .filter((access) => access.workId !== work.id),
    selectedWorkId: availableWorks[0]?.id || "",
    route: "admin-works",
    deleteWorkStage: 0,
    toast: "Obra excluída.",
  });
}
