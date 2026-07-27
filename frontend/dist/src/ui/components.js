import { esc } from "../core/utils.js";

export function logo() {
  return `<span class="brand-symbol"><img class="logo-mark" src="./brand/logo_macroobras_ref.png" alt="MacroObras" /></span>`;
}

export function pageHeader(title, subtitle, action = "") {
  return `<div class="page-header"><div class="page-heading"><span class="page-kicker">MacroObras · Controle operacional</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action ? `<div class="page-actions">${action}</div>` : ""}</div>`;
}

export function card(title, body, extra = "") {
  return `<article class="card ${esc(extra)}">${title ? `<h2>${esc(title)}</h2>` : ""}${body}</article>`;
}

export function formStep(num, title, body) {
  return `<section class="form-step"><span>${esc(num)}</span><div><h2>${esc(title)}</h2>${body}</div></section>`;
}

export function metric(label, value, sub) {
  return `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></div>`;
}

export function sidePanel(title, rows) {
  return `<div class="side-card"><h3>${esc(title)}<span>${rows.length}</span></h3>${rows.map((row) => `<p>${esc(row)}<button>+</button></p>`).join("")}</div>`;
}

export function mobileHeader(title, subtitle = "") {
  return `<header class="mobile-header">${logo()}<div><span class="mobile-kicker">Operação em campo</span><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div><b>AF</b></header>`;
}
