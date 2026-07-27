import { availableWorks } from "../../core/data.js";
import { selectedWork, state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { card, pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value) => `${Math.round(Number(value || 0))}%`;

function activeWork() {
  return selectedWork() || availableWorks[0];
}

function workResponsible(work) {
  const access = (state.encarregadoAccesses || []).find((item) => item.workId === work.id);
  return access?.name || work.client || "Equipe de campo";
}

function workChip(work) {
  return `<div class="diary-work-chip"><small>Obra ativa</small><strong>${esc(work.code)}</strong><span>${esc(work.name)}</span></div>`;
}

function parseDate(value) {
  const [day, month, year] = String(value || "").split("/").map(Number);
  if (!day || !month || !year) return new Date(0);
  return new Date(year, month - 1, day);
}

function chunk(items, count) {
  if (!count) return [];
  const safeCount = Math.max(1, count);
  const result = Array.from({ length: safeCount }, () => []);
  items.forEach((item, index) => {
    result[index % safeCount].push(item);
  });
  return result;
}

function buildDiaryEntries(work) {
  const accesses = (state.encarregadoAccesses || []).filter((item) => item.workId === work.id);
  const baseEntries = (work.progressHistory || []).slice().sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const dates = baseEntries.length
    ? baseEntries
    : [{ date: new Date().toLocaleDateString("pt-BR"), progress: work.progress }];
  const groups = chunk(work.items || [], dates.length);
  return dates.map((entry, index) => {
    const services = groups[index] || [];
    const serviceIds = new Set(services.map((item) => item.id));
    const purchases = (state.purchaseFlows || []).filter((flow) => flow.workId === work.id && (serviceIds.size === 0 || serviceIds.has(flow.itemId)));
    const details = [];

    services.forEach((item) => {
      details.push({
        id: `${entry.date}-service-${item.id}`,
        kind: "Serviço",
        title: item.description,
        executor: accesses[0]?.name || workResponsible(work),
        value: item.budget || 0,
        purchaseValue: 0,
        committed: item.committed || 0,
        paid: item.paid || 0,
        progress: item.progress || 0,
        note: `Saldo contratual de ${money(Math.max(0, Number(item.budget || 0) - Number(item.committed || 0)))}`,
        attachments: [
          {
            id: `${entry.date}-${item.id}-field`,
            name: "Registro de campo",
            type: "Foto ou documento",
            status: "Aguardando arquivo",
          },
        ],
      });
    });

    purchases.forEach((flow) => {
      const relatedItem = work.items.find((item) => item.id === flow.itemId);
      details.push({
        id: `${entry.date}-purchase-${flow.id}`,
        kind: "Compra",
        title: flow.title,
        executor: flow.requester || accesses[0]?.name || workResponsible(work),
        value: flow.quoted || flow.estimated || 0,
        purchaseValue: flow.quoted || flow.estimated || 0,
        committed: flow.quoted || flow.estimated || 0,
        paid: flow.paid || 0,
        progress: relatedItem?.progress || 0,
        note: flow.status,
        attachments: [
          {
            id: `${entry.date}-${flow.id}-receipt`,
            name: flow.deliveryEvidence || "Comprovante de compra",
            type: flow.deliveryEvidence ? "Arquivo anexado" : "Recibo ou nota fiscal",
            status: flow.deliveryEvidence ? "Disponível" : "Aguardando arquivo",
          },
          {
            id: `${entry.date}-${flow.id}-delivery`,
            name: "Comprovação de entrega",
            type: "Foto de campo",
            status: flow.delivered ? "Disponível" : "Pendente",
          },
        ],
      });
    });

    const representedTotal = services.reduce((sum, item) => sum + Number(item.budget || 0), 0);
    const purchaseTotal = details.reduce((sum, item) => sum + Number(item.purchaseValue || 0), 0);

    return {
      id: `diary-${work.id}-${entry.date}`,
      date: entry.date,
      progress: entry.progress ?? work.progress,
      responsible: accesses[0]?.name || workResponsible(work),
      details,
      representedTotal,
      purchaseTotal,
      servicesCount: services.length,
      purchasesCount: purchases.length,
      note: entry.progress != null ? `Avanço registrado em ${percent(entry.progress)}` : "Registro consolidado do dia",
    };
  });
}

function diaryToolbarWork(work) {
  return `<div class="diary-toolbar-label"><small>Selecionar obra</small><strong>Timeline diária</strong></div>${availableWorks.map((candidate) => `<button class="diary-work-pill ${candidate.id === work.id ? "active" : ""}" data-message="open-work-section" data-work-id="${esc(candidate.id)}" data-route="admin-work-diary"><span>${esc(candidate.code)}</span><strong>${esc(candidate.name)}</strong></button>`).join("")}`;
}

function diaryTimeline(entries, selected) {
  return `<aside class="diary-day-timeline" aria-label="Dias registrados">
    <header><div><small>Registros da obra</small><h2>Linha do tempo</h2></div><span>${entries.length} dias</span></header>
    <div class="diary-timeline-rail">
      ${entries.slice().reverse().map((entry) => `<button class="diary-timeline-entry ${entry.id === selected?.id ? "active" : ""}" data-message="select-diary-entry" data-entry-id="${esc(entry.id)}">
        <i aria-hidden="true"></i>
        <time>${esc(entry.date)}</time>
        <strong>${percent(entry.progress)}</strong>
        <span>${entry.servicesCount} serviço(s) · ${entry.purchasesCount} compra(s)</span>
        <small>${money(entry.purchaseTotal)} em compras</small>
      </button>`).join("")}
    </div>
  </aside>`;
}

function diarySheet(work, entry, selectedDetail) {
  if (!entry) {
    return `<section class="diary-day-sheet"><div class="empty-state"><h3>Nenhum diário disponível</h3><p>Registros de campo aparecerão aqui após a primeira atualização da obra.</p></div></section>`;
  }
  return `<section class="diary-day-sheet" aria-label="Folha diária de ${esc(entry.date)}">
    <header class="diary-sheet-header">
      <div class="diary-sheet-brand"><span>ME</span><div><small>Maximus Empreendimentos</small><strong>Folha diária de obra</strong></div></div>
      <dl>
        <div><dt>Obra</dt><dd>${esc(work.code)}</dd></div>
        <div><dt>Data</dt><dd>${esc(entry.date)}</dd></div>
        <div><dt>Responsável</dt><dd>${esc(entry.responsible)}</dd></div>
        <div><dt>Avanço acumulado</dt><dd>${percent(entry.progress)}</dd></div>
      </dl>
    </header>
    <div class="diary-sheet-status">
      <span><b style="width:${Math.max(0, Math.min(100, Number(entry.progress || 0)))}%"></b></span>
      <strong>${esc(entry.note)}</strong>
    </div>
    <div class="diary-sheet-table-wrap">
      <table class="diary-sheet-table">
        <thead><tr><th>Tipo</th><th>Descrição do item</th><th>Executor</th><th>Medição</th><th>Valor</th><th>Anexos</th></tr></thead>
        <tbody>
          ${entry.details.length ? entry.details.map((detail) => `<tr class="${detail.id === selectedDetail?.id ? "is-selected" : ""}">
            <td><span class="diary-kind ${detail.kind.toLowerCase()}">${esc(detail.kind)}</span></td>
            <td><button class="diary-row-action" data-message="open-diary-detail" data-detail-id="${esc(detail.id)}"><strong>${esc(detail.title)}</strong><small>${esc(detail.note)}</small></button></td>
            <td>${esc(detail.executor)}</td>
            <td><strong>${percent(detail.progress)}</strong><span class="diary-row-progress"><i style="width:${Math.max(0, Math.min(100, Number(detail.progress || 0)))}%"></i></span></td>
            <td><strong>${money(detail.value)}</strong><small>${detail.kind === "Compra" ? "Compra" : "Orçamento"}</small></td>
            <td><button class="diary-gallery-button" data-message="open-diary-detail" data-detail-id="${esc(detail.id)}"><span>${detail.attachments.length}</span> Galeria</button></td>
          </tr>`).join("") : `<tr><td colspan="6"><div class="empty-state"><h3>Dia sem itens vinculados</h3><p>Associe serviços ou compras a esta data para preencher a folha.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    <footer class="diary-sheet-footer">
      <div><span>Serviços representados</span><strong>${money(entry.representedTotal)}</strong></div>
      <div><span>Total de compras do dia</span><strong>${money(entry.purchaseTotal)}</strong></div>
      <div><span>Percentual da obra</span><strong>${percent(entry.progress)}</strong></div>
    </footer>
  </section>`;
}

function diaryDetailPanel(work, entry, detail) {
  if (!detail) {
    return `<aside class="diary-floating-detail"><div class="diary-detail-empty"><span>01</span><strong>Selecione um item da folha</strong><p>Os dados de execução, valores, anotações e anexos serão inspecionados neste painel.</p></div></aside>`;
  }
  const note = state.diaryNotes?.[detail.id] ?? detail.note ?? "";
  return `<aside class="diary-floating-detail" aria-label="Detalhes de ${esc(detail.title)}">
    <header><div><small>${esc(detail.kind)} · ${esc(entry.date)}</small><h2>${esc(detail.title)}</h2></div><span>${percent(detail.progress)}</span></header>
    <div class="diary-detail-progress"><span><i style="width:${Math.max(0, Math.min(100, Number(detail.progress || 0)))}%"></i></span><small>Medição acumulada do item</small></div>
    <dl class="diary-detail-metadata">
      <div><dt>Obra</dt><dd>${esc(work.name)}</dd></div>
      <div><dt>Executor</dt><dd>${esc(detail.executor)}</dd></div>
      <div><dt>Valor representado</dt><dd>${money(detail.value)}</dd></div>
      <div><dt>Comprometido</dt><dd>${money(detail.committed)}</dd></div>
      <div><dt>Pago</dt><dd>${money(detail.paid)}</dd></div>
      <div><dt>Saldo</dt><dd>${money(Math.max(0, Number(detail.value || 0) - Number(detail.paid || 0)))}</dd></div>
    </dl>
    <label class="diary-executor-note"><span>Anotações do executor</span><textarea data-diary-note="${esc(detail.id)}" placeholder="Descreva ocorrências, impedimentos e decisões do dia.">${esc(note)}</textarea><small>Salvo automaticamente nesta estação.</small></label>
    <section class="diary-attachment-gallery">
      <header><div><small>Evidências</small><strong>Galeria de anexos</strong></div><span>${detail.attachments.length}</span></header>
      ${detail.attachments.map((attachment, index) => `<button type="button" data-message="open-diary-detail" data-detail-id="${esc(detail.id)}">
        <i>${String(index + 1).padStart(2, "0")}</i>
        <span><strong>${esc(attachment.name)}</strong><small>${esc(attachment.type)}</small></span>
        <em class="${attachment.status === "Disponível" ? "available" : ""}">${esc(attachment.status)}</em>
      </button>`).join("")}
    </section>
    <footer><span>Total das compras deste dia</span><strong>${money(entry.purchaseTotal)}</strong></footer>
  </aside>`;
}

export function adminWorkDiary() {
  const work = activeWork();
  const entries = buildDiaryEntries(work);
  const selected = entries.find((entry) => entry.id === state.selectedDiaryEntryId) || entries[entries.length - 1] || entries[0];
  const selectedDetail = selected?.details?.find((detail) => detail.id === state.selectedDiaryDetailId)
    || selected?.details?.[0]
    || null;

  return `${pageHeader(
    "Diário de obras",
    "Acompanhe cada dia como uma folha de campo: serviços, responsáveis, medições, compras e evidências.",
    `${workChip(work)}<div class="diary-page-summary"><small>Valor da obra</small><strong>${money(work.budget)}</strong><span>${percent(work.progress)} concluído</span></div>`,
  )}
    <div class="diary-commandbar">${diaryToolbarWork(work)}</div>
    <section class="diary-professional-layout">
      ${diaryTimeline(entries, selected)}
      ${diarySheet(work, selected, selectedDetail)}
      ${diaryDetailPanel(work, selected, selectedDetail)}
    </section>`;
}
