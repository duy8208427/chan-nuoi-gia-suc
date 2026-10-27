import { useEffect, useRef, useState } from "react";
import type { WarningItem, WarningKind } from "../types";

type Props = {
  items: WarningItem[];
  onOpen: (item: WarningItem) => void;
  stacked?: boolean;
  tabs?: boolean;
};

type GroupKey = Extract<WarningKind, "pond" | "asset" | "trip">;

const TAB_META: { key: GroupKey; label: string; title: string; tone: "danger" | "warn" }[] = [
  { key: "pond", label: "Chuồng", title: "Chuồng nguy hiểm", tone: "danger" },
  { key: "asset", label: "Thiết bị", title: "Thiết bị mất tín hiệu", tone: "warn" },
  { key: "trip", label: "Xe", title: "Xe trễ / nhiệt thùng", tone: "danger" },
];

function groupItems(items: WarningItem[], key: GroupKey): WarningItem[] {
  if (key === "pond") return items.filter((item) => item.kind === "pond" && item.level === "HIGH");
  return items.filter((item) => item.kind === key);
}

function firstTab(ponds: WarningItem[], assets: WarningItem[], trips: WarningItem[]): GroupKey {
  if (ponds.length) return "pond";
  if (assets.length) return "asset";
  if (trips.length) return "trip";
  return "pond";
}

function badgeCount(count: number): string {
  return count > 9 ? "9+" : String(count);
}

export function WarningBar({ items, onOpen, stacked, tabs }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ponds = groupItems(items, "pond");
  const assets = groupItems(items, "asset");
  const trips = groupItems(items, "trip");
  const grouped: Record<GroupKey, WarningItem[]> = { pond: ponds, asset: assets, trip: trips };
  const [open, setOpen] = useState<GroupKey | null>(() => (tabs ? firstTab(ponds, assets, trips) : stacked ? "pond" : null));

  useEffect(() => {
    if (!open || tabs) return;
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
  }, [open, tabs]);

  if (tabs) {
    const active = open ?? "pond";
    const activeItems = grouped[active];
    return (
      <div className="warning-bar tabs" ref={rootRef}>
        <div className="warn-tabs" role="tablist">
          {TAB_META.map((tab) => {
            const count = grouped[tab.key].length;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active === tab.key}
                title={tab.title}
                className={`warn-tab ${tab.tone}${active === tab.key ? " on" : ""}`}
                onClick={() => setOpen(tab.key)}
              >
                {tab.label}
                <em>{badgeCount(count)}</em>
              </button>
            );
          })}
        </div>
        {activeItems.length ? (
          <ul className="warn-drop scroll-fade">
            {activeItems.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onOpen(item)}>
                  <b>{item.title}</b>
                  <small>{item.detail}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="warn-tab-empty">Không có cảnh báo</p>
        )}
      </div>
    );
  }

  if (!ponds.length && !assets.length && !trips.length) {
    return (
      <div className={`warning-bar ok${stacked ? " stacked" : ""}`}>
        <span>Không có cảnh báo đang mở</span>
      </div>
    );
  }

  const toggle = (key: GroupKey) => setOpen((current) => (current === key ? null : key));
  const pick = (item: WarningItem) => {
    if (!stacked) setOpen(null);
    onOpen(item);
  };
  const show = (key: GroupKey) => stacked || open === key;

  return (
    <div className={`warning-bar${stacked ? " stacked" : ""}`} ref={rootRef}>
      {ponds.length ? (
        <div className="warn-menu">
          <button type="button" className={`warn-chip danger${open === "pond" ? " on" : ""}`} onClick={() => toggle("pond")}>
            {ponds.length} chuồng nguy hiểm
          </button>
          {show("pond") ? (
            <ul className="warn-drop scroll-fade">
              {ponds.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => pick(item)}>
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {assets.length ? (
        <div className="warn-menu">
          <button type="button" className={`warn-chip warn${open === "asset" ? " on" : ""}`} onClick={() => toggle("asset")}>
            {assets.length} thiết bị mất tín hiệu
          </button>
          {show("asset") ? (
            <ul className="warn-drop scroll-fade">
              {assets.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => pick(item)}>
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {trips.length ? (
        <div className="warn-menu">
          <button type="button" className={`warn-chip danger${open === "trip" ? " on" : ""}`} onClick={() => toggle("trip")}>
            {trips.length} xe trễ / nhiệt thùng
          </button>
          {show("trip") ? (
            <ul className="warn-drop scroll-fade">
              {trips.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => pick(item)}>
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
