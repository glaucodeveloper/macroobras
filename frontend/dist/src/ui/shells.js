import {
  initialCollaboratorStatus,
  routes,
  subNavigation,
  topNavigation,
} from "../core/data.js";
import { logo } from "./components.js";
import { esc } from "../core/utils.js";

export function shell({ id, state, screen }) {
  return `<main id="${esc(id)}" class="app is-desktop">
    ${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""}
    ${desktopFrame({ state, screen })}
  </main>`;
}

export function twaShell({ id, state, screen }) {
  return `<main id="${esc(id)}" class="app is-twa">
    ${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""}
    <div class="phone-shell">${screen}</div>
  </main>`;
}

function sectionForRoute(route) {
  if (String(route).startsWith("admin-work-")) return "admin-works";
  return routes.find((item) => item.route === route)?.parent || route;
}

function sidebarKey(route) {
  if (String(route).startsWith("admin-work-")) return "admin-work";
  const section = sectionForRoute(route);
  return subNavigation[section] ? section : "";
}

function desktopFrame({ state, screen }) {
  const route = state.route;
  const section = sectionForRoute(route);
  const key = sidebarKey(route);
  const children = key ? subNavigation[key] || [] : [];
  const current = routes.find((item) => item.route === route);
  const isWorkDrill = key === "admin-work";
  const isNested = isWorkDrill || (key && route !== section);
  const backRoute = isWorkDrill ? "admin-works" : section;
  const collapsed = Boolean(state.sidebarCollapsed && children.length);
  const user = state.authUser || { name: "Admin", email: "Administrador" };
  const initials = String(user.name || "AF").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return `
    <header class="topbar maximus-topbar">
      <button class="brand" data-message="navigate" data-route="admin-dashboard" aria-label="Abrir painel">
        ${logo()}
        <span><strong>MacroObras</strong><small>Gestão de Obras</small></span>
      </button>
      <nav class="top-nav" aria-label="Navegação principal">
        ${topNavigation.map((item) => `<button class="${item.route === section ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}"><i>${esc(item.icon)}</i><span>${esc(item.label)}</span></button>`).join("")}
      </nav>
      ${collaboratorBadge(state.collaboratorStatus)}
      <div class="user-menu-wrap">
        <button class="admin-profile-button" data-message="toggle-user-menu" aria-expanded="${state.userMenuOpen}"><span class="admin-dot">${esc(initials || "AF")}</span><span class="admin-name"><strong>${esc(user.name || "Admin")}</strong><small>${esc(user.email || "Administrador")}</small></span><b>⌄</b></button>
        ${state.userMenuOpen ? userMenu() : ""}
      </div>
    </header>
    ${isNested ? `<div class="drill-header"><button data-message="navigate" data-route="${esc(backRoute)}">← Voltar</button><div><small>${isWorkDrill ? "Obras" : "Subseção"}</small><strong>${esc(current?.label || "Subseção")}</strong></div></div>` : ""}
    <div class="desktop-layout ${children.length ? "has-sidebar" : "no-sidebar"} ${collapsed ? "sidebar-collapsed" : ""}">
      ${children.length ? `<aside class="sidebar drill-sidebar" aria-hidden="${collapsed}"><header class="sidebar-subnav-header"><div><small>${isWorkDrill ? "Página da obra" : "Subnavegação"}</small><strong>${isWorkDrill ? "Obra selecionada" : esc(current?.label || "Seção")}</strong></div><button class="sidebar-collapse-control" data-message="toggle-sidebar" aria-label="${collapsed ? "Expandir subnavegação" : "Recolher subnavegação"}" title="${collapsed ? "Expandir subnavegação" : "Recolher subnavegação"}">${collapsed ? "→" : "←"}</button></header><nav>${children.map((item) => `<button class="${item.route === route ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}"><span>${esc(item.label)}</span><b>›</b></button>`).join("")}</nav></aside>` : ""}
      <section class="workspace maximus-workspace">${screen}</section>
    </div>`;
}

function userMenu() {
  return `<nav class="admin-user-menu" aria-label="Menu do usuário">
    <button data-message="navigate" data-route="admin-help"><b>?</b><span>Ajuda e manual</span></button>
    <button data-message="navigate" data-route="admin-data-transfer"><b>CSV</b><span>Importar e exportar</span></button>
    <button data-message="navigate" data-route="admin-access-config"><b>⌁</b><span>Configuração de acesso</span></button>
    <hr>
    <button class="danger" data-message="logout-admin"><b>↪</b><span>Sair</span></button>
  </nav>`;
}

function collaboratorBadge(status) {
  const safe = status || initialCollaboratorStatus;
  const label = safe.available ? "Campo online" : safe.lanActive ? "Campo na rede" : safe.localActive ? "Campo local" : "Acesso de campo";
  const detail = safe.available || safe.lanActive || safe.localActive
    ? "Gerenciado dentro de cada obra"
    : safe.message;
  return `<div class="collab-badge passive ${safe.available ? "online" : safe.lanActive || safe.localActive ? "local" : ""}" title="Os links individuais são abertos pela página administrativa de cada obra"><strong>${esc(label)}</strong><span>${esc(detail || "Aguardando estação")}</span></div>`;
}
