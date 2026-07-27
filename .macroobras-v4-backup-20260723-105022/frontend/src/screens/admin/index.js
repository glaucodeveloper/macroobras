import {
  availableWorks,
  budgetImportPreview,
  mobileUsers,
  teamEntities,
} from "../../core/data.js";
import {
  selectedPurchaseFlow,
  selectedVisitPlan,
  selectedWork,
  state,
} from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, formStep, metric, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value) => `${Math.round(Number(value || 0))}%`;
const workById = (id) => availableWorks.find((work) => work.id === id);
const itemByFlow = (flow) => workById(flow?.workId)?.items.find((item) => item.id === flow?.itemId);

function progressBar(value, label = "") {
  return `<div class="mo-progress"><span style="width:${Math.max(0, Math.min(100, Number(value || 0)))}%"></span></div>${label ? `<small>${esc(label)}</small>` : ""}`;
}

function statusBadge(status) {
  const key = String(status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="mo-status ${esc(key)}">${esc(status)}</span>`;
}

function worksMap({ visits = false, compact = false } = {}) {
  const points = availableWorks.map((work, index) => {
    const positions = [{ left: 28, top: 58 }, { left: 54, top: 66 }, { left: 72, top: 30 }];
    const pos = positions[index % positions.length];
    return `
      <div class="map-work-point ${visits ? "route-point" : ""}" style="left:${pos.left}%;top:${pos.top}%">
        <button data-message="open-work" data-work-id="${esc(work.id)}" aria-label="Abrir ${esc(work.name)}"><span>${index + 1}</span></button>
        <div class="map-work-popover">
          <strong>${esc(work.name)}</strong>
          <small>${esc(work.address)}</small>
          <div>${statusBadge(work.status)} <b>${percent(work.progress)}</b></div>
          ${visits ? `<label>Duração da visita<input data-visit-duration="${esc(work.id)}" value="${esc(state.visitDurations[work.id] || (90 + index * 30))}" type="number" min="15" step="15" /> min</label><small>Tempo médio de chegada calculado por rota web.</small>` : `<p>${money(work.budget)} · próxima etapa: ${esc(work.nextMilestone)}</p>`}
        </div>
      </div>`;
  }).join("");

  return `
    <div class="works-map ${compact ? "compact" : ""} ${visits ? "visit-mode" : ""}">
      <div class="map-grid"></div>
      <div class="map-road road-a"></div><div class="map-road road-b"></div><div class="map-road road-c"></div>
      ${visits ? `<svg class="visit-route-lines" viewBox="0 0 1000 520" preserveAspectRatio="none"><path d="M280 300 C390 210 455 410 540 340 S650 110 720 155"/><path class="route-shadow" d="M280 300 C390 210 455 410 540 340 S650 110 720 155"/></svg>` : ""}
      ${points}
      <div class="map-legend"><span><i class="blue"></i> Em execução</span><span><i class="orange"></i> Mobilização</span>${visits ? "<b>Rota editável</b>" : ""}</div>
    </div>`;
}

function kpi(label, value, detail, tone = "blue") {
  return `<article class="mo-kpi ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
}

function workTabs(active) {
  const tabs = [
    ["overview", "Visão geral"], ["items", "Itens de execução"], ["planning", "Planejamento gráfico"],
    ["calendar", "Calendário"], ["purchases", "Compras"], ["measurement", "Medição"],
  ];
  return `<nav class="work-tabs">${tabs.map(([id, label]) => `<button class="${active === id ? "active" : ""}" data-message="open-work-tab" data-tab="${id}">${label}</button>`).join("")}</nav>`;
}

export function adminDashboard() {
  const totalBudget = availableWorks.reduce((sum, work) => sum + work.budget, 0);
  const totalPaid = availableWorks.reduce((sum, work) => sum + work.paid, 0);
  const pending = state.purchaseFlows.filter((flow) => !flow.delivered).length;
  return `
    ${pageHeader("Dashboard de obras", "Controle integrado de execução, orçamento, compras, pagamentos, visitas e equipes.", `<button class="btn ghost" data-message="navigate" data-route="admin-visits">Planejar visitas</button><button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    <section class="mo-kpi-grid">
      ${kpi("Obras ativas", String(availableWorks.length), "todas localizadas no mapa")}
      ${kpi("Orçamento alocado", money(totalBudget), "somatório dos itens importados", "cyan")}
      ${kpi("Valor pago", money(totalPaid), `${Math.round(totalPaid / totalBudget * 100)}% do orçamento`, "green")}
      ${kpi("Compras pendentes", String(pending), "inclui entregas sem foto", "orange")}
    </section>
    <section class="dashboard-grid">
      ${card("Mapa geral das obras", worksMap({ compact: true }), "map-card")}
      ${card("Controle rápido", `
        <div class="attention-list">
          ${state.purchaseFlows.map((flow) => `<button data-message="select-purchase" data-flow-id="${esc(flow.id)}"><span>${statusBadge(flow.status)}</span><strong>${esc(flow.title)}</strong><small>${esc(workById(flow.workId)?.name || "")}</small></button>`).join("")}
        </div>
        <button class="btn ghost full" data-message="navigate" data-route="admin-purchases">Abrir compras</button>
      `)}
    </section>
    ${card("Andamento das obras", `<div class="work-summary-table"><table><thead><tr><th>Obra</th><th>Cliente</th><th>Status</th><th>Execução</th><th>Orçamento</th><th>Próximo marco</th></tr></thead><tbody>${availableWorks.map((work) => `<tr data-message="open-work" data-work-id="${esc(work.id)}"><td><strong>${esc(work.name)}</strong><small>${esc(work.address)}</small></td><td>${esc(work.client)}</td><td>${statusBadge(work.status)}</td><td>${progressBar(work.progress, percent(work.progress))}</td><td>${money(work.budget)}</td><td>${esc(work.nextMilestone)}</td></tr>`).join("")}</tbody></table></div>`)}
  `;
}

export function adminWorks() {
  return `
    ${pageHeader("Obras", "Cada obra nasce do endereço informado e da planilha orçamentária importada.", `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`)}
    <div class="filters carbon-filters"><input placeholder="Buscar obra, cliente ou endereço"/><select><option>Todos os status</option><option>Em execução</option><option>Em mobilização</option></select><button class="btn ghost">Filtrar</button></div>
    <section class="works-cards">${availableWorks.map((work) => `
      <article class="work-card">
        <header><div><small>${esc(work.code)}</small><h2>${esc(work.name)}</h2></div>${statusBadge(work.status)}</header>
        <p>${esc(work.address)}</p><p><strong>Cliente:</strong> ${esc(work.client)}</p>
        ${progressBar(work.progress, `${percent(work.progress)} executado`)}
        <div class="work-money"><span><small>Orçamento</small><strong>${money(work.budget)}</strong></span><span><small>Pago</small><strong>${money(work.paid)}</strong></span></div>
        <button class="btn full" data-message="open-work" data-work-id="${esc(work.id)}">Abrir página da obra</button>
      </article>`).join("")}</section>
  `;
}

export function adminAddWork() {
  const preview = state.importPreviewReady ? budgetImportPreview : null;
  return `
    ${pageHeader("Adicionar obra", "Informe somente o endereço e importe a planilha orçamentária resumida.", `<button class="btn ghost" data-message="navigate" data-route="admin-works">Cancelar</button><button class="btn" data-message="save-imported-work">Criar obra</button>`)}
    <div class="grid two add-work-grid">
      ${card("Entrada da obra", `
        ${formStep(1, "Endereço", `<label>Endereço da obra</label><input data-work-address placeholder="Rua, número, município e estado" value="Estádio Municipal, América Dourada, Bahia"/><small>O sistema geocodifica o endereço e posiciona o marcador no mapa.</small>`)}
        ${formStep(2, "Planilha orçamentária", `<label class="dropzone import-zone"><input type="file" accept=".xlsx,.xls,.csv" data-message="budget-file"/><span>⇧</span><strong>${esc(state.importFileName || "Selecionar planilha Orçamento Resumido")}</strong><small>O importador lê o cliente no cabeçalho e cria itens apenas com descrição e orçamento alocado.</small></label><button class="btn ghost full" data-message="simulate-budget-import">Usar planilha localizada no ZIP para prévia</button>`)}
        <div class="format-rule"><strong>Formato reconhecido</strong><code>Descrição | Total</code><p>Arquivos “Orçamento Resumido”, “Plan Resumo” ou “Resumo”. Planilhas sintéticas e composições são ignoradas.</p></div>
      `)}
      ${card("Prévia da importação", preview ? `
        <div class="detected-client"><span>Cliente detectado</span><strong>${esc(preview.client)}</strong><small>Obtido do cabeçalho/rodapé interno da planilha.</small></div>
        <div class="import-meta"><span><small>Obra</small><strong>${esc(preview.workName)}</strong></span><span><small>Orçamento</small><strong>${money(preview.total)}</strong></span></div>
        <div class="import-items"><table><thead><tr><th>Descrição do item</th><th>Valor alocado</th></tr></thead><tbody>${preview.items.map((item) => `<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td></tr>`).join("")}</tbody></table></div>
      ` : `<div class="empty-preview"><b>1</b><h3>Aguardando planilha</h3><p>A prévia mostrará o cliente, a obra e os itens de execução com seus valores alocados.</p></div>`)}
    </div>
  `;
}

export function adminWork() {
  const work = selectedWork() || availableWorks[0];
  const active = state.workPageTab || "overview";
  let body = workOverview(work);
  if (active === "items") body = workItems(work);
  if (active === "planning") body = workPlanning(work);
  if (active === "calendar") body = workCalendar(work);
  if (active === "purchases") body = workPurchases(work);
  if (active === "measurement") body = workMeasurement(work);
  return `
    ${pageHeader(work.name, `${work.address} · ${work.client}`, `<button class="btn ghost" data-message="navigate" data-route="admin-works">Todas as obras</button>${statusBadge(work.status)}`)}
    ${workTabs(active)}
    ${body}
  `;
}

function workOverview(work) {
  const committed = work.items.reduce((sum, item) => sum + item.committed, 0);
  const paid = work.items.reduce((sum, item) => sum + item.paid, 0);
  return `
    <section class="mo-kpi-grid compact-kpis">${kpi("Execução", percent(work.progress), work.nextMilestone)}${kpi("Orçamento", money(work.budget), `${work.items.length} itens importados`, "cyan")}${kpi("Comprometido", money(committed), `${percent(committed / work.budget * 100)} do orçamento`, "orange")}${kpi("Pago", money(paid), `${percent(paid / work.budget * 100)} do orçamento`, "green")}</section>
    <div class="dashboard-grid">${card("Localização", worksMap({ compact: true }), "map-card")}${card("Resumo operacional", `<dl class="work-facts"><div><dt>Cliente</dt><dd>${esc(work.client)}</dd></div><div><dt>Endereço</dt><dd>${esc(work.address)}</dd></div><div><dt>Próxima etapa</dt><dd>${esc(work.nextMilestone)}</dd></div><div><dt>Fluxos de compra</dt><dd>${state.purchaseFlows.filter((flow) => flow.workId === work.id).length}</dd></div></dl>`)} </div>
    ${card("Itens com maior orçamento", `<div class="budget-bars">${[...work.items].sort((a,b)=>b.budget-a.budget).slice(0,6).map((item)=>`<div><label><span>${esc(item.description)}</span><strong>${money(item.budget)}</strong></label>${progressBar(item.budget/work.budget*100)}</div>`).join("")}</div>`)}
  `;
}

function workItems(work) {
  return card("Itens de execução importados", `
    <div class="info compact-info">Cada item contém somente a descrição e o valor alocado de orçamento. Quantidade, unidade e demais dados são preenchidos no fluxo de compra.</div>
    <div class="execution-items"><table><thead><tr><th>Descrição</th><th>Orçamento</th><th>Comprometido</th><th>Pago</th><th>Saldo</th><th>Execução</th><th></th></tr></thead><tbody>${work.items.map((item) => {
      const balance = item.budget - item.committed;
      return `<tr><td><strong>${esc(item.description)}</strong></td><td>${money(item.budget)}</td><td>${money(item.committed)}</td><td>${money(item.paid)}</td><td class="${balance < 0 ? "negative" : ""}">${money(balance)}</td><td>${progressBar(item.progress, percent(item.progress))}</td><td><button class="btn small-btn" data-message="start-purchase" data-item-id="${esc(item.id)}">Iniciar fluxo de compra</button></td></tr>`;
    }).join("")}</tbody></table></div>
  `);
}

function diagramNodes(work) {
  const nodes = work.items.slice(0, 7);
  const positions = [[8,15],[34,8],[60,18],[18,48],[48,47],[73,52],[40,78]];
  return `<div class="diagram-canvas schedule-canvas">
    <svg viewBox="0 0 1000 560" preserveAspectRatio="none"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs><path d="M170 120 C250 80 300 80 355 95"/><path d="M500 100 C590 90 610 130 665 145"/><path d="M720 190 C710 280 670 300 610 315"/><path d="M510 350 C420 340 330 320 260 315"/><path d="M270 350 C280 430 360 450 430 455"/><path d="M560 450 C630 430 700 405 765 360"/></svg>
    ${nodes.map((item, index) => { const [x,y]=positions[index]; return `<button class="diagram-node" style="left:${x}%;top:${y}%" data-message="save" data-entity="no-cronograma" data-value="Nó ${esc(item.description)} selecionado"><span>${String(index+1).padStart(2,"0")}</span><strong>${esc(item.description)}</strong><small>${money(item.budget)}</small><label>Data<input type="date" value="2026-0${Math.min(9,7+Math.floor(index/3))}-${String(24+index).padStart(2,"0")}"/></label></button>`; }).join("")}
  </div>`;
}

function workPlanning(work) {
  return `
    <div class="canvas-toolbar"><button class="btn ghost">＋ Forma</button><button class="btn ghost">↗ Conexão</button><button class="btn ghost">T Texto</button><span>Datas inseridas nos nós geram o calendário da obra.</span><button class="btn" data-message="save-node-plan">Salvar planejamento</button></div>
    ${card("Planejamento por nós e setas", diagramNodes(work), "diagram-card")}
  `;
}

function workCalendar(work) {
  const days = ["Seg 27", "Ter 28", "Qua 29", "Qui 30", "Sex 31", "Sáb 01"];
  return `
    <div class="calendar-origin"><span>Gerado a partir do diagrama</span><strong>${esc(work.name)}</strong><button class="btn ghost" data-message="open-work-tab" data-tab="planning">Editar nós</button></div>
    ${card("Calendário da obra", `<div class="node-calendar"><div class="calendar-head"><b>Etapas</b>${days.map((day)=>`<b>${day}</b>`).join("")}</div>${work.items.slice(0,5).map((item,index)=>`<div class="calendar-row"><strong>${esc(item.description)}</strong>${days.map((_,day)=>`<span>${day >= index && day <= index+1 ? `<i class="calendar-allocation tone-${index%4}">${day===index?esc(item.description):"continuação"}</i>`:""}</span>`).join("")}</div>`).join("")}</div>`)}
  `;
}

function workPurchases(work) {
  const flows = state.purchaseFlows.filter((flow) => flow.workId === work.id);
  return `${card("Compras da obra", flows.length ? `<div class="purchase-list">${flows.map(flowCard).join("")}</div>` : `<div class="empty-preview"><h3>Nenhum fluxo iniciado</h3><p>Abra “Itens de execução” e inicie uma compra a partir do item.</p></div>`)}<button class="btn" data-message="navigate" data-route="admin-purchases">Abrir interface completa de stickers</button>`;
}

function workMeasurement(work) {
  return card("Medição por item", `<div class="execution-items"><table><thead><tr><th>Item</th><th>Orçamento</th><th>Execução</th><th>Valor medido</th><th>Provas</th></tr></thead><tbody>${work.items.map((item,index)=>`<tr><td>${esc(item.description)}</td><td>${money(item.budget)}</td><td>${progressBar(item.progress,percent(item.progress))}</td><td>${money(item.budget*item.progress/100)}</td><td>${index<3?`${index+1} fotos de campo`:"Aguardando execução"}</td></tr>`).join("")}</tbody></table></div>`);
}

function flowCard(flow) {
  const work = workById(flow.workId);
  return `<button class="purchase-row ${state.selectedPurchaseFlowId === flow.id ? "active" : ""}" data-message="select-purchase" data-flow-id="${esc(flow.id)}"><span>${statusBadge(flow.status)}</span><strong>${esc(flow.title)}</strong><small>${esc(work?.name || "")} · ${money(flow.quoted || flow.estimated)}</small></button>`;
}

function sticker(title, number, body, stateClass = "") {
  return `<article class="flow-sticker ${esc(stateClass)}"><header><b>${number}</b><strong>${esc(title)}</strong></header>${body}</article>`;
}

export function adminPurchases() {
  const flow = selectedPurchaseFlow();
  const work = workById(flow?.workId);
  const item = itemByFlow(flow);
  if (!flow) return `${pageHeader("Compras", "Inicie um fluxo a partir de um item de execução.")}<div class="empty-preview"><h3>Sem fluxos</h3></div>`;
  return `
    ${pageHeader("Compras por stickers", "O fluxo nasce em um item de execução importado da planilha e avança até a entrega comprovada.", `<button class="btn ghost" data-message="open-work" data-work-id="${esc(work.id)}">Abrir obra</button>`)}
    <div class="purchase-layout">
      <aside class="purchase-sidebar"><h3>Fluxos</h3>${state.purchaseFlows.map(flowCard).join("")}</aside>
      <section>
        <div class="flow-context"><div><small>Obra</small><strong>${esc(work.name)}</strong></div><div><small>Item de execução</small><strong>${esc(item?.description || "")}</strong></div><div><small>Orçamento do item</small><strong>${money(item?.budget)}</strong></div><div><small>Saldo</small><strong>${money((item?.budget || 0) - (item?.committed || 0))}</strong></div></div>
        <div class="sticker-flow">
          ${sticker("Item de execução", "01", `<p>${esc(item?.description || "")}</p><strong>${money(item?.budget)}</strong>`, "complete")}
          ${sticker("Solicitação", "02", `<label>Material ou serviço<input value="${esc(flow.material)}"/></label><div class="sticker-split"><label>Quantidade<input value="${esc(flow.quantity)}"/></label><label>Unidade<input value="${esc(flow.unit)}"/></label></div><label>Data necessária<input value="${esc(flow.neededAt)}"/></label><label>Solicitante<input value="${esc(flow.requester)}"/></label><label>Valor estimado<input value="${money(flow.estimated)}"/></label>`, "complete")}
          ${sticker("Cotação", "03", `<label>Fornecedor<input value="${esc(flow.supplier)}" placeholder="Selecionar fornecedor"/></label><label>Valor cotado<input value="${flow.quoted ? money(flow.quoted) : ""}" placeholder="R$ 0,00"/></label><button class="sticker-action" data-message="advance-purchase" data-stage="quote">Registrar cotação</button>`, flow.quoted ? "complete" : "active")}
          ${sticker("Autorização", "04", `<p>Autorização exclusiva do administrador no desktop.</p><strong>${flow.authorized ? "Compra autorizada" : "Aguardando decisão"}</strong><button class="sticker-action" data-message="approve-purchase">${flow.authorized ? "Revalidar autorização" : "Autorizar compra"}</button>`, flow.authorized ? "complete" : "locked")}
          ${sticker("Compra", "05", `<label>Pedido<input value="${flow.ordered ? `PED-${flow.id.slice(-5).toUpperCase()}` : ""}" placeholder="Número do pedido"/></label><label>Pagamento<input value="${money(flow.paid)}"/></label><button class="sticker-action" data-message="advance-purchase" data-stage="order">Registrar pedido</button>`, flow.ordered ? "complete" : "locked")}
          ${sticker("Transporte", "06", `<label>Situação<input value="${esc(flow.transport)}"/></label><p>O trajeto e a previsão de chegada permanecem associados à compra.</p><button class="sticker-action" data-message="advance-purchase" data-stage="transport">Atualizar transporte</button>`, flow.transport !== "Não iniciado" ? "complete" : "locked")}
          ${sticker("Entrega", "07", flow.delivered ? `<div class="delivery-photo filled"><span>✓</span><strong>Foto recebida</strong><small>${esc(flow.deliveryEvidence)}</small></div><p>Entrega comprovada pelo encarregado.</p>` : `<div class="delivery-photo gap"><span>＋</span><strong>Lacuna de comprovação</strong><small>Este sticker só será preenchido após foto enviada no acesso de campo.</small></div><button class="sticker-action" data-message="navigate" data-route="mobile-deliveries">Abrir acesso de campo</button>`, flow.delivered ? "complete delivery" : "waiting delivery")}
        </div>
      </section>
    </div>
  `;
}

export function adminVisits() {
  const selected = selectedVisitPlan();
  return `
    ${pageHeader("Planejamento de visitas", "Trace rotas entre as obras, informe a duração no ponto e gere calendários independentes.", `<button class="btn" data-message="generate-visit-plan">Gerar novo calendário</button>`)}
    <div class="visits-layout">
      <section>${worksMap({ visits: true })}<div class="route-summary"><span><small>Distância estimada</small><strong>684 km</strong></span><span><small>Deslocamento</small><strong>8h 42min</strong></span><span><small>Tempo de visitas</small><strong>6h 00min</strong></span><span><small>Duração total</small><strong>14h 42min</strong></span></div></section>
      <aside class="visit-plan-list"><h3>Calendários gerados</h3>${state.visitPlans.map((plan)=>`<button class="${selected?.id===plan.id?"active":""}" data-message="select-visit-plan" data-plan-id="${esc(plan.id)}"><strong>${esc(plan.name)}</strong><small>${esc(plan.date)} · ${plan.workIds.length} obras</small><span>${Math.floor((plan.travelMinutes+plan.visitMinutes)/60)}h ${(plan.travelMinutes+plan.visitMinutes)%60}min</span></button>`).join("")}</aside>
    </div>
    ${selected ? card("Calendário da rota selecionada", `<div class="visit-calendar"><header><strong>${esc(selected.name)}</strong><span>Gerado em ${esc(selected.generatedAt)}</span></header>${selected.workIds.map((id,index)=>{const work=workById(id);return `<div class="visit-stop"><b>${String(index+1).padStart(2,"0")}</b><span><strong>${esc(work.name)}</strong><small>${esc(work.address)}</small></span><time>${8+index*4}:00 — ${10+index*4}:00</time></div>`;}).join("")}</div>`) : ""}
  `;
}

export function adminFinance() {
  const rows = availableWorks.flatMap((work)=>work.items.map((item)=>({work,item})));
  const total = rows.reduce((sum,row)=>sum+row.item.budget,0);
  const committed = rows.reduce((sum,row)=>sum+row.item.committed,0);
  const paid = rows.reduce((sum,row)=>sum+row.item.paid,0);
  return `
    ${pageHeader("Orçamento e pagamentos", "Acompanhe previsto, comprometido, comprado, pago e saldo por item de execução.", `<button class="btn">Registrar pagamento</button>`)}
    <section class="mo-kpi-grid compact-kpis">${kpi("Orçamento",money(total),"itens importados")}${kpi("Comprometido",money(committed),percent(committed/total*100),"orange")}${kpi("Pago",money(paid),percent(paid/total*100),"green")}${kpi("Saldo livre",money(total-committed),"disponível para novos fluxos","cyan")}</section>
    ${card("Controle por item", `<div class="execution-items"><table><thead><tr><th>Obra</th><th>Item</th><th>Previsto</th><th>Comprometido</th><th>Comprado</th><th>Pago</th><th>Saldo</th></tr></thead><tbody>${rows.map(({work,item})=>`<tr><td><small>${esc(work.code)}</small><strong>${esc(work.name)}</strong></td><td>${esc(item.description)}</td><td>${money(item.budget)}</td><td>${money(item.committed)}</td><td>${money(item.purchased)}</td><td>${money(item.paid)}</td><td>${money(item.budget-item.committed)}</td></tr>`).join("")}</tbody></table></div>`)}
  `;
}

export function adminRh() {
  return `
    ${pageHeader("RH — equipes e funções", "Jogo cadastral de entidades do RH representado por nós, funções e relações operacionais.", `<button class="btn">Adicionar entidade</button>`)}
    <div class="canvas-toolbar"><button class="btn ghost">＋ Pessoa</button><button class="btn ghost">＋ Equipe</button><button class="btn ghost">↗ Relação</button><span>As linhas podem receber legendas como administra, supervisiona, executa e autoriza.</span></div>
    ${card("Organograma operacional", `<div class="diagram-canvas rh-canvas"><svg viewBox="0 0 1000 560" preserveAspectRatio="none"><path d="M500 95 L260 220"/><path d="M500 95 L750 220"/><path d="M260 275 L260 405"/><path d="M750 275 L785 405"/><path d="M260 260 C380 320 430 400 510 430"/><path d="M750 260 C660 320 610 390 555 430"/></svg>${teamEntities.map((node)=>`<button class="rh-node ${esc(node.tone)}" style="left:${node.x}%;top:${node.y}%"><strong>${esc(node.name)}</strong><small>${esc(node.role)}</small></button>`).join("")}<span class="edge-label label-a">supervisiona</span><span class="edge-label label-b">autoriza</span><span class="edge-label label-c">executa</span></div>`, "diagram-card")}
    ${card("Cadastros vinculados", `<table><thead><tr><th>Nome</th><th>Função</th><th>Obra</th><th>Acesso</th></tr></thead><tbody>${mobileUsers.map((user,index)=>`<tr><td>${esc(user.name)}</td><td>${index===0?"Mestre de obras":"Encarregado de obra"}</td><td>${esc(workById(user.workId)?.name || "")}</td><td>${esc(user.email)}</td></tr>`).join("")}</tbody></table>`)}
  `;
}

export function adminMobileAccess() {
  return `
    ${pageHeader("Acessos de campo", "Cadastre email e CPF dos encarregados autorizados para cronograma, diário e comprovação de entregas.", `<button class="btn" data-message="save" data-entity="acesso-campo" data-value="Acesso salvo">Salvar acesso</button>`)}
    <div class="grid two">${card("Novo acesso", `${formStep(1,"Identificação",`<input placeholder="Nome do colaborador"/><div class="split"><input placeholder="CPF"/><input placeholder="email@empresa.com"/></div>`)}${formStep(2,"Obra vinculada",`<select>${availableWorks.map((work)=>`<option>${esc(work.name)}</option>`).join("")}</select>`)}`)}${card("Acessos ativos", `<table><thead><tr><th>Nome</th><th>Email</th><th>CPF</th><th>Obra</th></tr></thead><tbody>${mobileUsers.map((user)=>`<tr><td>${esc(user.name)}</td><td>${esc(user.email)}</td><td>${esc(user.cpf)}</td><td>${esc(workById(user.workId)?.code || "")}</td></tr>`).join("")}</tbody></table>`)}</div>`;
}

export function adminElements() {
  const work = selectedWork() || availableWorks[0];
  return `${pageHeader("Editor de diagramas", "Área comum de formas, stickers, setas e linhas usada em cronograma, compras e RH.", `<button class="btn" data-message="save-node-plan">Salvar diagrama</button>`)}${card("Demonstração do canvas", diagramNodes(work), "diagram-card")}`;
}

export function adminCalendar() {
  const work = selectedWork() || availableWorks[0];
  return `${pageHeader("Calendário da obra", "Produto das datas preenchidas no diagrama de planejamento.", `<button class="btn ghost" data-message="open-work" data-work-id="${esc(work.id)}">Abrir obra</button>`)}${workCalendar(work)}`;
}

export function adminMeasurement() {
  const work = selectedWork() || availableWorks[0];
  return `${pageHeader("Medição da obra", "Execução financeira e provas de campo vinculadas aos itens importados.", `<button class="btn ghost" data-message="open-work" data-work-id="${esc(work.id)}">Abrir obra</button>`)}${workMeasurement(work)}`;
}
