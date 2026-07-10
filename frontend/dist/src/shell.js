import { initialCollaboratorStatus, mobileRoutes, routes } from "./data.js";
import { logo } from "./components.js";
import { esc } from "./utils.js";

export function shell({ id, state, screen }) {
  return `
    <main id="${esc(id)}" class="app is-desktop">
      ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
      ${desktopFrame({ route: state.route, screen, collaboratorStatus: state.collaboratorStatus })}
    </main>
  `;
}

export function twaShell({ id, state, screen }) {
  return `
    <main id="${esc(id)}" class="app is-twa">
      ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
      <div class="phone-shell">${screen}</div>
    </main>
  `;
}

function desktopFrame({ route, screen, collaboratorStatus }) {
  const sidebarRoutes = routes.filter((item) => item.mode === "admin");

  return `
    <header class="topbar">
      <div class="brand">${logo()}<div><strong>MacroObras</strong><span>Gestão de Obras</span></div></div>
      <nav class="top-nav">${routes.map((item) => `<button class="${item.route === route ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}">${esc(item.group)}</button>`).join("")}</nav>
      ${collaboratorBadge(collaboratorStatus)}
      <div class="admin-dot">AF</div><div class="admin-name"><strong>Admin</strong><span>Administrador</span></div>
    </header>
    <div class="desktop-layout">
      <aside class="sidebar">
        <div class="sidebar-title">Operação administrativa</div>
        ${sidebarRoutes.map((item) => `<button class="${item.route === route ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}"><span>${esc(item.group)}</span>${esc(item.label)}</button>`).join("")}
      </aside>
      <section class="workspace">${screen}</section>
    </div>
  `;
}

function collaboratorBadge(status) {
  const safeStatus = status || initialCollaboratorStatus;
  if (safeStatus.available) {
    return `<a class="collab-badge online" href="${esc(safeStatus.baseUrl)}" target="_blank" rel="noreferrer"><strong>Colaborador online</strong><span>${esc(safeStatus.baseUrl)}</span></a>`;
  }

  if (safeStatus.localActive) {
    return `<a class="collab-badge local" href="${esc(safeStatus.localBaseUrl)}" target="_blank" rel="noreferrer"><strong>Colaborador local ativo</strong><span>${esc(safeStatus.localBaseUrl)} · público aguardando</span></a>`;
  }

  return `<div class="collab-badge"><strong>Endpoint de colaboradores</strong><span>${esc(safeStatus.message || "Aguardando publicação")}</span></div>`;
}
