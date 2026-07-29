import {
  initialCollaboratorStatus,
  routes,
  subNavigation,
  topNavigation,
} from "../core/data.js";
import { logo } from "./components.js";
import { esc } from "../core/utils.js";

function useReactShell() {
  return Boolean(window.__MACROOBRAS_REACT_SHELL__);
}

function shellIcon(name) {
  const paths = {
    dashboard: '<path d="M4 4h10v10H4zM18 4h10v6H18zM18 14h10v14H18zM4 18h10v10H4z"/>',
    works: '<path d="M5 28V8h10V4h12v24H5zm4-4h4v-4H9v4zm0-8h4v-4H9v4zm8 8h6v-4h-6v4zm0-8h6v-4h-6v4zm0-8h6V6h-6v2z"/>',
    purchases: '<path d="M3 5h4l2.6 14h13.8L27 9H9.2l-.5-3H3V5zm8 18a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm11 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>',
    visits: '<path d="M16 2C9.9 2 5 6.9 5 13c0 8.2 11 17 11 17s11-8.8 11-17C27 6.9 22.1 2 16 2zm0 16a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>',
    people: '<path d="M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm10-1a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM2 29v-4c0-5 4-9 9-9h2c5 0 9 4 9 9v4H2zm21-12c4.4.5 7 3.8 7 8v4h-6v-4c0-3.1-1-5.8-3-7.8.6-.1 1.3-.2 2-.2z"/>',
    settings: '<path d="M28.7 18.3a13 13 0 0 0 0-4.6l-3.3-1.2-.7-1.7 1.5-3.2-3.3-3.3-3.2 1.5-1.7-.7L16.8 2h-4.6L11 5.1l-1.7.7-3.2-1.5-3.3 3.3 1.5 3.2-.7 1.7L.3 13.7a13 13 0 0 0 0 4.6l3.3 1.2.7 1.7-1.5 3.2 3.3 3.3 3.2-1.5 1.7.7 1.2 3.1h4.6l1.2-3.1 1.7-.7 3.2 1.5 3.3-3.3-1.5-3.2.7-1.7 3.3-1.2zM14.5 21a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>',
    logout: '<path d="M13 4H4v24h9v-3H7V7h6V4zm7.6 5.6L18.5 12l2.5 2.5H11v3h10L18.5 20l2.1 2.4L27 16l-6.4-6.4z"/>',
    help: '<path d="M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28zm1.5 23h-3v-3h3v3zm2.8-10.6-1.7 1.8c-1 1-1.1 1.6-1.1 3.3h-3v-.7c0-1.4.3-2.7 1.3-3.7l2.1-2.2a3 3 0 1 0-5.1-2.1h-3a6 6 0 1 1 10.2 4.3l-.7.7z"/>',
    transfer: '<path d="M21 3l7 7-7 7v-5H9V8h12V3zM11 15v5h12v4H11v5l-7-7 7-7z"/>',
    security: '<path d="M16 2 5 6v8c0 7 4.7 13.5 11 16 6.3-2.5 11-9 11-16V6L16 2zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm-6 8c.7-4 3-6 6-6s5.3 2 6 6c-1.7 1.5-3.7 2.7-6 3.7A18.5 18.5 0 0 1 10 24z"/>',
    chevronLeft: '<path d="m20.5 5-11 11 11 11 2-2-9-9 9-9-2-2z"/>',
    chevronRight: '<path d="m11.5 5-2 2 9 9-9 9 2 2 11-11-11-11z"/>',
    pin: '<path d="m20 3 9 9-4 2-5 5 1 5-2 2-5-5-7 7-3-3 7-7-5-5 2-2 5 1 5-5 2-4z"/>',
  };
  return `<svg class="shell-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${paths[name] || paths.dashboard}</svg>`;
}

function contentOnlyShell({ id, state, screen, variant }) {
  return `<div id="${esc(id)}" class="legacy-shell legacy-shell--${variant}">${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""}${screen}</div>`;
}

export function shell({ id, state, screen }) {
  if (useReactShell()) {
    return contentOnlyShell({ id, state, screen, variant: "desktop" });
  }

  return `<main id="${esc(id)}" class="app is-desktop">
    ${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""}
    ${desktopFrame({ state, screen })}
  </main>`;
}

