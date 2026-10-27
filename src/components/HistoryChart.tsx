import type { HistoryPoint, Parameter } from "../types";

type Props = {
  points: HistoryPoint[];
  unit: string;
  parameter?: Parameter;
};

function tone(value: number, parameter?: Parameter): "ok" | "low" | "high" {
  if (!parameter) return "ok";
  if (parameter.ref_min != null && value < parameter.ref_min) return "low";
  if (parameter.ref_max != null && value > parameter.ref_max) return "high";
  return "ok";
}

const STROKE = { ok: "#16a34a", low: "#d97706", high: "#e11d48" };

export function HistoryChart({ points, unit, parameter }: Props) {
  if (!points.length) {
    return (
      <div className="empty-note">
        <b>Chưa có dữ liệu lịch sử</b>
        <span>Thử khoảng thời gian khác hoặc chọn chỉ số khác.</span>
      </div>
    );
  }

  const values = points.map((p) => Number(p.measured_value)).filter(Number.isFinite);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const width = 420;
  const height = 168;
  const pad = 22;
  const yMin = Math.min(dataMin, parameter?.ref_min ?? dataMin);
  const yMax = Math.max(dataMax, parameter?.ref_max ?? dataMax);
  const padY = (yMax - yMin) * 0.12 || 1;
  const min = yMin - padY;
  const max = yMax + padY;
  const span = max - min || 1;
  const yOf = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);
  const coords = points.map((point, index) => {
    const value = Number(point.measured_value);
    const x = pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
    return { x, y: yOf(value), value, label: point.alert_time, tone: tone(value, parameter) };
  });
  const bandTop = parameter?.ref_max != null ? yOf(parameter.ref_max) : pad;
  const bandBottom = parameter?.ref_min != null ? yOf(parameter.ref_min) : height - pad;
  const ticks = [coords[0], coords[Math.floor(coords.length / 2)], coords.at(-1)].filter(
    (tick): tick is (typeof coords)[number] => Boolean(tick),
  );

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {parameter && (parameter.ref_min != null || parameter.ref_max != null) ? (
          <rect
            x={pad}
            y={Math.min(bandTop, bandBottom)}
            width={width - pad * 2}
            height={Math.max(4, Math.abs(bandBottom - bandTop))}
            fill="#22c55e"
            opacity="0.12"
          />
        ) : null}
        {parameter?.ref_min != null ? (
          <line x1={pad} x2={width - pad} y1={yOf(parameter.ref_min)} y2={yOf(parameter.ref_min)} className="chart-ref" />
        ) : null}
        {parameter?.ref_max != null ? (
          <line x1={pad} x2={width - pad} y1={yOf(parameter.ref_max)} y2={yOf(parameter.ref_max)} className="chart-ref" />
        ) : null}
        {coords.slice(1).map((point, index) => {
          const prev = coords[index];
          const color = STROKE[prev.tone === "ok" && point.tone === "ok" ? "ok" : point.tone === "high" || prev.tone === "high" ? "high" : "low"];
          return (
            <line
              key={`${prev.x}-${point.x}`}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke={color}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          );
        })}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2.6" fill={STROKE[c.tone]} />
        ))}
        {ticks.map((tick, i) => (
          <text key={i} x={tick.x} y={height - 6} textAnchor="middle" className="chart-tick">
            {String(tick.label).slice(0, 10)}
          </text>
        ))}
      </svg>
      <div className="chart-meta">
        <span>
          Min {dataMin.toLocaleString("vi-VN")} {unit}
        </span>
        <span>
          Max {dataMax.toLocaleString("vi-VN")} {unit}
        </span>
        <span>
          {parameter?.ref_min != null || parameter?.ref_max != null
            ? `Ngưỡng ${parameter.ref_min ?? "—"}–${parameter.ref_max ?? "—"}`
            : `${points.length} mốc`}
        </span>
      </div>
    </div>
  );
}
