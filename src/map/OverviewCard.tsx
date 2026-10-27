import { UNASSIGNED_FARM_ID } from "../catalog";
import { formatNumber, statusCounts, tripStatusLabel } from "../geo";
import type { FarmView, PlantView, PondPin, TripStatus, VehicleView } from "../types";

const VEHICLE_GROUPS: { status: TripStatus | "idle"; label: string }[] = [
  { status: "late", label: "Trễ" },
  { status: "enroute", label: "Đang chạy" },
  { status: "waiting", label: "Chờ xuất" },
  { status: "received", label: "Đã nhận" },
  { status: "idle", label: "Chưa có chuyến" },
];

function farmMix(farm: FarmView): string {
  const parts = [
    farm.okCount ? `${farm.okCount} ổn` : "",
    farm.warnCount ? `${farm.warnCount} cảnh báo` : "",
    farm.dangerCount ? `${farm.dangerCount} nguy hiểm` : "",
    farm.idleCount ? `${farm.idleCount} chưa đo` : "",
  ].filter(Boolean);
  return parts.join(" · ") || `${farm.pins.length} chuồng`;
}

type Props = {
  regionName: string;
  farms: FarmView[];
  pondPins?: PondPin[];
  plants: PlantView[];
  vehicles: VehicleView[];
  selectedFarmId: string | null;
  selectedVehicleId: string | null;
  selectedPlantId: string | null;
  onSelectFarm: (farmId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onSelectPlant: (plantId: string) => void;
  embedded?: boolean;
};

export function OverviewCard({
  regionName,
  farms,
  pondPins,
  plants,
  vehicles,
  selectedFarmId,
  selectedVehicleId,
  selectedPlantId,
  onSelectFarm,
  onSelectVehicle,
  onSelectPlant,
  embedded,
}: Props) {
  const fromFarms = farms.flatMap((farm) => farm.pins);
  const pins = fromFarms.length ? fromFarms : (pondPins ?? []);
  const counts = statusCounts(pins);
  const total = Math.max(1, pins.length);
  const mappedFarms = farms.filter((farm) => farm.id !== UNASSIGNED_FARM_ID);
  const unassigned = farms.find((farm) => farm.id === UNASSIGNED_FARM_ID);
  const legend = [
    counts.ok ? { key: "ok", label: `${counts.ok} ổn` } : null,
    counts.warn ? { key: "warn", label: `${counts.warn} cảnh báo` } : null,
    counts.danger ? { key: "danger", label: `${counts.danger} nguy hiểm` } : null,
    counts.idle ? { key: "idle", label: `${counts.idle} chưa đo` } : null,
  ].filter((item): item is { key: string; label: string } => item !== null);
  const vehicleGroups = VEHICLE_GROUPS.map((group) => ({
    ...group,
    items: vehicles.filter((vehicle) => (group.status === "idle" ? !vehicle.trip : vehicle.trip?.status === group.status)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className={`overview-card${embedded ? " embedded" : ""}`}>
      {embedded ? null : (
        <header>
          <div>
            <small>Khu vực</small>
            <b>{regionName}</b>
          </div>
        </header>
      )}
      <div className="overview-body scroll-fade">
        <section className="overview-section" aria-label="Chuồng">
          <div className="overview-section-head">
            <span>Chuồng</span>
            <em>{pins.length}</em>
          </div>
          {pins.length ? (
            <div className="ratio-bar" aria-label="Tỷ lệ chuồng">
              {counts.ok ? <i className="ok" style={{ width: `${(counts.ok / total) * 100}%` }} /> : null}
              {counts.warn ? <i className="warn" style={{ width: `${(counts.warn / total) * 100}%` }} /> : null}
              {counts.danger ? <i className="danger" style={{ width: `${(counts.danger / total) * 100}%` }} /> : null}
              {counts.idle ? <i className="idle" style={{ width: `${(counts.idle / total) * 100}%` }} /> : null}
            </div>
          ) : null}
          <ul className="ratio-legend">
            {legend.map((item) => (
              <li key={item.key}>
                <i className={item.key} />
                {item.label}
              </li>
            ))}
          </ul>
        </section>

        {mappedFarms.length || unassigned ? (
        <section className="overview-section" aria-label="Trại">
          <div className="overview-section-head">
            <span>Trại</span>
            <em>{mappedFarms.length}</em>
          </div>
          <ul className="overview-list">
            {mappedFarms.map((farm) => {
              const tone = farm.status === "LOW" || farm.status === "HIGH" ? ` ${farm.status.toLowerCase()}` : "";
              return (
                <li key={farm.id}>
                  <button
                    type="button"
                    className={`overview-row farm${tone}${selectedFarmId === farm.id ? " on" : ""}`}
                    onClick={() => onSelectFarm(farm.id)}
                  >
                    <span>
                      <b>{farm.name}</b>
                      <small>
                        {farm.pins.length} chuồng · {farmMix(farm)}
                      </small>
                    </span>
                    {farm.dangerCount ? <em className="danger">{farm.dangerCount}</em> : null}
                    {!farm.dangerCount && farm.warnCount ? <em className="warn">{farm.warnCount}</em> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {unassigned ? (
            <button
              type="button"
              className={`overview-unassigned${selectedFarmId === unassigned.id ? " on" : ""}`}
              onClick={() => onSelectFarm(unassigned.id)}
            >
              <b>Chưa gán trại</b>
              <small>{unassigned.pins.length} chuồng chưa thuộc trại nào</small>
            </button>
          ) : null}
        </section>
        ) : null}

        {plants.length ? (
          <section className="overview-section" aria-label="Điểm thu">
            <div className="overview-section-head">
              <span>Điểm thu</span>
              <em>{plants.length}</em>
            </div>
            <ul className="overview-list">
              {plants.map((plant) => (
                <li key={plant.id}>
                  <button
                    type="button"
                    className={`overview-plant${selectedPlantId === plant.id ? " on" : ""}`}
                    onClick={() => onSelectPlant(plant.id)}
                  >
                    <b>{plant.name}</b>
                    <span>
                      Chờ {formatNumber(plant.waiting_kg, 0)} / {formatNumber(plant.daily_capacity_kg, 0)} kg/ngày
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {vehicleGroups.length ? (
          <section className="overview-section" aria-label="Xe">
            <div className="overview-section-head">
              <span>Xe</span>
              <em>{vehicles.length}</em>
            </div>
            {vehicleGroups.map((group) => (
              <div key={group.status}>
                <p className="overview-group">{group.label}</p>
                <ul className="overview-list">
                  {group.items.map((vehicle) => (
                    <li key={vehicle.id}>
                      <button
                        type="button"
                        className={`overview-vehicle${selectedVehicleId === vehicle.id ? " on" : ""}`}
                        onClick={() => onSelectVehicle(vehicle.id)}
                      >
                        <span>
                          <b>{vehicle.plate}</b>
                          <small>
                            {vehicle.pond_name ?? "Chưa gán chuồng"}
                            {vehicle.trip ? ` · ${vehicle.trip.trailer_temp}°C` : ""}
                          </small>
                        </span>
                        <em className={`trip-status ${vehicle.trip?.status ?? "empty"}`}>
                          {vehicle.trip ? tripStatusLabel(vehicle.trip.status) : "Trống"}
                        </em>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </aside>
  );
}
