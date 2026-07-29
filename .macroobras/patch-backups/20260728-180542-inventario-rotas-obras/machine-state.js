import {
  availableWorks,
  purchaseFlows,
  mobileUsers,
  routes,
  visitPlans,
  workElements,
} from "./data.js";
import { inventoryMaterialsSeed, ticketsSeed } from "./domain-data.js";

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
      tickets: "mobile-tickets",
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

function initialPersistedArray(key, fallback) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(key) || "null"
    );

    if (Array.isArray(saved)) {
      return saved;
    }
  } catch {
    // Mantém o conjunto inicial.
  }

  return clone(fallback);
}

function initialPurchaseFlows() {
  return initialPersistedArray(
    "macroobras.purchaseFlows",
    purchaseFlows
  );
}


function initialEncarregadoAccesses() {
  try {
    const saved = JSON.parse(localStorage.getItem("macroobras.encarregadoAccesses") || "null");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    // Mantém os acessos iniciais quando o armazenamento local estiver inválido.
  }
  return clone(mobileUsers);
}

function initialCustomization() {
  const defaults = {
    stationName: "ERP da construção Maximus Empreendimentos",
    stationSubtitle: "Gestão operacional da construção",
    primaryColor: "#0a61d8",
    theme: "system",
    density: "comfortable",
    sidebarBehavior: "hover",
    adminLoginEmail: "icaroglaucooliveira@gmail.com",
    adminLoginCpf: "123.456.789-09",

    adminName: "Administrador",
    letterheadTradeName: "Maximus Empreendimentos",
    letterheadLegalName: "Maximus Empreendimentos",
    letterheadCnpj: "",
    letterheadAddress: "",
    letterheadPhone: "",
    letterheadEmail: "icaroglaucooliveira@gmail.com",
    letterheadResponsible: "Administração",
    letterheadFooter: "Documento emitido pelo MacroObras.",
    letterheadDocumentCode: "MO",
    letterheadLogoText: "ME",
    letterheadLogoDataUrl: "",
  };

  try {
    const saved = JSON.parse(localStorage.getItem("macroobras.customization") || "null");
    if (saved && typeof saved === "object") {
      return { ...defaults, ...saved };
    }
  } catch {
    // Mantém os padrões quando a personalização salva estiver inválida.
  }

  return defaults;
}

function initialDiagramModels() {
  try {
    const saved = JSON.parse(localStorage.getItem("macroobras.diagramModels") || "null");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function initialDiaryNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem("macroobras.diaryNotes") || "null");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function initialPersistedObject(key, fallback = {}) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) return saved;
  } catch {
    // Mantém o valor inicial.
  }
  return clone(fallback);
}
function legacyMeasurementSeed() {
  return availableWorks.flatMap((work) =>
    (work.items || [])
      .filter((item) => Number(item.progress || 0) > 0)
      .map((item) => ({
        id: `legacy-measurement-${work.id}-${item.id}`,
        workId: work.id,
        itemId: item.id,
        diaryEntryId: `legacy-${work.id}`,
        detailId: `legacy-${work.id}-${item.id}`,
        percentage: Number(item.progress || 0),
        service: item.description,
        administrativeNote: "Medição inicial importada dos dados anteriores.",
        status: "official",
        source: "legacy",
        officializedAt: new Date(0).toISOString(),
      }))
  );
}

function mergePersistedWorks() {
  const deleted = new Set(initialPersistedArray("macroobras.deletedWorkIds", []));
  const customWorks = initialPersistedArray("macroobras.customWorks", []);

  for (let index = availableWorks.length - 1; index >= 0; index -= 1) {
    if (deleted.has(availableWorks[index].id)) availableWorks.splice(index, 1);
  }

  customWorks.forEach((work) => {
    const existing = availableWorks.find((item) => item.id === work.id);
    if (existing) Object.assign(existing, work);
    else availableWorks.push(work);
  });

  return { customWorks, deletedWorkIds: [...deleted] };
}

function applyMeasurementProgress(entries) {
  availableWorks.forEach((work) => {
    (work.items || []).forEach((item) => {
      const matches = entries
        .filter((entry) => entry.workId === work.id && entry.itemId === item.id)
        .sort((a, b) => String(a.officializedAt || "").localeCompare(String(b.officializedAt || "")));
      item.progress = Math.max(0, Math.min(100, Number(matches.at(-1)?.percentage || 0)));
    });

    const total = Number(work.budget || 0);
    const executed = (work.items || []).reduce(
      (sum, item) => sum + Number(item.budget || 0) * Number(item.progress || 0) / 100,
      0,
    );
    work.progress = total > 0 ? Math.round((executed / total * 100) * 100) / 100 : 0;
  });
}

