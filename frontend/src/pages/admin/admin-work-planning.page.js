import {
  availableWorks,
  budgetImportPreview,
  mobileUsers,
} from "../../core/data.js";
import {
  selectedPurchaseFlow,
  selectedVisitPlan,
  selectedWork,
  state,
} from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, formStep, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value) => `${Math.round(Number(value || 0))}%`;
const workById = (id) => availableWorks.find((work) => work.id === id);
const activeWork = () => selectedWork() || availableWorks[0];
const flowWork = (flow) => workById(flow?.workId);
const flowItem = (flow) => flowWork(flow)?.items.find((item) => item.id === flow?.itemId);
const accessesForWork = (workId) => (state.encarregadoAccesses || []).filter((access) => access.workId === workId);

function encarregadoAccessUrl(access) {
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


function authStatusMarkup() {
  const message = String(state.toast || "").trim();
  return `<div class="auth-form-status" data-auth-status data-tone="info" ${message ? "" : "hidden"} role="status" aria-live="polite">${esc(message)}</div>`;
}

function status(value) {
  const css = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
}

function progress(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="progress-track"><span style="width:${safe}%"></span></div>`;
}

function map(type = "works", options = {}) {
  const attributes = [
    `data-google-map="${esc(type)}"`,
    options.workId ? `data-work-id="${esc(options.workId)}"` : "",
    options.address ? `data-address="${esc(options.address)}"` : "",
    options.compact ? `data-compact="true"` : "",
  ].filter(Boolean).join(" ");
  return `<div class="google-map ${options.compact ? "compact" : ""}" ${attributes}><div class="map-loading"><span></span><strong>Carregando Google Maps</strong><small>Mapa, marcadores e rotas</small></div></div>`;
}

function kpi(label, value, detail, tone = "blue") {
  return `<article class="metric-card ${tone}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(detail)}</span></article>`;
}

function workContext(work) {
  return `<div class="work-context"><div><small>Obra ativa</small><strong>${esc(work.name)}</strong><span>${esc(work.address)}</span></div><div>${status(work.status)}<strong>${percent(work.progress)}</strong></div></div>`;
}

function workHeader(work, title, subtitle, actions = "") {
  return `${pageHeader(title, subtitle, actions)}${workContext(work)}`;
}

function planningIsoDate(value, fallback = "") {
  const raw = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const br = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  );

  if (br) {
    return [
      br[3],
      String(br[2]).padStart(2, "0"),
      String(br[1]).padStart(2, "0"),
    ].join("-");
  }

  return fallback;
}

