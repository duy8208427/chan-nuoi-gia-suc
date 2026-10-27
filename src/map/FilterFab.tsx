import { useEffect, useRef, useState } from "react";
import { SelectMenu, type SelectOption } from "../components/SelectMenu";
import type { AlertStatus, MapLayers } from "../types";

type Group = "search" | "scope" | "status" | "layers";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  onSearchEnter: () => void;
  farmFilter: string;
  farmOptions: SelectOption[];
  onFarm: (value: string) => void;
  province: string;
  provinceOptions: SelectOption[];
  onProvince: (value: string) => void;
  statusFilter: AlertStatus[];
  onToggleStatus: (status: AlertStatus) => void;
  layers: MapLayers;
  onToggleLayer: (key: keyof MapLayers) => void;
  showLayers?: boolean;
};

const ICONS = {
  search: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21l-1.4 1.4-5.2-5.2A7.5 7.5 0 0 1 10.5 18Zm0-2a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z",
  scope: "M12 3a7 7 0 0 1 7 7c0 5.2-7 11-7 11S5 15.2 5 10a7 7 0 0 1 7-7Zm0 4.5A2.5 2.5 0 1 0 12 12a2.5 2.5 0 0 0 0-4.5Z",
  farm: "M4 20V10l8-6 8 6v10h-6v-6H10v6H4Z",
  status: "M12 3.2 2.4 20h19.2L12 3.2Zm0 4.4 6.4 11H5.6L12 7.6ZM11 11h2v4h-2v-4Zm0 5h2v2h-2v-2Z",
  ok: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm-1.2 12.4 6-6-1.4-1.4-4.6 4.6-2.2-2.2-1.4 1.4 3.6 3.6Z",
  warn: "M12 3.2 2.4 20h19.2L12 3.2Zm0 5.4 5.2 9H6.8L12 8.6ZM11 12h2v3h-2v-3Zm0 4h2v2h-2v-2Z",
  idle: "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 3.2V12l3.2 1.8",
  layers: "M12 4.2 3 9l9 4.8L21 9 12 4.2Zm0 7.1L5.2 7.7 12 4.2l6.8 3.5L12 11.3Zm0 3.2L3 9.7V12l9 4.8L21 12V9.7L12 14.5Z",
  pond: "M4 14c2-4 5-6 8-6s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6Z",
  truck:
    "M5 13.2 6.6 9A1.8 1.8 0 0 1 8.3 7.8h6.4c.7 0 1.3.4 1.6 1.1L18.2 13H19c.9 0 1.6.7 1.6 1.6v.6c0 .6-.5 1.1-1.1 1.1h-.4a2.3 2.3 0 0 1-4.5 0H9.2a2.3 2.3 0 0 1-4.5 0h-.3c-.6 0-1.1-.5-1.1-1.1v-.6c0-.9.7-1.6 1.6-1.6H5Zm2.9 3.1a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Zm8.2 0a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2ZM8.5 9.2 7.5 13h9.1l-1.1-3.8H8.5Z",
  plant: "M4 20h16v-2H4v2Zm2-4h12V8L12 4 6 8v8Z",
};

function FabIcon({
  tip,
  on,
  active,
  tone,
  children,
  onClick,
}: {
  tip: string;
  on?: boolean;
  active?: boolean;
  tone?: "ok" | "warn" | "danger" | "idle";
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`fab-icon${tone ? ` ${tone}` : ""}${on === false ? " off" : ""}${active ? " active" : ""}`}
      aria-label={tip}
      aria-pressed={on ?? active}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d={children} />
      </svg>
      <span className="fab-tip">{tip}</span>
    </button>
  );
}

export function FilterFab({
  query,
  onQuery,
  onSearchEnter,
  farmFilter,
  farmOptions,
  onFarm,
  province,
  provinceOptions,
  onProvince,
  statusFilter,
  onToggleStatus,
  layers,
  onToggleLayer,
  showLayers = true,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Group | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const toggle = (id: Group) => setOpen((current) => (current === id ? null : id));

  return (
    <div className="filter-fab" ref={rootRef}>
      <div className={`filter-group${open === "search" ? " open" : ""}`}>
        <FabIcon tip="Tìm chuồng" active={open === "search"} onClick={() => toggle("search")}>
          {ICONS.search}
        </FabIcon>
        {open === "search" ? (
          <div className="filter-flyout filter-pop">
            <input
              autoFocus
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearchEnter();
              }}
              placeholder="Tên chuồng, mã chuồng, trại…"
              aria-label="Tìm theo tên hoặc mã chuồng"
            />
          </div>
        ) : null}
      </div>

      <div className={`filter-group${open === "scope" ? " open" : ""}`}>
        <FabIcon tip="Phạm vi — trại và tỉnh" active={open === "scope"} onClick={() => toggle("scope")}>
          {ICONS.scope}
        </FabIcon>
        {open === "scope" ? (
          <div className="filter-flyout filter-pop">
            <SelectMenu value={farmFilter} options={farmOptions} onChange={onFarm} ariaLabel="Lọc theo trại" />
            <SelectMenu value={province} options={provinceOptions} onChange={onProvince} ariaLabel="Lọc theo tỉnh" />
          </div>
        ) : null}
      </div>

      <div className={`filter-group${open === "status" ? " open" : ""}`}>
        <FabIcon tip="Trạng thái chuồng" active={open === "status"} onClick={() => toggle("status")}>
          {ICONS.status}
        </FabIcon>
        {open === "status" ? (
          <div className="filter-flyout">
            <FabIcon tip="Ổn" tone="ok" on={statusFilter.includes("OK")} onClick={() => onToggleStatus("OK")}>
              {ICONS.ok}
            </FabIcon>
            <FabIcon tip="Cảnh báo" tone="warn" on={statusFilter.includes("LOW")} onClick={() => onToggleStatus("LOW")}>
              {ICONS.warn}
            </FabIcon>
            <FabIcon tip="Nguy hiểm" tone="danger" on={statusFilter.includes("HIGH")} onClick={() => onToggleStatus("HIGH")}>
              {ICONS.status}
            </FabIcon>
            <FabIcon tip="Chưa đo" tone="idle" on={statusFilter.includes("NONE")} onClick={() => onToggleStatus("NONE")}>
              {ICONS.idle}
            </FabIcon>
          </div>
        ) : null}
      </div>

      {showLayers ? (
      <div className={`filter-group${open === "layers" ? " open" : ""}`}>
        <FabIcon tip="Lớp bản đồ" active={open === "layers"} onClick={() => toggle("layers")}>
          {ICONS.layers}
        </FabIcon>
        {open === "layers" ? (
          <div className="filter-flyout">
            <FabIcon tip="Lớp chuồng" on={layers.ponds} onClick={() => onToggleLayer("ponds")}>
              {ICONS.pond}
            </FabIcon>
            <FabIcon tip="Lớp trại" on={layers.farms} onClick={() => onToggleLayer("farms")}>
              {ICONS.farm}
            </FabIcon>
            <FabIcon tip="Lớp xe / tuyến" on={layers.routes} onClick={() => onToggleLayer("routes")}>
              {ICONS.truck}
            </FabIcon>
            <FabIcon tip="Lớp điểm thu" on={layers.plants} onClick={() => onToggleLayer("plants")}>
              {ICONS.plant}
            </FabIcon>
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
