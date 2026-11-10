import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fallbackReport, fallbackTasks } from "../../../src/api";
import { assetKindLabel, assetStatusLabel, formatMoney, formatNumber, parameterForStage, pickMetric, statusRank } from "../../../src/geo";
import type { AlertStatus, HistoryPoint, Measurement, Parameter } from "../../../src/types";
import { HistoryChart } from "../HistoryChart";
import type { RootStack } from "../nav";
import { penPhoto } from "../photos";
import { useStore } from "../store";
import { C, refRange, statusColor, unitText } from "../theme";
import { Card, Empty, SectionTitle, Segmented, StatusPill } from "../ui";

type Props = NativeStackScreenProps<RootStack, "Pond">;
type RangeKey = "1d" | "7d" | "30d";

/** Cùng 4 chỉ số nổi bật với DetailPanel của web. */
const FEATURED = [
  { code: "ATEMP", label: "Nhiệt độ", short: "Nhiệt" },
  { code: "RH", label: "Độ ẩm", short: "Ẩm" },
  { code: "NH3", label: "Khí NH3", short: "NH3" },
  { code: "CO2", label: "Khí CO2", short: "CO2" },
] as const;

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "1d", label: "1 ngày" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

/** Chuỗi mô phỏng giống DetailPanel của web (bản demo không có lịch sử thật). */
function demoHistory(deviceCode: string, current: Measurement | undefined, parameter: Parameter | undefined, range: RangeKey): HistoryPoint[] {
  if (!current) return [];
  const base = current.measured_value ?? parameter?.ref_min ?? 0;
  const count = range === "1d" ? 8 : range === "7d" ? 12 : 16;
  return Array.from({ length: count }, (_, i) => {
    const wave = Math.sin(i / 2.2) * (base * 0.08 || 0.4);
    const dip = i === count - 3 || i === count - 2 ? -(parameter?.ref_min ?? base) * 0.08 : 0;
    return {
      device_code: deviceCode,
      alert_time: `2026-10-${String(Math.min(28, 9 + i)).padStart(2, "0")}`,
      measured_value: Number(Math.max(0, base + wave + dip).toFixed(2)),
    };
  });
}