export function twaShell({ id, state, screen }) {
  if (useReactShell()) {
    return contentOnlyShell({ id, state, screen, variant: "twa" });
  }

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
  const current = routes.find((item) => item.route === route);
  const isWorkDrill = key === "admin-work";
  const sidebarItems = key ? subNavigation[key] || [] : [];
  const isNested = isWorkDrill || (key && route !== section);
  const backRoute = isWorkDrill ? "admin-works" : section;
  const sidebarBehavior = state.customization?.sidebarBehavior || "hover";
  const hoverMode = sidebarBehavior !== "pinned";
  const collapsed = Boolean(sidebarItems.length && (hoverMode || state.sidebarCollapsed));
  const user = state.authUser || { name: "Admin", email: "Administrador" };
  const stationName = state.customization?.stationName || "ERP da construção Maximus Empreendimentos";
  const stationSubtitle = state.customization?.stationSubtitle || "Gestão operacional da construção";
  const initials = String(user.name || "AF")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return `
    <a class="skip-link" href="#main-workspace">Ir para o conteúdo</a>
    <header class="topbar maximus-topbar">
      <button class="brand" data-message="navigate" data-route="admin-dashboard" aria-label="Abrir painel">
        ${logo()}
        <span><strong>${esc(stationName)}</strong><small>${esc(stationSubtitle)}</small></span>
      </button>
      <nav class="top-nav" aria-label="Navegação principal">
        ${topNavigation
          .map(
            (item) =>
              `<button class="${item.route === section ? "active" : ""}" data-message="navigate" data-route="${esc(item.route)}" ${item.route === section ? 'aria-current="page"' : ""}><i>${shellIcon(item.icon)}</i><span>${esc(item.label)}</span></button>`,
          )
          .join("")}
      </nav>
      ${collaboratorBadge(state.collaboratorStatus)}
      <div class="topbar-actions">
        <button class="topbar-action" data-message="navigate" data-route="admin-settings">${shellIcon("settings")}<span>Configurações</span></button>
        <button class="topbar-action danger" data-message="logout-admin">${shellIcon("logout")}<span>Sair</span></button>
      </div>
      <div class="user-menu-wrap">
        <button class="admin-profile-button" data-message="toggle-user-menu" aria-expanded="${state.userMenuOpen}">
          <span class="admin-dot">${esc(initials || "AF")}</span>
          <span class="admin-name"><strong>${esc(user.name || "Admin")}</strong><small>${esc(user.email || "Administrador")}</small></span>
          <b>⌄</b>
        </button>
        ${state.userMenuOpen ? userMenu() : ""}
      </div>
    </header>
    ${isNested ? `<div class="drill-header"><button data-message="navigate" data-route="${esc(backRoute)}">← Voltar</button><div><small>${isWorkDrill ? "Obras" : "Subseção"}</small><strong>${esc(current?.label || "Subseção")}</strong></div></div>` : ""}
    <div class="desktop-layout ${sidebarItems.length ? "has-sidebar" : "no-sidebar"} ${isNested ? "has-drill-header" : ""} ${collapsed ? "sidebar-collapsed" : ""} ${hoverMode ? "sidebar-hover-mode" : "sidebar-pinned-mode"}">
      ${renderSidebar({ route, isWorkDrill, current, sidebarItems, collapsed, hoverMode })}
      <section id="main-workspace" class="workspace maximus-workspace" tabindex="-1">${screen}</section>
    </div>`;
}

function renderSidebar({
  route,
  isWorkDrill,
  current,
  sidebarItems,
  collapsed,
  hoverMode,
}) {
  if (!sidebarItems.length) return "";

  return `
    <button
      class="sidebar-fold-handle"
      data-message="toggle-sidebar"
      aria-controls="carbon-subnavigation"
      aria-expanded="${!collapsed}"
      aria-label="${
        hoverMode
          ? "Fixar subnavegação"
          : "Recolher subnavegação"
      }"
      title="${
        hoverMode
          ? "Fixar menu"
          : "Recolher menu"
      }"
    >
      ${shellIcon(
        hoverMode
          ? "chevronRight"
          : "chevronLeft"
      )}
    </button>

    <aside
      id="carbon-subnavigation"
      class="sidebar drill-sidebar"
      aria-label="Subnavegação da seção"
      data-collapsed="${collapsed}"
    >
      <header class="sidebar-subnav-header">
        <div>
          <small>
            ${
              isWorkDrill
                ? "Página da obra"
                : "Subnavegação"
            }
          </small>
          <strong>
            ${
              isWorkDrill
                ? "Obra selecionada"
                : esc(current?.label || "Seção")
            }
          </strong>
        </div>

        <button
          class="sidebar-collapse-control"
          data-message="toggle-sidebar"
          aria-label="${
            hoverMode
              ? "Fixar subnavegação"
              : "Recolher subnavegação"
          }"
          title="${
            hoverMode
              ? "Fixar"
              : "Recolher"
          }"
        >
          ${shellIcon(
            hoverMode
              ? "pin"
              : "chevronLeft"
          )}
        </button>
      </header>

      <nav>
        ${sidebarItems.map((item) => `
          <button
            class="${
              item.route === route
                ? "active"
                : ""
            }"
            data-message="navigate"
            data-route="${esc(item.route)}"
            ${
              item.route === route
                ? 'aria-current="page"'
                : ""
            }
          >
            <span>${esc(item.label)}</span>
            ${shellIcon("chevronRight")}
          </button>
        `).join("")}
      </nav>
    </aside>
  `;
}

function userMenu() {
  return `<nav class="admin-user-menu" aria-label="Menu do usuário">
    <button data-message="navigate" data-route="admin-help">${shellIcon("help")}<span>Ajuda e manual</span></button>
    <button data-message="navigate" data-route="admin-data-transfer">${shellIcon("transfer")}<span>Importar e exportar</span></button>
    <button data-message="navigate" data-route="admin-access-config">${shellIcon("security")}<span>Configuração de login</span></button>
    <hr>
    <button class="danger" data-message="logout-admin">${shellIcon("logout")}<span>Sair</span></button>
  </nav>`;
}

function collaboratorBadge(status) {
  const safe = status || initialCollaboratorStatus;
  const label = safe.available ? "Campo online" : safe.lanActive ? "Campo na rede" : safe.localActive ? "Campo local" : "Acesso de campo";
  const detail = safe.available || safe.lanActive || safe.localActive ? "Gerenciado dentro de cada obra" : safe.message;
  return `<div class="collab-badge passive ${safe.available ? "online" : safe.lanActive || safe.localActive ? "local" : ""}" title="Os links individuais são abertos pela página administrativa de cada obra"><strong>${esc(label)}</strong><span>${esc(detail || "Aguardando estação")}</span></div>`;
}
