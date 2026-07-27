import { callRpc } from "./api.js";

function invokeWithPayload(method, payload) {
  return callRpc(method, [JSON.stringify(payload ?? {})]);
}

export const operationalGraphApi = Object.freeze({
  saveGraph(graph) {
    return invokeWithPayload("salvarGrafoOperacional", graph);
  },

  loadGraph(id) {
    return invokeWithPayload("obterGrafoOperacional", { id });
  },

  listGraphs() {
    return callRpc("listarGrafosOperacionais");
  },

  removeGraph(id) {
    return invokeWithPayload("removerGrafoOperacional", { id });
  },

  saveVisitRoute(route) {
    return invokeWithPayload("salvarRotaVisita", route);
  },

  loadVisitRoute(id) {
    return invokeWithPayload("obterRotaVisita", { id });
  },

  listVisitRoutes() {
    return callRpc("listarRotasVisita");
  },

  removeVisitRoute(id) {
    return invokeWithPayload("removerRotaVisita", { id });
  },

  saveOrgChart(orgChart) {
    return invokeWithPayload("salvarOrganogramaOperacional", orgChart);
  },

  loadOrgChart(id) {
    return invokeWithPayload("obterOrganogramaOperacional", { id });
  },

  listOrgCharts() {
    return callRpc("listarOrganogramasOperacionais");
  },

  removeOrgChart(id) {
    return invokeWithPayload("removerOrganogramaOperacional", { id });
  },
});
