import { mobileRoutes } from "./data.js";
import {
  adminAccess,
  adminAddWork,
  adminDashboard,
  adminDiagramLibrary,
  adminFinance,
  adminMobilePlatform,
  adminPurchases,
  adminHelp,
  adminDataTransfer,
  adminAccessConfig,
  adminLogin,
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
  "admin-purchases": adminPurchases,
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
  "admin-help": adminHelp,
  "admin-data-transfer": adminDataTransfer,
  "admin-access-config": adminAccessConfig,
  "admin-login": adminLogin,
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
