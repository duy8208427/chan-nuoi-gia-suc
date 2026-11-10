// Biểu đồ lịch sử gọn: đường số đo, dải xanh là ngưỡng an toàn (ref_min–ref_max), điểm cuối tô màu theo ngưỡng.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";
import { formatNumber } from "../../src/geo";
import type { HistoryPoint, Parameter } from "../../src/types";
import { C, refRange } from "./theme";

const H = 150;
const PAD = { top: 10, bottom: 18, left: 4, right: 4 };

function tone(value: number, parameter?: Parameter): string {
  if (!parameter) return C.brand;
  if (parameter.ref_min != null && value < parameter.ref_min) return C.low;
  if (parameter.ref_max != null && value > parameter.ref_max) return C.high;
  return C.ok;
}

function shortTime(value: string): string {
  const [date = "", time = ""] = value.trim().split(/\s+/);
  const [, m, d] = date.split("-");
  return time ? `${d}/${m} ${time.slice(0, 5)}` : `${d}/${m}`;
}

export function HistoryChart({ points, parameter, unit }: { points: HistoryPoint[]; parameter?: Parameter; unit: string }) {
  const [width, setWidth] = useState(0);
  const values = points
    .map((p) => ({ t: p.alert_time, v: Number(p.measured_value) }))
    .filter((p) => Number.isFinite(p.v));

  if (!values.length) {
    return (
      <View style={[st.box, st.center]}>
        <Text style={st.muted}>Chưa có số đo trong khoảng này.</Text>
      </View>
    );
  }

  const refs = [parameter?.ref_min, parameter?.ref_max].filter((v): v is number => v != null);
  let lo = Math.min(...values.map((p) => p.v), ...refs);
  let hi = Math.max(...values.map((p) => p.v), ...refs);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const span = hi - lo;
  lo -= span * 0.08;
  hi += span * 0.08;

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;
  const last = values[values.length - 1];
  const bandTop = parameter?.ref_max != null ? y(parameter.ref_max) : PAD.top;
  const bandBottom = parameter?.ref_min != null ? y(parameter.ref_min) : PAD.top + innerH;
  const hasBand = refs.length > 0;

  return (
    <View>
      <View style={st.legend}>
        <Text style={st.muted}>
          Thấp {formatNumber(Math.min(...values.map((p) => p.v)))} · Cao {formatNumber(Math.max(...values.map((p) => p.v)))}
        </Text>
        <Text style={[st.last, { color: tone(last.v, parameter) }]}>
          {formatNumber(last.v)} {unit}
        </Text>
      </View>
      <View style={st.box} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={H}>
            {hasBand ? (
              <Rect x={PAD.left} y={bandTop} width={innerW} height={Math.max(1, bandBottom - bandTop)} fill={C.okSoft} />
            ) : null}
            <Line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke={C.line} strokeWidth={1} />
            <Polyline
              points={values.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")}
              fill="none"
              stroke={C.brand}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {values.map((p, i) => {
              const color = tone(p.v, parameter);
              if (color === C.ok && i !== values.length - 1) return null;
              return <Circle key={`${p.t}-${i}`} cx={x(i)} cy={y(p.v)} r={i === values.length - 1 ? 4 : 3} fill={color} />;
            })}
          </Svg>
        ) : null}
        <View style={st.axis}>
          <Text style={st.axisText}>{shortTime(values[0].t)}</Text>
          <Text style={st.axisText}>{shortTime(last.t)}</Text>
        </View>
      </View>
      {hasBand ? (
        <Text style={[st.muted, st.note]}>
          Vùng xanh: ngưỡng an toàn {refRange(parameter?.ref_min, parameter?.ref_max)} {unit}
        </Text>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  box: { height: H, position: "relative" },
  center: { alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  last: { fontWeight: "800", fontSize: 16 },
  muted: { color: C.muted, fontSize: 12 },
  note: { marginTop: 4 },
  axis: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-between" },
  axisText: { color: C.muted, fontSize: 11 },
});