function planningStartDate(work) {
  const candidates = [
    work.startDate,
    work.startedAt,
    ...(work.items || []).map(
      (item) => item.date || item.startDate,
    ),
  ]
    .map((value) => planningIsoDate(value))
    .filter(Boolean)
    .sort();

  if (candidates.length) return candidates[0];

  const current = new Date();
  return [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
}

function planningDateOffset(startDate, date) {
  const start = new Date(`${startDate}T12:00:00`);
  const target = new Date(`${date}T12:00:00`);

  return Math.max(
    0,
    Math.round((target - start) / 86400000),
  );
}

function diagramSeed(work) {
  const id = `planning-${work.id}`;
  const stored = state.diagramModels?.[id];

  if (stored?.nodes?.length) {
    return stored;
  }

  const startDate = planningStartDate(work);
  const dayWidth = 190;
  const laneHeight = 220;

  const itemNodes = (work.items || []).map(
    (item, index) => {
      const fallbackDate = new Date(
        `${startDate}T12:00:00`,
      );

      fallbackDate.setDate(
        fallbackDate.getDate() + index * 2,
      );

      const date = planningIsoDate(
        item.date || item.startDate,
        fallbackDate.toISOString().slice(0, 10),
      );

      const quantity =
        item.quantity
        ?? item.totalQuantity
        ?? item.amount
        ?? 1;

      return {
        id: item.id,
        kind: "Item da obra",
        title: item.description,
        description: money(item.budget),
        observations: "",
        fields: [
          { name: "Data", value: date },
          { name: "Quantidade", value: String(quantity) },
          { name: "Unidade", value: item.unit || "" },
          {
            name: "Percentual",
            value: String(Number(item.progress || 0)),
          },
          {
            name: "Requerente",
            value: item.requester || "",
          },
          {
            name: "Requisitos",
            value: item.requirements || "",
          },
        ],
        x:
          70
          + planningDateOffset(startDate, date)
          * dayWidth,
        y:
          110
          + (index % 4)
          * laneHeight,
      };
    },
  );

  const visitPlans = (state.visitPlans || [])
    .filter((plan) =>
      (plan.workIds || []).includes(work.id)
      || (plan.stops || []).some(
        (stop) => stop.workId === work.id,
      ),
    );

  const visitNodes = visitPlans.map(
    (plan, index) => {
      const date = planningIsoDate(
        plan.date || plan.generatedAt,
        startDate,
      );

      return {
        id: `visit:${plan.id}`,
        sourceVisitPlanId: plan.id,
        kind: "Visita",
        title: plan.name || "Visita de obra",
        description: [
          `${Number(plan.distanceMeters || 0) / 1000} km`,
          `${Number(plan.travelMinutes || 0)} min de deslocamento`,
        ].join(" · "),
        observations: "",
        fields: [
          { name: "Data", value: date },
          { name: "Quantidade", value: "1" },
          { name: "Unidade", value: "visita" },
          { name: "Percentual", value: "0" },
          {
            name: "Requerente",
            value: plan.requester || "Administração",
          },
          {
            name: "Requisitos",
            value: plan.requirements || "Rota e disponibilidade da equipe",
          },
        ],
        x:
          70
          + planningDateOffset(startDate, date)
          * dayWidth,
        y:
          110
          + (
            (itemNodes.length + index) % 4
          )
          * laneHeight,
      };
    },
  );

  const nodes = [
    ...itemNodes,
    ...visitNodes,
  ];

  const edges = itemNodes
    .slice(0, -1)
    .filter((_, index) => index < 4)
    .map((node, index) => ({
      id: `seed-${index}`,
      from: node.id,
      to: itemNodes[index + 1].id,
      label:
        index % 2
          ? "libera atividade"
          : "precede",
    }));

  return {
    nodes,
    edges,
    calendar: {
      startDate,
      dayWidth,
      laneHeight,
    },
  };
}

export function adminWorkPlanning() {
  const work = activeWork();
  const seed = diagramSeed(work);
  return `${workHeader(work, "Cronograma", "Todos os itens da planilha ficam disponíveis para relações de atividade, datas e requerimentos de materiais.", `<button class="btn" data-message="save-node-plan">Salvar cronograma</button>`)}
    <div class="diagram-help"><span><b>1</b> Arraste o fundo para mover a área</span><span><b>2</b> Arraste os quadros</span><span><b>3</b> Puxe a porta azul até outro quadro</span><span><b>4</b> Solte a linha na área vazia para criar um material</span><span><b>5</b> Edite a relação no meio da seta</span><span><b>D</b> Segure D e arraste para dividir e duplicar</span><span><b>Data</b> Solte sobre o dia para encaixar no calendário</span></div>
    ${card("Cronograma gráfico", `<div class="interactive-diagram planning-diagram" data-interactive-diagram="planning-${esc(work.id)}" data-allow-material-drop="true" data-calendar-grid="true" data-calendar-start="${esc(seed.calendar?.startDate || "")}" data-calendar-day-width="${Number(seed.calendar?.dayWidth || 190)}" data-calendar-lane-height="${Number(seed.calendar?.laneHeight || 220)}" data-duplicate-with-d="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(seed)}</script></div>`, "interactive-diagram-card")}`;
}
