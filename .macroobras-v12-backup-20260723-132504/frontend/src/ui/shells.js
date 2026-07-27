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
      <div class="admin-dot">AF</div>
      <div class="admin-name"><strong>Admin</strong><small>Administrador</small></div>
    </header>
    ${isNested ? `<div class="drill-header"><button data-message="navigate" data-route="${esc(backRoute)}">← Voltar</button><div><small>${isWorkDrill ? "Obras" : "Subseção"}</small><strong>${esc(current?.label || "Subseção")}</strong></div>${children.length ? `<button class="sidebar-collapse-control" data-message="toggle-sidebar" aria-label="${collapsed ? "Expandir subnavegação" : "Recolher subnavegação"}" title="${collapsed ? "Expandir subnavegação" : "Recolher subnavegação"}">${collapsed ? "→" : "←"}<span>${collapsed ? "Expandir menu" : "Recolher menu"}</span></button>` : ""}</div>` : ""}
    <div class="desktop-layout ${children.length ? "has-sidebar" : "no-sidebar"} ${collapsed ? "sidebar-collapsed" : ""}">
      ${children.length ? `<aside class="sidebar drill-sidebar" aria-hidden="${collapsed}"><div class="sidebar-title">${isWorkDrill ? "Página da obra" : "Subnavegação"}</div>${children.map((item) => `<button class="${item.route === route ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}"><span>${esc(item.label)}</span><b>›</b></button>`).join("")}</aside>` : ""}
      <section class="workspace maximus-workspace">${screen}</section>
    </div>`;
}

function collaboratorBadge(status) {
  const safe = status || initialCollaboratorStatus;
  const label = safe.available ? "Mobile online" : safe.localActive ? "Mobile local" : "Plataforma mobile";
  const detail = safe.available ? safe.publicAppUrl : safe.localAppUrl || safe.message;
  return `<button class="collab-badge ${safe.available ? "online" : safe.localActive ? "local" : ""}" data-message="navigate" data-route="admin-mobile-platform"><strong>${esc(label)}</strong><span>${esc(detail || safe.message)}</span></button>`;
}
