import { mobileRoutes } from "./data.js";
import {
  adminAccess,
  adminAddWork,
  adminDashboard,
  adminDiagramLibrary,
  adminFinance,
  adminMobilePlatform,
  adminRh,
  adminSettings,
  adminVisits,
  adminWorkCalendar,
  adminWorkDiary,
  adminWorkItems,
  adminWorkMeasurement,
  adminWorkOverview,
  adminWorkPlanning,
  adminWorkPurchases,
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
  "admin-work-overview": adminWorkOverview,
  "admin-work-items": adminWorkItems,
  "admin-work-planning": adminWorkPlanning,
  "admin-work-calendar": adminWorkCalendar,
  "admin-work-purchases": adminWorkPurchases,
  "admin-work-diary": adminWorkDiary,
  "admin-work-measurement": adminWorkMeasurement,
  "admin-visits": adminVisits,
  "admin-finance": adminFinance,
  "admin-rh": adminRh,
  "admin-settings": adminSettings,
  "admin-mobile-platform": adminMobilePlatform,
  "admin-access": adminAccess,
  "admin-diagram-library": adminDiagramLibrary,
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
