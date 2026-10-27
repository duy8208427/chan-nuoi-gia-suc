import parametersFallback from "../data/parameters.json";
import { regionCatalog } from "./catalog";
import { parameterForStage } from "./geo";
import type { AlertRow, Measurement, Parameter, PondReport, TaskRow } from "./types";

export type AccountProfile = {
  fullname: string;
  email: string;
};

export type PasswordField = {
  name: string;
  label: string;
};

export type PasswordForm = {
  action: string;
  fields: PasswordField[];
  hidden: { name: string; value: string }[];
};

export async function login(username: string, password: string): Promise<boolean> {
  return username.trim().length > 0 && password.trim().length > 0;
}

export async function fetchAccountProfile(): Promise<AccountProfile | "expired"> {
  return { fullname: "Nguyễn Văn An", email: "an.nguyen@vsg.vn" };
}

export async function fetchPasswordForm(): Promise<PasswordForm | "expired" | null> {
  return {
    action: "/local",
    fields: [
      { name: "current", label: "Mật khẩu hiện tại" },
      { name: "new", label: "Mật khẩu mới" },
      { name: "again", label: "Nhập lại mật khẩu mới" },
    ],
    hidden: [],
  };
}

export async function submitPasswordForm(
  _form: PasswordForm,
  _values: string[],
): Promise<{ ok: boolean; message: string }> {
  return { ok: true, message: "Đã lưu mật khẩu trên bản demo." };
}

export function fallbackParameters(): Parameter[] {
  return parametersFallback as Parameter[];
}

export function fallbackTasks(pondId: string): TaskRow[] {
  return regionCatalog().tasks.filter((row) => row.pond_id === pondId);
}

export function fallbackAlerts(deviceCodes: string[]): AlertRow[] {
  const realtime = regionCatalog().realtime;
  const rows: AlertRow[] = [];
  for (const code of deviceCodes) {
    for (const item of realtime[code] ?? []) {
      if (item.status === "OK" || item.status === "NONE") continue;
      rows.push({
        id: `${code}-${item.param_code}`,
        device_code: code,
        param_code: item.param_code,
        measured_value: String(item.measured_value),
        alert_level: item.status,
        message: `${item.param_code} ${item.status === "HIGH" ? "vượt" : "thấp hơn"} ngưỡng giai đoạn`,
        alert_time: item.measured_at,
      });
    }
  }
  return rows;
}

export function fallbackReport(pondId: string): PondReport | null {
  const catalog = regionCatalog();
  const pond = catalog.ponds.find((item) => item.id === pondId);
  if (!pond) return null;
  const herd = catalog.crops.find((item) => item.pond_id === pondId);
  const codes = catalog.devices.filter((item) => item.pond_code === pond.pond_code).map((item) => item.device_code);
  const seen = new Set<string>();
  const climate: PondReport["climate"] = [];
  for (const code of codes) {
    for (const row of catalog.realtime[code] ?? []) {
      if (seen.has(row.param_code)) continue;
      seen.add(row.param_code);
      const parameter = (parametersFallback as Parameter[]).find((item) => item.param_code === row.param_code);
      const resolved = parameter ? parameterForStage(parameter, herd?.stage) : undefined;
      const low = resolved?.ref_min;
      const high = resolved?.ref_max;
      const out = row.status === "HIGH" || row.status === "LOW";
      climate.push({
        param_code: row.param_code,
        param_name: parameter?.param_name ?? row.param_code,
        avg: row.measured_value,
        unit: row.unit,
        range: `${low ?? "—"}–${high ?? "—"}`,
        verdict: out ? "Vượt ngưỡng" : "Đạt",
      });
    }
  }
  const farm = catalog.farms.find((item) => item.pond_ids.includes(pondId));
  const share = farm ? Math.max(1, farm.pond_ids.length) : 1;
  const materials = (farm?.inventory ?? []).map((item) => ({
    kind: item.kind,
    name: item.name,
    quantity: Number((item.quantity / share).toFixed(2)),
    unit: item.unit,
    cost: Math.round(item.week_cost / share),
  }));
  return {
    pond_id: pond.id,
    pond_code: pond.pond_code,
    pond_name: pond.pond_name,
    area: Number(pond.area) || 0,
    head_count: herd?.head_count ?? 0,
    location: pond.location,
    description: pond.description,
    feed_count_this_week: herd ? Math.max(7, Math.round(herd.head_count / 20)) : 0,
    manure_scrapes_this_week: herd ? herd.manure_scrapes_today * 6 : 0,
    materials,
    total_cost: materials.reduce((sum, item) => sum + item.cost, 0),
    climate,
  };
}

export async function fetchRealtimeMap(): Promise<Record<string, Measurement[]>> {
  return regionCatalog().realtime;
}
