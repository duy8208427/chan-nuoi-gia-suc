import type { AlertStatus } from "../../src/types";

export const C = {
  bg: "#f4f6f4",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  line: "#e3e9e4",
  brand: "#15803d",
  brandDark: "#0f2419",
  brandSoft: "#ecfdf3",
  high: "#dc2626",
  highSoft: "#fef2f2",
  low: "#d97706",
  lowSoft: "#fffbeb",
  ok: "#16a34a",
  okSoft: "#f0fdf4",
  none: "#94a3b8",
  noneSoft: "#f1f5f9",
};

export function statusColor(status: AlertStatus): { fg: string; bg: string } {
  if (status === "HIGH") return { fg: C.high, bg: C.highSoft };
  if (status === "LOW") return { fg: C.low, bg: C.lowSoft };
  if (status === "OK") return { fg: C.ok, bg: C.okSoft };
  return { fg: C.none, bg: C.noneSoft };
}

/** Ngưỡng chuẩn dạng "7.5 – 8.5", "≥ 4" hoặc "≤ 0.1"; rỗng nếu không có ngưỡng. */
export function refRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min != null && max != null) return `${min} – ${max}`;
  if (min != null) return `≥ ${min}`;
  if (max != null) return `≤ ${max}`;
  return "";
}

/** Đơn vị hiển thị; bỏ các giá trị giả như "-" (pH không có đơn vị). */
export function unitText(unit: string | null | undefined): string {
  const value = (unit ?? "").trim();
  return value === "-" || value === "–" || value === "—" ? "" : value;
}

export const radius = 14;
export const gap = 12;
