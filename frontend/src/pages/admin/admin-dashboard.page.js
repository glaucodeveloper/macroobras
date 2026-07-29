import { availableWorks, routes } from "../../core/data.js";
import { selectedWork, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const integer = (value) => Number(value || 0).toLocaleString("pt-BR");
const percent = (value) => `${Math.round(Number(value || 0))}%`;
const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const visitRoute = () =>
  routes.some((item) => item.route === "admin-works-visits")
    ? "admin-works-visits"
    : "admin-visits";

const activeWork = () => selectedWork() || availableWorks[0] || null;

const workPaid = (work) => {
  const direct = Number(work?.paid || 0);
  if (direct > 0) return direct;
  return (work?.items || []).reduce(
    (sum, item) => sum + Number(item.paid || 0),
    0,
  );
};

const workCommitted = (work) =>
  (work?.items || []).reduce(
    (sum, item) => sum + Number(item.committed || 0),
    0,
  );

const planStops = (plan) => {
  if (Array.isArray(plan?.stops) && plan.stops.length) return plan.stops;
  if (Array.isArray(plan?.schedule) && plan.schedule.length) return plan.schedule;

  return (plan?.workIds || [])
    .map((workId) => {
      const work = availableWorks.find((item) => item.id === workId);
      return work ? { workId: work.id, name: work.name, address: work.address } : null;
    })
    .filter(Boolean);
};

const distanceLabel = (meters) => {
  const value = Number(meters || 0);
  if (!(value > 0)) return "—";

  return `${(value / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: value >= 100000 ? 0 : 1,
    maximumFractionDigits: 1,
  })} km`;
};

const minutesLabel = (value) => {
  const total = Math.max(0, Math.round(Number(value || 0)));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  return hours
    ? `${hours}h ${String(minutes).padStart(2, "0")}min`
    : `${minutes}min`;
};

function progress(value, tone = "blue") {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="balance-progress tone-${esc(tone)}"><span style="width:${safe}%"></span></div>`;
}

function actionButton(label, detail, route, workId = "", tone = "") {
  return `
    <button
      type="button"
      class="balance-action ${esc(tone)}"
      data-message="${workId ? "open-work-section" : "navigate"}"
      data-route="${esc(route)}"
      ${workId ? `data-work-id="${esc(workId)}"` : ""}
    >
      <strong>${esc(label)}</strong>
      <span>${esc(detail)}</span>
    </button>
  `;
}

function differenceCard(item) {
  return `
    <article class="balance-difference tone-${esc(item.tone)}">
      <i></i>

      <div>
        <header>
          <strong>${esc(item.title)}</strong>
          <b>${esc(item.difference)}</b>
        </header>

        <p>
          <span>Referência: ${esc(item.reference)}</span>
          <span>Realizado: ${esc(item.realized)}</span>
        </p>

        <small><b>Causa:</b> ${esc(item.cause)}</small>
        <small><b>Impacto:</b> ${esc(item.impact)}</small>
      </div>

      <button
        type="button"
        data-message="${item.workId ? "open-work-section" : "navigate"}"
        data-route="${esc(item.route)}"
        ${item.workId ? `data-work-id="${esc(item.workId)}"` : ""}
      >
        ${esc(item.action)}
      </button>
    </article>
  `;
}

function balanceCard(item) {
  return `
    <article class="balance-card tone-${esc(item.tone)}">
      <small>${esc(item.title)}</small>

      <div class="balance-equation">
        <span>
          <small>${esc(item.referenceLabel)}</small>
          <strong>${esc(item.referenceValue)}</strong>
        </span>

        <b>−</b>

        <span>
          <small>${esc(item.realizedLabel)}</small>
          <strong>${esc(item.realizedValue)}</strong>
        </span>
      </div>

      <div class="balance-card-difference">
        <small>${esc(item.differenceLabel)}</small>
        <strong>${esc(item.differenceValue)}</strong>
      </div>

      ${item.progress == null ? "" : progress(item.progress, item.tone)}

      <p>${esc(item.detail)}</p>

      <button
        type="button"
        data-message="${item.workId ? "open-work-section" : "navigate"}"
        data-route="${esc(item.route)}"
        ${item.workId ? `data-work-id="${esc(item.workId)}"` : ""}
      >
        ${esc(item.action)}
      </button>
    </article>
  `;
}

function workRow(work) {
  const budget = Number(work.budget || 0);
  const measured = budget * Number(work.progress || 0) / 100;
  const paid = workPaid(work);
  const committed = workCommitted(work);

  return `
    <article class="balance-work-row">
      <button
        type="button"
        data-message="open-work-section"
        data-route="admin-work-overview"
        data-work-id="${esc(work.id)}"
      >
        <span>
          <strong>${esc(work.name)}</strong>
          <small>${esc(work.nextMilestone || work.address || "")}</small>
        </span>
        <b>${percent(work.progress)}</b>
      </button>

      ${progress(work.progress)}

      <div class="balance-work-values">
        <span><small>Orçamento</small><strong>${money(budget)}</strong></span>
        <span><small>Medido</small><strong>${money(measured)}</strong></span>
        <span><small>Pago</small><strong>${money(paid)}</strong></span>
        <span class="difference"><small>Saldo por medir</small><strong>${money(Math.max(0, budget - measured))}</strong></span>
        <span class="difference"><small>Medido não pago</small><strong>${money(Math.max(0, measured - paid))}</strong></span>
        <span><small>Comprometido</small><strong>${money(committed)}</strong></span>
      </div>

      <footer>
        <button data-message="open-work-section" data-route="admin-work-measurement" data-work-id="${esc(work.id)}">Medição</button>
        <button data-message="open-work-section" data-route="admin-work-planning" data-work-id="${esc(work.id)}">Cronograma</button>
        <button data-message="open-work-section" data-route="admin-work-purchases" data-work-id="${esc(work.id)}">Compras</button>
      </footer>
    </article>
  `;
}

function purchaseRow(flow) {
  const work = availableWorks.find((item) => item.id === flow.workId);
  const reference = Number(flow.quoted || flow.estimated || 0);
  const paid = Number(flow.paid || 0);

  let stage = "Cotação";
  let action = "Abrir compra";

  if (!flow.authorized) {
    stage = "Autorização";
    action = "Autorizar";
  } else if (!flow.ordered) {
    stage = "Pedido";
    action = "Emitir pedido";
  } else if (!flow.delivered) {
    stage = "Entrega";
    action = "Acompanhar";
  } else {
    stage = "Concluída";
    action = "Ver registro";
  }

  return `
    <button
      type="button"
      class="balance-purchase-row"
      data-message="open-work-section"
      data-route="admin-work-purchases"
      data-work-id="${esc(flow.workId || "")}"
    >
      <span>
        <strong>${esc(flow.title || flow.material || "Compra")}</strong>
        <small>${esc(work?.name || "Obra não vinculada")}</small>
      </span>
      <span><small>Referência</small><strong>${money(reference)}</strong></span>
      <span><small>Pago</small><strong>${money(paid)}</strong></span>
      <span class="difference"><small>Diferença</small><strong>${money(Math.max(0, reference - paid))}</strong></span>
      <em>${esc(stage)}</em>
      <b>${esc(action)}</b>
    </button>
  `;
}

function visitRow(plan) {
  const stops = planStops(plan);
  const first = stops[0];
  const last = stops[stops.length - 1];
  const distance = Number(plan.distanceMeters || plan.totalDistanceMeters || 0);
  const totalMinutes = Number(plan.travelMinutes || 0) + Number(plan.visitMinutes || 0);

  return `
    <button
      type="button"
      class="balance-visit-row"
      data-message="navigate"
      data-route="${esc(visitRoute())}"
    >
      <span>
        <strong>${esc(plan.name || "Rota de visitas")}</strong>
        <small>${esc(first?.name || first?.address || "Origem")} → ${esc(last?.name || last?.address || "Destino")}</small>
      </span>
      <span><small>Distância</small><strong>${distanceLabel(distance)}</strong></span>
      <span><small>Tempo</small><strong>${minutesLabel(totalMinutes)}</strong></span>
      <b>Abrir rota</b>
    </button>
  `;
}

export function adminDashboard() {
  const works = availableWorks || [];
  const selected = activeWork();
  const activeWorks = works.filter((work) => !normalize(work.status).includes("conclu"));

  const items = works.flatMap((work) =>
    (work.items || []).map((item) => ({ ...item, workId: work.id })),
  );

  const totalBudget = works.reduce((sum, work) => sum + Number(work.budget || 0), 0);
  const measuredValue = works.reduce(
    (sum, work) => sum + (Number(work.budget || 0) * Number(work.progress || 0) / 100),
    0,
  );
  const totalPaid = works.reduce((sum, work) => sum + workPaid(work), 0);
  const totalCommitted = items.reduce((sum, item) => sum + Number(item.committed || 0), 0);
  const totalPurchased = items.reduce((sum, item) => sum + Number(item.purchased || 0), 0);

  const balanceToMeasure = Math.max(0, totalBudget - measuredValue);
  const measuredUnpaid = Math.max(0, measuredValue - totalPaid);
  const committedUnpaid = Math.max(0, totalCommitted - totalPaid);
  const consolidatedProgress = totalBudget ? measuredValue / totalBudget * 100 : 0;

  const completedItems = items.filter((item) => Number(item.progress || 0) >= 100);
  const inProgressItems = items.filter((item) => Number(item.progress || 0) > 0 && Number(item.progress || 0) < 100);
  const notStartedItems = items.filter((item) => Number(item.progress || 0) <= 0);

  const purchases = Array.isArray(state.purchaseFlows) ? state.purchaseFlows : [];
  const pendingAuthorization = purchases.filter((flow) => !flow.authorized && !flow.delivered);
  const pendingOrder = purchases.filter((flow) => flow.authorized && !flow.ordered);
  const awaitingDelivery = purchases.filter((flow) => flow.ordered && !flow.delivered);
  const purchasePipeline = purchases.reduce(
    (sum, flow) => sum + Number(flow.quoted || flow.estimated || 0),
    0,
  );
  const purchasePaid = purchases.reduce((sum, flow) => sum + Number(flow.paid || 0), 0);

  const plans = Array.isArray(state.visitPlans) ? state.visitPlans : [];
  const visitedWorkIds = new Set(
    plans.flatMap((plan) => planStops(plan).map((stop) => stop.workId).filter(Boolean)),
  );
  const unvisitedWorks = activeWorks.filter((work) => !visitedWorkIds.has(work.id));

  const visitDistance = plans.reduce(
    (sum, plan) => sum + Number(plan.distanceMeters || plan.totalDistanceMeters || 0),
    0,
  );
  const visitMinutes = plans.reduce(
    (sum, plan) => sum + Number(plan.travelMinutes || 0) + Number(plan.visitMinutes || 0),
    0,
  );

  const accesses = Array.isArray(state.encarregadoAccesses)
    ? state.encarregadoAccesses
    : [];

  const activeAccesses = accesses.filter(
    (access) => normalize(access.status) === "ativo",
  );

  const accessWorkIds = new Set(activeAccesses.map((access) => access.workId));
  const worksWithoutAccess = activeWorks.filter((work) => !accessWorkIds.has(work.id));

  const diaryEntries = Object.values(state.diaryNotes || {})
    .filter((value) => String(value || "").trim());

  const printRecords = Array.isArray(state.printRecords) ? state.printRecords : [];

  const mobileOnline = Boolean(
    state.collaboratorStatus?.publicAppUrl
    || state.collaboratorStatus?.lanAppUrl
    || state.collaboratorStatus?.running
    || state.collaboratorStatus?.localActive,
  );

  const differences = [];

  if (measuredUnpaid > 0) {
    differences.push({
      title: "Produção medida ainda não paga",
      difference: money(measuredUnpaid),
      reference: money(measuredValue),
      realized: money(totalPaid),
      cause: "O valor medido supera o total pago registrado.",
      impact: "Produção reconhecida ainda não convertida em recebimento.",
      tone: "red",
      route: "admin-work-measurement",
      workId: selected?.id || "",
      action: "Revisar medições",
    });
  }

  if (pendingAuthorization.length) {
    differences.push({
      title: "Compras aguardando autorização",
      difference: `${pendingAuthorization.length} compra(s)`,
      reference: money(pendingAuthorization.reduce(
        (sum, flow) => sum + Number(flow.quoted || flow.estimated || 0),
        0,
      )),
      realized: "Nenhuma autorização concluída",
      cause: "Solicitações permanecem antes da emissão de pedido.",
      impact: "Itens de execução podem ficar sem material.",
      tone: "amber",
      route: "admin-purchases",
      action: "Autorizar compras",
    });
  }

  if (awaitingDelivery.length) {
    differences.push({
      title: "Pedidos ainda não entregues",
      difference: `${awaitingDelivery.length} entrega(s)`,
      reference: money(awaitingDelivery.reduce(
        (sum, flow) => sum + Number(flow.quoted || flow.estimated || 0),
        0,
      )),
      realized: "Entrega pendente",
      cause: "Materiais permanecem em transporte ou aguardando recebimento.",
      impact: "A produção pode ser interrompida.",
      tone: "cyan",
      route: "admin-purchases",
      action: "Acompanhar entregas",
    });
  }

  if (unvisitedWorks.length) {
    differences.push({
      title: "Obras sem cobertura de visita",
      difference: `${unvisitedWorks.length} obra(s)`,
      reference: `${activeWorks.length} obra(s) ativa(s)`,
      realized: `${visitedWorkIds.size} obra(s) coberta(s)`,
      cause: "As obras não aparecem nas rotas registradas.",
      impact: "Acompanhamento presencial incompleto.",
      tone: "blue",
      route: visitRoute(),
      action: "Planejar visitas",
    });
  }

  if (worksWithoutAccess.length) {
    differences.push({
      title: "Obras sem encarregado ativo",
      difference: `${worksWithoutAccess.length} obra(s)`,
      reference: `${activeWorks.length} obra(s) ativa(s)`,
      realized: `${activeAccesses.length} acesso(s) ativo(s)`,
      cause: "Não existe acesso mobile ativo para todas as obras.",
      impact: "Registros de campo podem deixar de ser produzidos.",
      tone: "purple",
      route: "admin-mobile-platform",
      action: "Configurar acessos",
    });
  }

  if (!mobileOnline) {
    differences.push({
      title: "Plataforma mobile sem conexão",
      difference: "Endereço indisponível",
      reference: "URL local, LAN ou pública",
      realized: "Nenhuma conexão ativa",
      cause: "A estação não publicou um endereço utilizável.",
      impact: "O aplicativo de campo não consegue conectar automaticamente.",
      tone: "red",
      route: "admin-mobile-platform",
      action: "Verificar conexão",
    });
  }

  if (!differences.length) {
    differences.push({
      title: "Nenhuma diferença crítica",
      difference: "Operação regular",
      reference: "Balanços monitorados",
      realized: "Sem pendências críticas",
      cause: "Os dados atuais não excedem os critérios de atenção.",
      impact: "O foco pode permanecer nos próximos marcos.",
      tone: "green",
      route: "admin-works",
      action: "Acompanhar obras",
    });
  }

  const tools = [
    ["Revisar medições", money(measuredUnpaid), "admin-work-measurement", selected?.id || "", "primary"],
    ["Autorizar compras", `${pendingAuthorization.length} pendente(s)`, "admin-purchases", "", ""],
    ["Acompanhar entregas", `${awaitingDelivery.length} em aberto`, "admin-purchases", "", ""],
    ["Planejar visitas", `${unvisitedWorks.length} obra(s) sem cobertura`, visitRoute(), "", ""],
    ["Registrar diário", `${diaryEntries.length} registro(s)`, "admin-work-diary", selected?.id || "", ""],
    ["Configurar campo", `${worksWithoutAccess.length} obra(s) sem acesso`, "admin-mobile-platform", "", ""],
  ];

  return `
    ${pageHeader(
      "Painel de balanços",
      "Referência, realizado, diferença, impacto e ferramenta de resolução.",
      `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`,
    )}

    <section class="balance-attention">
      <article class="balance-differences-panel">
        <header>
          <div>
            <small>Diferenças prioritárias</small>
            <h2>O que precisa ser resolvido</h2>
          </div>
          <span>${differences.length}</span>
        </header>
        <div class="balance-difference-list">
          ${differences.slice(0, 7).map(differenceCard).join("")}
        </div>
      </article>

      <aside class="balance-tools-panel">
        <header>
          <small>Meios de resolução</small>
          <h2>Ferramentas imediatas</h2>
        </header>
        <div class="balance-tools-grid">
          ${tools.map(([label, detail, route, workId, tone]) =>
            actionButton(label, detail, route, workId, tone)
          ).join("")}
        </div>
      </aside>
    </section>

    <section class="balance-card-grid">
      ${balanceCard({
        title: "Produção",
        referenceLabel: "Orçamento",
        referenceValue: money(totalBudget),
        realizedLabel: "Medido",
        realizedValue: money(measuredValue),
        differenceLabel: "Saldo por medir",
        differenceValue: money(balanceToMeasure),
        detail: `${percent(consolidatedProgress)} da produção consolidada foi medida.`,
        tone: "blue",
        route: "admin-work-measurement",
        workId: selected?.id || "",
        action: "Abrir medição",
        progress: consolidatedProgress,
      })}

      ${balanceCard({
        title: "Recebimento",
        referenceLabel: "Medido",
        referenceValue: money(measuredValue),
        realizedLabel: "Pago",
        realizedValue: money(totalPaid),
        differenceLabel: "Ainda não pago",
        differenceValue: money(measuredUnpaid),
        detail: "Produção reconhecida comparada aos pagamentos registrados.",
        tone: measuredUnpaid > 0 ? "red" : "green",
        route: "admin-work-measurement",
        workId: selected?.id || "",
        action: "Revisar valores",
      })}

      ${balanceCard({
        title: "Compromissos",
        referenceLabel: "Comprometido",
        referenceValue: money(totalCommitted),
        realizedLabel: "Pago",
        realizedValue: money(totalPaid),
        differenceLabel: "A liquidar",
        differenceValue: money(committedUnpaid),
        detail: `${money(totalPurchased)} já constam como comprados.`,
        tone: committedUnpaid > 0 ? "amber" : "green",
        route: "admin-purchases",
        action: "Abrir compras",
      })}

      ${balanceCard({
        title: "Suprimentos",
        referenceLabel: "Pipeline",
        referenceValue: money(purchasePipeline),
        realizedLabel: "Pago",
        realizedValue: money(purchasePaid),
        differenceLabel: "Diferença",
        differenceValue: money(Math.max(0, purchasePipeline - purchasePaid)),
        detail: `${pendingAuthorization.length} autorização(ões), ${pendingOrder.length} pedido(s) e ${awaitingDelivery.length} entrega(s).`,
        tone: pendingAuthorization.length || awaitingDelivery.length ? "amber" : "green",
        route: "admin-purchases",
        action: "Resolver pipeline",
      })}
    </section>

    <section class="balance-main">
      <article class="balance-section balance-work-section">
        <header>
          <div>
            <small>Balanço por obra</small>
            <h2>Produção física e financeira</h2>
          </div>
          <button data-message="navigate" data-route="admin-works">Ver obras</button>
        </header>

        <div class="balance-work-list">
          ${works.map(workRow).join("")}
        </div>
      </article>

      <aside class="balance-side">
        <article class="balance-section">
          <header>
            <div>
              <small>Execução</small>
              <h2>Distribuição dos itens</h2>
            </div>
          </header>

          <div class="balance-stat-grid">
            <span><small>Total</small><strong>${integer(items.length)}</strong></span>
            <span class="green"><small>Concluídos</small><strong>${integer(completedItems.length)}</strong></span>
            <span class="blue"><small>Em execução</small><strong>${integer(inProgressItems.length)}</strong></span>
            <span class="red"><small>Não iniciados</small><strong>${integer(notStartedItems.length)}</strong></span>
          </div>

          <footer>
            <button data-message="open-work-section" data-route="admin-work-items" data-work-id="${esc(selected?.id || "")}">Abrir itens</button>
            <button data-message="open-work-section" data-route="admin-work-planning" data-work-id="${esc(selected?.id || "")}">Revisar sequência</button>
          </footer>
        </article>

        <article class="balance-section">
          <header>
            <div>
              <small>Campo</small>
              <h2>Cobertura operacional</h2>
            </div>
          </header>

          <div class="balance-stat-grid">
            <span><small>Obras ativas</small><strong>${integer(activeWorks.length)}</strong></span>
            <span><small>Com visita</small><strong>${integer(visitedWorkIds.size)}</strong></span>
            <span class="${unvisitedWorks.length ? "red" : "green"}"><small>Sem visita</small><strong>${integer(unvisitedWorks.length)}</strong></span>
            <span><small>Acessos ativos</small><strong>${integer(activeAccesses.length)}</strong></span>
            <span class="${worksWithoutAccess.length ? "red" : "green"}"><small>Sem encarregado</small><strong>${integer(worksWithoutAccess.length)}</strong></span>
            <span><small>Diários locais</small><strong>${integer(diaryEntries.length)}</strong></span>
            <span><small>Impressões</small><strong>${integer(printRecords.length)}</strong></span>
            <span class="${mobileOnline ? "green" : "red"}"><small>App mobile</small><strong>${mobileOnline ? "Ativo" : "Pendente"}</strong></span>
          </div>

          <div class="balance-field-meta">
            <span>${distanceLabel(visitDistance)} planejados</span>
            <span>${minutesLabel(visitMinutes)} totais</span>
          </div>

          <footer>
            <button data-message="navigate" data-route="${esc(visitRoute())}">Planejar visitas</button>
            <button data-message="navigate" data-route="admin-mobile-platform">Abrir app de campo</button>
          </footer>
        </article>
      </aside>
    </section>

    <section class="balance-lower">
      <article class="balance-section">
        <header>
          <div>
            <small>Compras</small>
            <h2>Referência, pagamento e diferença</h2>
          </div>
          <button data-message="navigate" data-route="admin-purchases">Abrir fluxo</button>
        </header>

        <div class="balance-purchase-list">
          ${purchases.length
            ? purchases.map(purchaseRow).join("")
            : `<div class="balance-empty">Nenhuma compra registrada.</div>`}
        </div>
      </article>

      <article class="balance-section">
        <header>
          <div>
            <small>Visitas</small>
            <h2>Cobertura, distância e tempo</h2>
          </div>
          <button data-message="navigate" data-route="${esc(visitRoute())}">Abrir planejador</button>
        </header>

        <div class="balance-visit-list">
          ${plans.length
            ? plans.map(visitRow).join("")
            : `<div class="balance-empty">${unvisitedWorks.length} obra(s) sem rota registrada.</div>`}
        </div>
      </article>
    </section>
  `;
}
