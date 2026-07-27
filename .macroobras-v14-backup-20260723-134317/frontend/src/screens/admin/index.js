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
  const totalBudget = availableWorks.reduce((sum, work) => sum + work.budget, 0);
  const measuredValue = availableWorks.reduce((sum, work) => sum + (work.budget * work.progress / 100), 0);
  const consolidatedProgress = totalBudget ? Math.round(measuredValue / totalBudget * 100) : 0;
  const plans = state.visitPlans || [];
  const diaries = availableWorks.map((work, index) => ({
    work,
    day: String(22 - index).padStart(2, "0"),
    month: "JUL",
    title: index === 0 ? "Preparação da base para grama sintética" : index === 1 ? "Movimentação de terra e regularização" : "Instalação e conferência dos refletores",
    detail: index === 2 ? "Registro com evidência fotográfica" : "Registro diário atualizado pela equipe de campo",
  }));

  return `
    ${pageHeader("Painel", "Resumo de medições, visitas, obras e diários de campo.", `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    <section class="dashboard-module-grid">
      <article class="dashboard-module-card measurement-module" data-message="open-work-section" data-work-id="${esc(availableWorks[0]?.id || "")}" data-route="admin-work-measurement" tabindex="0">
        <header><div><small>Medições</small><h2>Balanço das medições</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${percent(consolidatedProgress)}</strong><span>${money(measuredValue)} medidos de ${money(totalBudget)}</span></div>
        <div class="dashboard-module-list">
          ${availableWorks.map((work) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-measurement"><span><strong>${esc(work.name)}</strong><small>${money(work.budget * work.progress / 100)} medidos</small></span><b>${percent(work.progress)}</b></button>`).join("")}
        </div>
      </article>

      <article class="dashboard-module-card visits-module" data-message="navigate" data-route="admin-visits" tabindex="0">
        <header><div><small>Agenda</small><h2>Visitas programadas</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${plans.length}</strong><span>${plans.length === 1 ? "roteiro salvo" : "roteiros salvos"}</span></div>
        <div class="dashboard-module-list">
          ${plans.length ? plans.map((plan) => `<button data-message="navigate" data-route="admin-visits"><span><strong>${esc(plan.name)}</strong><small>${esc(plan.date)} · ${Math.round((plan.travelMinutes + plan.visitMinutes) / 60)} h previstas</small></span><b>Agenda</b></button>`).join("") : `<div class="dashboard-empty"><strong>Nenhuma visita agendada</strong><small>Abra Visitas para criar o primeiro roteiro.</small></div>`}
        </div>
      </article>

      <article class="dashboard-module-card works-module" data-message="navigate" data-route="admin-works" tabindex="0">
        <header><div><small>Obras</small><h2>Obras cadastradas</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${availableWorks.length}</strong><span>obras com medição ativa</span></div>
        <div class="dashboard-module-list">
          ${availableWorks.map((work) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-overview"><span><strong>${esc(work.name)}</strong><small>${esc(work.address)}</small></span><b>${percent(work.progress)}</b></button>`).join("")}
        </div>
      </article>

      <article class="dashboard-module-card diary-module" data-message="open-work-section" data-work-id="${esc(availableWorks[0]?.id || "")}" data-route="admin-work-diary" tabindex="0">
        <header><div><small>Campo</small><h2>Diários de obras</h2></div><span>›</span></header>
        <div class="dashboard-module-hero"><strong>${diaries.length}</strong><span>obras com registros recentes</span></div>
        <div class="dashboard-module-list diary-dashboard-list">
          ${diaries.map(({ work, day, month, title, detail }) => `<button data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-diary"><i><b>${esc(day)}</b><small>${esc(month)}</small></i><span><strong>${esc(title)}</strong><small>${esc(work.name)} · ${esc(detail)}</small></span><em>›</em></button>`).join("")}
        </div>
      </article>
    </section>
  `;
}

export function adminWorks() {
  return `
    ${pageHeader("Obras", "Mapa geral seguido por uma sessão horizontal para cada obra cadastrada.", `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    ${card("Localização das obras", map("works"), "map-card works-map-card")}
    <div class="section-heading"><div><h2>Obras cadastradas</h2><p>Cada obra ocupa uma faixa completa com acessos diretos às suas subseções.</p></div><div class="inline-filter"><input placeholder="Buscar obra, cliente ou endereço"><button class="btn ghost">Filtrar</button></div></div>
    <section class="work-horizontal-list">
      ${availableWorks.map((work) => `<article class="work-horizontal-section">
        <div class="work-horizontal-main"><header><div><small>${esc(work.code)}</small><h2>${esc(work.name)}</h2></div>${status(work.status)}</header><p class="address">⌖ ${esc(work.address)}</p><p class="client-line"><b>Cliente</b><span>${esc(work.client)}</span></p></div>
        <div class="work-horizontal-progress"><div><small>Execução</small><strong>${percent(work.progress)}</strong></div>${progress(work.progress)}<div class="work-horizontal-values"><span><small>Orçamento</small><b>${money(work.budget)}</b></span><span><small>Próximo marco</small><b>${esc(work.nextMilestone)}</b></span></div></div>
        <nav class="work-horizontal-actions" aria-label="Acessos da obra"><button class="btn" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-overview">Visão geral</button><button class="btn ghost" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-diary">Diário</button><button class="btn ghost" data-message="open-work-section" data-work-id="${esc(work.id)}" data-route="admin-work-purchases">Compras</button></nav>
      </article>`).join("")}
    </section>`;
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

export function adminWorkPlanning() {
  const work = activeWork();
  const seed = diagramSeed(work);
  return `${workHeader(work, "Cronograma", "Todos os itens da planilha ficam disponíveis para relações de atividade, datas e requerimentos de materiais.", `<button class="btn" data-message="save-node-plan">Salvar cronograma</button>`)}
    <div class="diagram-help"><span><b>1</b> Arraste o fundo para mover a área</span><span><b>2</b> Arraste os quadros</span><span><b>3</b> Puxe a porta azul até outro quadro</span><span><b>4</b> Solte a linha na área vazia para criar um material</span><span><b>5</b> Edite a relação no meio da seta</span></div>
    ${card("Cronograma gráfico", `<div class="interactive-diagram planning-diagram" data-interactive-diagram="planning-${esc(work.id)}" data-allow-material-drop="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(seed)}</script></div>`, "interactive-diagram-card")}`;
}

export function adminWorkCalendar() {
  const work = activeWork();
  const days = ["Seg 03/08", "Ter 04/08", "Qua 05/08", "Qui 06/08", "Sex 07/08", "Sáb 08/08"];
  const rows = work.items.slice(0, 6);
  return `${workHeader(work, "Calendário", "Visualização gerada pelas datas preenchidas no Cronograma.", `<button class="btn ghost">Exportar</button><button class="btn" data-message="navigate" data-route="admin-work-planning">Editar cronograma</button>`)}
    <div class="calendar-origin"><b>↗</b><span>Origem</span><strong>Cronograma</strong><small>Arraste o fundo da grade para navegar horizontal e verticalmente.</small></div>
    ${card("Semana da obra", `<div class="node-calendar pan-surface" data-pan-surface><div class="calendar-head"><strong>Item</strong>${days.map((day) => `<strong>${day}</strong>`).join("")}</div>${rows.map((item, rowIndex) => `<div class="calendar-row"><aside><strong>${esc(item.description)}</strong><small>${money(item.budget)}</small></aside>${days.map((day, dayIndex) => `<div>${dayIndex === rowIndex % days.length ? `<span class="calendar-allocation tone-${rowIndex % 4}"><b>${esc(item.description)}</b><small>Data do quadro</small></span>` : ""}</div>`).join("")}</div>`).join("")}</div>`)} `;
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
          ${sticker("Entrega", "07", flow.delivered ? `<div class="delivery-proof complete"><b>✓</b><strong>Foto recebida</strong><small>${esc(flow.deliveryEvidence)}</small></div>` : `<div class="delivery-proof empty"><b>＋</b><strong>Lacuna de entrega</strong><small>Preenchida somente pela foto enviada pelo encarregado no acesso mobile.</small></div><button class="sticker-action" data-message="navigate" data-route="admin-mobile-platform">Abrir plataforma mobile</button>`, flow.delivered ? "complete" : "waiting")}
        </div>
      </section>
    </div>`;
}

export function adminWorkDiary() {
  const work = activeWork();
  const seed = diagramSeed(work);
  const diarySeed = {
    nodes: seed.nodes.map((node, index) => ({
      ...node,
      kind: `Registro ${String(index + 1).padStart(2, "0")}`,
      description: `${node.fields?.find((field) => field.name === "Data")?.value || "Sem data"} · item do cronograma`,
      observations: "Registro vinculado ao Cronograma.",
    })),
    edges: seed.edges.map((edge) => ({ ...edge, label: "sequência registrada" })),
  };
  return `${workHeader(work, "Diário de obras", "Área gráfica dos itens do Cronograma e da sequência registrada em campo.")}
    ${card("Fluxo registrado da obra", `<div class="interactive-diagram diary-diagram" data-interactive-diagram="diary-${esc(work.id)}" data-fixed-edges="true" data-hide-node-dates="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(diarySeed)}</script></div>`, "interactive-diagram-card diary-graphic-only")}`;
}

export function adminWorkMeasurement() {
  const work = activeWork();
  return `${workHeader(work, "Medição", "Execução física e financeira vinculada aos itens e provas do diário.")}
    ${card("Medição administrativa", `<div class="table-scroll"><table><thead><tr><th>Item</th><th>Orçamento</th><th>Execução</th><th>Valor executado</th><th>Diários</th></tr></thead><tbody>${work.items.map((item, index) => `<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td><td><label class="percent-input"><input value="${item.progress}">%</label></td><td>${money(item.budget * item.progress / 100)}</td><td><button class="table-link">${index % 3 + 1} registros</button></td></tr>`).join("")}</tbody></table></div>`)} `;
}

export function adminVisits() {
  const selected = selectedVisitPlan();
  const route = state.visitRoute || { stops: [], segments: [], totalDistanceMeters: 0, totalDurationMillis: 0 };
  const stops = Array.isArray(route.stops) ? route.stops : [];
  const visitMinutes = stops.reduce((sum, stop) => sum + Number(stop.durationMinutes || state.visitDurations[stop.id] || 60), 0);
  const routeDistance = `${(Number(route.totalDistanceMeters || 0) / 1000).toFixed(route.totalDistanceMeters >= 100000 ? 0 : 1)} km`;
  const travelMinutes = Math.round(Number(route.totalDurationMillis || 0) / 60000);
  const travelLabel = `${Math.floor(travelMinutes / 60)}h ${travelMinutes % 60}min`;
  const selectedStops = selected?.stops || selected?.workIds?.map((id) => {
    const work = workById(id);
    return work ? { id: `work:${work.id}`, workId: work.id, name: work.name, address: work.address } : null;
  }).filter(Boolean) || [];
  const calendarRows = selected?.schedule?.length
    ? selected.schedule.map((entry, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><span><strong>${esc(entry.name || workById(entry.workId)?.name || "Parada")}</strong><small>${esc(entry.address || workById(entry.workId)?.address || "")}</small></span><time>${esc(entry.start)} — ${esc(entry.end)}</time></article>`).join("")
    : selectedStops.map((stop, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><span><strong>${esc(stop.name)}</strong><small>${esc(stop.address || "")}</small></span><time>${8 + index * 2}:00 — ${9 + index * 2}:00</time></article>`).join("");

  return `${pageHeader("Visitas", "Segure um ponto de obra, mova o mouse e solte em qualquer cidade ou ponto da estrada para criar uma parada.", `<button class="btn" data-message="generate-visit-plan">Gerar calendário</button>`)}
    <div class="visit-layout">
      <section>
        <div class="visit-map-wrap">
          <div class="route-map-toolbar">
            <div><strong>Traçado por estradas</strong><span class="route-draw-status" data-route-draw-status>Segure um ponto e mova o mouse.</span></div>
            <div><button type="button" data-map-only="true" data-visit-map-command="undo">↶ Desfazer</button><button type="button" data-map-only="true" data-visit-map-command="clear">Novo traçado</button></div>
          </div>
          ${map("visits")}
          <div class="route-live-order" data-route-live-order>${stops.length ? stops.map((stop, index) => `<span><b>${index + 1}</b>${esc(stop.name)}</span>`).join("") : "<small>Nenhuma parada conectada</small>"}</div>
        </div>
        <div class="route-metrics"><span><small>Distância</small><strong data-route-distance>${routeDistance}</strong></span><span><small>Deslocamento</small><strong data-route-travel>${travelLabel}</strong></span><span><small>Paradas</small><strong data-route-visits>${visitMinutes} min</strong></span><span><small>Fonte</small><strong data-route-source>${route.segments.length ? "Google Routes · vias rodoviárias" : "Aguardando traçado"}</strong></span></div>
      </section>
      <aside class="saved-routes"><h3>Calendários gerados</h3>${state.visitPlans.map((plan) => { const count = plan.stops?.length || plan.workIds?.length || 0; return `<button class="${selected?.id === plan.id ? "active" : ""}" data-message="select-visit-plan" data-plan-id="${esc(plan.id)}"><strong>${esc(plan.name)}</strong><small>${esc(plan.date)} · ${count} paradas</small><span>${Math.floor((plan.travelMinutes + plan.visitMinutes) / 60)}h ${(plan.travelMinutes + plan.visitMinutes) % 60}min</span></button>`; }).join("")}</aside>
    </div>
    ${card("Paradas do traçado", stops.length ? `<div class="current-route-list">${stops.map((stop, index) => `<article><b>${index + 1}</b><span><strong>${esc(stop.name)}</strong><small>${esc(stop.address || "")}</small></span><label>Parada<input type="number" min="0" step="15" value="${Number(stop.durationMinutes || 60)}" data-visit-duration="${esc(stop.id)}"><small>min</small></label><button class="route-stop-remove" data-message="remove-visit-stop" data-stop-id="${esc(stop.id)}" aria-label="Remover parada">Remover</button></article>`).join("")}</div>` : `<div class="route-empty-state"><b>●</b><strong>Inicie em um ponto de obra</strong><span>Segure o ponto, mova o mouse e acompanhe o caminho pelas estradas. Ao soltar, informe o tempo da nova parada.</span></div>`)}
    ${selected ? card("Calendário da rota", `<div class="route-calendar pan-surface" data-pan-surface>${calendarRows}</div>`) : ""}`;
}

export function adminFinance() {
  const total = availableWorks.reduce((sum, work) => sum + Number(work.budget || 0), 0);
  const executed = availableWorks.reduce((sum, work) => sum + Number(work.budget || 0) * Number(work.progress || 0) / 100, 0);
  return `${pageHeader("Financeiro", "Quantitativo de valor das obras e evolução registrada por data.")}
    <section class="metric-grid compact">${kpi("Valor total das obras", money(total), `${availableWorks.length} obras`)}${kpi("Valor proporcional executado", money(executed), percent(executed / total * 100), "green")}</section>
    <section class="finance-work-grid">${availableWorks.map((work) => `<article class="finance-work-card"><header><div><small>${esc(work.code)}</small><h2>${esc(work.name)}</h2><span>Incluída em ${esc(work.includedAt || "—")}</span></div><strong>${money(work.budget)}</strong></header><div class="finance-progress-summary"><span><small>Progresso atual</small><b>${percent(work.progress)}</b></span><span><small>Valor proporcional</small><b>${money(work.budget * work.progress / 100)}</b></span></div><div class="vertical-progress-timeline">${(work.progressHistory || []).map((entry, index) => `<div class="finance-timeline-entry"><i></i><time>${esc(entry.date)}</time><span><strong>${percent(entry.progress)}</strong><small>${money(work.budget * entry.progress / 100)}</small></span></div>`).join("")}</div></article>`).join("")}</section>`;
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

export function adminSettings() {
  return `${pageHeader("Administração", "Acessos, distribuição da estação, dados e referências de uso.")}
    <section class="settings-grid">
      <button data-message="navigate" data-route="admin-mobile-platform"><b>◎</b><strong>Plataforma mobile</strong><span>Endereço do encarregado por ngrok ou rede local.</span></button>
      <button data-message="navigate" data-route="admin-access"><b>AF</b><strong>Acessos do encarregado</strong><span>Identificação do RH, email, CPF e obra permitida.</span></button>
      <button data-message="navigate" data-route="admin-diagram-library"><b>↗</b><strong>Modelos de diagramas</strong><span>Reconhecimento visual dos fluxos do sistema.</span></button>
      <button data-message="navigate" data-route="admin-help"><b>?</b><strong>Manual</strong><span>Sequência de prints de uso desde o login.</span></button>
      <button data-message="navigate" data-route="admin-data-transfer"><b>CSV</b><strong>Importar e exportar dados</strong><span>Transferência em arquivos CSV.</span></button>
      <button data-message="navigate" data-route="admin-access-config"><b>⌁</b><strong>Configuração de acesso</strong><span>GitHub e Firebase Authentication.</span></button>
    </section>`;
}

export function adminMobilePlatform() {
  const platform = state.collaboratorStatus || {};
  const address = platform.publicAppUrl || platform.lanAppUrl || platform.localAppUrl || "Aguardando endereço";
  const online = String(address).startsWith("http");
  return `${pageHeader("Plataforma mobile", "O ngrok permanece ativo automaticamente enquanto a estação estiver aberta.")}
    <section class="mobile-address-only ${online ? "online" : "waiting"}">
      <small>Endereço de acesso do encarregado</small>
      ${online ? `<a href="${esc(address)}" target="_blank" rel="noreferrer">${esc(address)}</a>` : `<strong>${esc(address)}</strong>`}
      <button class="btn ghost" data-message="enable-lan-collaborator">Disponibilizar também na rede local</button>
    </section>`;
}

export function adminAccess() {
  const graphPeople = (state.rhModel?.nodes || []).filter((node) => String(node.kind || "").toLowerCase() === "pessoa");
  const people = graphPeople.length ? graphPeople.map((node) => ({
    id: node.id,
    name: node.title,
    email: node.fields?.find((field) => String(field.name).toLowerCase() === "email")?.value || "",
    cpf: node.fields?.find((field) => String(field.name).toLowerCase() === "cpf")?.value || "",
  })) : mobileUsers.map((user, index) => ({ id: `rh-person-${index + 1}`, name: user.name, email: user.email, cpf: user.cpf }));
  return `${pageHeader("Acessos do encarregado", "Selecione uma pessoa identificada no organograma de RH e vincule-a a uma obra.", `<button class="btn" data-message="save-encarregado-access">Salvar acesso</button>`)}
    <div class="grid two">${card("Novo acesso", `${formStep(1, "Identificação do RH", `<label>Pessoa do organograma</label><select data-encarregado-person>${people.map((person) => `<option value="${esc(person.id)}" data-email="${esc(person.email)}" data-cpf="${esc(person.cpf)}">${esc(person.name)}</option>`).join("")}</select><small>Novas pessoas são criadas no organograma de RH pelo botão Adicionar entidade.</small>`)}${formStep(2, "Obra", `<select data-encarregado-work>${availableWorks.map((work) => `<option value="${esc(work.id)}">${esc(work.name)}</option>`).join("")}</select>`)}`)}${card("Acessos ativos", `<table><thead><tr><th>Nome</th><th>Email</th><th>Obra</th></tr></thead><tbody>${mobileUsers.map((user) => `<tr><td>${esc(user.name)}</td><td>${esc(user.email)}</td><td>${esc(workById(user.workId)?.code || "")}</td></tr>`).join("")}</tbody></table>`)}</div>`;
}

export function adminDiagramLibrary() {
  const allWorkElements = {
    nodes: availableWorks.flatMap((work, workIndex) => {
      const baseX = 70 + workIndex * 620;
      const workNode = { id: `library-work-${work.id}`, kind: "Obra", title: work.name, description: work.address, observations: "", fields: [{ name: "Código", value: work.code }], x: baseX, y: 55 };
      const itemNodes = work.items.map((item, itemIndex) => ({
        id: `library-item-${work.id}-${item.id}`,
        kind: "Item de execução",
        title: item.description,
        description: `Orçamento alocado: ${money(item.budget)}`,
        observations: "",
        fields: [{ name: "Obra", value: work.name }, { name: "Orçamento", value: money(item.budget) }],
        x: baseX + (itemIndex % 2) * 290,
        y: 255 + Math.floor(itemIndex / 2) * 245,
      }));
      return [workNode, ...itemNodes];
    }),
    edges: availableWorks.flatMap((work) => work.items.map((item) => ({
      id: `library-edge-${work.id}-${item.id}`,
      from: `library-work-${work.id}`,
      to: `library-item-${work.id}-${item.id}`,
      label: "possui item",
    }))),
  };
  const operational = {
    nodes: [
      { id: "sys-login", kind: "Acesso", title: "Login administrativo", description: "Abre a estação e inicia o ngrok automaticamente", x: 70, y: 70 },
      { id: "sys-work", kind: "Obra", title: "Endereço + planilha", description: "Cria a obra e todos os itens de execução", x: 410, y: 70 },
      { id: "sys-plan", kind: "Cronograma", title: "Relações entre atividades", description: "Itens, datas e materiais necessários", x: 750, y: 70 },
      { id: "sys-calendar", kind: "Calendário", title: "Agenda da obra", description: "Gerada pelas datas do cronograma", x: 1090, y: 70 },
      { id: "sys-field", kind: "Campo", title: "Encarregado de obra mobile", description: "Cronograma, diário e comprovação de entrega", x: 750, y: 330 },
      { id: "sys-measure", kind: "Controle", title: "Medição e progresso", description: "Consolida os registros do diário", x: 1090, y: 330 },
    ],
    edges: [
      { id: "sys-e1", from: "sys-login", to: "sys-work", label: "cadastra" },
      { id: "sys-e2", from: "sys-work", to: "sys-plan", label: "disponibiliza itens" },
      { id: "sys-e3", from: "sys-plan", to: "sys-calendar", label: "gera datas" },
      { id: "sys-e4", from: "sys-plan", to: "sys-field", label: "publica cronograma" },
      { id: "sys-e5", from: "sys-field", to: "sys-measure", label: "envia registros" },
    ],
  };
  const purchases = {
    nodes: [
      { id: "buy-item", kind: "Item", title: "Item de execução", description: "Descrição e orçamento alocado", x: 70, y: 90 },
      { id: "buy-request", kind: "Compra", title: "Solicitação", description: "Material, quantidade, unidade e data", x: 390, y: 90 },
      { id: "buy-approve", kind: "Administração", title: "Autorização", description: "Aprovação exclusiva no desktop", x: 710, y: 90 },
      { id: "buy-delivery", kind: "Campo", title: "Entrega", description: "Foto enviada pelo encarregado", x: 1030, y: 90 },
      { id: "buy-complete", kind: "Controle", title: "Sticker completo", description: "Entrega vinculada à obra e ao item", x: 710, y: 350 },
    ],
    edges: [
      { id: "buy-e1", from: "buy-item", to: "buy-request", label: "inicia fluxo" },
      { id: "buy-e2", from: "buy-request", to: "buy-approve", label: "envia para autorização" },
      { id: "buy-e3", from: "buy-approve", to: "buy-delivery", label: "libera compra" },
      { id: "buy-e4", from: "buy-delivery", to: "buy-complete", label: "comprova com foto" },
    ],
  };
  return `${pageHeader("Modelos de diagramas", "Itens importados, materiais e fluxos visuais de funcionamento da estação.")}
    ${card("Elementos de todas as obras", `<div class="diagram-help"><span><b>1</b> Todos os itens importados aparecem como quadros</span><span><b>2</b> Conecte quadros para estabelecer relações</span><span><b>3</b> Solte uma nova linha na área vazia para criar um material</span></div><div class="interactive-diagram library-elements-diagram" data-interactive-diagram="all-work-elements" data-allow-material-drop="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(allWorkElements)}</script></div>`, "interactive-diagram-card")}
    ${card("Fluxo operacional do sistema", `<div class="interactive-diagram system-flow-diagram" data-interactive-diagram="system-operational" data-fixed-edges="true" data-hide-node-dates="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(operational)}</script></div>`, "interactive-diagram-card diagram-section-gap")}
    ${card("Fluxo de compra e comprovação", `<div class="interactive-diagram system-flow-diagram" data-interactive-diagram="system-purchases" data-fixed-edges="true" data-hide-node-dates="true" data-wheel-zoom="true"><svg data-diagram-svg></svg><div data-node-layer></div><script type="application/json">${JSON.stringify(purchases)}</script></div>`, "interactive-diagram-card diagram-section-gap")}`;
}


export function adminPurchases() {
  const flows = state.purchaseFlows || [];
  return `${pageHeader("Compras", "Acompanhamento consolidado dos fluxos iniciados nos itens de execução.")}
    <section class="purchase-summary-grid">${["Solicitação", "Aguardando autorização", "Autorizada", "Aguardando entrega", "Entregue com foto"].map((stage) => `<article><small>${esc(stage)}</small><strong>${flows.filter((flow) => flow.status === stage).length}</strong></article>`).join("")}</section>
    ${card("Fluxos de todas as obras", `<div class="table-scroll"><table><thead><tr><th>Obra</th><th>Item</th><th>Fluxo</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>${flows.map((flow) => { const work = flowWork(flow); const item = flowItem(flow); return `<tr><td>${esc(work?.name || "")}</td><td>${esc(item?.description || "")}</td><td><strong>${esc(flow.title)}</strong></td><td>${money(flow.quoted || flow.estimated)}</td><td>${status(flow.status)}</td><td><button class="btn small" data-message="open-work-section" data-work-id="${esc(flow.workId)}" data-route="admin-work-purchases">Abrir</button></td></tr>`; }).join("")}</tbody></table></div>`)} `;
}

export function adminHelp() {
  const screens = [
    ["01-login.png", "Login administrativo"],
    ["02-painel.png", "Painel"],
    ["03-obras.png", "Obras"],
    ["04-cronograma.png", "Cronograma gráfico"],
    ["05-compras.png", "Compras"],
    ["06-mobile.png", "Acesso do encarregado"],
  ];
  return `${pageHeader("Manual", "Sequência visual de uso da aplicação.")}
    <section class="manual-screenshot-strip">${screens.map(([file, label]) => `<figure><img src="./screens/${file}" alt="${esc(label)}" loading="lazy"><figcaption>${esc(label)}</figcaption></figure>`).join("")}</section>`;
}

export function adminDataTransfer() {
  return `${pageHeader("Importar e exportar dados", "Arquivos CSV com codificação UTF-8 e separador por ponto e vírgula.")}
    <div class="grid two">
      ${card("Importar CSV", `<label class="dropzone"><input type="file" accept=".csv,text/csv" data-message="import-system-csv"><span>⇧</span><strong>Selecionar arquivo CSV</strong><small>Obras, itens, compras, pessoas e medições.</small></label>`)}
      ${card("Exportar CSV", `<div class="data-export-list"><button class="btn" data-message="export-system-csv" data-export-entity="obras">Obras e itens</button><button class="btn ghost" data-message="export-system-csv" data-export-entity="compras">Compras</button><button class="btn ghost" data-message="export-system-csv" data-export-entity="rh">RH e acessos</button><button class="btn ghost" data-message="export-system-csv" data-export-entity="medicoes">Medições</button></div>`)}
    </div>`;
}

export function adminAccessConfig() {
  return `${pageHeader("Configuração de acesso", "Autorização da máquina e autenticação Google pelo Firebase.")}
    <div class="grid two access-config-grid">
      ${card("Máquina autorizada pelo GitHub", `<form data-auth-form="machine-update"><label>Repositório autorizado<input value="glaucodeveloper/macroobras" readonly></label><label>Token da máquina<input type="password" name="machine-token-update" autocomplete="new-password" placeholder="Substituir token GitHub" data-machine-github-token></label><button class="btn" type="button" data-message="save-machine-token">Atualizar autorização</button></form>`)}
      ${card("Firebase Authentication", `<label>Configuração JSON<textarea data-firebase-config placeholder='{"apiKey":"…","authDomain":"…","projectId":"…"}'></textarea></label><div class="auth-provider-row"><span>Google OAuth</span><b>Firebase</b></div><button class="btn" data-message="save-firebase-config">Salvar configuração</button>`)}
    </div>`;
}

export function adminMachineAuthorization() {
  return `<main class="admin-login-page machine-authorization-page">
    <form class="admin-login-card machine-authorization-card" data-auth-form="machine">
      <div class="login-brand"><strong>MacroObras</strong><span>Autorização da máquina</span></div>
      <h1>Autorizar esta estação</h1>
      <p>Informe o token GitHub vinculado a esta máquina. Após a verificação, a identificação do usuário será solicitada em uma tela separada.</p>
      <label class="login-field"><span>Token GitHub da máquina</span><input type="password" name="github-machine-token" autocomplete="current-password" data-admin-github-token placeholder="github_pat_… ou ghp_…" required></label>
      <button class="btn full" type="submit" data-message="admin-machine-token-authorize">Verificar token e continuar</button>
    </form>
  </main>`;
}

export function adminLogin() {
  return `<main class="admin-login-page">
    <form class="admin-login-card" data-auth-form="contact">
      <div class="login-brand"><strong>MacroObras</strong><span>Acesso administrativo</span></div>
      <h1>Entrar na estação</h1>
      <p>A máquina já foi autorizada pelo GitHub. Identifique o usuário pelo email e telefone cadastrados ou continue com Google.</p>
      <label class="login-field"><span>Email</span><input type="email" name="email" autocomplete="email" data-admin-email placeholder="admin@empresa.com" required></label>
      <label class="login-field"><span>Telefone</span><input type="tel" name="phone" autocomplete="tel" inputmode="tel" data-admin-phone placeholder="(77) 99999-9999" required></label>
      <button class="btn full" type="submit" data-message="admin-contact-login">Entrar com email e telefone</button>
      <div class="login-divider"><span>ou</span></div>
      <button class="auth-button google" type="button" data-message="firebase-login" data-provider="google">Continuar com Google</button>
    </form>
  </main>`;
}
