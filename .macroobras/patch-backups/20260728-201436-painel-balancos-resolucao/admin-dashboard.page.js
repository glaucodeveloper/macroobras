import {
  availableWorks,
  routes,
} from "../../core/data.js";
import {
  selectedWork,
  state,
} from "../../core/state.js";
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

const routeExists = (route) =>
  routes.some((item) => item.route === route);

const visitPlannerRoute = () =>
  routeExists("admin-works-visits")
    ? "admin-works-visits"
    : "admin-visits";

const activeWork = () =>
  selectedWork()
  || availableWorks[0]
  || null;

const isCompletedWork = (work) =>
  normalize(work?.status).includes("conclu")
  || normalize(work?.status).includes("finaliz");

const workPaid = (work) => {
  const direct = Number(work?.paid || 0);

  if (direct > 0) return direct;

  return (work?.items || []).reduce(
    (sum, item) => sum + Number(item.paid || 0),
    0,
  );
};

const planStops = (plan) => {
  if (Array.isArray(plan?.stops) && plan.stops.length) {
    return plan.stops;
  }

  if (Array.isArray(plan?.schedule) && plan.schedule.length) {
    return plan.schedule;
  }

  if (Array.isArray(plan?.workIds)) {
    return plan.workIds
      .map((workId) => {
        const work = availableWorks.find(
          (item) => item.id === workId,
        );

        return work
          ? {
              workId: work.id,
              name: work.name,
              address: work.address,
            }
          : null;
      })
      .filter(Boolean);
  }

  return [];
};

const planDistance = (plan) =>
  Number(
    plan?.distanceMeters
    || plan?.totalDistanceMeters
    || 0,
  );

const minutesLabel = (value) => {
  const total = Math.max(0, Math.round(Number(value || 0)));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  return hours
    ? `${hours}h ${String(minutes).padStart(2, "0")}min`
    : `${minutes}min`;
};

const distanceLabel = (meters) => {
  const value = Number(meters || 0);

  if (!(value > 0)) return "—";

  return `${(value / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: value >= 100000 ? 0 : 1,
    maximumFractionDigits: 1,
  })} km`;
};

function progressBar(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));

  return `
    <div class="dashboard-progress">
      <span style="width:${safe}%"></span>
    </div>
  `;
}

function commandButton({
  label,
  detail,
  route,
  workId = "",
  tone = "",
}) {
  const message = workId
    ? "open-work-section"
    : "navigate";

  return `
    <button
      type="button"
      class="dashboard-command ${esc(tone)}"
      data-message="${message}"
      data-route="${esc(route)}"
      ${workId ? `data-work-id="${esc(workId)}"` : ""}
    >
      <strong>${esc(label)}</strong>
      <span>${esc(detail)}</span>
    </button>
  `;
}

function summaryCard({
  label,
  value,
  detail,
  foot,
  tone = "blue",
  progress = null,
}) {
  return `
    <article class="dashboard-summary-card tone-${esc(tone)}">
      <header>
        <small>${esc(label)}</small>
        <i></i>
      </header>
      <strong>${esc(value)}</strong>
      <span>${esc(detail)}</span>
      ${progress == null ? "" : progressBar(progress)}
      <footer>${esc(foot)}</footer>
    </article>
  `;
}

function priorityRow(item) {
  const message = item.workId
    ? "open-work-section"
    : "navigate";

  return `
    <button
      type="button"
      class="dashboard-priority-row tone-${esc(item.tone || "blue")}"
      data-message="${message}"
      data-route="${esc(item.route)}"
      ${item.workId ? `data-work-id="${esc(item.workId)}"` : ""}
    >
      <i></i>
      <span>
        <strong>${esc(item.title)}</strong>
        <small>${esc(item.detail)}</small>
      </span>
      <b>${esc(item.action || "Abrir")}</b>
    </button>
  `;
}

function purchaseStage(flow) {
  if (flow.delivered) return "Concluída";
  if (flow.ordered) return "Entrega";
  if (flow.authorized) return "Pedido";
  if (Number(flow.quoted || 0) > 0) return "Autorização";
  return "Cotação";
}

function purchaseTone(flow) {
  if (flow.delivered) return "green";
  if (!flow.authorized) return "amber";
  if (flow.ordered && !flow.delivered) return "cyan";
  return "blue";
}

