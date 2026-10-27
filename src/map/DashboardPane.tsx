import { useState, type ReactNode } from "react";
import { UNASSIGNED_FARM_ID } from "../catalog";
import { AccountSettings } from "./AccountSettings";
import { formatNumber, statusCounts } from "../geo";
import type { AppRole, FarmView, PlantView, PondPin, VehicleView } from "../types";
import type { InfoTopic } from "./InfoPanel";

type Props = {
  pins: PondPin[];
  farms: FarmView[];
  devices: number;
  plants: PlantView[];
  vehicles: VehicleView[];
  collapsed: boolean;
  title?: string;
  onBack?: () => void;
  onToggle: () => void;
  onOpen: (topic: InfoTopic) => void;
  account: string | null;
  role: AppRole;
  sessionLabel: string;
  live: boolean;
  regionLocation: string;
  onLogout: () => void;
  children?: ReactNode;
};

const ICONS = {
  pond: "M4 14c2-4 5-6 8-6s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6Z",
  danger: "M12 3.2 2.4 20h19.2L12 3.2Zm0 4.4 6.4 11H5.6L12 7.6ZM11 11h2v4h-2v-4Zm0 5h2v2h-2v-2Z",
  truck:
    "M5 13.2 6.6 9A1.8 1.8 0 0 1 8.3 7.8h6.4c.7 0 1.3.4 1.6 1.1L18.2 13H19c.9 0 1.6.7 1.6 1.6v.6c0 .6-.5 1.1-1.1 1.1h-.4a2.3 2.3 0 0 1-4.5 0H9.2a2.3 2.3 0 0 1-4.5 0h-.3c-.6 0-1.1-.5-1.1-1.1v-.6c0-.9.7-1.6 1.6-1.6H5Zm2.9 3.1a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Zm8.2 0a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2ZM8.5 9.2 7.5 13h9.1l-1.1-3.8H8.5Z",
};

function DashEntry({
  tone,
  icon,
  value,
  label,
  detail,
  onClick,
  children,
}: {
  tone: string;
  icon: string;
  value: string;
  label: string;
  detail: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button type="button" className={`dash-entry ${tone}`} onClick={onClick}>
      <span className="dash-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path fill="currentColor" d={icon} />
        </svg>
      </span>
      <b>{value}</b>
      <small>{label}</small>
      <span className="dash-entry-detail">{detail}</span>
      {children}
    </button>
  );
}

export function DashboardPane({
  pins,
  farms,
  devices,
  plants,
  vehicles,
  collapsed,
  title,
  onBack,
  onToggle,
  onOpen,
  account,
  role,
  sessionLabel,
  live,
  regionLocation,
  onLogout,
  children,
}: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const showAccount = accountOpen && !children;
  const counts = statusCounts(pins);
  const farmCount = farms.filter((farm) => farm.id !== UNASSIGNED_FARM_ID).length;
  const waitingKg = plants.reduce((sum, plant) => sum + plant.waiting_kg, 0);
  const capacityKg = plants.reduce((sum, plant) => sum + plant.daily_capacity_kg, 0);
  const moving = vehicles.filter((item) => item.trip?.status === "enroute" || item.trip?.status === "late").length;

  return (
    <section className={`dashboard-pane${collapsed ? " collapsed" : ""}`} aria-label="Tổng quan">
      <div className="dashboard-main">
          <header>
            {showAccount || onBack ? (
              <button
                type="button"
                className="info-back"
                onClick={() => (showAccount ? setAccountOpen(false) : onBack?.())}
                aria-label="Quay lại"
              >
                ←
              </button>
            ) : null}
            <b>{showAccount ? "Tài khoản" : (title ?? "Tổng quan")}</b>
          </header>
          <div className="dashboard-body scroll-fade">
        {children ?? (showAccount ? (
          <AccountSettings account={account} live={live} regionLocation={regionLocation} />
        ) : (
          <div className="dash-entries">
            <DashEntry
              tone="pond"
              icon={ICONS.pond}
              value={formatNumber(pins.length, 0)}
              label="chuồng đang quản trị"
              detail={
                role === "admin"
                  ? `${formatNumber(farmCount, 0)} trại · ${formatNumber(plants.length, 0)} điểm thu · ${formatNumber(devices, 0)} thiết bị · ${formatNumber(capacityKg, 0)} kg công suất/ngày`
                  : role === "farmer"
                    ? `${formatNumber(pins.length, 0)} chuồng trong trại`
                    : "Chuồng được giao"
              }
              onClick={() => onOpen("region")}
            >
              {pins.length ? (
                <>
                  <span className="ratio-bar" aria-hidden="true">
                    {counts.ok ? <i className="ok" style={{ width: `${(counts.ok / pins.length) * 100}%` }} /> : null}
                    {counts.warn ? <i className="warn" style={{ width: `${(counts.warn / pins.length) * 100}%` }} /> : null}
                    {counts.danger ? <i className="danger" style={{ width: `${(counts.danger / pins.length) * 100}%` }} /> : null}
                    {counts.idle ? <i className="idle" style={{ width: `${(counts.idle / pins.length) * 100}%` }} /> : null}
                  </span>
                  <span className="dash-legend">
                    {counts.ok ? (
                      <span>
                        <i className="ok" />
                        {formatNumber(counts.ok, 0)} ổn
                      </span>
                    ) : null}
                    {counts.warn ? (
                      <span>
                        <i className="warn" />
                        {formatNumber(counts.warn, 0)} cảnh báo
                      </span>
                    ) : null}
                    {counts.danger ? (
                      <span>
                        <i className="danger" />
                        {formatNumber(counts.danger, 0)} nguy hiểm
                      </span>
                    ) : null}
                    {counts.idle ? (
                      <span>
                        <i className="idle" />
                        {formatNumber(counts.idle, 0)} chưa đo
                      </span>
                    ) : null}
                  </span>
                </>
              ) : null}
            </DashEntry>
            <DashEntry
              tone="danger"
              icon={ICONS.danger}
              value={formatNumber(counts.danger, 0)}
              label="nguy hiểm"
              detail={`${formatNumber(counts.warn, 0)} cảnh báo`}
              onClick={() => onOpen("warnings")}
            />
            {role === "admin" ? (
              <DashEntry
                tone="truck"
                icon={ICONS.truck}
                value={formatNumber(moving, 0)}
                label="xe chạy"
                detail={`${formatNumber(waitingKg, 0)} kg chờ cửa`}
                onClick={() => onOpen("trips")}
              />
            ) : null}
          </div>
        ))}
        </div>
        {children ? null : (
          <footer className="dash-account">
            <img src="/vsg-logo.png?v=2" alt="" />
            <div>
              <b>{sessionLabel}</b>
              {account && live ? <small>Số liệu trực tiếp</small> : null}
              <span>{regionLocation}</span>
            </div>
            <div className="dash-account-actions">
              {showAccount || role !== "admin" ? null : (
                <button type="button" onClick={() => setAccountOpen(true)}>
                  Cài đặt
                </button>
              )}
              <button type="button" onClick={onLogout}>
                {account ? "Đăng xuất" : "Về đăng nhập"}
              </button>
            </div>
          </footer>
        )}
      </div>
      <button
        type="button"
        className={`home-toggle${collapsed ? " collapsed" : ""}`}
        onClick={onToggle}
        aria-label={collapsed ? "Mở tổng quan" : "Thu tổng quan"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 6 8 12l6 6"
          />
        </svg>
      </button>
    </section>
  );
}
