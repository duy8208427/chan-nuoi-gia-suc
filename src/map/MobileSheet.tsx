import { useState } from "react";
import { offendingMetrics, statusLabel, statusRank } from "../geo";
import type { AppRole, PondPin, VehicleView, WarningItem } from "../types";

type ListKind = "danger" | "late" | "warnings";

type Props = {
  role: AppRole;
  pins: PondPin[];
  farmName: string;
  warnings: WarningItem[];
  lateVehicles: VehicleView[];
  onOpenPond: (pondId: string) => void;
  onOpenCamera: (pin: PondPin) => void;
  onFocus: (kind: "pond" | "vehicle", id: string) => void;
};

function worstMetric(pin: PondPin): string {
  const ranked = [...offendingMetrics(pin.measurements)].sort(
    (a, b) => statusRank(b.status ?? "NONE") - statusRank(a.status ?? "NONE"),
  );
  const top = ranked[0];
  if (!top) return "Các chỉ số đang ổn";
  return `${top.param_code} ${top.measured_value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${top.unit}`;
}

export function MobileSheet({
  role,
  pins,
  farmName,
  warnings,
  lateVehicles,
  onOpenPond,
  onOpenCamera,
  onFocus,
}: Props) {
  const [list, setList] = useState<ListKind | null>(null);
  const danger = pins.filter((pin) => pin.status === "HIGH");

  if (role === "resident") {
    return (
      <aside className="mobile-sheet" aria-label="Chuồng của tôi">
        {pins.map((pin) => (
          <div key={pin.pond.id} className="mobile-pond">
            <button type="button" onClick={() => onOpenPond(pin.pond.id)}>
              <b>{pin.pond.pond_name}</b>
              <small>
                {statusLabel(pin.status)} · {worstMetric(pin)}
              </small>
            </button>
            <button type="button" onClick={() => onOpenCamera(pin)}>
              Camera
            </button>
          </div>
        ))}
      </aside>
    );
  }

  if (role === "farmer") {
    return (
      <aside className="mobile-sheet" aria-label="Trại của tôi">
        <header>
          <b>{farmName}</b>
          <span>{danger.length} chuồng nguy hiểm</span>
        </header>
        <div className="mobile-list">
          {pins.map((pin) => (
            <button key={pin.pond.id} type="button" onClick={() => onOpenPond(pin.pond.id)}>
              <b>{pin.pond.pond_name}</b>
              <em className={pin.status.toLowerCase()}>{statusLabel(pin.status)}</em>
            </button>
          ))}
        </div>
      </aside>
    );
  }

  const rows =
    list === "danger"
      ? danger.map((pin) => ({ id: pin.pond.id, kind: "pond" as const, title: pin.pond.pond_name, detail: statusLabel(pin.status) }))
      : list === "late"
        ? lateVehicles.map((item) => ({
            id: item.id,
            kind: "vehicle" as const,
            title: item.plate,
            detail: item.pond_name ?? "Chưa có chuồng",
          }))
        : warnings.slice(0, 6).map((item) => ({
            id: item.pond_id ?? item.vehicle_id ?? item.id,
            kind: (item.vehicle_id ? "vehicle" : "pond") as "pond" | "vehicle",
            title: item.title,
            detail: item.detail,
          }));

  return (
    <aside className="mobile-sheet" aria-label="Tóm tắt vận hành">
      {list ? (
        <>
          <button type="button" className="mobile-back" onClick={() => setList(null)}>
            ← Quay lại
          </button>
          <div className="mobile-list">
            {rows.length ? (
              rows.map((row) => (
                <button key={`${row.kind}-${row.id}`} type="button" onClick={() => onFocus(row.kind, row.id)}>
                  <b>{row.title}</b>
                  <small>{row.detail}</small>
                </button>
              ))
            ) : (
              <p>Không có mục nào.</p>
            )}
          </div>
        </>
      ) : (
        <div className="mobile-metrics">
          <button type="button" onClick={() => setList("danger")}>
            <b>{danger.length}</b>
            <span>Chuồng nguy hiểm</span>
          </button>
          <button type="button" onClick={() => setList("late")}>
            <b>{lateVehicles.length}</b>
            <span>Xe trễ</span>
          </button>
          <button type="button" onClick={() => setList("warnings")}>
            <b>{warnings.length}</b>
            <span>Cảnh báo</span>
          </button>
        </div>
      )}
    </aside>
  );
}
