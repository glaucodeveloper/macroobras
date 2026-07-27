import { initApp } from "./core/app-controller.js";

const url = new URL(window.location.href);
if (url.hostname === "0.0.0.0") {
  url.hostname = "localhost";
  window.location.replace(url);
} else {
  initApp();
}
