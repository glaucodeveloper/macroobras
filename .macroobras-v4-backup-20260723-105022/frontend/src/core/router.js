import { mobileRoutes } from "./data.js";
import {
  adminAddWork,
  adminCalendar,
  adminDashboard,
  adminElements,
  adminFinance,
  adminMeasurement,
  adminMobileAccess,
  adminPurchases,
  adminRh,
  adminVisits,
  adminWork,
  adminWorks,
} from "../screens/admin/index.js";
import {
  mobileDay,
  mobileDeliveries,
  mobileDiary,
  mobileHome,
  mobileRoutine,
} from "../screens/mobile/index.js";

const routeMap = {
  "admin-dashboard": adminDashboard,
  "admin-works": adminWorks,
  "admin-add-work": adminAddWork,
  "admin-work": adminWork,
  "admin-purchases": adminPurchases,
  "admin-visits": adminVisits,
  "admin-finance": adminFinance,
  "admin-rh": adminRh,
  "admin-elements": adminElements,
  "admin-mobile-access": adminMobileAccess,
  "admin-calendar": adminCalendar,
  "admin-measurement": adminMeasurement,
  "mobile-home": mobileHome,
  "mobile-routine": mobileRoutine,
  "mobile-day": mobileDay,
  "mobile-deliveries": mobileDeliveries,
  "mobile-diary": mobileDiary,
};

export function renderRoute(route) {
  return (routeMap[route] || adminDashboard)();
}

export function normalizedMobileRoute(route) {
  return mobileRoutes.some((item) => item.route === route) ? route : "mobile-home";
}
