import { availableWorks } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const number = (value) => Number(value || 0).toLocaleString("pt-BR", {
  maximumFractionDigits: 2,
});
const normalize = (value) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function cityFromAddress(value) {
  const parts = String(value || "").split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.at(-2) : parts[0] || "Sem cidade";
}

function inventoryLocations(materials) {
  const works = availableWorks.map((work) => {
    const city = cityFromAddress(work.address);
    return {
      id: `work:${work.id}`,
      kind: "work",
      workId: work.id,
      city,
      code: work.code,
      name: work.name,
      address: work.address,
      materials: materials.filter((material) => material.workId
        ? material.workId === work.id
        : normalize(material.city) === normalize(city)),
    };
  });
  const knownCities = new Set(works.map((item) => normalize(item.city)));
  const extraCities = [...new Set(materials.map((item) => item.city).filter((city) => city && !knownCities.has(normalize(city))))];
  return [
    ...works,
    ...extraCities.map((city) => ({
      id: `city:${city}`,
      kind: "city",
      workId: "",
      city,
      code: "DEPÓSITO",
      name: `Inventário de ${city}`,
      address: `${city}, Bahia, Brasil`,
      materials: materials.filter((material) => normalize(material.city) === normalize(city)),
    })),
  ];
}

function summarize(location) {
  const items = location?.materials || [];
  const available = items.reduce((sum, item) => sum + Number(item.availableQuantity || 0), 0);
  const reserved = items.reduce((sum, item) => sum + Number(item.reservedQuantity || 0), 0);
  const represented = items.reduce((sum, item) => sum + Number(item.availableQuantity || 0) * Number(item.averageUnitValue || 0), 0);
  return { items: items.length, available, reserved, free: Math.max(0, available - reserved), represented };
}

function locationButton(location, selectedId) {
  const stats = summarize(location);
  return `<button class="inventory-location-item ${location.id === selectedId ? "active" : ""}" data-message="select-inventory-location" data-location-id="${esc(location.id)}">
    <span class="inventory-location-icon">${location.kind === "work" ? "O" : "D"}</span>
    <span class="inventory-location-copy"><small>${esc(location.code)}</small><strong>${esc(location.name)}</strong><em>${esc(location.city)}</em></span>
    <span class="inventory-location-amount"><b>${stats.items}</b><small>itens</small></span>
  </button>`;
}

function materialRows(location) {
  const materials = location?.materials || [];
  if (!materials.length) {
    return `<tr><td colspan="9"><div class="inventory-empty-sheet"><strong>Local sem materiais registrados</strong><p>A obra já participa naturalmente do mapa. Cadastre ou transfira materiais para iniciar a listagem.</p></div></td></tr>`;
  }
  return materials.map((material, index) => {
    const available = Number(material.availableQuantity || 0);
    const reserved = Number(material.reservedQuantity || 0);
    const free = Math.max(0, available - reserved);
    const represented = available * Number(material.averageUnitValue || 0);
    const tone = free <= 0 ? "empty" : free <= available * 0.25 ? "warning" : "available";
    return `<tr>
      <td><span class="inventory-row-index">${String(index + 1).padStart(2, "0")}</span></td>
      <td><div class="inventory-material-name"><small>${esc(material.category)}</small><strong>${esc(material.description)}</strong><span>${esc(material.warehouse)}</span></div></td>
      <td><span class="inventory-stock-status ${tone}">${free > 0 ? "Disponível" : "Esgotado"}</span></td>
      <td><strong>${number(available)}</strong><small>${esc(material.unit)}</small></td>
      <td><strong>${number(reserved)}</strong><small>${esc(material.unit)}</small></td>
      <td><strong>${number(free)}</strong><small>${esc(material.unit)}</small></td>
      <td><strong>${money(material.averageUnitValue)}</strong><small>por ${esc(material.unit)}</small></td>
      <td><strong>${money(represented)}</strong><small>valor representado</small></td>
      <td><div class="inventory-row-actions">
        <label><span>Qtd.</span><input type="number" min="0" step="0.01" value="1" data-inventory-quantity="${esc(material.id)}"></label>
        <label><span>Destino</span><select data-inventory-work="${esc(material.id)}"><option value="">Selecione</option>${availableWorks.map((work) => `<option value="${esc(work.id)}">${esc(work.code)}</option>`).join("")}</select></label>
        <button class="btn compact" data-message="allocate-inventory-material" data-material-id="${esc(material.id)}">Criar ticket</button>
      </div></td>
    </tr>`;
  }).join("");
}

