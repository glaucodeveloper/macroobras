import {
  availableWorks,
  purchaseFlows,
  routes,
  visitPlans,
  workElements,
} from "./data.js";

let renderCallback = () => {};

export function configureStateRenderer(callback) {
  renderCallback = callback;
}

export function isTwaSurface() {
  const params = new URLSearchParams(window.location.search);
  return params.get("surface") === "twa" || window.location.pathname.startsWith("/twa");
}

export function isAdminSurface() {
  const params = new URLSearchParams(window.location.search);
  return params.get("surface") === "admin" || window.location.pathname.startsWith("/admin");
}

export function isInstallerSurface() {
  return !isTwaSurface() && !isAdminSurface();
}

function initialRoute() {
  if (isTwaSurface()) return sessionStorage.getItem("macroobras.mobileRoute") || "mobile-home";
  if (isInstallerSurface()) return "installer";
  const savedRoute = sessionStorage.getItem("macroobras.route") || "admin-dashboard";
  return routes.some((route) => route.route === savedRoute) ? savedRoute : "admin-dashboard";
}

function initialSelectedWorkId() {
  if (isTwaSurface()) return sessionStorage.getItem("macroobras.selectedWorkId") || "";
  return sessionStorage.getItem("macroobras.selectedWorkId") || availableWorks[0]?.id || "";
}

function initialMobileAuthenticated() {
  if (!isTwaSurface()) return true;
  return sessionStorage.getItem("macroobras.mobileAuthenticated") === "true";
}

const clone = (value) => JSON.parse(JSON.stringify(value));

export const state = {
  route: initialRoute(),
  toast: "",
  collaboratorStatus: null,
  okfStatus: null,
  installerStatus: null,
  installerStep: Number(sessionStorage.getItem("macroobras.installerStep") || 0),
  selectedWorkId: initialSelectedWorkId(),
  selectedBudgetItemId: "",
  selectedPurchaseFlowId: purchaseFlows[0]?.id || "",
  selectedVisitPlanId: visitPlans[0]?.id || "",
  mobileAuthenticated: initialMobileAuthenticated(),
  mobileDayExpandedId: sessionStorage.getItem("macroobras.mobileDayExpandedId") || "",
  temporaryWorkElements: workElements,
  purchaseFlows: clone(purchaseFlows),
  visitPlans: clone(visitPlans),
  importFileName: "",
  importPreviewReady: false,
  deliveryPhotoName: "",
  visitDurations: {},
};

export function selectedWork() {
  return availableWorks.find((work) => work.id === state.selectedWorkId) || null;
}

export function selectedBudgetItem() {
  const work = selectedWork();
  return work?.items.find((item) => item.id === state.selectedBudgetItemId) || null;
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
    sessionStorage.setItem("macroobras.mobileDayExpandedId", state.mobileDayExpandedId || "");
  } else {
    sessionStorage.setItem("macroobras.route", state.route);
    sessionStorage.setItem("macroobras.selectedWorkId", state.selectedWorkId || "");
  }
  renderCallback();
}

export function dependencyMessage() {
  return "Selecione uma obra antes de acessar cronograma, compras, entregas ou diário.";
}
