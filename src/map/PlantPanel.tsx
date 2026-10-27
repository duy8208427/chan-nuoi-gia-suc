import { formatMoney, formatNumber, isColdChain } from "../geo";
import type { PlantView } from "../types";
import { TripBoard } from "./TripBoard";

type Props = {
  plant: PlantView;
  selectedVehicleId: string | null;
  onClose: () => void;
  onSelectVehicle: (vehicleId: string) => void;
  embedded?: boolean;
};

export function PlantPanel({ plant, selectedVehicleId, onClose, onSelectVehicle, embedded }: Props) {
  const used = plant.received_today_kg + plant.waiting_kg;
  const loadPct = Math.min(100, Math.round((used / Math.max(1, plant.daily_capacity_kg)) * 100));

  return (
    <aside className={`detail-panel${embedded ? " embedded" : ""}`}>
      <header className="detail-hero farm-hero">
        {embedded ? null : (
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        )}
        <div>
          <em className="sample-tag">Điểm thu</em>
          <h2>{plant.name}</h2>
          <p>
            {plant.location} · {plant.dock}
          </p>
        </div>
      </header>

      <div className="panel-body scroll-fade">
      <section>
        <h3>Công suất hôm nay</h3>
        <div className="stat-row">
          <div>
            <small>Công suất ngày</small>
            <b>{formatNumber(plant.daily_capacity_kg, 0)} kg</b>
          </div>
          <div>
            <small>Đã nhận</small>
            <b>{formatNumber(plant.received_today_kg, 0)} kg</b>
          </div>
          <div>
            <small>Còn slot</small>
            <b>{formatNumber(plant.remaining_kg, 0)} kg</b>
          </div>
        </div>
        <div className="progress-track" aria-label={`Đã dùng ${loadPct}%`}>
          <i style={{ width: `${loadPct}%` }} />
        </div>
        <p className="muted">
          Chờ cửa {formatNumber(plant.waiting_kg, 0)} kg · {plant.inbound_count} xe trên đường · {plant.waiting_count} chờ
          xuất · {plant.received_count} đã nhận
        </p>
      </section>

      <section>
        <h3>Cửa nhận</h3>
        <div className="soft-card">
          <span>Giờ nhận</span>
          <b>{plant.receiving_hours}</b>
          <span>Cắt sổ</span>
          <b>{plant.cutoff_time}</b>
          <span>Liên hệ</span>
          <b>{plant.phone}</b>
        </div>
      </section>

      <section>
        <h3>Điều kiện nhận — chủ trại xem trước khi xuất</h3>
        <div className="soft-card">
          <span>Quy cách nhận</span>
          <b>{plant.size_spec}</b>
          <span>Loại</span>
          <b>{plant.grade}</b>
          <span>{isColdChain(plant.max_trailer_temp) ? "Nhiệt bồn sữa tối đa" : "Nhiệt thùng xe tối đa"}</span>
          <b>≤ {plant.max_trailer_temp}°C</b>
          <span>Giá tham chiếu</span>
          <b>{formatMoney(plant.price_per_kg)}/kg</b>
        </div>
      </section>

      <section>
        <h3>Chuyến về điểm thu</h3>
        <TripBoard
          compact
          vehicles={plant.inbound}
          selectedVehicleId={selectedVehicleId}
          onSelect={onSelectVehicle}
          onClose={onClose}
        />
      </section>
      </div>
    </aside>
  );
}