export function PenDetailScreen({ route }: Props) {
  const { pins, parameters, alerts, tasks } = useStore();
  const pin = pins.find((item) => item.pond.id === route.params.pondId);
  const herd = pin?.crop;
  const paramMap = useMemo(
    () => Object.fromEntries(parameters.map((p) => [p.param_code, parameterForStage(p, herd?.stage)])),
    [parameters, herd?.stage],
  );

  const cameras = pin?.assets.filter((a) => a.kind === "camera") ?? [];
  const [cameraId, setCameraId] = useState(cameras[0]?.id ?? "");
  const camera = cameras.find((c) => c.id === cameraId) ?? cameras[0];
  const [showAll, setShowAll] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [paramCode, setParamCode] = useState<string>("ATEMP");
  const [range, setRange] = useState<RangeKey>("7d");
  const deviceCode = pin?.devices[0]?.device_code ?? "";
  const firstFeatured = FEATURED.find((f) => pin && pickMetric(pin.measurements, f.code))?.code;

  useEffect(() => {
    if (firstFeatured && pin && !pickMetric(pin.measurements, paramCode)) setParamCode(firstFeatured);
  }, [firstFeatured, pin?.pond.id]);

  const history = useMemo(() => {
    if (!pin || !deviceCode) return [];
    const current = pickMetric(pin.byDevice[deviceCode] ?? pin.measurements, paramCode);
    return demoHistory(deviceCode, current, paramMap[paramCode], range);
  }, [pin, deviceCode, paramCode, range, paramMap]);

  if (!pin) return <Empty title="Không tìm thấy chuồng" hint="Chuồng này không còn trong danh sách." />;

  const report = fallbackReport(pin.pond.id);
  const deviceCodes = pin.devices.map((d) => d.device_code);
  const penAlerts = alerts.filter((row) => deviceCodes.includes(row.device_code));
  const issues = pin.assets.filter((a) => a.status === "offline" || a.status === "fault");
  const penTasks = (tasks.length ? tasks : fallbackTasks(pin.pond.id)).filter(
    (row) => row.pond_id === pin.pond.id || row.pond_name === pin.pond.pond_name,
  );
  const gear = pin.assets.filter((a) => a.kind !== "camera");
  const running = gear.filter((a) => a.status === "running").length;
  const allMetrics = [...pin.measurements].sort(
    (a, b) => statusRank(b.status) - statusRank(a.status) || a.param_code.localeCompare(b.param_code),
  );
  const lost = camera && (camera.status === "offline" || camera.status === "fault");
  const featured = FEATURED.filter((f) => pickMetric(pin.measurements, f.code));
  const dairy = herd?.stage === "dairy";

  return (
    <ScrollView style={st.page} contentContainerStyle={st.content}>
      <View style={st.photoWrap}>
        <Image source={penPhoto(pin.pond.pond_code)} style={[st.photo, lost && { opacity: 0.25 }]} resizeMode="cover" />
        {lost ? (
          <View style={st.lost}>
            <Text style={st.lostText}>MẤT HÌNH</Text>
            <Text style={st.lostSub}>{camera?.name}</Text>
          </View>
        ) : camera ? (
          <View style={st.camTag}>
            <View style={st.rec} />
            <Text style={st.camText}>{camera.name}</Text>
          </View>
        ) : null}
      </View>
      {cameras.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.camTabs}>
          {cameras.map((cam) => {
            const on = cam.id === camera?.id;
            const bad = cam.status === "offline" || cam.status === "fault";
            return (
              <Pressable key={cam.id} onPress={() => setCameraId(cam.id)} style={[st.camTab, on && st.camTabOn]}>
                <Text style={[st.camTabText, on && st.camTabTextOn]}>
                  {cam.location_label || cam.name}
                  {bad ? " · mất" : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={st.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.code}>
            {pin.pond.pond_code}
            {pin.farm_name ? ` · ${pin.farm_name}` : ""}
          </Text>
          <Text style={st.muted}>{pin.latestAt ? `Đo lúc ${pin.latestAt}` : "Chưa có số đo"}</Text>
        </View>
        <StatusPill status={pin.status} />
      </View>

      {herd ? (
        <Card style={{ gap: 10 }}>
          <View style={st.herdTop}>
            <Text style={st.herdTitle}>
              {herd.species} · {herd.stage_label}
            </Text>
            <Text style={st.muted}>ngày {herd.days_old}</Text>
          </View>
          <View style={st.herdGrid}>
            <Stat label="Số con" value={formatNumber(herd.head_count, 0)} />
            <Stat label="Tỉ lệ sống" value={`${herd.survival_pct}%`} />
            <Stat label="Cân nặng" value={`${formatNumber(herd.avg_weight_kg, 1)} kg`} />
            <Stat label={dairy ? "Sữa" : "Tăng trọng"} value={dairy && herd.milk_kg != null ? `${formatNumber(herd.milk_kg, 1)} kg/con` : `${formatNumber(herd.adg_g, 0)} g/ngày`} />
          </View>
          <Text style={st.line}>
            Thân nhiệt {formatNumber(herd.body_temp_c, 1)}°C · thở {formatNumber(herd.respiration, 0)}/phút
            {herd.rumination_min != null ? ` · nhai lại ${formatNumber(herd.rumination_min, 0)} phút` : ""}
          </Text>
          <Text style={st.muted}>
            {dairy ? "Đang vắt sữa" : `Xuất dự kiến ${herd.harvest_eta}`} · mật độ {herd.density}
          </Text>
        </Card>
      ) : null}

      {featured.length ? (
        <View style={st.grid}>
          {featured.map((f) => (
            <MetricTile key={f.code} label={f.label} m={pickMetric(pin.measurements, f.code)!} p={paramMap[f.code]} />
          ))}
        </View>
      ) : (
        <Card>
          <Text style={st.muted}>Chuồng chưa gắn cảm biến nên chưa có chỉ số.</Text>
        </Card>
      )}

      {allMetrics.length > featured.length ? (
        <Card style={{ paddingVertical: 4 }}>
          <Pressable onPress={() => setShowAll((v) => !v)} style={st.toggle}>
            <Text style={st.toggleText}>Tất cả chỉ số ({allMetrics.length})</Text>
            <Text style={st.toggleText}>{showAll ? "▴" : "▾"}</Text>
          </Pressable>
          {showAll
            ? allMetrics.map((m, i) => {
                const p = paramMap[m.param_code];
                const range = refRange(p?.ref_min, p?.ref_max);
                return (
                  <View key={`${m.param_code}-${i}`} style={st.metricRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.metricName} numberOfLines={1}>
                        {p?.param_name ?? m.param_code}
                      </Text>
                      {range ? <Text style={st.muted}>Chuẩn {range}</Text> : null}
                    </View>
                    <Text style={[st.metricVal, { color: statusColor(m.status === "NONE" ? "OK" : m.status).fg }]}>
                      {formatNumber(m.measured_value)} {unitText(m.unit)}
                    </Text>
                  </View>
                );
              })
            : null}
        </Card>
      ) : null}

      {deviceCode && featured.length ? (
        <>
          <SectionTitle>Lịch sử</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Segmented items={featured.map((f) => ({ value: f.code, label: f.short }))} value={paramCode} onChange={setParamCode} />
            <Segmented items={RANGES} value={range} onChange={setRange} />
            <HistoryChart points={history} parameter={paramMap[paramCode]} unit={unitText(paramMap[paramCode]?.unit)} />
          </Card>
        </>
      ) : null}

      <SectionTitle>Cảnh báo ({issues.length + penAlerts.length})</SectionTitle>
      {issues.length + penAlerts.length === 0 ? (
        <Card>
          <Text style={st.muted}>Không có cảnh báo.</Text>
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          {issues.map((a) => (
            <AlertLine
              key={a.id}
              level={a.status === "fault" ? "HIGH" : "LOW"}
              title={`${a.name} ${assetStatusLabel(a.status).toLowerCase()}`}
              detail={`${assetKindLabel(a.kind)}${a.last_seen ? ` · ${a.last_seen}` : ""}`}
            />
          ))}
          {penAlerts.slice(0, 6).map((a) => (
            <AlertLine
              key={a.id}
              level={a.alert_level === "HIGH" ? "HIGH" : "LOW"}
              title={`${paramMap[a.param_code]?.param_name ?? a.param_code} ${a.measured_value} ${unitText(paramMap[a.param_code]?.unit)}`}
              detail={`${a.message} · ${a.device_code}`}
            />
          ))}
        </Card>
      )}

      <SectionTitle>Vận hành</SectionTitle>
      <Card style={{ gap: 6 }}>
        {gear.length ? (
          <Text style={st.line}>
            Thiết bị: <Text style={st.bold}>{running}</Text>/{gear.length} đang chạy
            {issues.length ? <Text style={{ color: C.high }}> · {issues.length} lỗi/mất tín hiệu</Text> : null}
          </Text>
        ) : null}
        {herd ? (
          <Text style={st.line}>
            Thức ăn hôm nay {formatNumber(herd.feed_ration_kg)} kg · thừa {formatNumber(herd.leftover_feed_kg)} kg · cào phân{" "}
            {herd.manure_scrapes_today} lần
          </Text>
        ) : null}
        {report ? (
          <Text style={st.line}>
            Tuần này: {report.feed_count_this_week} lần cho ăn · {report.manure_scrapes_this_week} lần cào phân
            {report.total_cost ? ` · ${formatMoney(report.total_cost)}` : ""}
          </Text>
        ) : null}
      </Card>

      {penTasks.length ? (
        <Card style={{ paddingVertical: 4 }}>
          <Pressable onPress={() => setShowTasks((v) => !v)} style={st.toggle}>
            <Text style={st.toggleText}>Công việc gần đây ({penTasks.length})</Text>
            <Text style={st.toggleText}>{showTasks ? "▴" : "▾"}</Text>
          </Pressable>
          {showTasks
            ? penTasks.slice(0, 8).map((t) => (
                <View key={t.id} style={st.taskRow}>
                  <Text style={st.bold}>
                    {t.task_type_name}
                    {t.quantity && t.quantity !== "0" ? ` · ${t.quantity} ${t.unit}` : ""}
                  </Text>
                  <Text style={st.muted}>
                    {t.performed_at} · {t.user_fullname}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </Text>
                </View>
              ))
            : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.muted}>{label}</Text>
      <Text style={st.statVal}>{value}</Text>
    </View>
  );
}

function MetricTile({ label, m, p }: { label: string; m: Measurement; p?: Parameter }) {
  const tone = statusColor(m.status === "NONE" ? "OK" : m.status);
  const range = refRange(p?.ref_min, p?.ref_max);
  const unit = unitText(m.unit);
  return (
    <View style={[st.tile, { backgroundColor: tone.bg }]}>
      <Text style={st.tileLabel}>{label}</Text>
      <Text style={[st.tileVal, { color: tone.fg }]}>
        {formatNumber(m.measured_value, 1)}
        {unit ? <Text style={st.tileUnit}> {unit}</Text> : null}
      </Text>
      {range ? <Text style={st.tileRange}>Chuẩn {range}</Text> : null}
    </View>
  );
}

function AlertLine({ level, title, detail }: { level: AlertStatus; title: string; detail: string }) {
  return (
    <View style={st.alert}>
      <View style={[st.alertDot, { backgroundColor: statusColor(level).fg }]} />
      <View style={{ flex: 1 }}>
        <Text style={st.bold}>{title}</Text>
        <Text style={st.muted}>{detail}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  photoWrap: { borderRadius: 14, overflow: "hidden", backgroundColor: "#0b1510" },
  photo: { width: "100%", height: 200 },
  lost: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  lostText: { color: "#fff", fontWeight: "900", fontSize: 20, letterSpacing: 2 },
  lostSub: { color: "#cbd5e1", marginTop: 4 },
  camTag: { position: "absolute", left: 10, top: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  rec: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  camText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  camTabs: { gap: 8 },
  camTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  camTabOn: { backgroundColor: C.brand, borderColor: C.brand },
  camTabText: { color: C.text, fontWeight: "600", fontSize: 13 },
  camTabTextOn: { color: "#fff" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  code: { fontWeight: "800", color: C.text, fontSize: 15 },
  muted: { color: C.muted, fontSize: 13 },
  herdTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  herdTitle: { fontWeight: "800", color: C.text, fontSize: 16, flexShrink: 1 },
  herdGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  stat: { width: "50%", gap: 2 },
  statVal: { fontWeight: "900", color: C.text, fontSize: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", flexGrow: 1, borderRadius: 14, padding: 12, gap: 2 },
  tileLabel: { color: C.muted, fontWeight: "700", fontSize: 13 },
  tileVal: { fontSize: 28, fontWeight: "900" },
  tileUnit: { fontSize: 13, fontWeight: "600", color: C.muted },
  tileRange: { color: C.muted, fontSize: 12 },
  toggle: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  toggleText: { fontWeight: "800", color: C.brand },
  metricRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  metricName: { color: C.text },
  metricVal: { fontWeight: "800" },
  alert: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  alertDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  bold: { fontWeight: "700", color: C.text },
  line: { color: C.text, lineHeight: 20 },
  taskRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, gap: 2 },
});
