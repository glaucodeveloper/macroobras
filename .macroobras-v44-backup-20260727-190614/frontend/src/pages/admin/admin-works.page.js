import { availableWorks } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { pageHeader } from "../../ui/components.js";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const percent = (value) =>
  `${Math.round(Number(value || 0))}%`;

function safeProgress(value) {
  return Math.max(
    0,
    Math.min(100, Number(value || 0))
  );
}

function progress(value, className = "") {
  const safe = safeProgress(value);

  return `<span class="works-progress ${esc(className)}">
    <i style="width:${safe}%"></i>
  </span>`;
}

function statusSlug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

function status(value) {
  return `<span class="works-status ${statusSlug(value)}">
    <i aria-hidden="true"></i>
    ${esc(value)}
  </span>`;
}

function map(type = "works", options = {}) {
  const attributes = [
    `data-google-map="${esc(type)}"`,
    options.workId
      ? `data-work-id="${esc(options.workId)}"`
      : "",
    options.address
      ? `data-address="${esc(options.address)}"`
      : "",
    options.compact
      ? `data-compact="true"`
      : "",
  ].filter(Boolean).join(" ");

  return `<div
    class="google-map ${options.compact ? "compact" : ""}"
    ${attributes}
  >
    <div class="map-loading">
      <span></span>
      <strong>Carregando Google Maps</strong>
      <small>Mapa, marcadores e rotas</small>
    </div>
  </div>`;
}

function filterWorks(query) {
  const normalized =
    String(query || "").trim().toLowerCase();

  if (!normalized) {
    return availableWorks;
  }

  return availableWorks.filter((work) =>
    [
      work.name,
      work.code,
      work.client,
      work.address,
      work.status,
      work.nextMilestone,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(normalized)
    )
  );
}

function portfolioSummary() {
  const totalBudget = availableWorks.reduce(
    (sum, work) => sum + Number(work.budget || 0),
    0
  );
  const totalPaid = availableWorks.reduce(
    (sum, work) => sum + Number(work.paid || 0),
    0
  );
  const averageProgress = availableWorks.length
    ? availableWorks.reduce(
        (sum, work) =>
          sum + Number(work.progress || 0),
        0
      ) / availableWorks.length
    : 0;
  const active = availableWorks.filter(
    (work) =>
      statusSlug(work.status).includes("execucao")
  ).length;

  return `<section
    class="works-portfolio-summary"
    aria-label="Resumo do portfólio"
  >
    <article>
      <span>Portfólio</span>
      <strong>${availableWorks.length}</strong>
      <small>obras cadastradas</small>
    </article>

    <article>
      <span>Em execução</span>
      <strong>${active}</strong>
      <small>frentes operacionais</small>
    </article>

    <article>
      <span>Orçamento total</span>
      <strong>${money(totalBudget)}</strong>
      <small>valor representado</small>
    </article>

    <article>
      <span>Valor pago</span>
      <strong>${money(totalPaid)}</strong>
      <small>
        ${
          totalBudget
            ? percent((totalPaid / totalBudget) * 100)
            : "0%"
        } do orçamento
      </small>
    </article>

    <article>
      <span>Avanço médio</span>
      <strong>${percent(averageProgress)}</strong>
      ${progress(averageProgress)}
    </article>
  </section>`;
}

function workPicker(work) {
  const selected =
    work.id === state.selectedWorkId;

  return `<button
    class="works-browser-item ${
      selected ? "active" : ""
    }"
    data-message="open-work-section"
    data-work-id="${esc(work.id)}"
    data-route="admin-works"
    aria-pressed="${selected}"
  >
    <span class="works-browser-item-head">
      <b>${esc(work.code)}</b>
      ${status(work.status)}
    </span>

    <strong>${esc(work.name)}</strong>

    <small>
      ${esc(work.client)} · ${esc(work.address)}
    </small>

    <span class="works-browser-item-progress">
      ${progress(work.progress)}
      <em>${percent(work.progress)}</em>
    </span>

    <span class="works-browser-item-foot">
      <span>
        <small>Orçamento</small>
        <b>${money(work.budget)}</b>
      </span>
      <span>
        <small>Próximo marco</small>
        <b>${esc(work.nextMilestone)}</b>
      </span>
    </span>
  </button>`;
}

function selectionPrompt() {
  return `<div class="works-map-empty">
    <span aria-hidden="true">⌖</span>
    <strong>Selecione uma obra</strong>
    <p>
      Use a lista ou um marcador do mapa para abrir
      o resumo operacional.
    </p>
  </div>`;
}

function mapSelection(work) {
  if (!work) {
    return selectionPrompt();
  }

  return `<article class="works-map-selection">
    <header>
      <div>
        <small>${esc(work.code)}</small>
        <strong>${esc(work.name)}</strong>
      </div>
      ${status(work.status)}
    </header>

    <div class="works-map-selection-progress">
      <span>
        <small>Avanço acumulado</small>
        <strong>${percent(work.progress)}</strong>
      </span>
      ${progress(work.progress)}
    </div>

    <dl>
      <div>
        <dt>Cliente</dt>
        <dd>${esc(work.client)}</dd>
      </div>
      <div>
        <dt>Orçamento</dt>
        <dd>${money(work.budget)}</dd>
      </div>
      <div>
        <dt>Pago</dt>
        <dd>${money(work.paid)}</dd>
      </div>
    </dl>

    <button
      class="btn"
      data-message="open-work-section"
      data-work-id="${esc(work.id)}"
      data-route="admin-work-overview"
    >
      Abrir operação da obra
    </button>
  </article>`;
}

