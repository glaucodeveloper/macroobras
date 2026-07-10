import { initialCollaboratorStatus, initialOkfStatus } from "./data.js";
import { callRpc } from "./api.js";
import { renderRoute, normalizedMobileRoute } from "./router.js";
import { shell, twaShell } from "./shell.js";
import { installerScreen } from "./screens/installer.js";
import { configureStateRenderer, dependencyMessage, isInstallerSurface, isTwaSurface, selectedWork, state, updateState } from "./state.js";

export function initApp() {
  const root = document.querySelector("#app");
  if (!root) return;

  configureStateRenderer(render);
  root.addEventListener("click", handleClick);
  root.addEventListener("pointerdown", handlePointerDown);
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
    updateState({
      selectedWorkId: message.workId,
      route: "mobile-home",
      toast: "Obra selecionada. Fluxos do mestre liberados para esta obra.",
    });
    return;
  }

  if (message.type === "mobile-login") {
    updateState({
      mobileAuthenticated: true,
      toast: "Login autorizado. Selecione a obra vinculada a este colaborador.",
    });
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

  if (message.type === "toggle-day-entry") {
    if (!canRunMessage(message)) return;
    const entryId = message.entryId || "";
    updateState({
      mobileDayExpandedId: state.mobileDayExpandedId === entryId ? "" : entryId,
      toast: state.mobileDayExpandedId === entryId ? "" : "Rotinas do período expandidas para edição.",
    });
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

  if (message.type === "add-work-element") {
    addTemporaryWorkElement();
  }
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

  const entity = message.entity || "interface";
  const value = message.value || "Ação registrada";
  updateState({ toast: `${value} (${entity}: salvo)` });
}

async function pollCollaboratorStatus() {
  try {
    const response = await callRpc("obterRotaPublicaColaborador");
    const data = response?.data || {};
    updateState({ collaboratorStatus: {
      available: Boolean(data.disponivel),
      localActive: Boolean(data.localAtivo),
      localBaseUrl: data.localBaseUrl || "",
      baseUrl: data.baseUrl || "",
      message: data.mensagem || "",
    } });
  } catch (error) {
    updateState({ collaboratorStatus: {
      ...initialCollaboratorStatus,
      message: "Aguardando backend da estação",
    } });
  }
}

async function pollOkfStatus() {
  if (isTwaSurface()) return;

  try {
    const response = await callRpc("obterStatusOkf");
    updateState({ okfStatus: response?.data || initialOkfStatus });
  } catch (error) {
    updateState({ okfStatus: {
      ...initialOkfStatus,
      mensagem: "Backend ainda não expôs o status OKF",
    } });
  }
}

async function pollInstallerStatus() {
  if (!isInstallerSurface()) return;

  try {
    const response = await callRpc("obterStatusInstalador");
    updateState({ installerStatus: response?.data || state.installerStatus });
  } catch (error) {
    updateState({ installerStatus: {
      ...(state.installerStatus || {}),
      message: "Backend ainda não expôs o instalador Nim",
    } });
  }
}

async function prepareOkfFromWizard() {
  updateState({ toast: "Preparando OKF..." });
  try {
    const response = await callRpc("prepararOkf");
    const data = response?.data || {};
    updateState({
      okfStatus: data.status || state.okfStatus,
      toast: data.mensagem || "OKF processado",
    });
  } catch (error) {
    updateState({ toast: "Falha ao preparar OKF pelo backend Nim" });
  }
}

async function runInstaller() {
  updateState({ toast: "Executando instalação..." });
  try {
    const response = await callRpc("executarInstalador");
    const data = response?.data || {};
    updateState({
      installerStatus: data.status || state.installerStatus,
      toast: data.mensagem || "Instalação processada",
    });
  } catch (error) {
    updateState({ toast: "Falha ao executar instalador Nim" });
  }
}

function addTemporaryWorkElement() {
  const root = document.querySelector("#app");
  const valueOf = (name) => root?.querySelector(`[data-element-field="${name}"]`)?.value?.trim() || "";
  const listOf = (name) => valueOf(name).split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  const name = valueOf("name") || "Elemento de obra";
  updateState({
    temporaryWorkElements: [
      ...(state.temporaryWorkElements || []),
      {
        name,
        description: valueOf("description") || "Elemento adicionado pela administração.",
        materials: valueOf("materials") || "materiais a definir",
        dependencies: listOf("dependencies"),
        unlocks: listOf("unlocks"),
      },
    ],
    toast: `Elemento de obra adicionado: ${name}`,
  });
}

function handlePointerDown(event) {
  const scroller = event.target.closest("[data-drag-scroll]");
  if (!scroller) return;

  const startX = event.clientX;
  const startScrollLeft = scroller.scrollLeft;
  scroller.setPointerCapture?.(event.pointerId);
  scroller.classList.add("dragging");

  function move(moveEvent) {
    scroller.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
  }

  function up() {
    scroller.classList.remove("dragging");
    scroller.removeEventListener("pointermove", move);
    scroller.removeEventListener("pointerup", up);
    scroller.removeEventListener("pointercancel", up);
  }

  scroller.addEventListener("pointermove", move);
  scroller.addEventListener("pointerup", up);
  scroller.addEventListener("pointercancel", up);
}