function purchaseRow(flow) {
  const work = availableWorks.find(
    (item) => item.id === flow.workId,
  );

  const value = Number(flow.quoted || flow.estimated || 0);

  return `
    <button
      type="button"
      class="dashboard-purchase-row"
      data-message="open-work-section"
      data-route="admin-work-purchases"
      data-work-id="${esc(flow.workId || "")}"
    >
      <span>
        <strong>${esc(flow.title || flow.material || "Compra")}</strong>
        <small>${esc(work?.name || "Obra não vinculada")}</small>
      </span>
      <em class="tone-${purchaseTone(flow)}">${esc(purchaseStage(flow))}</em>
      <b>${money(value)}</b>
    </button>
  `;
}

function workRow(work) {
  const measured = Number(work.budget || 0)
    * Number(work.progress || 0)
    / 100;

  return `
    <article class="dashboard-work-row">
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

      ${progressBar(work.progress)}

      <footer>
        <span>${money(measured)} medidos</span>
        <span>${money(workPaid(work))} pagos</span>
      </footer>
    </article>
  `;
}

function visitRow(plan) {
  const stops = planStops(plan);
  const first = stops[0];
  const last = stops[stops.length - 1];
  const totalMinutes = Number(plan.travelMinutes || 0)
    + Number(plan.visitMinutes || 0);

  return `
    <button
      type="button"
      class="dashboard-visit-row"
      data-message="navigate"
      data-route="${esc(visitPlannerRoute())}"
    >
      <span>
        <strong>${esc(plan.name || "Rota de visitas")}</strong>
        <small>
          ${esc(first?.name || first?.address || "Origem não informada")}
          →
          ${esc(last?.name || last?.address || "Destino não informado")}
        </small>
      </span>
      <b>${distanceLabel(planDistance(plan))}</b>
      <em>${minutesLabel(totalMinutes)}</em>
    </button>
  `;
}

