// MacroObras page architecture v27
import { mobileRoutes } from "./data.js";
import { defaultAdminRoute, routeMap } from "../pages/route-registry.js";

export function renderRoute(route) {
  const renderer = routeMap[route] || routeMap[defaultAdminRoute];
  if (!renderer) {
    throw new Error(`Rota sem página registrada: ${route}`);
  }
  return renderer();
}

export function normalizedMobileRoute(route) {
  return mobileRoutes.some((item) => item.route === route)
    ? route
    : "mobile-home";
}
