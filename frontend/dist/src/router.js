import { mobileRoutes } from "./data.js";
import { adminAddWork, adminCalendar, adminElements, adminMeasurement, adminMobileAccess } from "./screens/admin.js";
import { mobileDay, mobileDiary, mobileHome, mobileRoutine } from "./screens/mobile.js";

const routeMap = {
  "admin-add-work": adminAddWork,
  "admin-elements": adminElements,
  "admin-mobile-access": adminMobileAccess,
  "admin-calendar": adminCalendar,
  "admin-measurement": adminMeasurement,
  "mobile-home": mobileHome,
  "mobile-routine": mobileRoutine,
  "mobile-day": mobileDay,
  "mobile-diary": mobileDiary,
};

export function renderRoute(route) {
  return (routeMap[route] || adminAddWork)();
}

export function normalizedMobileRoute(route) {
  return mobileRoutes.some((item) => item.route === route) ? route : "mobile-home";
}
