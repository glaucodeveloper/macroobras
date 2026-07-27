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
  return {
    location: result.geometry.location,
    viewport: result.geometry.viewport,
    formattedAddress: result.formatted_address,
  };
}

async function reverseGeocode(coordinates) {
  try {
    const { Geocoder } = await google.maps.importLibrary("geocoding");
    const geocoder = new Geocoder();
    const response = await geocoder.geocode({ location: coordinates, region: "BR" });
    const result = response.results?.[0];
    const city = result?.address_components?.find((component) => component.types.includes("administrative_area_level_2"))?.long_name
      || result?.address_components?.find((component) => component.types.includes("locality"))?.long_name;
    return {
      name: city ? `Parada em ${city}` : "Parada de visita",
      address: result?.formatted_address || coordinateLabel(coordinates),
    };
  } catch (error) {
    return { name: "Parada de visita", address: coordinateLabel(coordinates) };
  }
}

function coordinateLabel(coordinates) {
  return `${Number(coordinates.lat).toFixed(5)}, ${Number(coordinates.lng).toFixed(5)}`;
}

async function renderAddressPreviewMap(element) {
  const address = element.dataset.address || "Buerarema, Bahia";
  const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);
  const fallback = state.workCoordinates || availableWorks[0].coordinates;
  const map = new Map(element, mapOptions(fallback, state.workCoordinates ? 16 : 7, true));
  try {
    const result = await geocode(address);
    map.setCenter(result.location);
    if (result.viewport) map.fitBounds(result.viewport, 50);
    new AdvancedMarkerElement({ map, position: result.location, title: result.formattedAddress });
    element.dataset.formattedAddress = result.formattedAddress;
  } catch (error) {
    const warning = document.createElement("div");
    warning.className = "map-inline-warning";
    warning.textContent = "Mapa carregado. A geocodificação do endereço depende da Geocoding API e das restrições da chave.";
    element.appendChild(warning);
  }
  element.__macroMap = map;
}

