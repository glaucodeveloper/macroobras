const injected =
  window.__MACROOBRAS_RUNTIME_CONFIG__
  || {};

export const runtimeConfig = Object.freeze({
  googleMapsApiKey: String(
    injected.googleMapsApiKey || ""
  ).trim(),
  googleMapsMapId: String(
    injected.googleMapsMapId
      || "DEMO_MAP_ID"
  ).trim(),
  mobileSurfaceQuery: "?surface=twa",
});
