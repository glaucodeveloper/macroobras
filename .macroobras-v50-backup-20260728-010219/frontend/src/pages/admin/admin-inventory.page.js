import { availableWorks } from "../../core/data.js";
import { state } from "../../core/state.js";
import { esc } from "../../core/utils.js";
import { pageHeader } from "../../ui/components.js";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cityNames = (materials) => [...new Set(materials.map((item) => item.city))].sort((a, b) => a.localeCompare(b));

function citySummary(city, materials) {
  const items = materials.filter((item) => item.city === city);
  return {
    items: items.length,
    available: items.reduce((sum, item) => sum + Number(item.availableQuantity || 0), 0),
    represented: items.reduce((sum, item) => sum + Number(item.availableQuantity || 0) * Number(item.averageUnitValue || 0), 0),
  };
}

function materialCard(material) {
  const free = Math.max(0, Number(material.availableQuantity || 0) - Number(material.reservedQuantity || 0));

  return `<article class="inventory-material-card">
    <header><div><small>${esc(material.category)}</small><strong>${esc(material.description)}</strong></div><span>${esc(material.condition)}</span></header>
    <dl>
      <div><dt>Disponível</dt><dd>${free.toLocaleString("pt-BR")} ${esc(material.unit)}</dd></div>
      <div><dt>Reservado</dt><dd>${Number(material.reservedQuantity || 0).toLocaleString("pt-BR")} ${esc(material.unit)}</dd></div>
      <div><dt>Valor médio</dt><dd>${money(material.averageUnitValue)}</dd></div>
      <div><dt>Depósito</dt><dd>${esc(material.warehouse)}</dd></div>
    </dl>
    <div class="inventory-allocation-form">
      <label><span>Quantidade</span><input type="number" min="0" step="0.01" data-inventory-quantity="${esc(material.id)}" value="1"></label>
      <label><span>Obra de destino</span><select data-inventory-work="${esc(material.id)}"><option value="">Selecione uma obra</option>${availableWorks.map((work) => `<option value="${esc(work.id)}">${esc(work.code)} · ${esc(work.name)}</option>`).join("")}</select></label>
      <button class="btn" data-message="allocate-inventory-material" data-material-id="${esc(material.id)}">Criar ticket de alocação</button>
    </div>
  </article>`;
}

export function adminInventory() {
  const materials = state.inventoryMaterials || [];
  const allCities = cityNames(materials);
  const selectedCity = state.selectedInventoryCity || allCities[0] || "";
  const visible = materials.filter((item) => item.city === selectedCity);
  const summary = citySummary(selectedCity, materials);

  return `${pageHeader("Inventário", "Materiais disponíveis por cidade, depósito e obra de destino.", `<button class="btn ghost" data-message="print-current-report">Imprimir inventário</button>`)}
    <section class="inventory-map-layout" data-print-report>
      <aside class="inventory-city-list">
        <header><small>Localidades</small><h2>Cidades com inventário</h2></header>
        ${allCities.map((city) => { const stats = citySummary(city, materials); return `<button class="${city === selectedCity ? "active" : ""}" data-message="select-inventory-city" data-city="${esc(city)}"><span><strong>${esc(city)}</strong><small>${stats.items} material(is)</small></span><b>${money(stats.represented)}</b></button>`; }).join("")}
      </aside>
      <div class="inventory-map-stage">
        <header><div><small>Inventário disponível</small><h2>${esc(selectedCity)}</h2></div><dl><div><dt>Materiais</dt><dd>${summary.items}</dd></div><div><dt>Quantidade</dt><dd>${summary.available.toLocaleString("pt-BR")}</dd></div><div><dt>Valor representado</dt><dd>${money(summary.represented)}</dd></div></dl></header>
        <div class="inventory-city-map" aria-hidden="true">
          <span class="inventory-map-road road-a"></span><span class="inventory-map-road road-b"></span><span class="inventory-map-road road-c"></span>
          ${allCities.map((city, index) => `<button class="inventory-map-pin ${city === selectedCity ? "active" : ""}" style="left:${18 + (index * 19) % 70}%;top:${20 + (index * 27) % 58}%;" data-message="select-inventory-city" data-city="${esc(city)}"><i></i><span>${esc(city)}</span></button>`).join("")}
        </div>
        <div class="inventory-material-grid">${visible.length ? visible.map(materialCard).join("") : `<div class="empty-state"><h3>Sem materiais nesta cidade</h3><p>Cadastre um depósito ou transfira materiais para a localidade.</p></div>`}</div>
      </div>
    </section>`;
}
