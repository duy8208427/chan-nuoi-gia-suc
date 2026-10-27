import { CameraBubbles, pondCameras } from "../components/CameraBubbles";
import { UNASSIGNED_FARM_ID } from "../catalog";
import { formatMoney, formatNumber, pickMetric, statusLabel } from "../geo";
import type { FarmView, PondPin, TaskRow } from "../types";

type Props = {
  farm: FarmView;
  tasks: TaskRow[];
  onClose: () => void;
  onSelectPond: (pondId: string) => void;
  onOpenCamera: (pin: PondPin, cameraId: string) => void;
  embedded?: boolean;
};

const HEAT = ["ATEMP", "NH3", "CO2"] as const;

export function FarmPanel({ farm, tasks, onClose, onSelectPond, onOpenCamera, embedded }: Props) {
  const openTasks = tasks.filter((row) => farm.pond_ids.includes(row.pond_id));
  const mapped = farm.id !== UNASSIGNED_FARM_ID;

  return (
    <aside className={`detail-panel farm-panel${embedded ? " embedded" : ""}`}>
      <header className="detail-hero farm-hero">
        {embedded ? null : (
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        )}
        <div>
          <em className="sample-tag">{mapped ? "Trại" : "Nhóm"}</em>
          <h2>{farm.name}</h2>
          <p>
            {farm.location} · {farm.pins.length} chuồng
          </p>
        </div>
      </header>

      <div className="panel-body scroll-fade">
      <section>
        <h3>Trạng thái chuồng</h3>
        <div className="stat-row">
          <div>
            <small>Nguy hiểm</small>
            <b>{farm.dangerCount}</b>
          </div>
          <div>
            <small>Cảnh báo</small>
            <b>{farm.warnCount}</b>
          </div>
          <div>
            <small>Ổn</small>
            <b>{farm.okCount}</b>
          </div>
        </div>
        <div className="farm-ponds">
          {farm.pins.map((pin) => {
            const cameras = pondCameras(pin.assets);
            return (
              <div key={pin.pond.id} className={`farm-pond ${pin.status.toLowerCase()}`}>
                <button type="button" className="farm-pond-main" onClick={() => onSelectPond(pin.pond.id)}>
                  <i />
                  <span>
                    <b>{pin.pond.pond_name}</b>
                    <small>
                      {pin.pond.pond_code} · {statusLabel(pin.status)}
                    </small>
                  </span>
                </button>
                <CameraBubbles cameras={cameras} onOpen={(cameraId) => onOpenCamera(pin, cameraId)} />
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3>So sánh chuồng</h3>
        <div className="heat-table">
          <div className="heat-head">
            <span>Chuồng</span>
            {HEAT.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          {farm.pins.map((pin) => (
            <button key={pin.pond.id} type="button" className="heat-row" onClick={() => onSelectPond(pin.pond.id)}>
              <b>{pin.pond.pond_code}</b>
              {HEAT.map((code) => {
                const item = pickMetric(pin.measurements, code);
                return (
                  <em key={code} className={(item?.status ?? "none").toLowerCase()}>
                    {item ? item.measured_value : "—"}
                  </em>
                );
              })}
            </button>
          ))}
        </div>
      </section>

      {mapped ? (
        <section>
          <h3>Kho chung</h3>
          <ul className="card-list compact">
            {farm.inventory.map((row) => (
              <li key={row.name}>
                <div>
                  <b>{row.name}</b>
                  <span>
                    {formatNumber(row.quantity)} {row.unit}
                  </span>
                </div>
                <em>{formatMoney(row.week_cost)}</em>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mapped ? (
        <section>
          <h3>Vận hành</h3>
          <div className="soft-card">
            <span>Ca</span>
            <b>{farm.staff_shift}</b>
            <span>Nguồn nước uống</span>
            <b>{farm.inlet_source}</b>
            <span>Hầm phân</span>
            <b>{farm.settling_pond}</b>
          </div>
        </section>
      ) : null}

      <section>
        <h3>Việc trên các chuồng</h3>
        {openTasks.length ? (
          <ul className="card-list">
            {openTasks.map((row) => (
              <li key={row.id}>
                <div>
                  <b>{row.task_type_name}</b>
                  <span>
                    {row.pond_name} · {row.user_fullname}
                  </span>
                  <small>{row.notes || row.performed_at}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Không có việc ghi nhận trên các chuồng của trại.</p>
        )}
      </section>
      </div>
    </aside>
  );
}
