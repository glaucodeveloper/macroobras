import { availableWorks } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percent = (value) => `${Math.round(Number(value || 0))}%`;

function progress(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="progress-track"><span style="width:${safe}%"></span></div>`;
}

function status(value) {
  const css = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  return `<span class="status-pill ${css}">${esc(value)}</span>`;
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

function filterWorks(query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return availableWorks;
  return availableWorks.filter((work) => [
    work.name,
    work.code,
    work.client,
    work.address,
    work.status,
    work.nextMilestone,
  ].some((value) => String(value || "").toLowerCase().includes(normalized)));
}

function workHeader(work) {
  return `<div class="work-overview-hero">
    <div>
      <small>${esc(work.code)}</small>
      <h2>${esc(work.name)}</h2>
      <p>${esc(work.client)} • ${esc(work.address)}</p>
    </div>
    <div class="work-overview-status">
      ${status(work.status)}
      <strong>${percent(work.progress)}</strong>
    </div>
  </div>`;
}

function workActions(work) {
  return `<nav class="work-horizontal-actions" aria-label="Ações da obra">
    <button class="btn" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-overview">Visão geral</button>
    <button class="btn ghost" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-access">Encarregados</button>
    <button class="btn ghost" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-diary">Diário</button>
  </nav>`;
}

function workPicker(work) {
  return `<button class="work-picker ${work.id === state.selectedWorkId ? "active" : ""}" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-works">
    <strong>${esc(work.name)}</strong>
    <small>${esc(work.code)} · ${esc(work.status)}</small>
  </button>`;
}

function selectedCardBody(work) {
  return `${workHeader(work)}${workActions(work)}<div class="work-focus-body"><div class="focus-stat"><small>Cliente</small><strong>${esc(work.client)}</strong></div><div class="focus-stat"><small>Orçamento</small><strong>${money(work.budget)}</strong></div><div class="focus-stat"><small>Pago</small><strong>${money(work.paid)}</strong></div><div class="focus-stat"><small>Próximo marco</small><strong>${esc(work.nextMilestone)}</strong></div></div>`;
}

function selectionPrompt() {
  return `<div class="empty-state work-selection-empty"><b>⌖</b><h3>Selecione uma obra no mapa</h3><p>Clique em um marcador ou em uma obra da lista ao lado. Clique fora para limpar a seleção.</p></div>`;
}

export function adminWorks() {
  const selected = state.selectedWorkId ? availableWorks.find((work) => work.id === state.selectedWorkId) : null;
  const featuredWork = selected || availableWorks[0];
  const visibleWorks = filterWorks(state.workFilter);

  if (!featuredWork) {
    return `${pageHeader("Obras", "Nenhuma obra cadastrada.")}<section class="empty-state"><b>＋</b><h3>Cadastre a primeira obra</h3><p>Use o cadastro de obras para começar.</p></section>`;
  }

  return `
    ${pageHeader(
      "Obras",
      `O filtro fica no conteúdo da página. Clique no mapa para selecionar uma obra e abrir o card flutuante à direita. ${visibleWorks.length} obra(s) visível(is).`,
      `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`,
    )}
    <section class="works-layout-grid">
      ${card("Mapa e filtros", `<div class="works-map-layout">
        <aside class="works-filter-column">
          <label class="works-filter-input">
            <span>Filtrar obras</span>
            <input data-work-filter value="${esc(state.workFilter || "")}" placeholder="Obra, cliente, código ou endereço">
          </label>
          <small class="works-filter-count">${visibleWorks.length} obra(s) encontrada(s)</small>
          <div class="work-picker-list">${visibleWorks.map((candidate) => workPicker(candidate)).join("")}</div>
        </aside>
        <div class="works-map-column">
          ${map("works")}
          <div class="work-selection-float ${selected ? "is-visible" : "is-empty"}">
            ${selected ? selectedCardBody(selected) : selectionPrompt()}
          </div>
        </div>
      </div>`, "works-filter-card")}
    </section>
    <section class="metric-grid compact">
      ${featuredWork.items.slice(0, 4).map((item) => `
        <article class="metric-card blue">
          <small>${esc(item.description)}</small>
          <strong>${money(item.budget)}</strong>
          <span>${item.progress ? `Execução ${percent(item.progress)}` : "Item da obra"}</span>
        </article>
      `).join("")}
    </section>
    <section class="overview-grid">
      ${card(
        "Itens de execução",
        `<div class="table-scroll"><table><thead><tr><th>Descrição</th><th>Orçamento</th><th>Execução</th></tr></thead><tbody>${featuredWork.items.map((item) => `<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td><td>${progress(item.progress)}</td></tr>`).join("")}</tbody></table></div>`,
      )}
      ${card("Mapa da obra", map("work", { workId: featuredWork.id }), "map-card single-map")}
    </section>`;
}
