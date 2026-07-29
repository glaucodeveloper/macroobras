import { esc } from "../../core/utils.js";

function disabled(editing) {
  return editing ? "" : "disabled";
}

function logo(customization) {
  return customization.letterheadLogoDataUrl
    ? `<img src="${esc(customization.letterheadLogoDataUrl)}" alt="Marca">`
    : `<span>${esc(customization.letterheadLogoText || "ME")}</span>`;
}

export function letterheadSettings(customization = {}, editing = false, auth = {}) {
  const trade = customization.letterheadTradeName
    || customization.stationName
    || "Maximus Empreendimentos";
  const legal = customization.letterheadLegalName || trade;
  const email = customization.letterheadEmail
    || auth.email
    || customization.adminLoginEmail
    || "";
  const responsible = customization.letterheadResponsible
    || auth.name
    || customization.adminName
    || "Administração";

  return `<section class="letterhead-settings">
    <header>
      <div>
        <small>Impressão institucional</small>
        <h2>Modelo timbrado de PDF</h2>
        <p>Aplicado automaticamente aos canvases e relatórios.</p>
      </div>
      <div>
        <button class="btn ghost" data-message="edit-settings" ${editing ? "disabled" : ""}>Editar</button>
        <button class="btn" data-message="save-settings-top" ${editing ? "" : "disabled"}>Salvar modelo</button>
        <button class="btn ghost" data-message="print-letterhead-preview">
          Imprimir modelo de prova
        </button>
        <label class="btn ghost">
          Carregar logomarca
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            data-letterhead-logo-file
            ${disabled(editing)}
          >
        </label>
        <button
          class="btn ghost"
          data-message="remove-letterhead-logo"
          ${disabled(editing)}
        >
          Remover logo
        </button>
      </div>
    </header>

    <div class="letterhead-settings-layout">
      <form class="letterhead-form" data-settings-form>
        <label>
          <span>Nome fantasia</span>
          <input data-setting-field="letterheadTradeName" value="${esc(trade)}" ${disabled(editing)}>
        </label>
        <label>
          <span>Razão social</span>
          <input data-setting-field="letterheadLegalName" value="${esc(legal)}" ${disabled(editing)}>
        </label>
        <label>
          <span>CNPJ</span>
          <input data-setting-field="letterheadCnpj" value="${esc(customization.letterheadCnpj || "")}" ${disabled(editing)}>
        </label>
        <label>
          <span>Código documental</span>
          <input data-setting-field="letterheadDocumentCode" value="${esc(customization.letterheadDocumentCode || "MO")}" ${disabled(editing)}>
        </label>
        <label class="wide">
          <span>Endereço</span>
          <input data-setting-field="letterheadAddress" value="${esc(customization.letterheadAddress || "")}" ${disabled(editing)}>
        </label>
        <label>
          <span>Telefone</span>
          <input data-setting-field="letterheadPhone" value="${esc(customization.letterheadPhone || "")}" ${disabled(editing)}>
        </label>
        <label>
          <span>Email</span>
          <input type="email" data-setting-field="letterheadEmail" value="${esc(email)}" ${disabled(editing)}>
        </label>
        <label>
          <span>Responsável</span>
          <input data-setting-field="letterheadResponsible" value="${esc(responsible)}" ${disabled(editing)}>
        </label>
        <label>
          <span>Sigla da marca</span>
          <input data-setting-field="letterheadLogoText" value="${esc(customization.letterheadLogoText || "ME")}" ${disabled(editing)}>
        </label>
        <label class="wide">
          <span>Rodapé institucional</span>
          <textarea data-setting-field="letterheadFooter" ${disabled(editing)}>${esc(customization.letterheadFooter || "Documento emitido pelo MacroObras.")}</textarea>
        </label>
      </form>

      <article class="letterhead-preview" data-letterhead-preview data-print-title="Modelo timbrado">
        <header>
          <div class="letterhead-preview-company">
            <div class="letterhead-preview-logo">${logo(customization)}</div>
            <div>
              <small>${esc(legal)}</small>
              <strong>${esc(trade)}</strong>
              <span>${esc(customization.letterheadAddress || "Endereço institucional")}</span>
              <em>${esc(email || "Contato institucional")}</em>
            </div>
          </div>
          <div class="letterhead-preview-document">
            <small>${esc(customization.letterheadDocumentCode || "MO")}</small>
            <strong>Canvas / relatório</strong>
            <span>Documento operacional timbrado</span>
          </div>
        </header>
        <main>
          <div class="letterhead-preview-diagram">
            <article>
              <small>Serviço</small>
              <strong>Item de execução</strong>
              <span>Porcentagem apreçada: 24,50%</span>
            </article>
            <i></i>
            <article>
              <small>Material</small>
              <strong>Requisito associado</strong>
              <span>Quantidade e unidade</span>
            </article>
          </div>
        </main>
        <footer>
          <div>
            <strong>${esc(responsible)}</strong>
            <span>${esc(customization.letterheadFooter || "Documento emitido pelo MacroObras.")}</span>
          </div>
          <b>01</b>
        </footer>
      </article>
    </div>
  </section>`;
}
