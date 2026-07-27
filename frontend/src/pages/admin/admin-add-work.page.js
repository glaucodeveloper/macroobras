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

export function adminAddWork() {
  const preview = state.importPreviewReady ? budgetImportPreview : null;
  const address = state.workAddress || "Estádio Municipal, Buerarema, Bahia";
  return `
    ${pageHeader("Adicionar obra", "A criação recebe somente o endereço e a planilha orçamentária.", `<button class="btn ghost" data-message="navigate" data-route="admin-works">Cancelar</button><button class="btn" data-message="save-imported-work">Criar obra</button>`)}
    <div class="grid two add-work-grid">
      ${card("Entrada da obra", `
        ${formStep(1, "Endereço", `<label>Endereço da obra</label><div class="address-field"><input data-work-address value="${esc(address)}" placeholder="Rua, número, município e estado"><button class="btn ghost" data-message="locate-work-address">Localizar</button></div><small>Digite o endereço completo e clique em Localizar para posicionar a obra no mapa.</small><div class="address-preview">${map("address", { address, compact: true })}</div>`)}
        ${formStep(2, "Planilha orçamentária", `<label class="dropzone import-zone"><input type="file" accept=".xlsx,.xls,.csv,.pdf" data-message="budget-file"><span>⇧</span><strong>${esc(state.importFileName || "Selecionar orçamento sintético")}</strong><small>PDF, XLSX, XLS ou CSV.</small></label><button class="btn ghost full" data-message="simulate-budget-import">Carregar prévia do anexo</button>`)}
        <div class="format-spec"><strong>Formato presumido</strong><code>${budgetImportPreview.columns.join(" · ")}</code><p>${esc(budgetImportPreview.assumption)}</p><p>O item de execução persistido contém somente <b>descrição</b> e <b>orçamento alocado</b>.</p></div>`)}
      ${card("Prévia da importação", preview ? `<div class="import-detected"><small>Obra detectada</small><strong>${esc(preview.workName)}</strong><span>Cliente: ${esc(preview.client)}</span></div><div class="import-total"><span>Orçamento total</span><strong>${money(preview.total)}</strong></div><div class="table-scroll import-table"><table><thead><tr><th>Descrição do item</th><th>Orçamento alocado</th></tr></thead><tbody>${preview.items.map((item) => `<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state"><b>01</b><h3>Aguardando planilha</h3><p>A prévia exibirá as linhas de primeiro nível e o valor da coluna Total.</p></div>`)}
    </div>`;
}
