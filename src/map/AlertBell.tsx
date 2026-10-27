import { useEffect, useRef, useState } from "react";
import { WarningBar } from "../components/WarningBar";
import type { WarningItem } from "../types";

type Props = {
  items: WarningItem[];
  onOpen: (item: WarningItem) => void;
};

function alertCount(items: WarningItem[]): number {
  return items.filter((item) => item.kind !== "pond" || item.level === "HIGH").length;
}

export function AlertBell({ items, onOpen }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const count = alertCount(items);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="alert-bell" ref={rootRef}>
      <button
        type="button"
        className={`alert-bell-btn${open ? " on" : ""}`}
        aria-label="Cảnh báo nguy hiểm"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 3a6 6 0 0 0-6 6v3.1l-1.4 2.6A1 1 0 0 0 5.5 16h13a1 1 0 0 0 .9-1.3L18 12.1V9a6 6 0 0 0-6-6Zm0 18a2.6 2.6 0 0 0 2.5-2h-5A2.6 2.6 0 0 0 12 21Z"
          />
        </svg>
        {count ? <em>{count > 9 ? "9+" : count}</em> : null}
      </button>
      {open ? (
        <div className="alert-bell-drop">
          <WarningBar
            items={items}
            tabs
            onOpen={(item) => {
              setOpen(false);
              onOpen(item);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
