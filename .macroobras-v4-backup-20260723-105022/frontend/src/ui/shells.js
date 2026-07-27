import { initialCollaboratorStatus, primaryAdminRoutes, routes } from "../core/data.js";
import { logo } from "./components.js";
import { esc } from "../core/utils.js";

export function shell({ id, state, screen }) {
  return `<main id="${esc(id)}" class="app is-desktop">${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}${desktopFrame({ route: state.route, screen, collaboratorStatus: state.collaboratorStatus })}</main>`;
}

export function twaShell({ id, state, screen }) {
  return `<main id="${esc(id)}" class="app is-twa">${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}<div class="phone-shell">${screen}</div></main>`;
}

function desktopFrame({ route, screen, collaboratorStatus }) {
  const sidebarRoutes = routes.filter((item) => item.mode === "admin");
  const topRoutes = primaryAdminRoutes.map((routeName) => routes.find((item) => item.route === routeName)).filter(Boolean);
  const current = routes.find((item) => item.route === route);
  return `
    <header class="topbar carbon-topbar">
      <div class="brand">${logo()}<div><strong>MacroObras</strong><span>Administração de obras</span></div></div>
      <nav class="top-nav">${topRoutes.map((item) => `<button class="${item.group === current?.group ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}">${esc(item.group)}</button>`).join("")}</nav>
      ${collaboratorBadge(collaboratorStatus)}
      <div class="admin-dot">AF</div><div class="admin-name"><strong>Admin</strong><span>Autorizador</span></div>
    </header>
    <div class="desktop-layout carbon-layout">
      <aside class="sidebar carbon-sidebar"><div class="sidebar-title">Páginas</div>${sidebarRoutes.map((item) => `<button class="${item.route === route ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}"><i>${esc(item.icon || "•")}</i><span>${esc(item.group)}</span>${esc(item.label)}</button>`).join("")}</aside>
      <section class="workspace carbon-workspace">${screen}</section>
    </div>`;
}

function collaboratorBadge(status) {
  const safeStatus = status || initialCollaboratorStatus;
  if (safeStatus.available) return `<a class="collab-badge online" href="${esc(safeStatus.baseUrl)}" target="_blank" rel="noreferrer"><strong>Campo online</strong><span>${esc(safeStatus.baseUrl)}</span></a>`;
  if (safeStatus.localActive) return `<a class="collab-badge local" href="${esc(safeStatus.localBaseUrl)}" target="_blank" rel="noreferrer"><strong>Campo local ativo</strong><span>${esc(safeStatus.localBaseUrl)}</span></a>`;
  return `<div class="collab-badge"><strong>Acesso de campo</strong><span>${esc(safeStatus.message || "Aguardando publicação")}</span></div>`;
}
