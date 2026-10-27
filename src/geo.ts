import thresholds from "../data/thresholds.json";
import { UNASSIGNED_FARM_ID } from "./catalog";
import type {
  AlertStatus,
  Asset,
  Device,
  Farm,
  FarmView,
  HerdCycle,
  Measurement,
  Parameter,
  Plant,
  PlantView,
  Pond,
  PondPin,
  Route,
  Trip,
  Vehicle,
  VehicleView,
  WarningItem,
} from "./types";

export const MAX_TRAILER_TEMP = 30;

/** Điểm thu có ngưỡng dưới 15°C là chuỗi lạnh (bồn sữa). */
export function isColdChain(maxTemp: number): boolean {
  return maxTemp < 15;
}

export function tripTooHot(vehicle: Pick<VehicleView, "trip" | "max_temp">): boolean {
  return (vehicle.trip?.trailer_temp ?? 0) > vehicle.max_temp;
}

export function tripTempLabel(vehicle: Pick<VehicleView, "cold_chain">): string {
  return vehicle.cold_chain ? "Nhiệt bồn" : "Nhiệt thùng xe";
}

export function tripHotWord(vehicle: Pick<VehicleView, "cold_chain">): string {
  return vehicle.cold_chain ? "vượt ngưỡng lạnh" : "quá nóng";
}

type Band = { ref_min: number | null; ref_max: number | null };

export function parameterForStage(parameter: Parameter, stage?: string): Parameter {
  if (!stage) return parameter;
  const band = (thresholds as Record<string, Record<string, Band>>)[stage]?.[parameter.param_code];
  if (!band) return parameter;
  return { ...parameter, ref_min: band.ref_min, ref_max: band.ref_max };
}

const PLACE_COORDS: Record<string, [number, number]> = {
  "ca mau": [105.15, 9.1769],
  "bac lieu": [105.7218, 9.2941],
  "vinh long": [105.9722, 10.2537],
  "tan thanh": [106.3645, 10.545],
  "soc trang": [105.9738, 9.6032],
  "ben tre": [106.3756, 10.2428],
  "tra vinh": [106.3441, 9.9326],
  "hai phong": [106.791, 20.721],
  "nghe an": [105.622, 18.811],
  "binh dinh": [109.181, 13.851],
  "khanh hoa": [109.161, 12.501],
  "binh thuan": [108.101, 10.931],
};

export function normalizePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function estimateLngLat(location: string): [number, number] | null {
  const key = normalizePlace(location);
  return PLACE_COORDS[key] ?? null;
}

export function centroid(points: Array<{ longitude: number; latitude: number }>): [number, number] {
  const lng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
  const lat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  return [lng, lat];
}

export function statusLabel(status: AlertStatus): string {
  if (status === "OK") return "Ổn";
  if (status === "LOW") return "Cảnh báo";
  if (status === "HIGH") return "Nguy hiểm";
  return "Chưa đo";
}

export function statusRank(status: AlertStatus): number {
  if (status === "HIGH") return 3;
  if (status === "LOW") return 2;
  if (status === "OK") return 1;
  return 0;
}

export function combineStatus(items: Measurement[]): AlertStatus {
  let worst: AlertStatus = "NONE";
  for (const item of items) {
    if (statusRank(item.status) > statusRank(worst)) worst = item.status;
  }
  return worst;
}

export function pickMetric(items: Measurement[], code: string): Measurement | undefined {
  return items.find((item) => item.param_code === code);
}

export function offendingMetrics(items: Measurement[]): Measurement[] {
  return items.filter((item) => item.status === "HIGH" || item.status === "LOW");
}

export function assetAlertStatus(assets: Asset[]): AlertStatus {
  if (assets.some((item) => item.status === "fault")) return "HIGH";
  if (assets.some((item) => item.status === "offline")) return "LOW";
  if (assets.length) return "OK";
  return "NONE";
}

