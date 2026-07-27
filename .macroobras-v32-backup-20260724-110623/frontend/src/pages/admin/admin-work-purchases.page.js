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

export function adminWorkPurchases() {
  const work = activeWork();
  const flows = state.purchaseFlows.filter((flow) => flow.workId === work.id);
  const selected = selectedPurchaseFlow();
  const flow = selected?.workId === work.id ? selected : flows[0];
  if (!flow) {
    return `${workHeader(work, "Compras", "Os fluxos são iniciados nos itens de execução.", `<button class="btn" data-message="navigate" data-route="admin-work-items">Escolher item</button>`)}${card("Nenhum fluxo iniciado", `<div class="empty-state"><b>＋</b><h3>Inicie uma compra em Itens de execução</h3><p>O primeiro sticker receberá automaticamente o item e o orçamento da planilha.</p></div>`)}`;
  }
  const item = flowItem(flow);
  const quoteComplete = Number(flow.quoted) > 0;
  return `${workHeader(work, "Compras", "Stickers conectados guiam o fluxo até a comprovação da entrega.", `<button class="btn ghost" data-message="navigate" data-route="admin-work-items">Novo fluxo por item</button>`)}
    <div class="purchase-layout">
      <aside class="purchase-sidebar"><h3>Fluxos da obra</h3>${flows.map((candidate) => `<button class="purchase-row ${candidate.id === flow.id ? "active" : ""}" data-message="select-work-purchase" data-flow-id="${esc(candidate.id)}">${status(candidate.status)}<strong>${esc(candidate.title)}</strong><small>${esc(flowItem(candidate)?.description || "")}</small></button>`).join("")}</aside>
      <section>
        <div class="flow-context"><div><small>Item da planilha</small><strong>${esc(item?.description || "")}</strong></div><div><small>Orçamento alocado</small><strong>${money(item?.budget || 0)}</strong></div><div><small>Valor estimado</small><strong>${money(flow.estimated)}</strong></div><div><small>Saldo do item</small><strong>${money((item?.budget || 0) - (item?.committed || 0))}</strong></div></div>
        <div class="sticker-flow">
          ${sticker("Item de execução", "01", `<p>${esc(item?.description || "")}</p><strong>${money(item?.budget || 0)}</strong><small>Origem: planilha da obra</small>`, "complete")}
          ${sticker("Solicitação", "02", `<label>Material ou serviço<input data-flow-field="material" value="${esc(flow.material)}" placeholder="Descrever"></label><div class="sticker-split"><label>Quantidade<input data-flow-field="quantity" value="${esc(flow.quantity)}"></label><label>Unidade<input data-flow-field="unit" value="${esc(flow.unit)}"></label></div><label>Data necessária<input data-flow-field="neededAt" value="${esc(flow.neededAt)}"></label><label>Solicitante<input data-flow-field="requester" value="${esc(flow.requester)}"></label><label>Valor estimado<input data-flow-field="estimated" value="${Number(flow.estimated || 0)}" type="number" min="0" step="0.01"></label>`, flow.material ? "complete" : "active")}
          ${sticker("Cotação", "03", `<label>Fornecedor<input data-flow-field="supplier" value="${esc(flow.supplier)}" placeholder="Fornecedor"></label><label>Valor cotado<input data-flow-field="quoted" value="${Number(flow.quoted || 0)}" type="number" min="0" step="0.01"></label><button class="sticker-action" data-message="advance-purchase" data-stage="quote">Registrar cotação</button>`, quoteComplete ? "complete" : "active")}
          ${sticker("Autorização", "04", `<p>Exclusiva do administrador no desktop.</p><strong>${flow.authorized ? "Autorizada" : "Aguardando autorização"}</strong><button class="sticker-action" data-message="approve-purchase" ${flow.authorized ? "disabled" : ""}>${flow.authorized ? "Autorizado" : "Autorizar compra"}</button>`, flow.authorized ? "complete" : "locked")}
          ${sticker("Compra", "05", `<label>Pedido<input value="${flow.ordered ? `PED-${flow.id.slice(-4).toUpperCase()}` : ""}" placeholder="Pedido"></label><label>Pagamento<input data-flow-field="paid" value="${Number(flow.paid || 0)}" type="number" min="0" step="0.01"></label><button class="sticker-action" data-message="advance-purchase" data-stage="order">Registrar compra</button>`, flow.ordered ? "complete" : "locked")}
          ${sticker("Transporte", "06", `<label>Situação<input data-flow-field="transport" value="${esc(flow.transport)}"></label><button class="sticker-action" data-message="advance-purchase" data-stage="transport">Atualizar transporte</button>`, flow.transport !== "Não iniciado" ? "complete" : "locked")}
          ${sticker("Entrega", "07", flow.delivered ? `<div class="delivery-proof complete"><b>✓</b><strong>Foto recebida</strong><small>${esc(flow.deliveryEvidence)}</small></div>` : `<div class="delivery-proof empty"><b>＋</b><strong>Lacuna de entrega</strong><small>Preenchida somente pela foto enviada pelo encarregado no acesso mobile.</small></div><button class="sticker-action" data-message="navigate" data-route="admin-work-access">Abrir acessos da obra</button>`, flow.delivered ? "complete" : "waiting")}
        </div>
      </section>
    </div>`;
}
