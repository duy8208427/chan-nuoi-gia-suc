import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Marker } from "maplibre-gl";
import { UNASSIGNED_FARM_ID } from "../catalog";
import { formatNumber, offendingMetrics, splitPath, tripTooHot } from "../geo";
import type { FarmView, HoverInfo, MapLayers, Measurement, Plant, PondPin, VehicleView } from "../types";

type Props = {
  pins: PondPin[];
  farms: FarmView[];
  plants: Plant[];
  vehicles: VehicleView[];
  layers: MapLayers;
  selectedId: string | null;
  selectedFarmId: string | null;
  selectedVehicleId: string | null;
  selectedPlantId: string | null;
  onHover: (info: HoverInfo | null, immediate?: boolean) => void;
  onSelect: (pondId: string) => void;
  onSelectFarm: (farmId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onSelectPlant: (plantId: string) => void;
  onBackground: () => void;
};

const WATER = "#0c4a6e";
const FOCUS_PITCH = 36;
/** Từ mức zoom này trở lên, chuồng trong trại mới hiện ra; dưới đó chỉ thấy thẻ trại. */
const PEN_ZOOM = 14;
/** Cùng bề rộng với ScaleControl. Dưới 50 km trên thước thì nhãn hiện như khi thước ghi khoảng 30 km. */
const SCALE_BAR_PX = 88;
const DETAIL_SCALE_M = 50_000;
/** Mức zoom khi bay vào một trại hoặc chuồng: các chuồng cách nhau vài trăm mét đủ giãn để thẻ không đè nhau. */
const FOCUS_ZOOM = 15;

const PEN_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>';

const METRIC_SHORT: Record<string, string> = {
  ATEMP: "Nhiệt",
  RH: "Ẩm",
  WTEMP: "Nước",
  WCON: "Uống",
  FEED: "Ăn",
  AIR: "Gió",
};

function metricLabel(item: Measurement): string {
  const name = METRIC_SHORT[item.param_code] ?? item.param_code;
  const unit = item.unit && item.unit !== "—" ? ` ${item.unit}` : "";
  return `${name} ${formatNumber(item.measured_value, 1)}${unit}`;
}

const SATELLITE_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
];
const STREET_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
];

const STYLE = {
  version: 8 as const,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    satellite: {
      type: "raster" as const,
      tiles: SATELLITE_TILES,
      tileSize: 256,
      maxzoom: 18,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    { id: "background", type: "background" as const, paint: { "background-color": WATER } },
    { id: "satellite", type: "raster" as const, source: "satellite" },
  ],
};

const MINI_STYLE = {
  version: 8 as const,
  sources: {
    streets: {
      type: "raster" as const,
      tiles: STREET_TILES,
      tileSize: 256,
      maxzoom: 17,
      attribution: "Esri, OpenStreetMap",
    },
  },
  layers: [
    { id: "background", type: "background" as const, paint: { "background-color": WATER } },
    { id: "streets", type: "raster" as const, source: "streets" },
  ],
};

function ensureRaster(map: MapLibreMap, id: string, tiles: string[], visible: boolean, maxzoom: number) {
  if (!map.isStyleLoaded()) return;
  if (!map.getSource(id)) map.addSource(id, { type: "raster", tiles, tileSize: 256, maxzoom });
  if (!map.getLayer(id)) {
    map.addLayer(
      { id, type: "raster", source: id, layout: { visibility: visible ? "visible" : "none" } },
      map.getLayer("routes-glow") ? "routes-glow" : undefined,
    );
  } else {
    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }
}

function cameraRect(map: MapLibreMap) {
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const cx = w / 2;
  const cy = h * 0.42;
  const dx = w * 0.36;
  const dy = h * 0.26;
  return [
    map.unproject([cx - dx, cy - dy]),
    map.unproject([cx + dx, cy - dy]),
    map.unproject([cx - dx, cy + dy]),
    map.unproject([cx + dx, cy + dy]),
  ];
}

function statusClass(status: PondPin["status"]): string {
  if (status === "HIGH") return "danger";
  if (status === "LOW") return "warn";
  if (status === "OK") return "ok";
  return "idle";
}

function setMarkerClasses(el: HTMLElement, classes: string) {
  const keep = [...el.classList].filter((name) => name.startsWith("maplibregl-") || name === "front");
  el.className = [...new Set([...classes.split(/\s+/).filter(Boolean), ...keep])].join(" ");
}

function showsDetail(map: MapLibreMap) {
  const canvas = map.getCanvas();
  if (!canvas.clientWidth || !canvas.clientHeight) return false;
  const x = canvas.clientWidth / 2;
  const y = canvas.clientHeight / 2;
  const left = map.unproject([x, y]);
  const right = map.unproject([x + SCALE_BAR_PX, y]);
  return left.distanceTo(right) < DETAIL_SCALE_M;
}