export function mergeStatus(...statuses: AlertStatus[]): AlertStatus {
  let worst: AlertStatus = "NONE";
  for (const status of statuses) {
    if (statusRank(status) > statusRank(worst)) worst = status;
  }
  return worst;
}

export function assetStatusLabel(status: Asset["status"]): string {
  if (status === "running") return "Đang chạy";
  if (status === "idle") return "Nghỉ";
  if (status === "offline") return "Mất tín hiệu";
  return "Lỗi";
}

export function tripStatusLabel(status: Trip["status"]): string {
  if (status === "waiting") return "Chờ xuất";
  if (status === "enroute") return "Đang chạy";
  if (status === "late") return "Trễ";
  return "Đã nhận";
}

export function tripStatusRank(status: Trip["status"]): number {
  if (status === "late") return 0;
  if (status === "enroute") return 1;
  if (status === "waiting") return 2;
  return 3;
}

export function parseStamp(value: string): number {
  const [date, time = "00:00"] = value.trim().split(/\s+/);
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0).getTime();
}

export function formatClock(value: string): string {
  const [, time = value] = value.trim().split(/\s+/);
  return time.slice(0, 5);
}

export function formatRemaining(min: number | null): string {
  if (min == null) return "—";
  if (min <= 0) return "Quá giờ";
  if (min < 60) return `${min} phút`;
  return `${Math.floor(min / 60)} giờ ${min % 60} phút`;
}

export function buildTripPath(
  pond?: { lng: number; lat: number },
  plant?: { longitude: number; latitude: number },
  route?: Route,
): [number, number][] {
  if (!pond || !plant) return route?.path?.length ? route.path : [];
  const start: [number, number] = [pond.lng, pond.lat];
  const end: [number, number] = [plant.longitude, plant.latitude];
  const mids = (route?.path ?? []).filter((point) => {
    const fromStart = Math.hypot(point[0] - start[0], point[1] - start[1]);
    const fromEnd = Math.hypot(point[0] - end[0], point[1] - end[1]);
    return fromStart > 0.003 && fromEnd > 0.003;
  });
  return [start, ...mids, end];
}

export function interpolatePath(path: [number, number][], t: number): [number, number] {
  if (!path.length) return [0, 0];
  if (path.length === 1) return path[0];
  const clamped = Math.min(1, Math.max(0, t));
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const length = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    lengths.push(length);
    total += length;
  }
  if (total <= 0) return path[path.length - 1];
  let remain = clamped * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (remain <= lengths[i]) {
      const u = lengths[i] === 0 ? 0 : remain / lengths[i];
      return [
        path[i][0] + (path[i + 1][0] - path[i][0]) * u,
        path[i][1] + (path[i + 1][1] - path[i][1]) * u,
      ];
    }
    remain -= lengths[i];
  }
  return path[path.length - 1];
}

export function splitPath(path: [number, number][], t: number): { done: [number, number][]; rest: [number, number][] } {
  if (path.length < 2) return { done: [], rest: path.slice() };
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped <= 0) return { done: [], rest: path.slice() };
  if (clamped >= 1) return { done: path.slice(), rest: [] };

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const length = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    lengths.push(length);
    total += length;
  }
  if (total <= 0) return { done: path.slice(), rest: [] };

  let remain = clamped * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (remain <= lengths[i]) {
      const u = lengths[i] === 0 ? 0 : remain / lengths[i];
      const mid: [number, number] = [
        path[i][0] + (path[i + 1][0] - path[i][0]) * u,
        path[i][1] + (path[i + 1][1] - path[i][1]) * u,
      ];
      return {
        done: [...path.slice(0, i + 1), mid],
        rest: [mid, ...path.slice(i + 1)],
      };
    }
    remain -= lengths[i];
  }
  return { done: path.slice(), rest: [] };
}

export function assetKindLabel(kind: Asset["kind"]): string {
  if (kind === "sensor") return "Cảm biến";
  if (kind === "camera") return "Camera";
  if (kind === "fan") return "Quạt thông gió";
  if (kind === "feeder") return "Máy cho ăn";
  if (kind === "drinker") return "Núm uống";
  return kind;
}

