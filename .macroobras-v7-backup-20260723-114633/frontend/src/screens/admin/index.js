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

export function adminDashboard() {
  const budget = availableWorks.reduce((sum, work) => sum + work.budget, 0);
  const paid = availableWorks.reduce((sum, work) => sum + work.paid, 0);
  const pending = state.purchaseFlows.filter((flow) => !flow.delivered);
  return `
    ${pageHeader("Painel", "Visão executiva das obras, orçamento e operação de campo.", `<button class="btn ghost" data-message="navigate" data-route="admin-visits">Planejar visitas</button><button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    <section class="metric-grid">
      ${kpi("Obras ativas", String(availableWorks.length), "localizadas no Google Maps")}
      ${kpi("Orçamento alocado", money(budget), "itens vindos das planilhas", "cyan")}
      ${kpi("Valor pago", money(paid), `${percent(paid / budget * 100)} do orçamento`, "green")}
      ${kpi("Entregas pendentes", String(pending.length), "aguardando foto do mestre", "orange")}
    </section>
    <section class="dashboard-grid">
      ${card("Mapa operacional", map("works", { compact: true }), "map-card")}
      ${card("Pendências operacionais", `<div class="priority-list">${pending.map((flow) => `<button data-message="select-purchase" data-flow-id="${esc(flow.id)}">${status(flow.status)}<strong>${esc(flow.title)}</strong><small>${esc(flowWork(flow)?.name || "")}</small><span>›</span></button>`).join("")}</div>`)}
    </section>
    ${card("Andamento das obras", `<div class="table-scroll"><table><thead><tr><th>Obra</th><th>Cliente</th><th>Status</th><th>Execução</th><th>Orçamento</th><th>Próximo marco</th></tr></thead><tbody>${availableWorks.map((work) => `<tr><td><button class="table-link" data-message="open-work" data-work-id="${esc(work.id)}"><strong>${esc(work.name)}</strong><small>${esc(work.address)}</small></button></td><td>${esc(work.client)}</td><td>${status(work.status)}</td><td>${progress(work.progress)}<small>${percent(work.progress)}</small></td><td>${money(work.budget)}</td><td>${esc(work.nextMilestone)}</td></tr>`).join("")}</tbody></table></div>`)}
  `;
}

export function adminWorks() {
  return `
    ${pageHeader("Obras", "Mapa geral seguido pelos cards de acesso às obras cadastradas.", `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    ${card("Localização das obras", map("works"), "map-card works-map-card")}
    <div class="section-heading"><div><h2>Obras cadastradas</h2><p>Abra a obra ou entre diretamente em compras.</p></div><div class="inline-filter"><input placeholder="Buscar obra, cliente ou endereço"><button class="btn ghost">Filtrar</button></div></div>
    <section class="work-card-grid">
      ${availableWorks.map((work) => `<article class="work-card"><header><div><small>${esc(work.code)}</small><h2>${esc(work.name)}</h2></div>${status(work.status)}</header><p class="address">⌖ ${esc(work.address)}</p><p class="client-line"><b>Cliente</b><span>${esc(work.client)}</span></p>${progress(work.progress)}<div class="work-stats"><span><small>Execução</small><strong>${percent(work.progress)}</strong></span><span><small>Orçamento</small><strong>${money(work.budget)}</strong></span></div><div class="card-actions"><button class="btn" data-message="open-work" data-work-id="${esc(work.id)}">Abrir obra</button><button class="btn ghost" data-message="open-work-purchases" data-work-id="${esc(work.id)}">Compras</button></div></article>`).join("")}
    </section>`;
}

export function adminAddWork() {
  const preview = state.importPreviewReady ? budgetImportPreview : null;
  const address = state.workAddress || "Estádio Municipal, Buerarema, Bahia";
  return `
    ${pageHeader("Adicionar obra", "A criação recebe somente o endereço e a planilha orçamentária.", `<button class="btn ghost" data-message="navigate" data-route="admin-works">Cancelar</button><button class="btn" data-message="save-imported-work">Criar obra</button>`)}
    <div class="grid two add-work-grid">
      ${card("Entrada da obra", `
        ${formStep(1, "Endereço", `<label>Endereço da obra</label><div class="address-field"><input data-work-address value="${esc(address)}" placeholder="Rua, número, município e estado"><button class="btn ghost" data-message="locate-work-address">Localizar</button></div><small>O Google Maps geocodifica o endereço e cria o marcador.</small><div class="address-preview">${map("address", { address, compact: true })}</div>`)}
        ${formStep(2, "Planilha orçamentária", `<label class="dropzone import-zone"><input type="file" accept=".xlsx,.xls,.csv,.pdf" data-message="budget-file"><span>⇧</span><strong>${esc(state.importFileName || "Selecionar orçamento sintético")}</strong><small>PDF, XLSX, XLS ou CSV.</small></label><button class="btn ghost full" data-message="simulate-budget-import">Carregar prévia do anexo</button>`)}
        <div class="format-spec"><strong>Formato presumido</strong><code>${budgetImportPreview.columns.join(" · ")}</code><p>${esc(budgetImportPreview.assumption)}</p><p>O item de execução persistido contém somente <b>descrição</b> e <b>orçamento alocado</b>.</p></div>`)}
      ${card("Prévia da importação", preview ? `<div class="import-detected"><small>Obra detectada</small><strong>${esc(preview.workName)}</strong><span>Cliente: ${esc(preview.client)}</span></div><div class="import-total"><span>Orçamento total</span><strong>${money(preview.total)}</strong></div><div class="table-scroll import-table"><table><thead><tr><th>Descrição do item</th><th>Orçamento alocado</th></tr></thead><tbody>${preview.items.map((item) => `<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state"><b>01</b><h3>Aguardando planilha</h3><p>A prévia exibirá as linhas de primeiro nível e o valor da coluna Total.</p></div>`)}
    </div>`;
}

export function adminWorkOverview() {
  const work = activeWork();
  return `${workHeader(work, "Visão geral", "Resumo operacional da obra selecionada.", `<button class="btn ghost" data-message="navigate" data-route="admin-work-diary">Diário de obras</button><button class="btn" data-message="navigate" data-route="admin-work-items">Ver itens</button>`)}
    <section class="overview-grid">
      ${card("Localização", map("work", { workId: work.id }), "map-card single-map")}
      ${card("Dados da planilha", `<dl class="facts"><div><dt>Cliente</dt><dd>${esc(work.client)}</dd></div><div><dt>Orçamento</dt><dd>${money(work.budget)}</dd></div><div><dt>Pago</dt><dd>${money(work.paid)}</dd></div><div><dt>Origem</dt><dd>${esc(work.source || "Planilha orçamentária")}</dd></div></dl><div class="quick-actions"><button data-message="navigate" data-route="admin-work-purchases"><b>Compras</b><span>Fluxos por stickers</span></button><button data-message="navigate" data-route="admin-work-diary"><b>Diário de obras</b><span>Registros e evidências</span></button></div>`)}
    </section>
    <section class="metric-grid compact">
      ${kpi("Itens de execução", String(work.items.length), "descrição + orçamento")}
      ${kpi("Execução", percent(work.progress), work.nextMilestone, "green")}
      ${kpi("Compras", String(state.purchaseFlows.filter((flow) => flow.workId === work.id).length), "fluxos vinculados", "orange")}
      ${kpi("Diários", "18", "registros de campo", "cyan")}
    </section>`;
}

export function adminWorkItems() {
  const work = activeWork();
  return `${workHeader(work, "Itens de execução", "Cada item veio da planilha com descrição e orçamento alocado.")}
    ${card("Itens importados", `<div class="table-scroll"><table class="items-table"><thead><tr><th>Descrição</th><th>Orçamento alocado</th><th>Comprometido</th><th>Saldo</th><th>Execução</th><th>Ação</th></tr></thead><tbody>${work.items.map((item) => `<tr><td><strong>${esc(item.description)}</strong></td><td>${money(item.budget)}</td><td>${money(item.committed)}</td><td>${money(item.budget - item.committed)}</td><td>${progress(item.progress)}<small>${percent(item.progress)}</small></td><td><button class="btn small" data-message="start-purchase" data-item-id="${esc(item.id)}">Iniciar compra</button></td></tr>`).join("")}</tbody></table></div>`)} `;
}

function diagramSeed(work) {
  const nodes = work.items.slice(0, 6).map((item, index) => ({
    id: item.id,
    kind: `Item ${index + 1}`,
    title: item.description,
    description: money(item.budget),
    date: `2026-${String(8 + Math.floor(index / 3)).padStart(2, "0")}-${String(4 + index * 3).padStart(2, "0")}`,
    x: 54 + (index % 3) * 330,
    y: 56 + Math.floor(index / 3) * 250,
  }));
  const edges = nodes.slice(0, -1).map((node, index) => ({ id: `seed-${index}`, from: node.id, to: nodes[index + 1].id, label: index % 2 ? "libera" : "precede" }));
  return { nodes, edges };
}

export function adminWorkPlanning() {
  const work = activeWork();
  const seed = diagramSeed(work);
  return `${workHeader(work, "Planejamento por nós", "Arraste quadros e crie setas puxando a porta direita até outro quadro.", `<button class="btn" data-message="save-node-plan">Salvar e gerar calendário</button>`)}
    <div class="diagram-help"><span><b>1</b> Arraste o quadro</span><span><b>2</b> Puxe a porta azul</span><span><b>3</b> Solte sobre outro quadro</span><span><b>4</b> Edite o input no meio da linha</span></div>
    ${card("Cronograma gráfico", `<div class="interactive-diagram planning-diagram" data-interactive-diagram="planning-${esc(work.id)}"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(seed)}</script></div>`, "interactive-diagram-card")}`;
}

export function adminWorkCalendar() {
  const work = activeWork();
  const days = ["Seg 03/08", "Ter 04/08", "Qua 05/08", "Qui 06/08", "Sex 07/08", "Sáb 08/08"];
  const rows = work.items.slice(0, 6);
  return `${workHeader(work, "Calendário", "Visualização gerada pelas datas preenchidas nos nós.", `<button class="btn ghost">Exportar</button><button class="btn" data-message="navigate" data-route="admin-work-planning">Editar nós</button>`)}
    <div class="calendar-origin"><b>↗</b><span>Origem</span><strong>Planejamento por nós</strong><small>Alterar uma data no quadro regenera esta grade.</small></div>
    ${card("Semana da obra", `<div class="node-calendar"><div class="calendar-head"><strong>Item</strong>${days.map((day) => `<strong>${day}</strong>`).join("")}</div>${rows.map((item, rowIndex) => `<div class="calendar-row"><aside><strong>${esc(item.description)}</strong><small>${money(item.budget)}</small></aside>${days.map((day, dayIndex) => `<div>${dayIndex === rowIndex % days.length ? `<span class="calendar-allocation tone-${rowIndex % 4}"><b>${esc(item.description)}</b><small>Data do nó</small></span>` : ""}</div>`).join("")}</div>`).join("")}</div>`)} `;
}

function sticker(title, number, body, stateClass = "") {
  return `<article class="flow-sticker ${stateClass}"><header><b>${number}</b><strong>${esc(title)}</strong></header>${body}</article>`;
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
          ${sticker("Entrega", "07", flow.delivered ? `<div class="delivery-proof complete"><b>✓</b><strong>Foto recebida</strong><small>${esc(flow.deliveryEvidence)}</small></div>` : `<div class="delivery-proof empty"><b>＋</b><strong>Lacuna de entrega</strong><small>Preenchida somente pela foto enviada pelo mestre no acesso mobile.</small></div><button class="sticker-action" data-message="navigate" data-route="admin-mobile-platform">Abrir plataforma mobile</button>`, flow.delivered ? "complete" : "waiting")}
        </div>
      </section>
    </div>`;
}

export function adminWorkDiary() {
  const work = activeWork();
  const entries = [
    ["23", "JUL", "Preparação da base para grama sintética", "5 fotos", "Encarregado da obra"],
    ["22", "JUL", "Recebimento de tubos e conexões", "3 fotos", "Encarregada Carla"],
    ["21", "JUL", "Inspeção da infraestrutura elétrica", "2 fotos", "Encarregado da obra"],
  ];
  return `${workHeader(work, "Diário de obras", "Registros de campo, ocorrências, serviços e evidências vinculados à obra.", `<button class="btn ghost" data-message="navigate" data-route="admin-mobile-platform">Abrir plataforma mobile</button><button class="btn">Novo registro administrativo</button>`)}
    <section class="diary-layout"><div>${entries.map(([day, month, title, photos, author], index) => `<article class="diary-entry"><div class="diary-date"><b>${day}</b><span>${month}</span></div><div><small>${esc(author)} · ${8 + index}:40</small><h3>${esc(title)}</h3><p>Registro atualizado com serviços realizados, equipe vinculada, ocorrências do turno e evidências.</p><div class="evidence-row"><span>▧ ${esc(photos)}</span><span>✓ sincronizado</span></div></div><button>•••</button></article>`).join("")}</div>${card("Resumo do diário", `<div class="diary-summary"><span><small>Registros</small><strong>18</strong></span><span><small>Fotos</small><strong>46</strong></span><span><small>Pendências</small><strong>3</strong></span></div><button class="btn full" data-message="navigate" data-route="admin-mobile-platform">Acesso do mestre</button>`)}</section>`;
}

export function adminWorkMeasurement() {
  const work = activeWork();
  return `${workHeader(work, "Medição", "Execução física e financeira vinculada aos itens e provas do diário.")}
    ${card("Medição administrativa", `<div class="table-scroll"><table><thead><tr><th>Item</th><th>Orçamento</th><th>Execução</th><th>Valor executado</th><th>Diários</th></tr></thead><tbody>${work.items.map((item, index) => `<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td><td><label class="percent-input"><input value="${item.progress}">%</label></td><td>${money(item.budget * item.progress / 100)}</td><td><button class="table-link">${index % 3 + 1} registros</button></td></tr>`).join("")}</tbody></table></div>`)} `;
}

export function adminVisits() {
  const selected = selectedVisitPlan();
  const route = state.visitRoute || { workIds: [], segments: [], totalDistanceMeters: 0, totalDurationMillis: 0 };
  const routeWorks = route.workIds.map(workById).filter(Boolean);
  const visitMinutes = routeWorks.reduce((sum, work) => sum + Number(state.visitDurations[work.id] || 60), 0);
  const routeDistance = `${(Number(route.totalDistanceMeters || 0) / 1000).toFixed(route.totalDistanceMeters >= 100000 ? 0 : 1)} km`;
  const travelMinutes = Math.round(Number(route.totalDurationMillis || 0) / 60000);
  const travelLabel = `${Math.floor(travelMinutes / 60)}h ${travelMinutes % 60}min`;
  const calendarRows = selected?.schedule?.length
    ? selected.schedule.map((entry, index) => {
        const work = workById(entry.workId);
        return `<article><b>${String(index + 1).padStart(2, "0")}</b><span><strong>${esc(work?.name || entry.workId)}</strong><small>${esc(work?.address || "")}</small></span><time>${esc(entry.start)} — ${esc(entry.end)}</time></article>`;
      }).join("")
    : selected?.workIds.map((id, index) => {
        const work = workById(id);
        return `<article><b>${String(index + 1).padStart(2, "0")}</b><span><strong>${esc(work.name)}</strong><small>${esc(work.address)}</small></span><time>${8 + index * 3}:00 — ${10 + index * 3}:00</time></article>`;
      }).join("") || "";

  return `${pageHeader("Visitas", "Conecte os pontos das obras pelo próprio mapa. Cada trecho é calculado pelas estradas no Google Routes.", `<button class="btn" data-message="generate-visit-plan">Gerar calendário</button>`)}
    <div class="visit-layout">
      <section>
        <div class="visit-map-wrap">
          <div class="route-map-toolbar">
            <div><strong>Desenho de rota</strong><span class="route-draw-status" data-route-draw-status>Arraste a alça de uma obra e solte sobre outra.</span></div>
            <div><button type="button" data-map-only="true" data-visit-map-command="undo">↶ Desfazer trecho</button><button type="button" data-map-only="true" data-visit-map-command="clear">Novo traçado</button></div>
          </div>
          ${map("visits")}
          <div class="visit-duration-panel"><header><strong>Obras e duração</strong><small>O número acompanha a ordem do traçado.</small></header>${availableWorks.map((work) => { const order = route.workIds.indexOf(work.id); return `<label class="${order >= 0 ? "is-routed" : ""}"><span>${order >= 0 ? order + 1 : "•"}</span><strong>${esc(work.name)}</strong><input type="number" min="15" step="15" value="${state.visitDurations[work.id] || 60}" data-visit-duration="${esc(work.id)}"><small>min</small></label>`; }).join("")}</div>
          <div class="route-live-order" data-route-live-order>${routeWorks.length ? routeWorks.map((work, index) => `<span><b>${index + 1}</b>${esc(work.name)}</span>`).join("") : "<small>Nenhuma obra conectada</small>"}</div>
        </div>
        <div class="route-metrics"><span><small>Distância</small><strong data-route-distance>${routeDistance}</strong></span><span><small>Deslocamento</small><strong data-route-travel>${travelLabel}</strong></span><span><small>Visitas</small><strong>${Math.floor(visitMinutes / 60)}h ${visitMinutes % 60}min</strong></span><span><small>Fonte</small><strong data-route-source>${route.segments.length ? "Google Routes · vias rodoviárias" : "Aguardando traçado"}</strong></span></div>
      </section>
      <aside class="saved-routes"><h3>Calendários gerados</h3>${state.visitPlans.map((plan) => `<button class="${selected?.id === plan.id ? "active" : ""}" data-message="select-visit-plan" data-plan-id="${esc(plan.id)}"><strong>${esc(plan.name)}</strong><small>${esc(plan.date)} · ${plan.workIds.length} obras</small><span>${Math.floor((plan.travelMinutes + plan.visitMinutes) / 60)}h ${(plan.travelMinutes + plan.visitMinutes) % 60}min</span></button>`).join("")}</aside>
    </div>
    ${card("Traçado atual", routeWorks.length ? `<div class="current-route-list">${routeWorks.map((work, index) => `<article><b>${index + 1}</b><span><strong>${esc(work.name)}</strong><small>${esc(work.address)}</small></span><label>Duração<input type="number" min="15" step="15" value="${state.visitDurations[work.id] || 60}" data-visit-duration="${esc(work.id)}"><small>min</small></label></article>`).join("")}</div>` : `<div class="route-empty-state"><b>↗</b><strong>Inicie o traçado no mapa</strong><span>Arraste o conector azul de uma obra até o quadro de outra obra. A linha acompanha o mouse e se ajusta às estradas.</span></div>`)}
    ${selected ? card("Calendário da rota", `<div class="route-calendar">${calendarRows}</div>`) : ""}`;
}

export function adminFinance() {
  const rows = availableWorks.flatMap((work) => work.items.map((item) => ({ work, item })));
  const total = rows.reduce((sum, row) => sum + row.item.budget, 0);
  const committed = rows.reduce((sum, row) => sum + row.item.committed, 0);
  const paid = rows.reduce((sum, row) => sum + row.item.paid, 0);
  return `${pageHeader("Financeiro", "Orçamento, comprometimento, compras e pagamentos por item de execução.", `<button class="btn">Registrar pagamento</button>`)}
    <section class="metric-grid">${kpi("Orçamento", money(total), "valor alocado")}${kpi("Comprometido", money(committed), percent(committed / total * 100), "orange")}${kpi("Pago", money(paid), percent(paid / total * 100), "green")}${kpi("Saldo livre", money(total - committed), "novos fluxos", "cyan")}</section>
    ${card("Controle por item", `<div class="table-scroll"><table><thead><tr><th>Obra</th><th>Item</th><th>Previsto</th><th>Comprometido</th><th>Pago</th><th>Saldo</th></tr></thead><tbody>${rows.map(({ work, item }) => `<tr><td><small>${esc(work.code)}</small><strong>${esc(work.name)}</strong></td><td>${esc(item.description)}</td><td>${money(item.budget)}</td><td>${money(item.committed)}</td><td>${money(item.paid)}</td><td>${money(item.budget - item.committed)}</td></tr>`).join("")}</tbody></table></div>`)}`;
}

export function adminRh() {
  const seed = {
    nodes: [
      { id: "rh-admin", kind: "Entidade", title: "Administração", description: "Autoriza compras", x: 390, y: 42 },
      { id: "rh-eng", kind: "Equipe", title: "Engenharia", description: "Responsabilidade técnica", x: 70, y: 300 },
      { id: "rh-field", kind: "Equipe", title: "Encarregados", description: "Operação de campo", x: 390, y: 310 },
      { id: "rh-buy", kind: "Função", title: "Compras", description: "Cotação e pedidos", x: 710, y: 300 },
    ],
    edges: [
      { id: "rh-e1", from: "rh-admin", to: "rh-eng", label: "supervisiona" },
      { id: "rh-e2", from: "rh-admin", to: "rh-field", label: "coordena" },
      { id: "rh-e3", from: "rh-admin", to: "rh-buy", label: "autoriza" },
    ],
  };
  return `${pageHeader("RH", "Equipes, funções e relações operacionais em um organograma editável.", `<button class="btn">Adicionar entidade</button>`)}
    ${card("Organograma operacional", `<div class="interactive-diagram rh-diagram" data-interactive-diagram="rh-main"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(seed)}</script></div>`, "interactive-diagram-card")}
    ${card("Cadastros", `<table><thead><tr><th>Nome</th><th>Função</th><th>Obra</th><th>Acesso</th></tr></thead><tbody>${mobileUsers.map((user, index) => `<tr><td>${esc(user.name)}</td><td>${index ? "Encarregada" : "Encarregado"}</td><td>${esc(workById(user.workId)?.name || "")}</td><td>${esc(user.email)}</td></tr>`).join("")}</tbody></table>`)}`;
}

export function adminSettings() {
  return `${pageHeader("Administração", "Configuração dos acessos, publicação mobile e modelos gráficos.")}
    <section class="settings-grid"><button data-message="navigate" data-route="admin-mobile-platform"><b>◎</b><strong>Plataforma mobile</strong><span>Publicação segura pelo ngrok para o mestre.</span></button><button data-message="navigate" data-route="admin-access"><b>AF</b><strong>Acessos do mestre</strong><span>Email, CPF e obra permitida.</span></button><button data-message="navigate" data-route="admin-diagram-library"><b>↗</b><strong>Modelos de diagramas</strong><span>Planejamento, compras e RH.</span></button></section>`;
}

export function adminMobilePlatform() {
  const platform = state.collaboratorStatus || {};
  const appUrl = platform.publicAppUrl || platform.localAppUrl || "http://127.0.0.1:7654/?surface=twa";
  const online = Boolean(platform.available);
  return `${pageHeader("Plataforma mobile", "Acesso do mestre de obras publicado por túnel HTTPS do ngrok.", `<button class="btn ghost" data-message="refresh-mobile-platform">Atualizar status</button><button class="btn" data-message="start-mobile-platform">Publicar pelo ngrok</button>`)}
    <section class="platform-hero ${online ? "online" : "local"}"><div><small>${online ? "ONLINE PELO NGROK" : "ACESSO LOCAL"}</small><h2>${online ? "Plataforma disponível para o mestre" : "Plataforma pronta para publicação"}</h2><p>${esc(platform.message || "O servidor local está ativo e pode ser publicado.")}</p></div><span class="platform-status"><i></i>${online ? "Online" : platform.localActive ? "Local" : "Aguardando"}</span></section>
    <div class="platform-grid">
      ${card("Endereço de acesso", `<label>Link da aplicação mobile</label><div class="copy-field"><input readonly data-platform-url value="${esc(appUrl)}"><button class="btn ghost" data-message="copy-mobile-url">Copiar</button></div><div class="platform-actions"><a class="btn" href="${esc(appUrl)}" target="_blank" rel="noreferrer">Abrir plataforma</a><button class="btn ghost" data-message="open-mobile-preview">Prévia local</button></div><small>O link público aponta para <code>?surface=twa</code>, enquanto a API permanece sob <code>/api/colaboradores</code>.</small>`)}
      ${card("Publicação ngrok", `<dl class="platform-facts"><div><dt>ngrok instalado</dt><dd>${platform.ngrokInstalled ? "Sim" : "Verificar no sistema"}</dd></div><div><dt>Túnel habilitado</dt><dd>${platform.enabled ? "Sim" : "Defina MACROOBRAS_ENABLE_NGROK=1"}</dd></div><div><dt>Processo do túnel</dt><dd>${platform.running ? "Em execução" : "Parado"}</dd></div><div><dt>HTTPS público</dt><dd>${online ? "Disponível" : "Aguardando"}</dd></div></dl><div class="command-box"><small>Inicialização</small><code>MACROOBRAS_ENABLE_NGROK=1 NGROK_AUTHTOKEN=… nimble dev</code></div>`)}
    </div>
    ${card("Funções liberadas no mobile", `<div class="mobile-capability-grid"><span><b>C</b><strong>Cronograma</strong><small>Agenda gerada pelos nós.</small></span><span><b>E</b><strong>Entregas</strong><small>Foto preenche o sticker.</small></span><span><b>D</b><strong>Diário de obras</strong><small>Ocorrências e evidências.</small></span><span><b>R</b><strong>Rotinas</strong><small>Serviços da obra ativa.</small></span></div>`)}`;
}

export function adminAccess() {
  return `${pageHeader("Acessos do mestre", "Cadastre email e CPF e vincule o acesso a uma obra.", `<button class="btn">Salvar acesso</button>`)}
    <div class="grid two">${card("Novo acesso", `${formStep(1, "Identificação", `<input placeholder="Nome"><div class="split"><input placeholder="CPF"><input placeholder="email@empresa.com"></div>`)}${formStep(2, "Obra", `<select>${availableWorks.map((work) => `<option>${esc(work.name)}</option>`).join("")}</select>`)}`)}${card("Acessos ativos", `<table><thead><tr><th>Nome</th><th>Email</th><th>Obra</th></tr></thead><tbody>${mobileUsers.map((user) => `<tr><td>${esc(user.name)}</td><td>${esc(user.email)}</td><td>${esc(workById(user.workId)?.code || "")}</td></tr>`).join("")}</tbody></table>`)}</div>`;
}

export function adminDiagramLibrary() {
  return `${pageHeader("Modelos de diagramas", "A mesma interação de quadros, setas e inputs de aresta é reutilizada no sistema.")}
    <section class="template-grid"><article><b>01</b><h3>Planejamento da obra</h3><p>Itens e datas transformados em calendário.</p></article><article><b>02</b><h3>Fluxo de compras</h3><p>Stickers encadeados por estágio.</p></article><article><b>03</b><h3>Organograma do RH</h3><p>Equipes, funções e relações.</p></article></section>`;
}
