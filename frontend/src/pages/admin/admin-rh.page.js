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

function diagramSeed(work) {
  const columns = work.items.length > 8 ? 4 : 3;
  const nodes = work.items.map((item, index) => ({
    id: item.id,
    kind: "Item da obra",
    title: item.description,
    description: money(item.budget),
    observations: "",
    fields: [{ name: "Data", value: `2026-${String(8 + Math.floor(index / 6)).padStart(2, "0")}-${String(3 + (index * 3) % 25).padStart(2, "0")}` }],
    x: 54 + (index % columns) * 315,
    y: 54 + Math.floor(index / columns) * 225,
  }));
  const edges = nodes.slice(0, -1).filter((_, index) => index < 4).map((node, index) => ({
    id: `seed-${index}`,
    from: node.id,
    to: nodes[index + 1].id,
    label: index % 2 ? "libera atividade" : "precede",
  }));
  return { nodes, edges };
}

export function adminRh() {
  const seed = state.rhModel || {
    nodes: [
      { id: "rh-admin", kind: "Entidade", title: "Administração", description: "Autoriza compras", observations: "", fields: [], x: 390, y: 42 },
      { id: "rh-eng", kind: "Equipe", title: "Engenharia", description: "Responsabilidade técnica", observations: "", fields: [], x: 70, y: 300 },
      { id: "rh-field", kind: "Equipe", title: "Encarregados", description: "Operação de campo", observations: "", fields: [], x: 390, y: 310 },
      { id: "rh-buy", kind: "Função", title: "Compras", description: "Cotação e pedidos", observations: "", fields: [], x: 710, y: 300 },
      ...mobileUsers.map((user, index) => ({ id: `rh-person-${index + 1}`, kind: "Pessoa", title: user.name, description: "Encarregado de obra", observations: "", fields: [{ name: "Email", value: user.email }, { name: "CPF", value: user.cpf }, { name: "Obra", value: workById(user.workId)?.name || "" }], x: 390 + index * 310, y: 585 })),
    ],
    edges: [
      { id: "rh-e1", from: "rh-admin", to: "rh-eng", label: "supervisiona" },
      { id: "rh-e2", from: "rh-admin", to: "rh-field", label: "coordena" },
      { id: "rh-e3", from: "rh-admin", to: "rh-buy", label: "autoriza" },
      ...mobileUsers.map((user, index) => ({ id: `rh-access-${index + 1}`, from: "rh-field", to: `rh-person-${index + 1}`, label: "identifica encarregado" })),
    ],
  };
  return `${pageHeader("RH", "Equipes, funções e relações operacionais em um organograma editável.", `<button class="btn" data-message="add-rh-entity">Adicionar entidade</button>`)}
    ${card("Organograma operacional", `<div class="interactive-diagram rh-diagram" data-interactive-diagram="rh-main"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(seed)}</script></div>`, "interactive-diagram-card")}
    ${card("Cadastros", `<table><thead><tr><th>Nome</th><th>Função</th><th>Obra</th><th>Acesso</th></tr></thead><tbody>${mobileUsers.map((user, index) => `<tr><td>${esc(user.name)}</td><td>${index ? "Encarregada" : "Encarregado"}</td><td>${esc(workById(user.workId)?.name || "")}</td><td>${esc(user.email)}</td></tr>`).join("")}</tbody></table>`)}`;
}
