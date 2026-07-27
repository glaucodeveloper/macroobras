import { availableWorks } from "../core/data.js";
import { runtimeConfig } from "../core/runtime-config.js";

let loaderPromise;

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
  const element = document.createElement("button");
  element.className = "gm-work-marker";
  element.type = "button";
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

function haversine(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const earth = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function setRouteMetrics(distanceKm, durationMinutes) {
  const travel = `${Math.floor(durationMinutes / 60)}h ${Math.round(durationMinutes % 60)}min`;
  document.querySelector("[data-route-travel]")?.replaceChildren(document.createTextNode(travel));
  document.querySelector("[data-route-distance]")?.replaceChildren(document.createTextNode(`${distanceKm.toFixed(0)} km`));
}

function approximateRoute(map, points) {
  const { Polyline } = google.maps;
  const polyline = new Polyline({ map, path: points, strokeColor: "#0f62fe", strokeOpacity: 0.9, strokeWeight: 6 });
  const distance = points.slice(1).reduce((sum, point, index) => sum + haversine(points[index], point), 0);
  setRouteMetrics(distance, distance / 55 * 60);
  return [polyline];
}

async function drawRoute(map, points, previous = []) {
  previous.forEach((layer) => layer?.setMap?.(null));
  if (points.length < 2) return [];
  try {
    const { Route } = await google.maps.importLibrary("routes");
    const response = await Route.computeRoutes({
      origin: points[0],
      destination: points.at(-1),
      intermediates: points.slice(1, -1).map((location) => ({ location })),
      travelMode: "DRIVING",
      routingPreference: "TRAFFIC_AWARE",
      language: "pt-BR",
      region: "BR",
      fields: ["path", "distanceMeters", "durationMillis", "viewport", "legs"],
    });
    const route = response.routes?.[0];
    if (!route) throw new Error("Rota não retornada.");
    const polylines = route.createPolylines();
    polylines.forEach((polyline) => {
      polyline.setOptions?.({ strokeColor: "#0f62fe", strokeOpacity: 0.92, strokeWeight: 6 });
      polyline.setMap(map);
    });
    if (route.viewport) map.fitBounds(route.viewport, 68);
    setRouteMetrics((route.distanceMeters || 0) / 1000, (route.durationMillis || 0) / 60000);
    return polylines;
  } catch (error) {
    const fallback = approximateRoute(map, points);
    document.querySelector("[data-route-source]")?.replaceChildren(document.createTextNode("Estimativa local; habilite a Routes API para tempo viário."));
    return fallback;
  }
}

function visitInfo(work, index) {
  const value = document.querySelector(`[data-visit-duration="${work.id}"]`)?.value || 60;
  return `<div class="gm-visit-info"><small>Ponto ${index + 1}</small><strong>${work.name}</strong><label>Duração da visita<input type="number" min="15" step="15" value="${value}" data-map-visit-duration="${work.id}"><span>min</span></label></div>`;
}

async function renderVisitsMap(element) {
  const [{ Map, InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);
  const map = new Map(element, mapOptions(availableWorks[0].coordinates, 6));
  const info = new InfoWindow();
  const points = availableWorks.map((work) => ({ ...work.coordinates }));
  let routeLayers = [];

  availableWorks.forEach((work, index) => {
    const content = markerContent(work, index);
    const marker = new AdvancedMarkerElement({
      map,
      position: points[index],
      title: `${index + 1}. ${work.name}`,
      gmpDraggable: true,
      gmpClickable: true,
      content,
    });

    const openDuration = () => {
      info.setContent(visitInfo(work, index));
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

    content.addEventListener("mouseenter", openDuration);
    marker.addListener("click", openDuration);
    marker.addListener("dragend", async () => {
      const position = marker.position;
      const lat = typeof position?.lat === "function" ? position.lat() : Number(position?.lat);
      const lng = typeof position?.lng === "function" ? position.lng() : Number(position?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) points[index] = { lat, lng };
      routeLayers = await drawRoute(map, points, routeLayers);
    });
  });

  fitMapToWorks(map, availableWorks);
  routeLayers = await drawRoute(map, points, routeLayers);
  element.__macroMap = map;
}

export async function hydrateGoogleMaps(root = document) {
  const elements = [...root.querySelectorAll("[data-google-map]")].filter((element) => !element.dataset.hydrated);
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
