import { formatClock, formatNumber, formatRemaining, tripHotWord, tripStatusLabel, tripTempLabel, tripTooHot } from "../geo";
import type { VehicleView } from "../types";

type Props = {
  vehicle: VehicleView;
  onClose: () => void;
  embedded?: boolean;
};

export function VehiclePanel({ vehicle, onClose, embedded }: Props) {
  const trip = vehicle.trip;
  const hot = tripTooHot(vehicle);
  const pct = Math.round(vehicle.progress * 100);

  return (
    <aside className={`detail-panel${embedded ? " embedded" : ""}`}>
      <header className="detail-hero farm-hero">
        {embedded ? null : (
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        )}
        <div className="driver-head">
          <span className="driver-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-8 2-8 4.5V20h16v-1.5C20 16 16 14 12 14Z"
              />
            </svg>
          </span>
          <div>
            <em className="sample-tag">Xe vận chuyển</em>
            <h2>{vehicle.plate}</h2>
            <p>{vehicle.driver}</p>
          </div>
        </div>
      </header>

      <div className="panel-body scroll-fade">
      {trip ? (
        <>
          <section>
            <h3>Chuyến hiện tại</h3>
            <div className="trip-now">
              <em className={`trip-status ${trip.status}`}>{tripStatusLabel(trip.status)}</em>
              <div className="trip-now-bar">
                <div className="progress-track" aria-hidden="true">
                  <i style={{ width: `${pct}%` }} />
                </div>
                <b>{pct}%</b>
              </div>
              <small>Còn lại {formatRemaining(vehicle.remaining_min)}</small>
            </div>
          </section>
          <section>
            <h3>Hành trình</h3>
            <div className="soft-card">
              <span>Điểm đi</span>
              <b>{vehicle.pond_name ?? trip.pond_id}</b>
              <span>Điểm đến</span>
              <b>{vehicle.plant_name ?? trip.plant_id}</b>
              <span>Tuyến</span>
              <b>{vehicle.route_name ?? "—"}</b>
              <span>Khối lượng</span>
              <b>{formatNumber(trip.weight_kg, 0)} kg</b>
              <span>Xuất phát</span>
              <b>{formatClock(trip.departed_at)}</b>
              <span>ETA</span>
              <b>{formatClock(trip.eta)}</b>
              <span>{tripTempLabel(vehicle)}</span>
              <b className={hot ? "hot" : ""}>
                {trip.trailer_temp.toFixed(1)}°C · ngưỡng ≤ {vehicle.max_temp}°C{hot ? ` · ${tripHotWord(vehicle)}` : ""}
              </b>
            </div>
          </section>
        </>
      ) : (
        <section>
          <p className="muted">Xe đang trống, chưa gán chuyến.</p>
        </section>
      )}
      </div>
    </aside>
  );
}
