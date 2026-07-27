import { availableWorks } from "../core/data.js";
import { runtimeConfig } from "../core/runtime-config.js";
import { state } from "../core/state.js";

let loaderPromise;
let cleanupActiveVisitsMap = () => {};

function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const callback = `__macroObrasMapsReady_${Date.now()}`;
    window[callback] = () => {
      delete window[callback];
      resolve(window.google.maps);
    };
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(runtimeConfig.googleMapsApiKey)}&loading=async&v=weekly&libraries=marker,routes&language=pt-BR&region=BR&callback=${callback}`;
    script.onerror = () => reject(new Error("Não foi possível carregar o Google Maps."));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

function markerContent(work, index = 0) {
  const element = document.createElement("div");
  element.className = "gm-work-marker";
  element.setAttribute("role", "button");
  element.tabIndex = 0;
  element.innerHTML = `<b>${index + 1}</b><span>${Math.round(work.progress || 0)}%</span>`;
  element.title = work.name;
  return element;
}

function mapOptions(center, zoom, compact = false) {
  return {
    center,
    zoom,
    mapId: runtimeConfig.googleMapsMapId,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: !compact,
    gestureHandling: "greedy",
    clickableIcons: false,
  };
}

function infoContent(work) {
  return `<div class="gm-info"><small>${work.code}</small><strong>${work.name}</strong><span>${work.address}</span><div><b>${work.status}</b><b>${work.progress}% executado</b></div></div>`;
}

function fitMapToWorks(map, works) {
  if (!works.length) return;
  if (works.length === 1) {
    map.setCenter(works[0].coordinates);
    map.setZoom(16);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  works.forEach((work) => bounds.extend(work.coordinates));
  map.fitBounds(bounds, 72);
}

async function renderWorksMap(element) {
  const [{ Map, InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);
  const compact = element.dataset.compact === "true";
  const map = new Map(element, mapOptions(availableWorks[0].coordinates, compact ? 6 : 7, compact));
  const info = new InfoWindow();

  availableWorks.forEach((work, index) => {
    const marker = new AdvancedMarkerElement({
      map,
      position: work.coordinates,
      title: work.name,
      content: markerContent(work, index),
      gmpClickable: true,
    });
    marker.addEventListener("gmp-click", () => {
      info.setContent(infoContent(work));
      info.open({ map, anchor: marker });
    });
  });

  fitMapToWorks(map, availableWorks);
  element.__macroMap = map;
}

async function renderSingleWorkMap(element) {
  const work = availableWorks.find((item) => item.id === element.dataset.workId) || availableWorks[0];
  const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);
  const map = new Map(element, mapOptions(work.coordinates, 16));
  new AdvancedMarkerElement({ map, position: work.coordinates, title: work.name, content: markerContent(work) });
  element.__macroMap = map;
}

async function geocode(address) {
  const { Geocoder } = await google.maps.importLibrary("geocoding");
  const geocoder = new Geocoder();
  const response = await geocoder.geocode({ address, region: "BR" });
  const result = response.results?.[0];
  if (!result) throw new Error("Endereço não localizado no Google Maps.");
  return { location: result.geometry.location, viewport: result.geometry.viewport, formattedAddress: result.formatted_address };
}

async function renderAddressPreviewMap(element) {
  const address = element.dataset.address || "Buerarema, Bahia";
  const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);
  const result = await geocode(address);
  const map = new Map(element, mapOptions(result.location, 16, true));
  if (result.viewport) map.fitBounds(result.viewport, 50);
  new AdvancedMarkerElement({ map, position: result.location, title: result.formattedAddress });
  element.__macroMap = map;
  element.dataset.formattedAddress = result.formattedAddress;
}

function routeState() {
  const current = state.visitRoute || {};
  return {
    workIds: [...(current.workIds || [])],
    segments: (current.segments || []).map((segment) => ({
      ...segment,
      path: (segment.path || []).map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) })),
    })),
    totalDistanceMeters: Number(current.totalDistanceMeters || 0),
    totalDurationMillis: Number(current.totalDurationMillis || 0),
  };
}

function workById(id) {
  return availableWorks.find((work) => work.id === id) || null;
}

function durationText(durationMillis) {
  const totalMinutes = Math.max(0, Math.round(Number(durationMillis || 0) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function setText(selector, value) {
  document.querySelector(selector)?.replaceChildren(document.createTextNode(value));
}

function setRouteMetrics(route) {
  setText("[data-route-distance]", `${(Number(route.totalDistanceMeters || 0) / 1000).toFixed(route.totalDistanceMeters >= 100000 ? 0 : 1)} km`);
  setText("[data-route-travel]", durationText(route.totalDurationMillis));
  setText("[data-route-source]", route.segments.length ? "Google Routes · vias rodoviárias" : "Aguardando traçado");
}

function dispatchRouteChange(route, toast = "") {
  document.dispatchEvent(new CustomEvent("macroobras:visit-route-change", {
    detail: { route, toast },
  }));
}

function dispatchRouteToast(toast) {
  document.dispatchEvent(new CustomEvent("macroobras:visit-route-toast", { detail: { toast } }));
}

function pathToLiterals(path = []) {
  return [...path].map((point) => ({
    lat: typeof point.lat === "function" ? point.lat() : Number(point.lat),
    lng: typeof point.lng === "function" ? point.lng() : Number(point.lng),
  })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

async function computeRoadSegment(origin, destination, preview = false) {
  const { Route } = await google.maps.importLibrary("routes");
  const response = await Route.computeRoutes({
    origin,
    destination,
    travelMode: "DRIVING",
    routingPreference: preview ? "TRAFFIC_UNAWARE" : "TRAFFIC_AWARE",
    language: "pt-BR",
    region: "BR",
    fields: ["path", "distanceMeters", "durationMillis"],
  });
  const route = response.routes?.[0];
  if (!route?.path?.length) throw new Error("O Google Routes não encontrou uma via entre os pontos.");
  return {
    path: pathToLiterals(route.path),
    distanceMeters: Number(route.distanceMeters || 0),
    durationMillis: Number(route.durationMillis || 0),
  };
}

function drawStoredRoute(map, route) {
  return route.segments.map((segment, index) => new google.maps.Polyline({
    map,
    path: segment.path,
    strokeColor: "#0a61d8",
    strokeOpacity: 0.94,
    strokeWeight: 7,
    zIndex: 20 + index,
  }));
}

function visitMarkerContent(work, route) {
  const element = document.createElement("div");
  const routeIndex = route.workIds.indexOf(work.id);
  const isTail = route.workIds.at(-1) === work.id;
  const isVisited = routeIndex >= 0;
  element.className = `gm-visit-marker${isVisited ? " is-routed" : ""}${isTail ? " is-tail" : ""}`;
  element.dataset.visitWorkId = work.id;
  element.innerHTML = `
    <span class="gm-visit-marker-index">${isVisited ? routeIndex + 1 : "•"}</span>
    <span class="gm-visit-marker-copy"><strong>${work.name}</strong><small>${work.address}</small></span>
    <span class="gm-route-handle" role="button" tabindex="0" title="Arraste para conectar esta obra a outra"><i></i></span>
  `;
  return element;
}

function visitInfo(work, route) {
  const index = route.workIds.indexOf(work.id);
  const value = document.querySelector(`[data-visit-duration="${work.id}"]`)?.value || 60;
  return `<div class="gm-visit-info"><small>${index >= 0 ? `Parada ${index + 1}` : "Obra disponível"}</small><strong>${work.name}</strong><span>${work.address}</span><label>Duração da visita<input type="number" min="15" step="15" value="${value}" data-map-visit-duration="${work.id}"><b>min</b></label></div>`;
}

function setDrawStatus(wrap, message, tone = "") {
  const status = wrap?.querySelector("[data-route-draw-status]");
  if (!status) return;
  status.className = `route-draw-status ${tone}`.trim();
  status.replaceChildren(document.createTextNode(message));
}

function refreshRouteOrder(wrap, route) {
  const order = wrap?.querySelector("[data-route-live-order]");
  if (!order) return;
  if (!route.workIds.length) {
    order.innerHTML = "<small>Nenhuma obra conectada</small>";
    return;
  }
  order.innerHTML = route.workIds.map((id, index) => {
    const work = workById(id);
    return `<span><b>${index + 1}</b>${work?.name || id}</span>`;
  }).join("");
}

async function renderVisitsMap(element) {
  cleanupActiveVisitsMap();
  const [{ Map, InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);
  const map = new Map(element, mapOptions(availableWorks[0].coordinates, 6));
  const wrap = element.closest(".visit-map-wrap");
  const info = new InfoWindow();
  let route = routeState();
  let savedLayers = drawStoredRoute(map, route);
  let previewLayer = null;
  let cursorGuide = null;
  let previewTimer = 0;
  let previewToken = 0;
  let drawing = null;
  const markerViews = new globalThis.Map();

  setRouteMetrics(route);
  refreshRouteOrder(wrap, route);
  setDrawStatus(wrap, route.workIds.length
    ? `Continue o traçado pela última obra: ${workById(route.workIds.at(-1))?.name || ""}`
    : "Arraste a alça de uma obra e solte sobre outra obra.");

  const clearPreview = () => {
    window.clearTimeout(previewTimer);
    previewToken += 1;
    previewLayer?.setMap(null);
    cursorGuide?.setMap(null);
    previewLayer = null;
    cursorGuide = null;
  };

  const restoreMapGesture = () => map.setOptions({ draggable: true, gestureHandling: "greedy" });

  const cancelDrawing = (message = "Traçado cancelado.") => {
    markerViews.forEach(({ content }) => content.classList.remove("is-target", "is-origin"));
    drawing = null;
    clearPreview();
    restoreMapGesture();
    setDrawStatus(wrap, message);
  };

  const scheduleRoadPreview = (origin, destination) => {
    window.clearTimeout(previewTimer);
    const token = ++previewToken;
    previewTimer = window.setTimeout(async () => {
      try {
        const result = await computeRoadSegment(origin, destination, true);
        if (!drawing || token !== previewToken) return;
        previewLayer?.setMap(null);
        previewLayer = new google.maps.Polyline({
          map,
          path: result.path,
          strokeColor: "#0a61d8",
          strokeOpacity: 0.72,
          strokeWeight: 6,
          zIndex: 80,
        });
        setDrawStatus(wrap, `Prévia viária: ${(result.distanceMeters / 1000).toFixed(1)} km · ${durationText(result.durationMillis)}`, "drawing");
      } catch (error) {
        if (!drawing || token !== previewToken) return;
        setDrawStatus(wrap, "Movimente o cursor sobre uma via acessível.", "warning");
      }
    }, 280);
  };

  const commitConnection = async (targetId) => {
    const current = drawing;
    if (!current) return;
    const target = workById(targetId);
    if (!target || target.id === current.origin.id) {
      cancelDrawing("Solte a linha sobre outra obra.");
      return;
    }
    if (route.workIds.includes(target.id)) {
      cancelDrawing("Essa obra já faz parte do traçado.");
      dispatchRouteToast("A obra de destino já está conectada.");
      return;
    }

    clearPreview();
    setDrawStatus(wrap, `Calculando rota viária até ${target.name}…`, "drawing");
    try {
      const result = await computeRoadSegment(current.origin.coordinates, target.coordinates, false);
      const segment = {
        id: `visita-${current.origin.id}-${target.id}-${Date.now().toString(36)}`,
        fromId: current.origin.id,
        toId: target.id,
        path: result.path,
        distanceMeters: result.distanceMeters,
        durationMillis: result.durationMillis,
      };
      route = {
        workIds: route.workIds.length ? [...route.workIds, target.id] : [current.origin.id, target.id],
        segments: [...route.segments, segment],
        totalDistanceMeters: route.totalDistanceMeters + result.distanceMeters,
        totalDurationMillis: route.totalDurationMillis + result.durationMillis,
      };
      drawing = null;
      restoreMapGesture();
      dispatchRouteChange(route, `Trecho conectado pelas estradas: ${current.origin.name} → ${target.name}.`);
    } catch (error) {
      cancelDrawing("Não foi possível concluir o trecho viário.");
      dispatchRouteToast(error.message || "O Google Routes não calculou o trecho.");
    }
  };

  const beginDrawing = (work, content, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const tailId = route.workIds.at(-1);
    if (tailId && tailId !== work.id) {
      dispatchRouteToast(`Continue o traçado a partir de ${workById(tailId)?.name || "a última obra"}. Use “Novo traçado” para reiniciar.`);
      return;
    }
    if (route.workIds.length >= availableWorks.length) {
      dispatchRouteToast("Todas as obras já estão conectadas neste traçado.");
      return;
    }

    info.close();
    drawing = { origin: work, targetId: "" };
    map.setOptions({ draggable: false, gestureHandling: "none" });
    markerViews.forEach(({ content: markerContentElement }) => markerContentElement.classList.remove("is-target", "is-origin"));
    content.classList.add("is-origin");
    cursorGuide = new google.maps.Polyline({
      map,
      path: [work.coordinates, work.coordinates],
      strokeColor: "#0a61d8",
      strokeOpacity: 0.5,
      strokeWeight: 3,
      zIndex: 70,
    });
    setDrawStatus(wrap, `Desenhando a partir de ${work.name}. Solte sobre outra obra.`, "drawing");
  };

  availableWorks.forEach((work, index) => {
    const content = visitMarkerContent(work, route);
    const marker = new AdvancedMarkerElement({
      map,
      position: work.coordinates,
      title: work.name,
      gmpClickable: true,
      content,
      zIndex: 100 + index,
    });
    markerViews.set(work.id, { marker, content });

    const openDuration = () => {
      if (drawing) return;
      info.setContent(visitInfo(work, route));
      info.open({ map, anchor: marker });
      google.maps.event.addListenerOnce(info, "domready", () => {
        const input = document.querySelector(`[data-map-visit-duration="${work.id}"]`);
        input?.focus();
        input?.addEventListener("input", () => {
          const mirrored = document.querySelector(`[data-visit-duration="${work.id}"]`);
          if (mirrored) mirrored.value = input.value;
          mirrored?.dispatchEvent(new Event("input", { bubbles: true }));
        });
      });
    };

    content.querySelector(".gm-route-handle")?.addEventListener("pointerdown", (event) => beginDrawing(work, content, event));
    content.querySelector(".gm-route-handle")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") beginDrawing(work, content, event);
    });
    content.addEventListener("click", (event) => {
      if (!event.target.closest(".gm-route-handle")) openDuration();
    });
    content.addEventListener("pointerenter", () => {
      if (!drawing || drawing.origin.id === work.id || route.workIds.includes(work.id)) return;
      drawing.targetId = work.id;
      content.classList.add("is-target");
      setDrawStatus(wrap, `Solte para conectar em ${work.name}.`, "target");
    });
    content.addEventListener("pointerleave", () => {
      if (!drawing || drawing.targetId !== work.id) return;
      drawing.targetId = "";
      content.classList.remove("is-target");
    });
  });

  const mapMouseMoveListener = map.addListener("mousemove", (event) => {
    if (!drawing || !event.latLng) return;
    const cursor = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    cursorGuide?.setPath([drawing.origin.coordinates, cursor]);
    scheduleRoadPreview(drawing.origin.coordinates, cursor);
  });

  const finishPointer = (event) => {
    if (!drawing) return;
    const elementAtPointer = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)
      ? document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-visit-work-id]")
      : null;
    const targetId = elementAtPointer?.dataset?.visitWorkId || drawing.targetId;
    if (targetId) void commitConnection(targetId);
    else cancelDrawing("Solte a linha diretamente sobre o quadro de outra obra.");
  };
  const cancelPointer = () => drawing && cancelDrawing();
  const escapeDrawing = (event) => {
    if (event.key === "Escape" && drawing) cancelDrawing("Traçado cancelado com Esc.");
  };
  document.addEventListener("pointerup", finishPointer);
  document.addEventListener("pointercancel", cancelPointer);
  document.addEventListener("keydown", escapeDrawing);

  wrap?.querySelectorAll("[data-visit-map-command]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const command = button.dataset.visitMapCommand;
      if (command === "clear") {
        savedLayers.forEach((layer) => layer.setMap(null));
        savedLayers = [];
        route = { workIds: [], segments: [], totalDistanceMeters: 0, totalDurationMillis: 0 };
        dispatchRouteChange(route, "Traçado de visitas limpo. Inicie por qualquer obra.");
      }
      if (command === "undo") {
        if (!route.segments.length) {
          dispatchRouteToast("Não há trecho para desfazer.");
          return;
        }
        const removed = route.segments.at(-1);
        route = {
          workIds: route.workIds.slice(0, -1),
          segments: route.segments.slice(0, -1),
          totalDistanceMeters: Math.max(0, route.totalDistanceMeters - Number(removed.distanceMeters || 0)),
          totalDurationMillis: Math.max(0, route.totalDurationMillis - Number(removed.durationMillis || 0)),
        };
        dispatchRouteChange(route, "Último trecho removido.");
      }
    });
  });

  cleanupActiveVisitsMap = () => {
    window.clearTimeout(previewTimer);
    mapMouseMoveListener?.remove?.();
    document.removeEventListener("pointerup", finishPointer);
    document.removeEventListener("pointercancel", cancelPointer);
    document.removeEventListener("keydown", escapeDrawing);
    clearPreview();
    savedLayers.forEach((layer) => layer.setMap(null));
  };

  fitMapToWorks(map, availableWorks);
  element.__macroMap = map;
}

export async function hydrateGoogleMaps(root = document) {
  const elements = [...root.querySelectorAll("[data-google-map]")].filter((element) => !element.dataset.hydrated);
  if (!elements.some((element) => element.dataset.googleMap === "visits")) {
    cleanupActiveVisitsMap();
    cleanupActiveVisitsMap = () => {};
  }
  if (!elements.length) return;
  try {
    await loadGoogleMaps();
    for (const element of elements) {
      element.dataset.hydrated = "true";
      const type = element.dataset.googleMap;
      if (type === "work") await renderSingleWorkMap(element);
      else if (type === "visits") await renderVisitsMap(element);
      else if (type === "address") await renderAddressPreviewMap(element);
      else await renderWorksMap(element);
    }
  } catch (error) {
    elements.forEach((element) => {
      element.innerHTML = `<div class="map-error"><strong>Google Maps indisponível</strong><span>${error.message}</span><small>Confira a restrição da chave, faturamento e APIs habilitadas.</small></div>`;
    });
  }
}

export async function geocodeWorkAddress(address) {
  await loadGoogleMaps();
  const result = await geocode(address);
  return {
    address: result.formattedAddress,
    coordinates: { lat: result.location.lat(), lng: result.location.lng() },
  };
}