type PinExtras = {
  assets?: Asset[];
  crops?: HerdCycle[];
  farms?: Farm[];
};

export function buildPins(
  ponds: Pond[],
  devices: Device[],
  realtime: Record<string, Measurement[]>,
  extras: PinExtras = {},
): PondPin[] {
  const farmName = new Map((extras.farms ?? []).map((farm) => [farm.id, farm.name]));
  const farmByPond = new Map<string, string>();
  for (const farm of extras.farms ?? []) {
    for (const pondId of farm.pond_ids) farmByPond.set(pondId, farm.id);
  }

  return ponds.map((pond) => {
    const assigned = devices.filter((device) => device.pond_code === pond.pond_code);
    const byDevice = Object.fromEntries(
      assigned.map((device) => [device.device_code, realtime[device.device_code] ?? []]),
    );
    const measurements = assigned.flatMap((device) => byDevice[device.device_code] ?? []);
    const pondAssets = (extras.assets ?? []).filter((item) => item.pond_id === pond.id);
    const crop = (extras.crops ?? []).find((item) => item.pond_id === pond.id);
    const farm_id = pond.farm_id ?? farmByPond.get(pond.id);
    let lngLat: [number, number] | null = null;
    let estimated = false;

    if (assigned.length) {
      lngLat = centroid(assigned);
    } else {
      lngLat = estimateLngLat(pond.location);
      estimated = true;
    }

    if (!lngLat) {
      lngLat = [106.3, 10.3];
      estimated = true;
    }

    const times = measurements.map((item) => item.measured_at).filter(Boolean).sort();

    return {
      pond: { ...pond, farm_id },
      lng: lngLat[0],
      lat: lngLat[1],
      estimated,
      devices: assigned,
      measurements,
      byDevice,
      assets: pondAssets,
      crop,
      farm_id,
      farm_name: farm_id ? farmName.get(farm_id) : undefined,
      status: mergeStatus(combineStatus(measurements), assetAlertStatus(pondAssets)),
      latestAt: times.at(-1) ?? null,
    };
  });
}

export function buildFarmViews(farms: Farm[], pins: PondPin[]): FarmView[] {
  const byFarm = new Map<string, PondPin[]>();
  for (const pin of pins) {
    const key = pin.farm_id ?? UNASSIGNED_FARM_ID;
    const list = byFarm.get(key) ?? [];
    list.push(pin);
    byFarm.set(key, list);
  }

  const views: FarmView[] = farms.map((farm) => {
    const farmPins = (byFarm.get(farm.id) ?? []).slice().sort((a, b) => statusRank(b.status) - statusRank(a.status));
    return {
      ...farm,
      pins: farmPins,
      status: mergeStatus(...farmPins.map((pin) => pin.status)),
      dangerCount: farmPins.filter((pin) => pin.status === "HIGH").length,
      warnCount: farmPins.filter((pin) => pin.status === "LOW").length,
      okCount: farmPins.filter((pin) => pin.status === "OK").length,
      idleCount: farmPins.filter((pin) => pin.status === "NONE").length,
    };
  });

  const leftover = byFarm.get(UNASSIGNED_FARM_ID) ?? [];
  if (leftover.length) {
    views.push({
      id: UNASSIGNED_FARM_ID,
      code: "NA",
      name: "Chưa gán trại",
      region_id: "",
      location: "Chuồng chưa gán trại",
      latitude: leftover[0].lat,
      longitude: leftover[0].lng,
      pond_ids: leftover.map((pin) => pin.pond.id),
      staff_shift: "—",
      inlet_source: "—",
      settling_pond: "—",
      inventory: [],
      pins: leftover.slice().sort((a, b) => statusRank(b.status) - statusRank(a.status)),
      status: mergeStatus(...leftover.map((pin) => pin.status)),
      dangerCount: leftover.filter((pin) => pin.status === "HIGH").length,
      warnCount: leftover.filter((pin) => pin.status === "LOW").length,
      okCount: leftover.filter((pin) => pin.status === "OK").length,
      idleCount: leftover.filter((pin) => pin.status === "NONE").length,
    });
  }

  return views;
}

