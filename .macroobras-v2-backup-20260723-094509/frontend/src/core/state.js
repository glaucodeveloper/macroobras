import { availableWorks, routes, workElements } from "./data.js";

let renderCallback = () => {};
let toastTimer = null;

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
  if (isTwaSurface()) {
    return sessionStorage.getItem("macroobras.mobileRoute") || "mobile-home";
  }

  if (isInstallerSurface()) {
    return "installer";
  }

  const savedRoute = sessionStorage.getItem("macroobras.route") || "admin-add-work";
  return routes.some((route) => route.route === savedRoute) ? savedRoute : "admin-add-work";
}

function initialSelectedWorkId() {
  if (!isTwaSurface()) return availableWorks[0]?.id || "";
  return sessionStorage.getItem("macroobras.selectedWorkId") || "";
}

function initialMobileAuthenticated() {
  if (!isTwaSurface()) return true;
  return sessionStorage.getItem("macroobras.mobileAuthenticated") === "true";
}

export const state = {
  route: initialRoute(),
  toast: "",
  collaboratorStatus: null,
  okfStatus: null,
  installerStatus: null,
  installerStep: 0,
  selectedWorkId: initialSelectedWorkId(),
  mobileAuthenticated: initialMobileAuthenticated(),
  mobileDayExpandedId: sessionStorage.getItem("macroobras.mobileDayExpandedId") || "",
  temporaryWorkElements: workElements,
};

export function selectedWork() {
  return availableWorks.find((work) => work.id === state.selectedWorkId) || null;
}

export function updateState(patch) {
  const repeatsVisibleToast = typeof patch.toast === "string" && patch.toast.length > 0;
  const changed = repeatsVisibleToast || Object.entries(patch).some(([key, value]) => !sameValue(state[key], value));
  if (!changed) return;

  Object.assign(state, patch);
  scheduleToastDismiss(patch.toast);
  if (isInstallerSurface()) {
    sessionStorage.setItem("macroobras.installerStep", String(state.installerStep || 0));
  } else if (isTwaSurface()) {
    sessionStorage.setItem("macroobras.mobileRoute", state.route);
    sessionStorage.setItem("macroobras.selectedWorkId", state.selectedWorkId || "");
    sessionStorage.setItem("macroobras.mobileAuthenticated", String(Boolean(state.mobileAuthenticated)));
    sessionStorage.setItem("macroobras.mobileDayExpandedId", state.mobileDayExpandedId || "");
  } else {
    sessionStorage.setItem("macroobras.route", state.route);
  }
  renderCallback();
}

function sameValue(current, next) {
  if (Object.is(current, next)) return true;
  if (!current || !next || typeof current !== "object" || typeof next !== "object") return false;

  try {
    return JSON.stringify(current) === JSON.stringify(next);
  } catch {
    return false;
  }
}

function scheduleToastDismiss(nextToast) {
  if (nextToast === undefined) return;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = null;
  if (!nextToast) return;

  const expectedToast = nextToast;
  toastTimer = window.setTimeout(() => {
    if (state.toast !== expectedToast) return;
    state.toast = "";
    toastTimer = null;
    renderCallback();
  }, 3200);
}

export function dependencyMessage() {
  return "Selecione uma obra antes de criar serviços, rotinas, cronograma, compras, recibos ou diário.";
}
