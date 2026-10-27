import { statusLabel } from "../geo";
import type { AlertStatus, Parameter } from "../types";

type Props = {
  label: string;
  value: number | undefined;
  unit: string;
  status: AlertStatus;
  parameter?: Parameter;
};

function range(param: Parameter | undefined, value = 0): [number, number] {
  if (param?.param_code === "ATEMP" || param?.param_code === "WTEMP") return [0, 45];
  if (param?.param_code === "RH") return [0, 100];
  if (param?.param_code === "NH3") return [0, 40];
  if (param?.param_code === "CO2") return [0, 5000];
  if (param?.param_code === "THI") return [50, 100];
  if (param?.param_code === "H2S") return [0, 10];
  if (param?.param_code === "AIR") return [0, 3];
  const hi = Math.max(param?.ref_max ?? 0, value, 1);
  return [0, hi * 1.25];
}

const ARC = 110;

export function Gauge({ label, value, unit, status, parameter }: Props) {
  const [min, max] = range(parameter, value ?? 0);
  const safeMin = parameter?.ref_min ?? min;
  const safeMax = parameter?.ref_max ?? max;
  const ratio = value == null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min || 1)));
  const angle = -180 + ratio * 180;
  const start = Math.min(1, Math.max(0, (safeMin - min) / (max - min || 1)));
  const end = Math.min(1, Math.max(0, (safeMax - min) / (max - min || 1)));
  const color = status === "HIGH" ? "#e11d48" : status === "LOW" ? "#d97706" : status === "OK" ? "#16a34a" : "#94a3b8";

  return (
    <div className="gauge">
      <div className="gauge-label" title={parameter?.param_name}>
        {label}
      </div>
      <svg viewBox="0 0 88 54" className="gauge-svg">
        <path d="M10 46 A34 34 0 0 1 78 46" fill="none" stroke="#e8edf3" strokeWidth="7" strokeLinecap="round" />
        <path
          d="M10 46 A34 34 0 0 1 78 46"
          fill="none"
          stroke="#86efac"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, end - start) * ARC} ${ARC}`}
          strokeDashoffset={-start * ARC}
        />
        <line
          x1="44"
          y1="46"
          x2="44"
          y2="20"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${angle} 44 46)`}
        />
        <circle cx="44" cy="46" r="2.6" fill={color} />
      </svg>
      <div className="gauge-value" style={{ color }}>
        {value == null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
        <span>{unit}</span>
      </div>
      <div className={`gauge-status ${status.toLowerCase()}`}>{statusLabel(status)}</div>
    </div>
  );
}