export function buildVehicleViews(
  vehicles: Vehicle[],
  trips: Trip[],
  pins: PondPin[],
  plants: Plant[],
  routes: Route[] = [],
  now = Date.now(),
): VehicleView[] {
  const pondById = new Map(pins.map((pin) => [pin.pond.id, pin]));
  const plantById = new Map(plants.map((plant) => [plant.id, plant]));
  const routeById = new Map(routes.map((route) => [route.id, route]));
  return vehicles.map((vehicle) => {
    const trip = trips.find((item) => item.vehicle_id === vehicle.id);
    const pond = trip ? pondById.get(trip.pond_id) : undefined;
    const plant = trip ? plantById.get(trip.plant_id) : undefined;
    const route = trip ? routeById.get(trip.route_id) : undefined;
    const path = buildTripPath(pond, plant, route);
    const origin = pond
      ? { lng: pond.lng, lat: pond.lat, name: pond.pond.pond_name }
      : undefined;
    const dest = plant
      ? { lng: plant.longitude, lat: plant.latitude, name: plant.name }
      : undefined;
    let longitude = vehicle.longitude;
    let latitude = vehicle.latitude;
    let progress = 0;
    let remaining_min: number | null = null;
    if (trip) {
      const departed = parseStamp(trip.departed_at);
      const eta = parseStamp(trip.eta);
      remaining_min = Math.round((eta - now) / 60_000);
      if (trip.status === "waiting" && pond) {
        longitude = pond.lng;
        latitude = pond.lat;
        progress = 0;
      } else if (trip.status === "received" && plant) {
        longitude = plant.longitude;
        latitude = plant.latitude;
        progress = 1;
        remaining_min = 0;
      } else {
        const span = Math.max(1, eta - departed);
        let t = (now - departed) / span;
        if (trip.status === "late") t = Math.min(0.99, Math.max(0.86, t));
        else t = Math.min(0.98, Math.max(0, t));
        progress = t;
        if (path.length) {
          const point = interpolatePath(path, t);
          longitude = point[0];
          latitude = point[1];
        }
      }
    }
    const max_temp = plant?.max_trailer_temp ?? MAX_TRAILER_TEMP;
    return {
      ...vehicle,
      longitude,
      latitude,
      trip,
      pond_name: pond?.pond.pond_name,
      plant_name: plant?.name,
      route_name: route?.name,
      path,
      origin,
      dest,
      progress,
      remaining_min,
      max_temp,
      cold_chain: isColdChain(max_temp),
    };
  });
}

export function buildPlantViews(plants: Plant[], vehicles: VehicleView[]): PlantView[] {
  return plants.map((plant) => {
    const inbound = vehicles.filter((item) => item.trip?.plant_id === plant.id);
    const received = inbound.filter((item) => item.trip?.status === "received");
    const waiting = inbound.filter((item) => item.trip?.status === "waiting");
    const moving = inbound.filter((item) => item.trip?.status === "enroute" || item.trip?.status === "late");
    const received_today_kg = received.reduce((sum, item) => sum + (item.trip?.weight_kg ?? 0), 0);
    const inbound_kg = [...waiting, ...moving].reduce((sum, item) => sum + (item.trip?.weight_kg ?? 0), 0);
    return {
      ...plant,
      received_today_kg,
      remaining_kg: Math.max(0, plant.daily_capacity_kg - received_today_kg - inbound_kg),
      inbound_count: moving.length,
      received_count: received.length,
      waiting_count: waiting.length,
      inbound: inbound.slice().sort((a, b) => tripStatusRank(a.trip?.status ?? "received") - tripStatusRank(b.trip?.status ?? "received")),
    };
  });
}