const persistedWorkState = mergePersistedWorks();
const initialMeasurements = initialPersistedArray(
  "macroobras.measurementOfficializations",
  legacyMeasurementSeed(),
);
applyMeasurementProgress(initialMeasurements);

/* MACROOBRAS VISIT PRINT LOCAL STATE V1 */
function initialVisitPlans() {
  try {
    const saved = JSON.parse(localStorage.getItem("macroobras.visitPlans") || "null");
    if (Array.isArray(saved)) return saved;
  } catch {
    // Mantém os planos iniciais quando o armazenamento estiver inválido.
  }
  return clone(visitPlans);
}

function initialPrintRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem("macroobras.printRecords") || "null");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function initialSidebarCollapsed() {
  const saved = sessionStorage.getItem("macroobras.sidebarCollapsed");
  return saved == null ? true : saved === "true";
}

const persistedDiagramModels = initialDiagramModels();

export const state = {
  route: initialRoute(),
  toast: "",
  collaboratorStatus: null,
  okfStatus: null,
  installerStatus: null,
  installerStep: Number(sessionStorage.getItem("macroobras.installerStep") || 0),
  installerAdminName: sessionStorage.getItem("macroobras.installerAdminName") || "",
  installerAdminEmail: sessionStorage.getItem("macroobras.installerAdminEmail") || "",
  installerAdminCpf: sessionStorage.getItem("macroobras.installerAdminCpf") || "",
  bootstrapChecked: isTwaSurface() || explicitInstallerSurface() || authDemoMode(),
  installationRequired: explicitInstallerSurface(),
  installationCompleted: localStorage.getItem("macroobras.installationCompleted") === "true",
  machineAuthorized: authDemoMode()
    || localStorage.getItem("macroobras.machineAuthorized") === "true"
    || sessionStorage.getItem("macroobras.machineAuthorized") === "true",
  authenticated: authDemoMode() || sessionStorage.getItem("macroobras.adminAuthenticated") === "true",
  authUser: null,
  userMenuOpen: false,
  selectedWorkId: initialSelectedWorkId(),
  workFilter: sessionStorage.getItem("macroobras.workFilter") || "",
  selectedBudgetItemId: "",
  selectedDiaryEntryId: sessionStorage.getItem("macroobras.selectedDiaryEntryId") || "",
  selectedDiaryDetailId: sessionStorage.getItem("macroobras.selectedDiaryDetailId") || "",
  selectedPurchaseFlowId: purchaseFlows[0]?.id || "",
  worksVisitOpen: false,
  settingsEditing: false,
  purchaseStatusFilter: "Todas",
  selectedVisitPlanId: visitPlans[0]?.id || "",
  mobileAuthenticated: initialMobileAuthenticated(),
  activeMobileAccessId: requestedMobileAccessId(),
  encarregadoAccesses: initialEncarregadoAccesses(),
  mobileDayExpandedId: sessionStorage.getItem("macroobras.mobileDayExpandedId") || "",
  temporaryWorkElements: clone(workElements),
  purchaseFlows: initialPurchaseFlows(),
  inventoryMaterials: initialPersistedArray(
    "macroobras.inventoryMaterials",
    inventoryMaterialsSeed
  ),
  tickets: initialPersistedArray(
    "macroobras.tickets",
    ticketsSeed
  ),
  selectedInventoryCity:
    sessionStorage.getItem(
      "macroobras.selectedInventoryCity"
    ) || "",
  selectedTicketId:
    sessionStorage.getItem(
      "macroobras.selectedTicketId"
    ) || "",
  visitPlans: initialVisitPlans(),
  printRecords: initialPrintRecords(),
  importFileName: "",
  importPreviewReady: false,
  deliveryPhotoName: "",
  diaryNotes: initialDiaryNotes(),
  visitDurations: {},
  sidebarCollapsed: initialSidebarCollapsed(),
  workAddress: "",
  workCoordinates: null,
  diagramModels: persistedDiagramModels,
  selectedDiagramNode: null,
  rhModel: persistedDiagramModels["rh-main"] || null,
  customization: initialCustomization(),

  customWorks: persistedWorkState.customWorks,
  deletedWorkIds: persistedWorkState.deletedWorkIds,
  measurementOfficializations: initialMeasurements,
  closedDiaryEntries: initialPersistedObject("macroobras.closedDiaryEntries", {}),
  workSchedules: initialPersistedObject("macroobras.workSchedules", {}),
  diaryAttachmentCounts: initialPersistedObject("macroobras.diaryAttachmentCounts", {}),
  settingsEditing: false,
  deleteWorkStage: 0,
  deleteWorkExportBefore: true,
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
    sessionStorage.setItem("macroobras.installerAdminName", state.installerAdminName || "");
    sessionStorage.setItem("macroobras.installerAdminEmail", state.installerAdminEmail || "");
    sessionStorage.setItem("macroobras.installerAdminCpf", state.installerAdminCpf || "");
  } else if (isTwaSurface()) {
    sessionStorage.setItem("macroobras.mobileRoute", state.route);
    sessionStorage.setItem("macroobras.selectedWorkId", state.selectedWorkId || "");
    sessionStorage.setItem("macroobras.mobileAuthenticated", String(Boolean(state.mobileAuthenticated)));
    sessionStorage.setItem("macroobras.mobileAccessId", state.activeMobileAccessId || "");
    sessionStorage.setItem("macroobras.mobileDayExpandedId", state.mobileDayExpandedId || "");
  } else {
    sessionStorage.setItem("macroobras.route", state.route);
    sessionStorage.setItem("macroobras.selectedWorkId", state.selectedWorkId || "");
    sessionStorage.setItem("macroobras.selectedDiaryEntryId", state.selectedDiaryEntryId || "");
    sessionStorage.setItem("macroobras.selectedDiaryDetailId", state.selectedDiaryDetailId || "");
    sessionStorage.setItem("macroobras.workFilter", state.workFilter || "");
    sessionStorage.setItem(
      "macroobras.selectedInventoryCity",
      state.selectedInventoryCity || ""
    );
    sessionStorage.setItem(
      "macroobras.selectedTicketId",
      state.selectedTicketId || ""
    );
    sessionStorage.setItem("macroobras.sidebarCollapsed", String(Boolean(state.sidebarCollapsed)));
    localStorage.setItem("macroobras.machineAuthorized", String(Boolean(state.machineAuthorized)));
    sessionStorage.setItem("macroobras.machineAuthorized", String(Boolean(state.machineAuthorized)));
    sessionStorage.setItem("macroobras.adminAuthenticated", String(Boolean(state.authenticated)));
  }
  localStorage.setItem("macroobras.encarregadoAccesses", JSON.stringify(state.encarregadoAccesses || []));
  localStorage.setItem("macroobras.customization", JSON.stringify(state.customization || {}));
  localStorage.setItem("macroobras.diagramModels", JSON.stringify(state.diagramModels || {}));
  localStorage.setItem("macroobras.diaryNotes", JSON.stringify(state.diaryNotes || {}));
  localStorage.setItem("macroobras.visitPlans", JSON.stringify(state.visitPlans || []));
  localStorage.setItem("macroobras.printRecords", JSON.stringify(state.printRecords || []));

  localStorage.setItem("macroobras.customWorks", JSON.stringify(state.customWorks || []));
  localStorage.setItem("macroobras.deletedWorkIds", JSON.stringify(state.deletedWorkIds || []));
  localStorage.setItem(
    "macroobras.measurementOfficializations",
    JSON.stringify(state.measurementOfficializations || []),
  );
  localStorage.setItem("macroobras.closedDiaryEntries", JSON.stringify(state.closedDiaryEntries || {}));
  localStorage.setItem("macroobras.workSchedules", JSON.stringify(state.workSchedules || {}));
  localStorage.setItem("macroobras.diaryAttachmentCounts", JSON.stringify(state.diaryAttachmentCounts || {}));
  localStorage.setItem(
    "macroobras.inventoryMaterials",
    JSON.stringify(state.inventoryMaterials || [])
  );
  localStorage.setItem(
    "macroobras.tickets",
    JSON.stringify(state.tickets || [])
  );
  localStorage.setItem(
    "macroobras.purchaseFlows",
    JSON.stringify(state.purchaseFlows || [])
  );
  renderCallback();
  document.dispatchEvent(new CustomEvent("macroobras:state-change", { detail: { state } }));
}

export function dependencyMessage() {
  return "Selecione uma obra antes de acessar cronograma, compras, entregas ou diário.";
}
