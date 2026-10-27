import { useLayoutEffect, useRef, useState } from "react";
import { formatNumber, offendingMetrics, pickMetric, pondImage } from "../geo";
import type { HoverInfo, PondPin } from "../types";

type Props = {
  info: HoverInfo;
  onCamera: (pin: PondPin) => void;
  onKeep: () => void;
};

function Metric({ label, value, unit, status }: { label: string; value?: number; unit: string; status?: string }) {
  return (
    <div className={`metric ${(status ?? "none").toLowerCase()}`}>
      <i />
      <span>
        {label}
        <b>
          {value == null ? "—" : value} {unit}
        </b>
      </span>
    </div>
  );
}

function placeCard(
  pinX: number,
  pinY: number,
  width: number,
  height: number,
  pinWidth = 0,
): { left: number; top: number } {
  const pad = 12;
  // Khoảng cách ngang từ tâm ghim để hover card nằm hẳn bên cạnh thẻ ghim, không che thẻ.
  const gap = pinWidth / 2 + 18;
  const stage = document.querySelector(".map-stage")?.getBoundingClientRect();
  const leftMin = (stage?.left ?? 0) + pad;
  const topMin = (stage?.top ?? 0) + 64;
  const bottomMax = (stage?.bottom ?? window.innerHeight) - pad;
  const panel = document.querySelector(".map-stage .detail-panel") ?? document.querySelector(".detail-panel");
  const rightMax = panel
    ? panel.getBoundingClientRect().left - 8
    : (stage?.right ?? window.innerWidth) - pad;
  let left = pinX + gap;
  if (left + width > rightMax) left = pinX - width - gap;
  left = Math.min(rightMax - width, Math.max(leftMin, left));
  // Vẫn chạm thẻ ghim theo chiều ngang (hai bên đều chật): đẩy card xuống dưới thẻ để không che chỗ đang rê chuột.
  const coversPin = pinWidth > 0 && left < pinX + pinWidth / 2 && left + width > pinX - pinWidth / 2;
  let top = coversPin ? pinY + 52 : pinY - 28;
  if (coversPin && top + height > bottomMax) top = pinY - height - 16;
  top = Math.min(bottomMax - height, Math.max(topMin, top));
  return { left, top };
}

export function HoverCard({ info, onCamera, onKeep }: Props) {
  const { pin } = info;
  const cardRef = useRef<HTMLElement>(null);
  const [pos, setPos] = useState(() => placeCard(info.x, info.y, 340, 420, info.w));
  const off = offendingMetrics(pin.measurements);
  const featured = ["ATEMP", "RH", "NH3", "CO2"]
    .map((code) => pickMetric(pin.measurements, code))
    .filter((item) => item != null);
  const metrics = (off.length ? off.slice(0, 4) : featured).slice(0, 4);

  useLayoutEffect(() => {
    const box = cardRef.current?.getBoundingClientRect();
    setPos(placeCard(info.x, info.y, box?.width ?? 340, box?.height ?? 420, info.w));
  }, [info.x, info.y, info.w, pin.pond.id]);

  return (
    <aside ref={cardRef} className="hover-card" style={{ left: pos.left, top: pos.top }} role="dialog">
      <div className="hover-hero" style={{ backgroundImage: `url(${pondImage(pin.pond.pond_code)})` }}>
        <button
          type="button"
          className="cam-btn"
          onMouseEnter={onKeep}
          onClick={(event) => {
            event.stopPropagation();
            onCamera(pin);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M9 4.5h6l1.2 1.8H19a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.3a2 2 0 0 1 2-2h2.8L9 4.5Zm3 4.2a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2Zm0 1.8a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z"
            />
          </svg>
          Camera
        </button>
        <div>
          <h3>{pin.pond.pond_name}</h3>
          <p>
            {pin.pond.pond_code}
            {pin.farm_name ? ` · ${pin.farm_name}` : ""} · {pin.pond.location || "Chưa có vị trí"}
          </p>
        </div>
      </div>
      <ul className="hover-meta">
        <li>
          <span>Diện tích</span>
          <b>{formatNumber(pin.pond.area)} m²</b>
        </li>
        <li>
          <span>Đàn</span>
          <b>{pin.crop ? `${formatNumber(pin.crop.head_count, 0)} con` : "—"}</b>
        </li>
        <li>
          <span>Thiết bị</span>
          <b>
            {pin.assets.length ? `${pin.assets.length} thiết bị` : `${pin.devices.length} cảm biến`}
            {pin.estimated ? " · ước lượng" : ""}
          </b>
        </li>
      </ul>
      <div className="hover-metrics">
        {metrics.length ? (
          metrics.map((item) =>
            item ? (
              <Metric
                key={item.param_code}
                label={item.param_code}
                value={item.measured_value}
                unit={item.unit}
                status={item.status}
              />
            ) : null,
          )
        ) : (
          <Metric label="ATEMP" unit="°C" />
        )}
      </div>
      <div className="hover-time">{pin.latestAt ? `Cập nhật ${pin.latestAt}` : "Chưa có số liệu đo"}</div>
    </aside>
  );
}
