import { mobileRoutes } from "./data.js";
import { renderRegisteredPage } from "../pages/route-registry.js";

export function renderRoute(route) {
  return renderRegisteredPage(route);
}

export function normalizedMobileRoute(route) {
  return mobileRoutes.some((item) => item.route === route)
    ? route
    : "mobile-home";
}