function selectedWorkDashboard(work) {
  if (!work) {
    return "";
  }

  const balance = Math.max(
    0,
    Number(work.budget || 0)
      - Number(work.paid || 0)
  );
  const topItems =
    (work.items || []).slice(0, 6);

  return `<section class="works-selected-dashboard">
    <header class="works-selected-hero">
      <div class="works-selected-title">
        <span>${esc(work.code)}</span>
        <h2>${esc(work.name)}</h2>
        <p>${esc(work.address)}</p>
      </div>

      <div class="works-selected-actions">
        <button
          class="btn"
          data-message="open-work-section"
          data-work-id="${esc(work.id)}"
          data-route="admin-work-overview"
        >
          Visão geral
        </button>

        <button
          class="btn ghost"
          data-message="open-work-section"
          data-work-id="${esc(work.id)}"
          data-route="admin-work-diary"
        >
          Diário
        </button>

        <button
          class="btn ghost"
          data-message="open-work-section"
          data-work-id="${esc(work.id)}"
          data-route="admin-work-planning"
        >
          Cronograma
        </button>
      </div>
    </header>

    <div class="works-selected-stat-grid">
      <article>
        <span>Cliente</span>
        <strong>${esc(work.client)}</strong>
      </article>
      <article>
        <span>Orçamento</span>
        <strong>${money(work.budget)}</strong>
      </article>
      <article>
        <span>Pago</span>
        <strong>${money(work.paid)}</strong>
      </article>
      <article>
        <span>Saldo representado</span>
        <strong>${money(balance)}</strong>
      </article>
      <article class="wide">
        <span>Próximo marco operacional</span>
        <strong>${esc(work.nextMilestone)}</strong>
      </article>
    </div>

    <section class="works-items-overview">
      <header>
        <div>
          <small>Estrutura da obra</small>
          <h3>Itens de execução</h3>
        </div>
        <span>${work.items.length} itens</span>
      </header>

      <div class="works-item-grid">
        ${topItems.map((item, index) => `
          <article class="works-item-card">
            <span class="works-item-index">
              ${String(index + 1).padStart(2, "0")}
            </span>

            <div>
              <strong>${esc(item.description)}</strong>
              <small>${money(item.budget)}</small>
            </div>

            <footer>
              ${progress(item.progress)}
              <b>${percent(item.progress)}</b>
            </footer>
          </article>
        `).join("")}
      </div>
    </section>
  </section>`;
}

export function adminWorks() {
  const selected =
    state.selectedWorkId
      ? availableWorks.find(
          (work) => work.id === state.selectedWorkId
        )
      : null;
  const visibleWorks =
    filterWorks(state.workFilter);

  if (!availableWorks.length) {
    return `${pageHeader(
      "Obras",
      "Nenhuma obra cadastrada.",
      `<button
        class="btn"
        data-message="navigate"
        data-route="admin-add-work"
      >
        Adicionar obra
      </button>`
    )}
      <section class="empty-state">
        <b>＋</b>
        <h3>Cadastre a primeira obra</h3>
        <p>
          Use o cadastro de obras para iniciar
          o portfólio.
        </p>
      </section>`;
  }

  return `
    ${pageHeader(
      "Obras",
      "Visão consolidada do portfólio, localização, avanço e estrutura financeira.",
      `<button
        class="btn"
        data-message="navigate"
        data-route="admin-add-work"
      >
        Adicionar obra
      </button>`
    )}

    ${portfolioSummary()}

    <section class="works-command-center">
      <aside class="works-browser">
        <header>
          <div>
            <small>Portfólio operacional</small>
            <h2>Localizar obra</h2>
          </div>
          <span>${visibleWorks.length}</span>
        </header>

        <label class="works-search">
          <span aria-hidden="true">⌕</span>
          <input
            data-work-filter
            value="${esc(state.workFilter || "")}"
            placeholder="Nome, código, cliente ou endereço"
          >
        </label>

        <div class="works-browser-list">
          ${
            visibleWorks.length
              ? visibleWorks
                  .map((work) => workPicker(work))
                  .join("")
              : `<div class="works-browser-empty">
                  <strong>Nenhuma obra encontrada</strong>
                  <small>
                    Revise o termo usado no filtro.
                  </small>
                </div>`
          }
        </div>
      </aside>

      <div class="works-map-stage">
        <header class="works-map-head">
          <div>
            <small>Distribuição geográfica</small>
            <strong>Mapa das obras</strong>
          </div>
          <span>
            ${availableWorks.length} marcador(es)
          </span>
        </header>

        ${map("works")}

        <div class="works-map-selection-wrap">
          ${mapSelection(selected)}
        </div>
      </div>
    </section>

    ${selectedWorkDashboard(selected)}
  `;
}