function inventorySheet(location) {
  const stats = summarize(location);
  return `<section class="inventory-ledger-sheet" data-print-report>
    <header class="inventory-ledger-header">
      <div class="inventory-ledger-brand"><span>ME</span><div><small>Maximus Empreendimentos</small><strong>Folha de inventário</strong></div></div>
      <dl><div><dt>Local</dt><dd>${esc(location?.code || "—")}</dd></div><div><dt>Cidade</dt><dd>${esc(location?.city || "—")}</dd></div><div><dt>Itens</dt><dd>${stats.items}</dd></div><div><dt>Valor</dt><dd>${money(stats.represented)}</dd></div></dl>
    </header>
    <div class="inventory-ledger-title">
      <div><small>${location?.kind === "work" ? "Inventário natural da obra" : "Depósito regional"}</small><h2>${esc(location?.name || "Inventário")}</h2><p>${esc(location?.address || "")}</p></div>
      <div class="inventory-ledger-totals"><span><small>Quantidade</small><strong>${number(stats.available)}</strong></span><span><small>Reservado</small><strong>${number(stats.reserved)}</strong></span><span><small>Livre</small><strong>${number(stats.free)}</strong></span></div>
    </div>
    <div class="inventory-ledger-table-wrap"><table class="inventory-ledger-table"><thead><tr><th>#</th><th>Material / depósito</th><th>Estado</th><th>Registrado</th><th>Reservado</th><th>Livre</th><th>Valor médio</th><th>Total</th><th>Alocação</th></tr></thead><tbody>${materialRows(location)}</tbody></table></div>
    <footer class="inventory-ledger-footer"><span>Obras entram automaticamente como locais naturais de inventário.</span><strong>${money(stats.represented)}</strong></footer>
  </section>`;
}

export function adminInventory() {
  const materials = state.inventoryMaterials || [];
  const locations = inventoryLocations(materials);
  const selectedId = state.selectedInventoryCity || locations[0]?.id || "";
  const selected = locations.find((location) => location.id === selectedId) || locations[0] || null;
  const total = locations.reduce((sum, location) => sum + summarize(location).represented, 0);
  return `${pageHeader("Inventário", "Materiais por obra, cidade e depósito, com alocação operacional por ticket.", `<button class="btn ghost" data-message="print-current-report">Exportar / imprimir PDF</button>`)}
    <section class="inventory-command-center">
      <aside class="inventory-location-rail"><header><div><small>Mapa operacional</small><h2>Locais de inventário</h2></div><span>${locations.length}</span></header><div class="inventory-location-list">${locations.map((location) => locationButton(location, selectedId)).join("")}</div><footer><small>Valor total representado</small><strong>${money(total)}</strong></footer></aside>
      <section class="inventory-map-panel"><header><div><small>Google Maps</small><h2>${selected?.kind === "work" ? "Obra e inventário" : "Depósito e inventário"}</h2></div><span>Clique nos marcadores para alternar o local</span></header><div class="google-map inventory-google-map" data-google-map="inventory" data-selected-location-id="${esc(selectedId)}"><div class="map-loading"><span></span><strong>Carregando Google Maps</strong><small>Obras, depósitos e inventário</small></div></div></section>
    </section>
    ${inventorySheet(selected)}`;
}
