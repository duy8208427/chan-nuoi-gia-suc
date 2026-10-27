import type { ReactNode } from "react";

export type RailDrawerId = "search" | "filter" | "layers" | "warnings" | "trips" | "region";

const DRAWERS: { id: RailDrawerId; label: string; icon: string }[] = [
  {
    id: "search",
    label: "Tìm",
    icon: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21l-1.4 1.4-5.2-5.2A7.5 7.5 0 0 1 10.5 18Zm0-2a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z",
  },
  {
    id: "filter",
    label: "Lọc",
    icon: "M4 6h16l-6.2 7.4V20l-3.6-2v-4.6L4 6Z",
  },
  {
    id: "layers",
    label: "Lớp",
    icon: "M12 4.2 3 9l9 4.8L21 9 12 4.2Zm0 7.1L5.2 7.7 12 4.2l6.8 3.5L12 11.3Zm0 3.2L3 9.7V12l9 4.8L21 12V9.7L12 14.5Zm0 3.3L3 13v2.2l9 4.8 9-4.8V13l-9 4.8Z",
  },
  {
    id: "warnings",
    label: "Cảnh báo",
    icon: "M12 3.2 2.4 20h19.2L12 3.2Zm0 4.4 6.4 11H5.6L12 7.6ZM11 11h2v4h-2v-4Zm0 5h2v2h-2v-2Z",
  },
  {
    id: "trips",
    label: "Chuyến",
    icon: "M4 16.5A3.5 3.5 0 1 0 7.5 13H9l1.2-3.5h6.3L18 13h1.5A3.5 3.5 0 1 0 23 16.5h-1.1a2.4 2.4 0 1 1-4.7 0H9.8a2.4 2.4 0 1 1-4.7 0H4Zm13.2-5.2H11.6L10.7 14h7.2l-.7-2.7ZM6 8h5V6H6v2Z",
  },
  {
    id: "region",
    label: "Khu vực",
    icon: "M12 3a7 7 0 0 1 7 7c0 5.2-7 11-7 11S5 15.2 5 10a7 7 0 0 1 7-7Zm0 4.5A2.5 2.5 0 1 0 12 12a2.5 2.5 0 0 0 0-4.5Z",
  },
];

const DASH_ICON =
  "M4 5h7v7H4V5Zm9 0h7v4h-7V5ZM4 14h7v5H4v-5Zm9 6v-7h7v7h-7Z";

type Props = {
  open: RailDrawerId | null;
  onToggle: (id: RailDrawerId) => void;
  dashboardOpen: boolean;
  onToggleDashboard: () => void;
  warningCount: number;
};

export function SideRail({ open, onToggle, dashboardOpen, onToggleDashboard, warningCount }: Props) {
  return (
    <nav className="side-rail" aria-label="Công cụ bản đồ">
      <span className="brand-mark rail-logo" aria-hidden="true">
        <img src="/vsg-logo.png?v=2" alt="" />
      </span>
      {DRAWERS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rail-btn${open === item.id ? " on" : ""}`}
          aria-label={item.label}
          aria-pressed={open === item.id}
          title={item.label}
          onClick={() => onToggle(item.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d={item.icon} />
          </svg>
          {item.id === "warnings" && warningCount ? <i>{warningCount > 9 ? "9+" : warningCount}</i> : null}
        </button>
      ))}
      <button
        type="button"
        className={`rail-btn dash-btn${dashboardOpen ? " on" : ""}`}
        aria-label="Tổng quan"
        aria-pressed={dashboardOpen}
        title="Tổng quan"
        onClick={onToggleDashboard}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d={DASH_ICON} />
        </svg>
      </button>
    </nav>
  );
}

export function RailDrawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="rail-drawer" aria-label={title}>
      <header>
        <b>{title}</b>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={`Đóng ${title}`}>
          ×
        </button>
      </header>
      <div className="rail-drawer-body scroll-fade">{children}</div>
    </aside>
  );
}
