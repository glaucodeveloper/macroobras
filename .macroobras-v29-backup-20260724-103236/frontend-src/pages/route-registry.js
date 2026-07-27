// MacroObras page architecture v27
import { adminDashboard } from "./admin/admin-dashboard.page.js";
import { adminWorks } from "./admin/admin-works.page.js";
import { adminPurchases } from "./admin/admin-purchases.page.js";
import { adminAddWork } from "./admin/admin-add-work.page.js";
import { adminWorkOverview } from "./admin/admin-work-overview.page.js";
import { adminWorkAccess } from "./admin/admin-work-access.page.js";
import { adminWorkItems } from "./admin/admin-work-items.page.js";
import { adminWorkPlanning } from "./admin/admin-work-planning.page.js";
import { adminWorkCalendar } from "./admin/admin-work-calendar.page.js";
import { adminWorkPurchases } from "./admin/admin-work-purchases.page.js";
import { adminWorkDiary } from "./admin/admin-work-diary.page.js";
import { adminWorkMeasurement } from "./admin/admin-work-measurement.page.js";
import { adminVisits } from "./admin/admin-visits.page.js";
import { adminFinance } from "./admin/admin-finance.page.js";
import { adminRh } from "./admin/admin-rh.page.js";
import { adminSettings } from "./admin/admin-settings.page.js";
import { adminMobilePlatform } from "./admin/admin-mobile-platform.page.js";
import { adminAccess } from "./admin/admin-access.page.js";
import { adminDiagramLibrary } from "./admin/admin-diagram-library.page.js";
import { adminHelp } from "./admin/admin-help.page.js";
import { adminDataTransfer } from "./admin/admin-data-transfer.page.js";
import { adminAccessConfig } from "./admin/admin-access-config.page.js";
import { adminMachineAuthorization } from "./admin/admin-machine-authorization.page.js";
import { adminLogin } from "./admin/admin-login.page.js";
import { mobileHome } from "./mobile/mobile-home.page.js";
import { mobileRoutine } from "./mobile/mobile-routine.page.js";
import { mobileDay } from "./mobile/mobile-day.page.js";
import { mobileDeliveries } from "./mobile/mobile-deliveries.page.js";
import { mobileDiary } from "./mobile/mobile-diary.page.js";

export const routeMap = Object.freeze({
  "admin-dashboard": adminDashboard,
  "admin-works": adminWorks,
  "admin-purchases": adminPurchases,
  "admin-add-work": adminAddWork,
  "admin-work-overview": adminWorkOverview,
  "admin-work-access": adminWorkAccess,
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
  "admin-machine-authorization": adminMachineAuthorization,
  "admin-login": adminLogin,
  "mobile-home": mobileHome,
  "mobile-routine": mobileRoutine,
  "mobile-day": mobileDay,
  "mobile-deliveries": mobileDeliveries,
  "mobile-diary": mobileDiary,
});

export const defaultAdminRoute = "admin-dashboard";
