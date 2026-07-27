import { initApp } from "./core/app-controller.js";

const url = new URL(window.location.href);
const staticPreview = ["4173", "5173"].includes(url.port);

// localhost:5173 ainda pode estar controlado por um service worker de versões antigas.
// 127.0.0.1 é uma origem separada e abre o preview sem esse cache legado.
if (staticPreview && ["localhost", "0.0.0.0"].includes(url.hostname)) {
  url.hostname = "127.0.0.1";
  window.location.replace(url);
} else {
  void startApplication();
}

async function startApplication() {
  const shouldReload = await retireLegacyServiceWorkers();
  if (!shouldReload) initApp();
}

async function retireLegacyServiceWorkers() {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const controlled = Boolean(navigator.serviceWorker.controller);
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    const reloadKey = "macroobras.legacyServiceWorkerReloaded";
    if (controlled && sessionStorage.getItem(reloadKey) !== "true") {
      sessionStorage.setItem(reloadKey, "true");
      window.location.reload();
      return true;
    }
    sessionStorage.removeItem(reloadKey);
  } catch (error) {
    console.warn("Não foi possível remover o service worker legado.", error);
  }
  return false;
}
