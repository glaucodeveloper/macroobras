import {
  availableWorks,
  purchaseFlows,
  mobileUsers,
  routes,
  visitPlans,
  workElements,
} from "./data.js";

let renderCallback = () => {};

export function configureStateRenderer(callback) {
  renderCallback = callback;
}

function params() {
  return new URLSearchParams(window.location.search);
}

function explicitInstallerSurface() {
  return params().get("surface") === "installer" || window.location.pathname.startsWith("/installer");
}

export function isTwaSurface() {
  return params().get("surface") === "twa" || window.location.pathname.startsWith("/twa");
}

export function isAdminSurface() {
  return !isTwaSurface() && !explicitInstallerSurface();
}

export function isInstallerSurface() {
  return explicitInstallerSurface() || (!isTwaSurface() && state.bootstrapChecked && state.installationRequired);
}

export function authDemoMode() {
  return params().get("demo") === "1" || params().get("auth") === "skip";
}

function mobileDemoMode() {
  return params().get("demo") || "";
}

function initialRoute() {
  if (isTwaSurface()) {
    const demo = mobileDemoMode();
    const demoRoute = {
      login: "mobile-home",
      select: "mobile-home",
      home: "mobile-home",
      deliveries: "mobile-deliveries",
      diary: "mobile-diary",
    }[demo];
    return demoRoute || sessionStorage.getItem("macroobras.mobileRoute") || "mobile-home";
  }
  if (explicitInstallerSurface()) return "installer";
  const savedRoute = sessionStorage.getItem("macroobras.route") || "admin-dashboard";
  return routes.some((route) => route.route === savedRoute) ? savedRoute : "admin-dashboard";
}

function requestedMobileAccessId() {
  return params().get("access") || "";
}

function requestedMobileWorkId() {
  return params().get("work") || "";
}

function initialSelectedWorkId() {
  if (isTwaSurface()) {
    const demo = mobileDemoMode();
    if (demo === "select" || demo === "login") return "";
    if (demo) return availableWorks[0]?.id || "";
    return requestedMobileWorkId() || sessionStorage.getItem("macroobras.selectedWorkId") || "";
  }
  return sessionStorage.getItem("macroobras.selectedWorkId") || availableWorks[0]?.id || "";
}

function initialMobileAuthenticated() {
  if (!isTwaSurface()) return true;
  const demo = mobileDemoMode();
  if (demo === "login") return false;
  if (demo) return true;
  const requested = requestedMobileAccessId();
  return Boolean(requested)
    && sessionStorage.getItem("macroobras.mobileAuthenticated") === "true"
    && sessionStorage.getItem("macroobras.mobileAccessId") === requested;
}

const clone = (value) => JSON.parse(JSON.stringify(value));

function initialEncarregadoAccesses() {
  try {
    const saved = JSON.parse(localStorage.getItem("macroobras.encarregadoAccesses") || "null");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    // Mantém os acessos iniciais quando o armazenamento local estiver inválido.
  }
  return clone(mobileUsers);
}

export const state = {
  route: initialRoute(),
  toast: "",
  collaboratorStatus: null,
  okfStatus: null,
  installerStatus: null,
  installerStep: Number(sessionStorage.getItem("macroobras.installerStep") || 0),
  bootstrapChecked: isTwaSurface() || explicitInstallerSurface() || authDemoMode(),
  installationRequired: explicitInstallerSurface(),
  installationCompleted: localStorage.getItem("macroobras.installationCompleted") === "true",
  machineAuthorized: authDemoMode() || sessionStorage.getItem("macroobras.machineAuthorized") === "true",
  authenticated: authDemoMode() || sessionStorage.getItem("macroobras.adminAuthenticated") === "true",
  authUser: null,
  userMenuOpen: false,
  selectedWorkId: initialSelectedWorkId(),
  selectedBudgetItemId: "",
  selectedPurchaseFlowId: purchaseFlows[0]?.id || "",
  selectedVisitPlanId: visitPlans[0]?.id || "",
  mobileAuthenticated: initialMobileAuthenticated(),
  activeMobileAccessId: requestedMobileAccessId(),
  encarregadoAccesses: initialEncarregadoAccesses(),
  mobileDayExpandedId: sessionStorage.getItem("macroobras.mobileDayExpandedId") || "",
  temporaryWorkElements: clone(workElements),
  purchaseFlows: clone(purchaseFlows),
  visitPlans: clone(visitPlans),
  importFileName: "",
  importPreviewReady: false,
  deliveryPhotoName: "",
  visitDurations: {},
  sidebarCollapsed: sessionStorage.getItem("macroobras.sidebarCollapsed") === "true",
  workAddress: "",
  workCoordinates: null,
  selectedInstallFolder: "",
  ftpStatus: null,
  lanDistributionRequested: false,
  diagramModels: {},
  rhModel: null,
  visitRoute: {
    stops: [],
    segments: [],
    totalDistanceMeters: 0,
    totalDurationMillis: 0,
    pendingStopId: "",
  },
};

export function selectedWork() {
  return availableWorks.find((work) => work.id === state.selectedWorkId) || null;
}

export function selectedBudgetItem() {
  const work = selectedWork();
  return work?.items.find((item) => item.id === state.selectedBudgetItemId) || null;
}

export function selectedMobileAccess() {
  return state.encarregadoAccesses.find((access) => access.id === state.activeMobileAccessId) || null;
}

export function selectedPurchaseFlow() {
  const selected = state.purchaseFlows.find((flow) => flow.id === state.selectedPurchaseFlowId);
  if (selected) return selected;
  return state.purchaseFlows.find((flow) => flow.workId === state.selectedWorkId) || state.purchaseFlows[0] || null;
}

export function selectedVisitPlan() {
  return state.visitPlans.find((plan) => plan.id === state.selectedVisitPlanId) || state.visitPlans[0] || null;
}

export function updateState(patch) {
  Object.assign(state, patch);
  if (isInstallerSurface()) {
    sessionStorage.setItem("macroobras.installerStep", String(state.installerStep || 0));
  } else if (isTwaSurface()) {
    sessionStorage.setItem("macroobras.mobileRoute", state.route);
    sessionStorage.setItem("macroobras.selectedWorkId", state.selectedWorkId || "");
    sessionStorage.setItem("macroobras.mobileAuthenticated", String(Boolean(state.mobileAuthenticated)));
    sessionStorage.setItem("macroobras.mobileAccessId", state.activeMobileAccessId || "");
    sessionStorage.setItem("macroobras.mobileDayExpandedId", state.mobileDayExpandedId || "");
  } else {
    sessionStorage.setItem("macroobras.route", state.route);
    sessionStorage.setItem("macroobras.selectedWorkId", state.selectedWorkId || "");
    sessionStorage.setItem("macroobras.sidebarCollapsed", String(Boolean(state.sidebarCollapsed)));
    sessionStorage.setItem("macroobras.machineAuthorized", String(Boolean(state.machineAuthorized)));
    sessionStorage.setItem("macroobras.adminAuthenticated", String(Boolean(state.authenticated)));
  }
  localStorage.setItem("macroobras.encarregadoAccesses", JSON.stringify(state.encarregadoAccesses || []));
  renderCallback();
}

export function dependencyMessage() {
  return "Selecione uma obra antes de acessar cronograma, compras, entregas ou diário.";
}
