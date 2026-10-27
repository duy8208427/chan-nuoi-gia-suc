import type { ReactNode } from "react";

export type InfoTopic = "warnings" | "trips" | "region";
export type InfoKind = "pond" | "farm" | "vehicle" | "plant";
export type InfoNode = { kind: InfoKind; id: string };
export type DashNode = { kind: "list"; topic: InfoTopic } | InfoNode;

export const INFO_TITLES: Record<InfoTopic, string> = {
  warnings: "Cảnh báo",
  trips: "Chuyến xe",
  region: "Khu vực",
};

type Props = {
  topic: InfoTopic;
  title?: string;
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onBack?: () => void;
  children: ReactNode;
};

export function InfoPanel({ topic, title, collapsed, onCollapse, onExpand, onBack, children }: Props) {
  const heading = title ?? INFO_TITLES[topic];
  return (
    <aside className={`info-panel${collapsed ? " collapsed" : ""}`} aria-label={heading}>
      {collapsed ? null : (
        <>
          <header>
            {onBack ? (
              <button type="button" className="info-back" onClick={onBack} aria-label="Quay lại">
                ←
              </button>
            ) : null}
            <b>{heading}</b>
          </header>
          <div className="info-panel-body scroll-fade">{children}</div>
        </>
      )}
      <button
        type="button"
        className="pane-edge info-edge"
        onClick={collapsed ? onExpand : onCollapse}
        aria-label={collapsed ? `Mở ${INFO_TITLES[topic]}` : `Thu ${INFO_TITLES[topic]}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
        </svg>
      </button>
    </aside>
  );
}