function labelsOverlap(a: DOMRect, b: DOMRect) {
  const gap = 6;
  return a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
}

const LABEL_SLOTS = ["", "below", "shift-left", "shift-right"] as const;

/** Thẻ ưu tiên nằm trên chấm. Hết chỗ thì thử dưới, trái, phải. Vẫn kẹt thì ẩn: đỏ, vàng, xanh, rồi xám. */
function settleLabels(root: HTMLElement) {
  const pins = [...root.querySelectorAll<HTMLElement>(".pond-pin, .farm-pin")];
  for (const el of pins) el.classList.remove("crowd", "below", "shift-left", "shift-right");
  const items: { el: HTMLElement; card: HTMLElement; rank: number }[] = [];
  pins.forEach((el, index) => {
    if (el.classList.contains("far") || el.classList.contains("brief")) return;
    const card = el.querySelector<HTMLElement>(".card, .farm-card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const tone = el.classList.contains("danger") ? 4 : el.classList.contains("warn") ? 3 : el.classList.contains("ok") ? 2 : 1;
    const rank = (el.classList.contains("selected") ? 10 : 0) + tone;
    items.push({ el, card, rank: rank * 1000 - index });
  });
  items.sort((a, b) => b.rank - a.rank);
  const placed: DOMRect[] = [];
  for (const item of items) {
    const pinned = item.el.classList.contains("selected");
    let parked: DOMRect | null = null;
    for (const slot of LABEL_SLOTS) {
      item.el.classList.remove("below", "shift-left", "shift-right");
      if (slot) item.el.classList.add(slot);
      const rect = item.card.getBoundingClientRect();
      if (!placed.some((spot) => labelsOverlap(rect, spot))) {
        parked = rect;
        break;
      }
    }
    if (parked) {
      placed.push(parked);
      continue;
    }
    item.el.classList.remove("below", "shift-left", "shift-right");
    if (pinned) placed.push(item.card.getBoundingClientRect());
    else item.el.classList.add("crowd");
  }
}

function focusPadding(side: boolean) {
  return side
    ? { top: 90, left: 40, right: 380, bottom: 80 }
    : { top: 90, left: 40, right: 40, bottom: 80 };
}

function activeTrip(vehicle: VehicleView) {
  const status = vehicle.trip?.status;
  return status === "waiting" || status === "enroute" || status === "late";
}

function tripLineCollection(vehicles: VehicleView[], selectedVehicleId: string | null): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const item of vehicles) {
    if (!activeTrip(item) || item.path.length < 2) continue;
    const { done, rest } = splitPath(item.path, item.progress);
    const base = {
      id: item.id,
      kind: item.trip?.status ?? "enroute",
      selected: item.id === selectedVehicleId,
      name: item.route_name ?? item.plate,
    };
    if (done.length >= 2) {
      features.push({
        type: "Feature",
        properties: { ...base, stroke: "done" },
        geometry: { type: "LineString", coordinates: done },
      });
    }
    if (rest.length >= 2) {
      features.push({
        type: "Feature",
        properties: { ...base, stroke: "rest" },
        geometry: { type: "LineString", coordinates: rest },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

const ROUTE_LAYER_IDS = ["routes-glow", "routes-line", "routes-rest-glow", "routes-rest-line"] as const;
const DONE_FILTER: maplibregl.FilterSpecification = ["==", ["get", "stroke"], "done"];
const REST_FILTER: maplibregl.FilterSpecification = ["==", ["get", "stroke"], "rest"];
const REST_DASH_SEQ: number[][] = [
  [0, 2, 1.8],
  [0.5, 2, 1.3],
  [1, 2, 0.8],
  [1.5, 2, 0.3],
  [0, 0.5, 2, 1.3],
  [0, 1, 2, 0.8],
  [0, 1.5, 2, 0.3],
];

function applyRestDash(map: MapLibreMap, step: number) {
  if (!map.getLayer("routes-rest-line") || !map.isStyleLoaded()) return;
  try {
    map.setPaintProperty("routes-rest-line", "line-dasharray", REST_DASH_SEQ[step % REST_DASH_SEQ.length]);
  } catch {
    /* style not ready */
  }
}

function setRouteVisibility(map: MapLibreMap, visible: boolean) {
  const line = visible ? "visible" : "none";
  if (map.getLayer("routes-line")) map.setLayoutProperty("routes-line", "visibility", line);
  if (map.getLayer("routes-rest-line")) map.setLayoutProperty("routes-rest-line", "visibility", line);
  if (map.getLayer("routes-glow")) map.setLayoutProperty("routes-glow", "visibility", "none");
  if (map.getLayer("routes-rest-glow")) map.setLayoutProperty("routes-rest-glow", "visibility", "none");
}

const TRUCK_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 13.2 6.6 9A1.8 1.8 0 0 1 8.3 7.8h6.4c.7 0 1.3.4 1.6 1.1L18.2 13H19c.9 0 1.6.7 1.6 1.6v.6c0 .6-.5 1.1-1.1 1.1h-.4a2.3 2.3 0 0 1-4.5 0H9.2a2.3 2.3 0 0 1-4.5 0h-.3c-.6 0-1.1-.5-1.1-1.1v-.6c0-.9.7-1.6 1.6-1.6H5Zm2.9 3.1a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Zm8.2 0a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2ZM8.5 9.2 7.5 13h9.1l-1.1-3.8H8.5Z"/></svg>`;

function vehicleLngLat(vehicle: VehicleView): [number, number] {
  if (vehicle.trip?.status !== "received") return [vehicle.longitude, vehicle.latitude];
  return [vehicle.longitude + 0.00085, vehicle.latitude + 0.00045];
}

function parkedAtOrigin(vehicle: VehicleView): boolean {
  return vehicle.trip?.status === "waiting" && Boolean(vehicle.origin);
}

function destLngLat(dest: { lng: number; lat: number }, plantsOn: boolean): [number, number] {
  if (!plantsOn) return [dest.lng, dest.lat];
  return [dest.lng - 0.00095, dest.lat + 0.00055];
}

const ROUTE_COLOR: maplibregl.ExpressionSpecification = [
  "case",
  ["==", ["get", "kind"], "late"],
  "#e11d48",
  ["==", ["get", "kind"], "waiting"],
  "#64748b",
  "#f59e0b",
];
const ROUTE_GLOW: maplibregl.ExpressionSpecification = [
  "case",
  ["==", ["get", "kind"], "late"],
  "#fda4af",
  ["==", ["get", "kind"], "waiting"],
  "#e2e8f0",
  "#fde68a",
];

function hideMarker(marker: Marker) {
  const el = marker.getElement();
  el.hidden = true;
  marker.remove();
}

function showMarker(map: MapLibreMap, marker: Marker, lng: number, lat: number) {
  const el = marker.getElement();
  el.hidden = false;
  marker.setLngLat([lng, lat]);
  if (!el.isConnected) marker.addTo(map);
}

function runWhenReady(map: MapLibreMap, mapReady: boolean, draw: () => void) {
  const run = () => {
    if (map.isStyleLoaded() || map.loaded()) draw();
    else map.once("load", draw);
  };
  if (mapReady) run();
  else map.once("idle", run);
  return () => {
    map.off("load", draw);
    map.off("idle", run);
  };
}

function paintRouteLayers(map: MapLibreMap) {
  const glowWidth: maplibregl.ExpressionSpecification = ["case", ["get", "selected"], 16, 14];
  const glowOp: maplibregl.ExpressionSpecification = ["case", ["==", ["get", "kind"], "waiting"], 0.7, 0.88];
  const lineWidth: maplibregl.ExpressionSpecification = ["case", ["get", "selected"], 6, 5];
  const lineOp: maplibregl.ExpressionSpecification = ["case", ["==", ["get", "kind"], "waiting"], 0.85, 1];
  if (map.getLayer("routes-glow")) {
    map.setFilter("routes-glow", DONE_FILTER);
    map.setPaintProperty("routes-glow", "line-color", ROUTE_GLOW);
    map.setPaintProperty("routes-glow", "line-width", glowWidth);
    map.setPaintProperty("routes-glow", "line-opacity", glowOp);
  }
  if (map.getLayer("routes-line")) {
    map.setFilter("routes-line", DONE_FILTER);
    map.setPaintProperty("routes-line", "line-color", ROUTE_COLOR);
    map.setPaintProperty("routes-line", "line-width", lineWidth);
    map.setPaintProperty("routes-line", "line-opacity", lineOp);
  }
  if (map.getLayer("routes-rest-glow")) {
    map.setFilter("routes-rest-glow", REST_FILTER);
    map.setPaintProperty("routes-rest-glow", "line-color", ROUTE_GLOW);
    map.setPaintProperty("routes-rest-glow", "line-width", glowWidth);
    map.setPaintProperty("routes-rest-glow", "line-opacity", glowOp);
  }
  if (map.getLayer("routes-rest-line")) {
    map.setFilter("routes-rest-line", REST_FILTER);
    map.setPaintProperty("routes-rest-line", "line-color", ROUTE_COLOR);
    map.setPaintProperty("routes-rest-line", "line-width", lineWidth);
    map.setPaintProperty("routes-rest-line", "line-opacity", lineOp);
  }
}

function ensureRouteLayers(map: MapLibreMap, data: GeoJSON.FeatureCollection) {
  const existing = map.getSource("routes") as GeoJSONSource | undefined;
  if (!existing) map.addSource("routes", { type: "geojson", data });
  else existing.setData(data);

  if (!map.getLayer("routes-glow")) {
    map.addLayer({
      id: "routes-glow",
      type: "line",
      source: "routes",
      filter: DONE_FILTER,
      paint: {
        "line-color": ROUTE_GLOW,
        "line-width": ["case", ["get", "selected"], 16, 14],
        "line-opacity": ["case", ["==", ["get", "kind"], "waiting"], 0.7, 0.88],
      },
    });
  }
  if (!map.getLayer("routes-line")) {
    map.addLayer({
      id: "routes-line",
      type: "line",
      source: "routes",
      filter: DONE_FILTER,
      paint: {
        "line-color": ROUTE_COLOR,
        "line-width": ["case", ["get", "selected"], 6, 5],
        "line-opacity": ["case", ["==", ["get", "kind"], "waiting"], 0.85, 1],
      },
    });
  }
  if (!map.getLayer("routes-rest-glow")) {
    map.addLayer({
      id: "routes-rest-glow",
      type: "line",
      source: "routes",
      filter: REST_FILTER,
      paint: {
        "line-color": ROUTE_GLOW,
        "line-width": ["case", ["get", "selected"], 16, 14],
        "line-opacity": ["case", ["==", ["get", "kind"], "waiting"], 0.7, 0.88],
        "line-dasharray": [2, 1.2],
      },
    });
  }
  if (!map.getLayer("routes-rest-line")) {
    map.addLayer({
      id: "routes-rest-line",
      type: "line",
      source: "routes",
      filter: REST_FILTER,
      layout: {
        "line-cap": "butt",
        "line-join": "round",
      },
      paint: {
        "line-color": ROUTE_COLOR,
        "line-width": ["case", ["get", "selected"], 6, 5],
        "line-opacity": ["case", ["==", ["get", "kind"], "waiting"], 0.85, 1],
        "line-dasharray": REST_DASH_SEQ[0],
      },
    });
  } else {
    map.setLayoutProperty("routes-rest-line", "line-cap", "butt");
  }
  paintRouteLayers(map);
  if (map.getLayer("routes-glow")) map.setLayoutProperty("routes-glow", "visibility", "none");
  if (map.getLayer("routes-rest-glow")) map.setLayoutProperty("routes-rest-glow", "visibility", "none");
}

export function PondMap({
  pins,
  farms,
  plants,
  vehicles,
  layers,
  selectedId,
  selectedFarmId,
  selectedVehicleId,
  selectedPlantId,
  onHover,
  onSelect,
  onSelectFarm,
  onSelectVehicle,
  onSelectPlant,
  onBackground,
}: Props) {
  const [mapReady, setMapReady] = useState(false);
  const [streetMain, setStreetMain] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const miniMapRef = useRef<MapLibreMap | null>(null);
  const streetMainRef = useRef(false);
  const applyBasemapRef = useRef<(street: boolean) => void>(() => {});
  const pinMarkers = useRef(new Map<string, Marker>());
  const extraMarkers = useRef(new Map<string, Marker>());
  const extraClicks = useRef(new Map<string, () => void>());
  const pinsRef = useRef(pins);
  const farmsRef = useRef(farms);
  const plantsRef = useRef(plants);
  const vehiclesRef = useRef(vehicles);
  const hoverRef = useRef(onHover);
  const selectRef = useRef(onSelect);
  const farmRef = useRef(onSelectFarm);
  const vehicleRef = useRef(onSelectVehicle);
  const plantRef = useRef(onSelectPlant);
  const backgroundRef = useRef(onBackground);
  const layersRef = useRef(layers);
  const settleRef = useRef<() => void>(() => {});
  pinsRef.current = pins;
  farmsRef.current = farms;
  plantsRef.current = plants;
  vehiclesRef.current = vehicles;
  hoverRef.current = onHover;
  selectRef.current = onSelect;
  farmRef.current = onSelectFarm;
  vehicleRef.current = onSelectVehicle;
  plantRef.current = onSelectPlant;
  backgroundRef.current = onBackground;
  layersRef.current = layers;
  applyBasemapRef.current = (street: boolean) => {
    const map = mapRef.current;
    const mini = miniMapRef.current;
    if (map) {
      ensureRaster(map, "streets", STREET_TILES, street, 17);
      if (map.getLayer("satellite")) map.setLayoutProperty("satellite", "visibility", street ? "none" : "visible");
    }
    if (mini) {
      ensureRaster(mini, "satellite", SATELLITE_TILES, street, 18);
      if (mini.getLayer("streets")) mini.setLayoutProperty("streets", "visibility", street ? "none" : "visible");
    }
  };
  const vehicleIds = vehicles.map((item) => item.id).join(",");
  const tripLineKey = vehicles
    .filter((item) => activeTrip(item) && item.path.length >= 2)
    .map((item) => `${item.id}:${item.trip?.status}:${item.path.length}:${Math.round(item.progress * 100)}`)
    .join(",");

  useEffect(() => {
    if (!rootRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: rootRef.current,
      style: STYLE as maplibregl.StyleSpecification,
      center: [106.4, 16],
      zoom: 5.3,
      pitch: 32,
      bearing: -12,
      maxPitch: 55,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 88 }), "bottom-left");
    const markReady = () => {
      map.resize();
      setMapReady(true);
    };
    map.on("load", () => applyBasemapRef.current(streetMainRef.current));
    map.on("load", markReady);
    map.on("idle", markReady);
    if (map.loaded()) markReady();
    map.on("zoom", () => {
      const showPens = map.getZoom() >= PEN_ZOOM;
      const grouped = layersRef.current.farms;
      rootRef.current?.querySelectorAll(".pond-pin[data-farm]").forEach((el) => {
        el.classList.toggle("far", grouped && !showPens && !el.classList.contains("selected"));
      });
      rootRef.current?.querySelectorAll(".pond-pin, .farm-pin").forEach((el) => {
        el.classList.toggle("brief", !showsDetail(map) && !el.classList.contains("selected"));
      });
      rootRef.current?.querySelectorAll(".farm-pin").forEach((el) => el.classList.toggle("compact", showPens));
      rootRef.current?.querySelectorAll(".layer-pin:not(.selected)").forEach((el) => el.classList.remove("show-name"));
      for (const [id, marker] of extraMarkers.current) {
        if (id.startsWith("origin-")) marker.setOffset([0, 0]);
      }
      if (rootRef.current) settleLabels(rootRef.current);
    });
    map.on("move", () => {
      if (rootRef.current) settleLabels(rootRef.current);
    });
    const clearHover = () => hoverRef.current(null, true);
    map.on("movestart", clearHover);
    map.on("dragstart", clearHover);
    map.on("click", (event) => {
      clearHover();
      if (!event.originalEvent.defaultPrevented) backgroundRef.current();
    });
    map.getCanvas().addEventListener("mouseleave", clearHover);
    settleRef.current = () => {
      if (rootRef.current) settleLabels(rootRef.current);
    };
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(rootRef.current);
    return () => {
      ro.disconnect();
      map.getCanvas().removeEventListener("mouseleave", clearHover);
      map.remove();
      mapRef.current = null;
      settleRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    if (!miniRef.current || miniMapRef.current) return;
    const mini = new maplibregl.Map({
      container: miniRef.current,
      style: MINI_STYLE as maplibregl.StyleSpecification,
      center: [106.4, 16],
      zoom: 4.2,
      pitch: 0,
      bearing: 0,
      interactive: true,
      attributionControl: false,
      dragRotate: false,
    });
    mini.scrollZoom.disable();
    mini.dragPan.disable();
    mini.touchZoomRotate.disableRotation();
    mini.on("load", () => {
      mini.resize();
      applyBasemapRef.current(streetMainRef.current);
    });
    mini.on("click", (event) => {
      mapRef.current?.flyTo({
        center: event.lngLat,
        zoom: Math.max(mapRef.current.getZoom(), 8.4),
        pitch: FOCUS_PITCH,
        speed: 0.9,
      });
    });
    miniMapRef.current = mini;
    return () => {
      mini.remove();
      miniMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mini = miniMapRef.current;
    if (!map || !mini) return;

    const sync = () => {
      const center = map.getCenter();
      const zoom = Math.min(9, Math.max(3.5, map.getZoom() - 2));
      mini.jumpTo({ center, zoom, bearing: 0, pitch: 0 });
      const points = cameraRect(map).map((lngLat) => mini.project(lngLat));
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const frame = frameRef.current;
      const box = mini.getContainer();
      if (!frame || !box) return;
      const pad = 8;
      let left = Math.min(...xs);
      let top = Math.min(...ys);
      let width = Math.max(...xs) - left;
      let height = Math.max(...ys) - top;
      left = Math.max(pad, left);
      top = Math.max(pad, top);
      width = Math.max(28, Math.min(width, box.clientWidth - left - pad));
      height = Math.max(22, Math.min(height, box.clientHeight - top - pad));
      frame.style.left = `${left}px`;
      frame.style.top = `${top}px`;
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
    };

    map.on("move", sync);
    if (mini.isStyleLoaded()) sync();
    else mini.once("load", sync);
    sync();
    return () => {
      map.off("move", sync);
    };
  }, [selectedId, selectedFarmId, selectedVehicleId, selectedPlantId]);

  useEffect(() => {
    miniMapRef.current?.resize();
  }, [selectedId, selectedFarmId, selectedVehicleId, selectedPlantId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => {
      const show = layersRef.current.routes;
      if (!show && ROUTE_LAYER_IDS.some((id) => map.getLayer(id))) {
        setRouteVisibility(map, false);
      }
      if (!map.isStyleLoaded() && !map.getSource("routes")) return;
      try {
        const data = tripLineCollection(show ? vehiclesRef.current : [], selectedVehicleId);
        ensureRouteLayers(map, data);
        setRouteVisibility(map, show);
      } catch {
        map.once("load", draw);
      }
    };
    const stop = runWhenReady(map, mapReady, draw);
    draw();
    return stop;
  }, [mapReady, layers.routes, selectedVehicleId, tripLineKey]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    let raf = 0;
    let frames = 0;
    let step = 0;
    const tick = () => {
      const current = mapRef.current;
      if (current?.getLayer("routes-rest-line") && current.isStyleLoaded() && !current.isZooming()) {
        frames += 1;
        if (frames % 3 === 0) {
          step = (step + 1) % REST_DASH_SEQ.length;
          applyRestDash(current, step);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const reapply = () => applyRestDash(mapRef.current ?? map, step);
    map.on("zoomend", reapply);
    map.on("moveend", reapply);
    applyRestDash(map, step);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      map.off("zoomend", reapply);
      map.off("moveend", reapply);
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Chuồng thuộc trại: so le trái/phải theo thứ tự trong trại và ẩn khi nhìn xa.
    const paint = (el: HTMLButtonElement, pin: PondPin, orderInFarm: number | undefined) => {
      const danger = pin.status === "HIGH";
      const selectedNow = selectedId === pin.pond.id;
      const inFarm = orderInFarm !== undefined;
      const side = inFarm ? (orderInFarm % 2 === 0 ? " side-right" : " side-left") : "";
      el.setAttribute("aria-label", pin.pond.pond_name);
      el.dataset.pondId = pin.pond.id;
      if (inFarm && pin.farm_id) el.dataset.farm = pin.farm_id;
      else delete el.dataset.farm;
      const raised = el.classList.contains("front");
      setMarkerClasses(
        el,
        `pond-pin ${statusClass(pin.status)}${selectedNow ? " selected" : ""}${danger ? " alert" : ""}${side}`,
      );
      if (raised) el.classList.add("front");
      const worst = offendingMetrics(pin.measurements)[0];
      const metric = worst
        ? `<em>${metricLabel(worst)}</em>`
        : pin.status === "NONE"
          ? '<em class="muted">Chưa đo</em>'
          : "";
      el.innerHTML = `<span class="pulse"></span><span class="card">${PEN_ICON}<b>${pin.pond.pond_name}</b>${metric}</span>`;
      el.classList.toggle("far", inFarm && layersRef.current.farms && map.getZoom() < PEN_ZOOM && !selectedNow);
      el.classList.toggle("brief", !showsDetail(map) && !selectedNow);
    };

    const draw = () => {
      const visiblePins = layersRef.current.ponds ? pinsRef.current : [];
      const keep = new Set(visiblePins.map((pin) => pin.pond.id));
      const order = new Map<string, number>();
      for (const farm of farmsRef.current) {
        if (farm.id === UNASSIGNED_FARM_ID) continue;
        farm.pins.forEach((item, index) => order.set(item.pond.id, index));
      }
      for (const pin of visiblePins) {
        let marker = pinMarkers.current.get(pin.pond.id);
        if (!marker) {
          const el = document.createElement("button");
          el.type = "button";
      el.addEventListener("mouseenter", () => {
        el.classList.add("front");
        const current = pinsRef.current.find((item) => item.pond.id === el.dataset.pondId);
        if (!current) return;
        const card = el.querySelector(".card");
        const rect = (card && card.getBoundingClientRect().width > 0 ? card : el).getBoundingClientRect();
        hoverRef.current({ pin: current, x: rect.left + rect.width / 2, y: rect.top, w: rect.width });
      });
      el.addEventListener("mouseleave", () => {
        el.classList.remove("front");
        hoverRef.current(null);
      });
          el.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            hoverRef.current(null, true);
            if (el.dataset.pondId) selectRef.current(el.dataset.pondId);
          });
          marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([pin.lng, pin.lat]);
          pinMarkers.current.set(pin.pond.id, marker);
        }
        showMarker(map, marker, pin.lng, pin.lat);
        paint(marker.getElement() as HTMLButtonElement, pin, order.get(pin.pond.id));
      }
      settleRef.current();
      for (const [id, marker] of pinMarkers.current) {
        if (keep.has(id)) continue;
        hideMarker(marker);
        pinMarkers.current.delete(id);
      }
    };

    const stop = runWhenReady(map, mapReady, draw);
    draw();
    return stop;
  }, [mapReady, pins, farms, selectedId, layers.ponds, layers.farms]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const upsert = (
      id: string,
      lng: number,
      lat: number,
      className: string,
      label: string,
      html: string,
      onClick: () => void,
      offset: [number, number] = [0, 0],
    ) => {
      extraClicks.current.set(id, onClick);
      let marker = extraMarkers.current.get(id);
      if (!marker) {
        const el = document.createElement("button");
        el.type = "button";
        el.dataset.extraId = id;
        el.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          extraClicks.current.get(el.dataset.extraId ?? "")?.();
        });
        el.addEventListener("mouseenter", () => {
          el.classList.add("show-name");
          if (el.classList.contains("farm-pin")) el.classList.add("front");
        });
        el.addEventListener("mouseleave", () => {
          if (!el.classList.contains("selected") || el.classList.contains("origin-pin")) el.classList.remove("show-name");
          el.classList.remove("front");
        });
        marker = new maplibregl.Marker({ element: el, anchor: "bottom", offset }).setLngLat([lng, lat]);
        extraMarkers.current.set(id, marker);
      }
      marker.setOffset(offset);
      showMarker(map, marker, lng, lat);
      const el = marker.getElement() as HTMLButtonElement;
      setMarkerClasses(el, className);
      el.setAttribute("aria-label", label);
      el.innerHTML = html;
      el.classList.toggle("show-name", className.includes("selected") && !className.includes("origin-pin") && !className.includes("farm-pin"));
    };

    const draw = () => {
      const visible = layersRef.current;
      const keep = new Set<string>();
      if (visible.farms) {
        for (const farm of farmsRef.current) {
          if (farm.id === UNASSIGNED_FARM_ID || !farm.pins.length) continue;
          const id = `farm-${farm.id}`;
          keep.add(id);
          const dots = farm.pins.map((item) => `<u class="${statusClass(item.status)}"></u>`).join("");
          const summary = farm.dangerCount
            ? `${farm.dangerCount} nguy hiểm${farm.warnCount ? ` · ${farm.warnCount} cảnh báo` : ""}`
            : farm.warnCount
              ? `${farm.warnCount} cảnh báo`
              : "Tất cả ổn";
          const compact = map.getZoom() >= PEN_ZOOM ? " compact" : "";
          const brief = showsDetail(map) || selectedFarmId === farm.id ? "" : " brief";
          upsert(
            id,
            farm.longitude,
            farm.latitude,
            `layer-pin farm-pin ${statusClass(farm.status)}${selectedFarmId === farm.id ? " selected" : ""}${compact}${brief}`,
            `${farm.name} · ${farm.pins.length} chuồng · ${summary}`,
            `<span class="mark farm-card"><span class="farm-head"><b>${farm.name}</b><i class="dots">${dots}</i></span><small>${summary}</small></span>`,
            () => farmRef.current(farm.id),
          );
        }
      }
      if (visible.plants) {
        for (const plant of plantsRef.current) {
          const id = `plant-${plant.id}`;
          keep.add(id);
          upsert(
            id,
            plant.longitude,
            plant.latitude,
            `layer-pin plant-pin${selectedPlantId === plant.id ? " selected" : ""}`,
            plant.name,
            `<span class="mark">NM</span><span class="name">${plant.name}</span>`,
            () => plantRef.current(plant.id),
          );
        }
      }
      if (visible.routes) {
        const destSeen = new Set<string>();
        for (const vehicle of vehiclesRef.current) {
          const parked = parkedAtOrigin(vehicle);
          const late = vehicle.trip?.status === "late";
          const hot = tripTooHot(vehicle);
          if (!parked) {
            const id = `veh-${vehicle.id}`;
            keep.add(id);
            const [lng, lat] = vehicleLngLat(vehicle);
            upsert(
              id,
              lng,
              lat,
              `layer-pin vehicle-pin${late || hot ? " danger" : ""}${selectedVehicleId === vehicle.id ? " selected" : ""}`,
              vehicle.plate,
              `<span class="mark" aria-hidden="true">${TRUCK_ICON}</span><span class="name">${vehicle.plate}</span>`,
              () => vehicleRef.current(vehicle.id),
            );
          }
          if (!activeTrip(vehicle) || !vehicle.origin || !vehicle.dest || !vehicle.trip) continue;
          const originId = `origin-${vehicle.trip.id}`;
          keep.add(originId);
          upsert(
            originId,
            vehicle.origin.lng,
            vehicle.origin.lat,
            `layer-pin origin-pin${parked ? " parked" : ""}${selectedVehicleId === vehicle.id ? " selected" : ""}`,
            parked ? `Xuất phát · ${vehicle.plate} · ${vehicle.origin.name}` : `Xuất phát · ${vehicle.origin.name}`,
            `<span class="glow" aria-hidden="true"></span><span class="name">${parked ? `Xuất phát · ${vehicle.plate} · ${vehicle.origin.name}` : `Xuất phát · ${vehicle.origin.name}`}</span>`,
            () => vehicleRef.current(vehicle.id),
          );
          const plantId = vehicle.trip.plant_id;
          if (destSeen.has(plantId)) continue;
          destSeen.add(plantId);
          const destId = `dest-${plantId}`;
          keep.add(destId);
          const [destLng, destLat] = destLngLat(vehicle.dest, visible.plants);
          const destSelected =
            selectedPlantId === plantId ||
            vehiclesRef.current.some((item) => item.id === selectedVehicleId && item.trip?.plant_id === plantId);
          upsert(
            destId,
            destLng,
            destLat,
            `layer-pin dest-pin${destSelected ? " selected" : ""}`,
            `Điểm đến · ${vehicle.dest.name}`,
            `<span class="mark">Đến</span><span class="name">${vehicle.dest.name}</span>`,
            () => plantRef.current(plantId),
          );
        }
      }
      for (const [id, marker] of extraMarkers.current) {
        if (keep.has(id)) continue;
        hideMarker(marker);
        extraMarkers.current.delete(id);
        extraClicks.current.delete(id);
      }
      settleRef.current();
    };

    const stop = runWhenReady(map, mapReady, draw);
    draw();
    return stop;
  }, [mapReady, farms, plants, selectedFarmId, selectedVehicleId, selectedPlantId, layers.farms, layers.plants, layers.routes, vehicleIds]);

  useEffect(() => {
    if (!layers.routes) return;
    for (const vehicle of vehicles) {
      const marker = extraMarkers.current.get(`veh-${vehicle.id}`);
      if (!marker) continue;
      const [lng, lat] = vehicleLngLat(vehicle);
      marker.setLngLat([lng, lat]);
    }
    settleRef.current();
  }, [vehicles, layers.routes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const side = Boolean(selectedId || selectedFarmId || selectedVehicleId || selectedPlantId);
    const padding = focusPadding(side);
    if (selectedId) {
      const selected = pinsRef.current.find((pin) => pin.pond.id === selectedId);
      if (selected) {
        map.flyTo({ center: [selected.lng, selected.lat], zoom: FOCUS_ZOOM, pitch: FOCUS_PITCH, speed: 1.05, padding });
      }
      return;
    }
    if (selectedVehicleId) {
      const vehicle = vehiclesRef.current.find((item) => item.id === selectedVehicleId);
      if (vehicle) {
        const [lng, lat] = vehicleLngLat(vehicle);
        map.flyTo({ center: [lng, lat], zoom: 11, pitch: FOCUS_PITCH, speed: 1.05, padding });
      }
      return;
    }
    if (selectedPlantId) {
      const plant = plantsRef.current.find((item) => item.id === selectedPlantId);
      if (plant) map.flyTo({ center: [plant.longitude, plant.latitude], zoom: 10.8, pitch: FOCUS_PITCH, speed: 1.05, padding });
      return;
    }
    if (selectedFarmId) {
      const farm = farmsRef.current.find((item) => item.id === selectedFarmId && item.id !== UNASSIGNED_FARM_ID);
      if (farm) map.flyTo({ center: [farm.longitude, farm.latitude], zoom: FOCUS_ZOOM, pitch: FOCUS_PITCH, speed: 1.05, padding });
    }
  }, [mapReady, selectedId, selectedFarmId, selectedVehicleId, selectedPlantId]);

  const sideOpen = Boolean(selectedId || selectedFarmId || selectedVehicleId || selectedPlantId);

  return (
    <>
      <div ref={rootRef} className="map-root" />
      <div className={`minimap${sideOpen ? " with-panel" : ""}`}>
        <div ref={miniRef} className="minimap-map" />
        <div ref={frameRef} className="minimap-frame" />
        <button
          type="button"
          className={`minimap-swap${streetMain ? " on" : ""}`}
          aria-label={streetMain ? "Đưa ảnh vệ tinh về bản đồ chính" : "Đưa bản đồ minimap lên bản đồ chính"}
          onClick={(event) => {
            event.stopPropagation();
            const next = !streetMainRef.current;
            streetMainRef.current = next;
            setStreetMain(next);
            applyBasemapRef.current(next);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M7 7h7.2L12 4.8l1.4-1.4L18 8l-4.6 4.6L12 11.2 14.2 9H7V7Zm10 10h-7.2L12 19.2l-1.4 1.4L6 16l4.6-4.6L12 12.8 9.8 15H17v2Z"
            />
          </svg>
        </button>
      </div>
    </>
  );
}