export function adminDashboard() {
  const works = availableWorks || [];
  const selected = activeWork();
  const activeWorks = works.filter(
    (work) => !isCompletedWork(work),
  );

  const items = works.flatMap(
    (work) => (work.items || []).map((item) => ({
      ...item,
      workId: work.id,
      workName: work.name,
    })),
  );

  const totalBudget = works.reduce(
    (sum, work) => sum + Number(work.budget || 0),
    0,
  );

  const measuredValue = works.reduce(
    (sum, work) =>
      sum
      + (
        Number(work.budget || 0)
        * Number(work.progress || 0)
        / 100
      ),
    0,
  );

  const totalPaid = works.reduce(
    (sum, work) => sum + workPaid(work),
    0,
  );

  const totalCommitted = items.reduce(
    (sum, item) => sum + Number(item.committed || 0),
    0,
  );

  const consolidatedProgress = totalBudget
    ? measuredValue / totalBudget * 100
    : 0;

  const balanceToMeasure = Math.max(
    0,
    totalBudget - measuredValue,
  );

  const inProgressItems = items.filter(
    (item) =>
      Number(item.progress || 0) > 0
      && Number(item.progress || 0) < 100,
  );

  const completedItems = items.filter(
    (item) => Number(item.progress || 0) >= 100,
  );

  const notStartedItems = items.filter(
    (item) => Number(item.progress || 0) <= 0,
  );

  const purchases = Array.isArray(state.purchaseFlows)
    ? state.purchaseFlows
    : [];

  const pendingAuthorization = purchases.filter(
    (flow) => !flow.authorized && !flow.delivered,
  );

  const pendingOrder = purchases.filter(
    (flow) => flow.authorized && !flow.ordered,
  );

  const awaitingDelivery = purchases.filter(
    (flow) => flow.ordered && !flow.delivered,
  );

  const purchasePipelineValue = purchases.reduce(
    (sum, flow) =>
      sum + Number(flow.quoted || flow.estimated || 0),
    0,
  );

  const plans = Array.isArray(state.visitPlans)
    ? state.visitPlans
    : [];

  const visitDistance = plans.reduce(
    (sum, plan) => sum + planDistance(plan),
    0,
  );

  const visitMinutes = plans.reduce(
    (sum, plan) =>
      sum
      + Number(plan.travelMinutes || 0)
      + Number(plan.visitMinutes || 0),
    0,
  );

  const visitedWorkIds = new Set(
    plans.flatMap((plan) =>
      planStops(plan)
        .map((stop) => stop.workId)
        .filter(Boolean),
    ),
  );

  const unvisitedWorks = activeWorks.filter(
    (work) => !visitedWorkIds.has(work.id),
  );

  const accesses = Array.isArray(state.encarregadoAccesses)
    ? state.encarregadoAccesses
    : [];

  const activeAccesses = accesses.filter(
    (access) => normalize(access.status) === "ativo",
  );

  const accessWorkIds = new Set(
    activeAccesses.map((access) => access.workId),
  );

  const worksWithoutAccess = activeWorks.filter(
    (work) => !accessWorkIds.has(work.id),
  );

  const diaryEntries = Object.values(
    state.diaryNotes || {},
  ).filter((value) => String(value || "").trim());

  const printRecords = Array.isArray(state.printRecords)
    ? state.printRecords
    : [];

  const collaboratorOnline = Boolean(
    state.collaboratorStatus?.publicAppUrl
    || state.collaboratorStatus?.lanAppUrl
    || state.collaboratorStatus?.running
    || state.collaboratorStatus?.localActive,
  );

  const priorities = [];

  pendingAuthorization.slice(0, 2).forEach((flow) => {
    const work = works.find(
      (item) => item.id === flow.workId,
    );

    priorities.push({
      title: `Autorizar compra: ${flow.title || flow.material}`,
      detail: `${work?.name || "Obra"} · ${money(flow.quoted || flow.estimated)}`,
      tone: "amber",
      route: "admin-work-purchases",
      workId: flow.workId,
      action: "Decidir",
    });
  });

  awaitingDelivery.slice(0, 2).forEach((flow) => {
    const work = works.find(
      (item) => item.id === flow.workId,
    );

    priorities.push({
      title: `Acompanhar entrega: ${flow.title || flow.material}`,
      detail: `${work?.name || "Obra"} · ${flow.transport || "Em andamento"}`,
      tone: "cyan",
      route: "admin-work-purchases",
      workId: flow.workId,
      action: "Acompanhar",
    });
  });

  unvisitedWorks.slice(0, 1).forEach((work) => {
    priorities.push({
      title: `Programar visita: ${work.name}`,
      detail: work.address || "Obra sem rota registrada",
      tone: "blue",
      route: visitPlannerRoute(),
      action: "Planejar",
    });
  });

  worksWithoutAccess.slice(0, 1).forEach((work) => {
    priorities.push({
      title: `Definir acesso de campo: ${work.name}`,
      detail: "Nenhum encarregado ativo vinculado à obra",
      tone: "purple",
      route: "admin-work-access",
      workId: work.id,
      action: "Configurar",
    });
  });

  if (!collaboratorOnline) {
    priorities.push({
      title: "Plataforma mobile sem endereço disponível",
      detail: "Verifique o serviço local, LAN ou túnel público",
      tone: "red",
      route: "admin-mobile-platform",
      action: "Verificar",
    });
  }

  if (!priorities.length && activeWorks[0]) {
    priorities.push({
      title: `Acompanhar próximo marco: ${activeWorks[0].name}`,
      detail: activeWorks[0].nextMilestone || "Revisar produção da obra",
      tone: "green",
      route: "admin-work-overview",
      workId: activeWorks[0].id,
      action: "Acompanhar",
    });
  }

  const commands = [
    {
      label: "Nova obra",
      detail: "Cadastro e localização",
      route: "admin-add-work",
      tone: "primary",
    },
    {
      label: "Compras",
      detail: `${pendingAuthorization.length + pendingOrder.length + awaitingDelivery.length} em ação`,
      route: "admin-purchases",
    },
    {
      label: "Planejar visitas",
      detail: `${plans.length} rota(s) registrada(s)`,
      route: visitPlannerRoute(),
    },
    {
      label: "Medição",
      detail: selected
        ? percent(selected.progress)
        : "Selecionar obra",
      route: "admin-work-measurement",
      workId: selected?.id || "",
    },
    {
      label: "Diário",
      detail: `${diaryEntries.length} anotação(ões) local(is)`,
      route: "admin-work-diary",
      workId: selected?.id || "",
    },
    {
      label: "App de campo",
      detail: collaboratorOnline
        ? `${activeAccesses.length} acesso(s) ativo(s)`
        : "Conexão pendente",
      route: "admin-mobile-platform",
    },
  ];

  return `
    ${pageHeader(
      "Painel de produção",
      "Síntese executiva das obras, decisões pendentes e controles imediatos.",
      `<button class="btn" data-message="navigate" data-route="admin-add-work">Adicionar obra</button>`,
    )}

    <section class="dashboard-command-center">
      <header>
        <div>
          <small>Controle imediato</small>
          <strong>Operações principais</strong>
        </div>
        <span>
          ${collaboratorOnline ? "Plataforma de campo conectada" : "Plataforma de campo pendente"}
        </span>
      </header>

      <nav>
        ${commands.map(commandButton).join("")}
      </nav>
    </section>

    <section class="dashboard-summary-grid">
      ${summaryCard({
        label: "Produção medida",
        value: percent(consolidatedProgress),
        detail: `${money(measuredValue)} de ${money(totalBudget)}`,
        foot: `${money(balanceToMeasure)} ainda por medir`,
        tone: "blue",
        progress: consolidatedProgress,
      })}

      ${summaryCard({
        label: "Fluxo financeiro",
        value: money(totalPaid),
        detail: `${money(totalCommitted)} comprometidos`,
        foot: `${money(Math.max(0, totalCommitted - totalPaid))} comprometidos e não pagos`,
        tone: "green",
      })}

      ${summaryCard({
        label: "Operação das obras",
        value: integer(activeWorks.length),
        detail: `${inProgressItems.length} itens em execução`,
        foot: `${completedItems.length} concluídos · ${notStartedItems.length} não iniciados`,
        tone: "purple",
      })}

      ${summaryCard({
        label: "Compras em ação",
        value: integer(
          pendingAuthorization.length
          + pendingOrder.length
          + awaitingDelivery.length,
        ),
        detail: money(purchasePipelineValue),
        foot: `${pendingAuthorization.length} autorizações · ${awaitingDelivery.length} entregas`,
        tone: "amber",
      })}

      ${summaryCard({
        label: "Cobertura de visitas",
        value: `${visitedWorkIds.size}/${activeWorks.length}`,
        detail: `${plans.length} rota(s) · ${distanceLabel(visitDistance)}`,
        foot: `${minutesLabel(visitMinutes)} planejados`,
        tone: "cyan",
        progress: activeWorks.length
          ? visitedWorkIds.size / activeWorks.length * 100
          : 0,
      })}

      ${summaryCard({
        label: "Produção de campo",
        value: integer(activeAccesses.length),
        detail: `${diaryEntries.length} registros locais`,
        foot: `${printRecords.length} impressão(ões) registrada(s)`,
        tone: collaboratorOnline ? "green" : "red",
      })}
    </section>

    <section class="dashboard-production-grid">
      <article class="dashboard-panel dashboard-priority-panel">
        <header>
          <div>
            <small>Fila de decisão</small>
            <h2>O que requer atenção</h2>
          </div>
          <span>${priorities.length}</span>
        </header>

        <div class="dashboard-priority-list">
          ${priorities.slice(0, 6).map(priorityRow).join("")}
        </div>
      </article>

      <article class="dashboard-panel dashboard-works-production">
        <header>
          <div>
            <small>Produção por obra</small>
            <h2>Avanço físico e financeiro</h2>
          </div>
          <button
            type="button"
            class="dashboard-panel-link"
            data-message="navigate"
            data-route="admin-works"
          >
            Ver obras
          </button>
        </header>

        <div class="dashboard-work-list">
          ${works.map(workRow).join("")}
        </div>
      </article>

      <article class="dashboard-panel dashboard-purchases-panel">
        <header>
          <div>
            <small>Compras</small>
            <h2>Pipeline imediato</h2>
          </div>
          <button
            type="button"
            class="dashboard-panel-link"
            data-message="navigate"
            data-route="admin-purchases"
          >
            Abrir fluxo
          </button>
        </header>

        <div class="dashboard-purchase-list">
          ${purchases.length
            ? purchases.slice(0, 6).map(purchaseRow).join("")
            : `<div class="dashboard-panel-empty">
                <strong>Nenhuma compra registrada</strong>
                <span>As solicitações das obras aparecerão aqui.</span>
              </div>`}
        </div>
      </article>

      <article class="dashboard-panel dashboard-visits-panel">
        <header>
          <div>
            <small>Visitas e campo</small>
            <h2>Rotas e capacidade operacional</h2>
          </div>
          <button
            type="button"
            class="dashboard-panel-link"
            data-message="navigate"
            data-route="${esc(visitPlannerRoute())}"
          >
            Planejar
          </button>
        </header>

        <div class="dashboard-field-summary">
          <span>
            <small>Rotas</small>
            <strong>${integer(plans.length)}</strong>
          </span>
          <span>
            <small>Distância</small>
            <strong>${distanceLabel(visitDistance)}</strong>
          </span>
          <span>
            <small>Acessos ativos</small>
            <strong>${integer(activeAccesses.length)}</strong>
          </span>
          <span>
            <small>Obras sem acesso</small>
            <strong>${integer(worksWithoutAccess.length)}</strong>
          </span>
        </div>

        <div class="dashboard-visit-list">
          ${plans.length
            ? plans.slice(0, 5).map(visitRow).join("")
            : `<div class="dashboard-panel-empty">
                <strong>Nenhuma rota registrada</strong>
                <span>Abra o Planejador de visitas para produzir a primeira rota.</span>
              </div>`}
        </div>
      </article>
    </section>
  `;
}