function cloneCoordinates(value) {
  if (!value) return null;
  const lat = typeof value.lat === "function" ? value.lat() : Number(value.lat);
  const lng = typeof value.lng === "function" ? value.lng() : Number(value.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function routeStopFromWork(work) {
  return {
    id: `work:${work.id}`,
    kind: "work",
    workId: work.id,
    name: work.name,
    address: work.address,
    coordinates: cloneCoordinates(work.coordinates),
    durationMinutes: Number(state.visitDurations[`work:${work.id}`] ?? state.visitDurations[work.id] ?? 60),
  };
}

function normalizeStop(stop) {
  const work = stop.workId ? availableWorks.find((item) => item.id === stop.workId) : null;
  return {
    id: stop.id || (work ? `work:${work.id}` : `stop-${Math.random().toString(36).slice(2)}`),
    kind: stop.kind || (work ? "work" : "custom"),
    workId: stop.workId || work?.id || "",
    name: stop.name || work?.name || "Parada de visita",
    address: stop.address || work?.address || coordinateLabel(stop.coordinates || { lat: 0, lng: 0 }),
    coordinates: cloneCoordinates(stop.coordinates || work?.coordinates),
    durationMinutes: Number(stop.durationMinutes ?? state.visitDurations[stop.id] ?? 60),
  };
}

function routeState() {
  const current = state.visitRoute || {};
  let stops = Array.isArray(current.stops) ? current.stops.map(normalizeStop).filter((stop) => stop.coordinates) : [];
  if (!stops.length && Array.isArray(current.workIds)) {
    stops = current.workIds.map((id) => availableWorks.find((work) => work.id === id)).filter(Boolean).map(routeStopFromWork);
  }
  const idMap = new Map(stops.map((stop) => [stop.workId || stop.id, stop.id]));
  return {
    stops,
    segments: (current.segments || []).map((segment) => ({
      ...segment,
      fromId: idMap.get(segment.fromId) || segment.fromId,
      toId: idMap.get(segment.toId) || segment.toId,
      path: (segment.path || []).map(cloneCoordinates).filter(Boolean),
    })),
    totalDistanceMeters: Number(current.totalDistanceMeters || 0),
    totalDurationMillis: Number(current.totalDurationMillis || 0),
    pendingStopId: current.pendingStopId || "",
  };
}

function stopById(route, id) {
  return route.stops.find((stop) => stop.id === id) || null;
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
  setText("[data-route-visits]", `${route.stops.reduce((sum, stop) => sum + Number(stop.durationMinutes || 0), 0)} min`);
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
  return [...path].map(cloneCoordinates).filter(Boolean);
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

function workPointContent(work, route) {
  const element = document.createElement("div");
  const routeIndex = route.stops.findIndex((stop) => stop.workId === work.id);
  const stop = routeIndex >= 0 ? route.stops[routeIndex] : routeStopFromWork(work);
  const isTail = route.stops.at(-1)?.id === stop.id;
  element.className = `gm-route-point gm-work-point${routeIndex >= 0 ? " is-routed" : ""}${isTail ? " is-tail" : ""}`;
  element.dataset.workPointId = work.id;
  element.dataset.routeStopId = stop.id;
  element.innerHTML = `<span class="gm-route-dot">${routeIndex >= 0 ? routeIndex + 1 : ""}</span><span class="gm-route-label">${work.name}</span>`;
  element.title = `${work.name}. Segure o ponto para desenhar uma rota; clique para abrir as ações.`;
  return { element, stop };
}

function customStopContent(stop, route) {
  const element = document.createElement("div");
  const routeIndex = route.stops.findIndex((item) => item.id === stop.id);
  const isTail = route.stops.at(-1)?.id === stop.id;
  element.className = `gm-route-point gm-custom-stop is-routed${isTail ? " is-tail" : ""}`;
  element.dataset.routeStopId = stop.id;
  element.innerHTML = `<span class="gm-route-dot">${routeIndex + 1}</span><span class="gm-route-label">${stop.name}</span>`;
  element.title = `${stop.name}. Segure o ponto para continuar a rota; clique para editar.`;
  return element;
}

function workContextInfo(work, stop, route) {
  const index = route.stops.findIndex((item) => item.id === stop.id);
  return `<div class="gm-context-card"><small>${index >= 0 ? `Parada ${index + 1}` : work.code}</small><strong>${work.name}</strong><span>${work.address}</span><div class="gm-context-stats"><b>${work.progress}% executado</b><b>${work.status}</b></div><button type="button" data-map-open-work="${work.id}">Abrir obra</button><p>Segure o ponto no mapa para iniciar ou continuar o traçado.</p></div>`;
}

function stopContextInfo(stop, route) {
  const index = route.stops.findIndex((item) => item.id === stop.id);
  return `<div class="gm-context-card"><small>Parada ${index + 1}</small><strong>${stop.name}</strong><span>${stop.address}</span><label>Tempo de parada<input type="number" min="0" step="15" value="${Number(stop.durationMinutes || 60)}" data-stop-context-duration><b>min</b></label><button type="button" data-stop-context-save>Atualizar parada</button><p>Segure o ponto para continuar o traçado pelas estradas.</p></div>`;
}

function durationEditor(stop, route) {
  const index = route.stops.findIndex((item) => item.id === stop.id);
  return `<div class="gm-stop-editor"><small>Nova parada ${index + 1}</small><strong>${stop.name}</strong><span>${stop.address}</span><label>Tempo de parada<input type="number" min="0" step="15" value="${Number(stop.durationMinutes || 60)}" data-stop-duration-editor><b>min</b></label><button type="button" data-stop-duration-save>Adicionar tempo e continuar</button></div>`;
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
  if (!route.stops.length) {
    order.innerHTML = "<small>Nenhuma parada conectada</small>";
    return;
  }
  order.innerHTML = route.stops.map((stop, index) => `<span><b>${index + 1}</b>${stop.name}</span>`).join("");
}

function createProjectionAdapter(map) {
  const overlay = new google.maps.OverlayView();
  overlay.onAdd = () => {};
  overlay.draw = () => {};
  overlay.onRemove = () => {};
  overlay.setMap(map);
  return {
    overlay,
    fromClientPoint(clientX, clientY, element) {
      const projection = overlay.getProjection();
      if (!projection) return null;
      const rect = element.getBoundingClientRect();
      const point = new google.maps.Point(clientX - rect.left, clientY - rect.top);
      const latLng = projection.fromContainerPixelToLatLng(point);
      return latLng ? { lat: latLng.lat(), lng: latLng.lng() } : null;
    },
  };
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
  const projectionAdapter = createProjectionAdapter(map);
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
  setDrawStatus(wrap, route.stops.length
    ? `Continue segurando a última parada: ${route.stops.at(-1)?.name || ""}`
    : "Segure um ponto de obra e mova o mouse para desenhar pelas estradas.");

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
    markerViews.forEach(({ content }) => content.classList.remove("is-origin"));
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
          strokeOpacity: 0.82,
          strokeWeight: 6,
          zIndex: 80,
        });
        cursorGuide?.setOptions({ strokeOpacity: 0.12 });
        setDrawStatus(wrap, `Rota em estrada: ${(result.distanceMeters / 1000).toFixed(1)} km · ${durationText(result.durationMillis)}`, "drawing");
      } catch (error) {
        if (!drawing || token !== previewToken) return;
        setDrawStatus(wrap, "Mova o cursor para uma via alcançável.", "warning");
      }
    }, 320);
  };

  const bindInfoActions = (stop, work = null, pending = false) => {
    google.maps.event.addListenerOnce(info, "domready", () => {
      document.querySelector(`[data-map-open-work="${work?.id || ""}"]`)?.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("macroobras:open-work", { detail: { workId: work.id } }));
      });
      const contextInput = document.querySelector("[data-stop-context-duration]");
      document.querySelector("[data-stop-context-save]")?.addEventListener("click", () => {
        stop.durationMinutes = Math.max(0, Number(contextInput?.value || 0));
        state.visitDurations[stop.id] = stop.durationMinutes;
        route.pendingStopId = "";
        dispatchRouteChange(route, "Tempo da parada atualizado.");
        info.close();
      });
      const editorInput = document.querySelector("[data-stop-duration-editor]");
      document.querySelector("[data-stop-duration-save]")?.addEventListener("click", () => {
        stop.durationMinutes = Math.max(0, Number(editorInput?.value || 0));
        state.visitDurations[stop.id] = stop.durationMinutes;
        route.pendingStopId = "";
        dispatchRouteChange(route, "Parada adicionada. Segure o último ponto para continuar o traçado.");
        info.close();
      });
      if (pending) editorInput?.focus();
    });
  };

  const openContext = (stop, marker) => {
    const work = stop.workId ? availableWorks.find((item) => item.id === stop.workId) : null;
    info.setContent(work ? workContextInfo(work, stop, route) : stopContextInfo(stop, route));
    info.open({ map, anchor: marker });
    bindInfoActions(stop, work, false);
  };

  const openDurationEditor = (stop, marker) => {
    info.setContent(durationEditor(stop, route));
    info.open({ map, anchor: marker });
    bindInfoActions(stop, null, true);
  };

  const beginDrawing = (stop, content, event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const tail = route.stops.at(-1);
    if (tail && tail.id !== stop.id) {
      dispatchRouteToast(`Continue o traçado pela última parada: ${tail.name}.`);
      openContext(stop, markerViews.get(stop.id)?.marker);
      return;
    }
    info.close();
    drawing = {
      origin: stop,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    map.setOptions({ draggable: false, gestureHandling: "none" });
    markerViews.forEach(({ content: item }) => item.classList.remove("is-origin"));
    content.classList.add("is-origin");
    cursorGuide = new google.maps.Polyline({
      map,
      path: [stop.coordinates, stop.coordinates],
      strokeColor: "#0a61d8",
      strokeOpacity: 0.38,
      strokeWeight: 3,
      strokeDashArray: [8, 7],
      zIndex: 70,
    });
    setDrawStatus(wrap, `Segurando ${stop.name}. Mova o mouse para traçar pelas estradas.`, "drawing");
  };

  const bindPointMarker = (stop, marker, content) => {
    markerViews.set(stop.id, { marker, content, stop });
    content.addEventListener("pointerdown", (event) => beginDrawing(stop, content, event));
    content.addEventListener("contextmenu", (event) => event.preventDefault());
  };

  availableWorks.forEach((work, index) => {
    const { element: content, stop } = workPointContent(work, route);
    const marker = new AdvancedMarkerElement({
      map,
      position: work.coordinates,
      title: work.name,
      gmpClickable: true,
      content,
      zIndex: 100 + index,
    });
    bindPointMarker(stop, marker, content);
  });

  route.stops.filter((stop) => stop.kind !== "work").forEach((stop, index) => {
    const content = customStopContent(stop, route);
    const marker = new AdvancedMarkerElement({
      map,
      position: stop.coordinates,
      title: stop.name,
      gmpClickable: true,
      content,
      zIndex: 180 + index,
    });
    bindPointMarker(stop, marker, content);
  });

  const commitDestination = async (destinationCoordinates, targetStop = null) => {
    const current = drawing;
    if (!current) return;
    if (targetStop && route.stops.some((stop) => stop.id === targetStop.id)) {
      cancelDrawing("A parada selecionada já pertence à rota.");
      dispatchRouteToast("Escolha um novo ponto ou solte em outra cidade.");
      return;
    }
    clearPreview();
    setDrawStatus(wrap, "Fixando o trecho na malha rodoviária…", "drawing");
    try {
      const result = await computeRoadSegment(current.origin.coordinates, destinationCoordinates, false);
      const snappedCoordinates = result.path.at(-1) || destinationCoordinates;
      let destination = targetStop;
      if (!destination) {
        const description = await reverseGeocode(snappedCoordinates);
        destination = {
          id: `stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          kind: "custom",
          workId: "",
          name: description.name,
          address: description.address,
          coordinates: snappedCoordinates,
          durationMinutes: 60,
        };
      }
      const segment = {
        id: `visita-${current.origin.id}-${destination.id}-${Date.now().toString(36)}`,
        fromId: current.origin.id,
        toId: destination.id,
        path: result.path,
        distanceMeters: result.distanceMeters,
        durationMillis: result.durationMillis,
      };
      route = {
        stops: route.stops.length ? [...route.stops, destination] : [current.origin, destination],
        segments: [...route.segments, segment],
        totalDistanceMeters: route.totalDistanceMeters + result.distanceMeters,
        totalDurationMillis: route.totalDurationMillis + result.durationMillis,
        pendingStopId: destination.id,
      };
      drawing = null;
      restoreMapGesture();
      dispatchRouteChange(route, `Trecho fixado pelas estradas até ${destination.name}. Informe o tempo de parada.`);
    } catch (error) {
      cancelDrawing("Não foi possível concluir o trecho viário.");
      dispatchRouteToast(error.message || "O Google Routes não calculou o trecho.");
    }
  };

  const pointerMove = (event) => {
    if (!drawing) return;
    drawing.lastX = event.clientX;
    drawing.lastY = event.clientY;
    const distance = Math.hypot(event.clientX - drawing.startX, event.clientY - drawing.startY);
    if (distance < 5) return;
    drawing.moved = true;
    const cursor = projectionAdapter.fromClientPoint(event.clientX, event.clientY, element);
    if (!cursor) return;
    cursorGuide?.setPath([drawing.origin.coordinates, cursor]);
    scheduleRoadPreview(drawing.origin.coordinates, cursor);
  };

  const pointerUp = (event) => {
    if (!drawing) return;
    const current = drawing;
    if (!current.moved) {
      const record = markerViews.get(current.origin.id);
      cancelDrawing("Clique reconhecido. Use o cartão para as ações do ponto.");
      if (record) openContext(current.origin, record.marker);
      return;
    }
    const cursor = projectionAdapter.fromClientPoint(event.clientX, event.clientY, element);
    if (!cursor) {
      cancelDrawing("Solte dentro do mapa para criar a parada.");
      return;
    }
    const stack = document.elementsFromPoint(event.clientX, event.clientY);
    const workElement = stack.map((node) => node.closest?.("[data-work-point-id]")).find(Boolean);
    const stopElement = stack.map((node) => node.closest?.("[data-route-stop-id]")).find(Boolean);
    let targetStop = null;
    if (workElement?.dataset.workPointId) {
      const work = availableWorks.find((item) => item.id === workElement.dataset.workPointId);
      if (work) targetStop = routeStopFromWork(work);
    } else if (stopElement?.dataset.routeStopId) {
      targetStop = stopById(route, stopElement.dataset.routeStopId);
    }
    void commitDestination(targetStop?.coordinates || cursor, targetStop);
  };

  const pointerCancel = () => drawing && cancelDrawing();
  const escapeDrawing = (event) => {
    if (event.key === "Escape" && drawing) cancelDrawing("Traçado cancelado com Esc.");
  };
  document.addEventListener("pointermove", pointerMove);
  document.addEventListener("pointerup", pointerUp);
  document.addEventListener("pointercancel", pointerCancel);
  document.addEventListener("keydown", escapeDrawing);

  wrap?.querySelectorAll("[data-visit-map-command]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const command = button.dataset.visitMapCommand;
      if (command === "clear") {
        savedLayers.forEach((layer) => layer.setMap(null));
        savedLayers = [];
        route = { stops: [], segments: [], totalDistanceMeters: 0, totalDurationMillis: 0, pendingStopId: "" };
        dispatchRouteChange(route, "Traçado de visitas limpo. Segure qualquer obra para iniciar.");
      }
      if (command === "undo") {
        if (!route.segments.length) {
          dispatchRouteToast("Não há trecho para desfazer.");
          return;
        }
        const removed = route.segments.at(-1);
        route = {
          stops: route.stops.slice(0, -1),
          segments: route.segments.slice(0, -1),
          totalDistanceMeters: Math.max(0, route.totalDistanceMeters - Number(removed.distanceMeters || 0)),
          totalDurationMillis: Math.max(0, route.totalDurationMillis - Number(removed.durationMillis || 0)),
          pendingStopId: "",
        };
        dispatchRouteChange(route, "Último trecho removido.");
      }
    });
  });

  cleanupActiveVisitsMap = () => {
    window.clearTimeout(previewTimer);
    document.removeEventListener("pointermove", pointerMove);
    document.removeEventListener("pointerup", pointerUp);
    document.removeEventListener("pointercancel", pointerCancel);
    document.removeEventListener("keydown", escapeDrawing);
    projectionAdapter.overlay.setMap(null);
    clearPreview();
    savedLayers.forEach((layer) => layer.setMap(null));
  };

  fitMapToWorks(map, availableWorks);
  element.__macroMap = map;

  if (route.pendingStopId) {
    const pending = stopById(route, route.pendingStopId);
    const record = markerViews.get(route.pendingStopId);
    if (pending && record) window.setTimeout(() => openDurationEditor(pending, record.marker), 80);
  }
}

function renderMapError(element, error) {
  element.innerHTML = `<div class="map-error"><strong>Google Maps indisponível</strong><span>${error.message}</span><small>Confira a restrição da chave, faturamento e APIs habilitadas.</small></div>`;
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
  } catch (error) {
    elements.forEach((element) => renderMapError(element, error));
    return;
  }

  for (const element of elements) {
    element.dataset.hydrated = "true";
    try {
      const type = element.dataset.googleMap;
      if (type === "work") await renderSingleWorkMap(element);
      else if (type === "visits") await renderVisitsMap(element);
      else if (type === "address") await renderAddressPreviewMap(element);
      else await renderWorksMap(element);
    } catch (error) {
      renderMapError(element, error);
    }
  }
}

export async function geocodeWorkAddress(address) {
  await loadGoogleMaps();
  const result = await geocode(address);
  return {
    address: result.formattedAddress,
    coordinates: cloneCoordinates(result.location),
  };
}
