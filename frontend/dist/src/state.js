import { availableWorks, routes, workElements } from "./data.js";

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
  }
  renderCallback();
}

export function dependencyMessage() {
  return "Selecione uma obra antes de criar serviços, rotinas, cronograma, compras, recibos ou diário.";
}