export function sortTrips(vehicles: VehicleView[]): VehicleView[] {
  return vehicles
    .filter((item) => item.trip)
    .slice()
    .sort((a, b) => tripStatusRank(a.trip?.status ?? "received") - tripStatusRank(b.trip?.status ?? "received"));
}

export function buildWarnings(
  pins: PondPin[],
  vehicles: VehicleView[],
): WarningItem[] {
  const items: WarningItem[] = [];
  for (const pin of pins) {
    if (pin.status === "HIGH" || pin.status === "LOW") {
      const off = offendingMetrics(pin.measurements);
      const assetIssue = pin.assets.find((item) => item.status === "fault" || item.status === "offline");
      const detail = off.length
        ? off.map((item) => `${item.param_code} ${item.measured_value}`).join(" · ")
        : assetIssue
          ? `${assetIssue.name} ${assetStatusLabel(assetIssue.status)}`
          : statusLabel(pin.status);
      items.push({
        id: `pond-${pin.pond.id}`,
        kind: "pond",
        level: pin.status === "HIGH" ? "HIGH" : "LOW",
        title: pin.pond.pond_name,
        detail,
        lng: pin.lng,
        lat: pin.lat,
        pond_id: pin.pond.id,
        farm_id: pin.farm_id,
      });
    }
    for (const row of pin.assets) {
      if (row.status !== "offline" && row.status !== "fault") continue;
      items.push({
        id: `asset-${row.id}`,
        kind: "asset",
        level: row.status === "fault" ? "HIGH" : "LOW",
        title: `${row.name} · ${pin.pond.pond_name}`,
        detail: assetStatusLabel(row.status),
        lng: pin.lng,
        lat: pin.lat,
        pond_id: pin.pond.id,
        farm_id: pin.farm_id,
      });
    }
  }
  for (const vehicle of vehicles) {
    const trip = vehicle.trip;
    if (!trip) continue;
    const late = trip.status === "late";
    const hot = tripTooHot(vehicle);
    if (!late && !hot) continue;
    items.push({
      id: `trip-${trip.id}`,
      kind: "trip",
      level: late || hot ? "HIGH" : "LOW",
      title: `${vehicle.plate}${late ? " trễ" : ""}`,
      detail: hot
        ? `${tripTempLabel(vehicle)} ${trip.trailer_temp}°C · ${vehicle.pond_name ?? trip.pond_id}`
        : `ETA ${trip.eta} · ${vehicle.pond_name ?? trip.pond_id}`,
      lng: vehicle.longitude,
      lat: vehicle.latitude,
      pond_id: trip.pond_id,
      vehicle_id: vehicle.id,
    });
  }
  return items.sort((a, b) => (a.level === b.level ? 0 : a.level === "HIGH" ? -1 : 1));
}

export function statusCounts(pins: PondPin[]): { ok: number; warn: number; danger: number; idle: number } {
  return {
    ok: pins.filter((pin) => pin.status === "OK").length,
    warn: pins.filter((pin) => pin.status === "LOW").length,
    danger: pins.filter((pin) => pin.status === "HIGH").length,
    idle: pins.filter((pin) => pin.status === "NONE").length,
  };
}

export function formatNumber(value: number | string, digits = 2): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
}

export function formatMoney(value: number): string {
  return value.toLocaleString("vi-VN") + " VNĐ";
}

const POND_IMAGES: Record<string, string> = {
  DN01: "/pens/dn01.jpg",
  DN02: "/pens/dn02.jpg",
  DN03: "/pens/dn03.jpg",
  DN04: "/pens/dn04.jpg",
  LD01: "/pens/ld01.jpg",
  LD02: "/pens/ld02.jpg",
  LD03: "/pens/ld03.jpg",
  LD04: "/pens/ld04.jpg",
};

export function pondImage(code: string): string {
  return POND_IMAGES[code] ?? "/pens/dn01.jpg";
}

export function pondImageUrls(): string[] {
  return [...new Set(Object.values(POND_IMAGES))];
}

export function preloadPondImages(): void {
  for (const src of pondImageUrls()) {
    const image = new Image();
    image.src = src;
  }
}
