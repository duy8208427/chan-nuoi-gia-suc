import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { formatNumber, pickMetric, statusCounts, statusRank } from "../../../src/geo";
import type { AlertStatus, PondPin } from "../../../src/types";
import { clock, useRootNav } from "../nav";
import { ROLE_LABEL, useStore } from "../store";
import { C, statusColor } from "../theme";
import { Empty, StatusPill } from "../ui";

type Filter = "ALL" | AlertStatus;

const QUICK = [
  { code: "ATEMP", label: "Nhiệt", unit: "°" },
  { code: "RH", label: "Ẩm", unit: "%" },
  { code: "NH3", label: "NH3", unit: "" },
] as const;

export function PensScreen() {
  const { pins, session, updatedAt, refreshing, refresh } = useStore();
  const nav = useRootNav();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const counts = statusCounts(pins);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pins
      .filter((pin) => filter === "ALL" || pin.status === filter)
      .filter(
        (pin) =>
          !q ||
          `${pin.pond.pond_name} ${pin.pond.pond_code} ${pin.pond.location} ${pin.farm_name ?? ""} ${pin.crop?.species ?? ""}`
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => statusRank(b.status) - statusRank(a.status) || a.pond.pond_name.localeCompare(b.pond.pond_name, "vi"));
  }, [pins, query, filter]);

  const chips: { key: Filter; label: string; n: number; status: AlertStatus }[] = [
    { key: "HIGH", label: "Nguy hiểm", n: counts.danger, status: "HIGH" },
    { key: "LOW", label: "Cảnh báo", n: counts.warn, status: "LOW" },
    { key: "OK", label: "Ổn", n: counts.ok, status: "OK" },
  ];

  const header = (
    <View style={st.head}>
      <Text style={st.meta}>
        Dữ liệu mẫu · {session ? ROLE_LABEL[session.role] : ""} · cập nhật {clock(updatedAt)}
      </Text>
      <View style={st.chips}>
        {chips.map((chip) => {
          const on = filter === chip.key;
          const tone = statusColor(chip.status);
          return (
            <Pressable
              key={chip.key}
              onPress={() => setFilter(on ? "ALL" : chip.key)}
              style={[st.chip, { backgroundColor: on ? tone.fg : tone.bg }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[st.chipN, { color: on ? "#fff" : tone.fg }]}>{chip.n}</Text>
              <Text style={[st.chipLabel, { color: on ? "#fff" : tone.fg }]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {pins.length > 5 ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm chuồng, mã chuồng, trại, vật nuôi…"
          placeholderTextColor={C.none}
          style={st.search}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={st.page}
      contentContainerStyle={st.content}
      data={list}
      keyExtractor={(pin) => pin.pond.id}
      ListHeaderComponent={header}
      ListEmptyComponent={<Empty title="Không có chuồng" hint={filter !== "ALL" || query ? "Thử bỏ bộ lọc." : undefined} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={C.brand} colors={[C.brand]} />}
      renderItem={({ item }) => <PenRow pin={item} onPress={() => nav.navigate("Pond", { pondId: item.pond.id, title: item.pond.pond_name })} />}
    />
  );
}

function PenRow({ pin, onPress }: { pin: PondPin; onPress: () => void }) {
  const tone = statusColor(pin.status);
  const herd = pin.crop;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <View style={[st.bar, { backgroundColor: tone.fg }]} />
      <View style={st.rowBody}>
        <View style={st.rowTop}>
          <Text style={st.name} numberOfLines={1}>
            {pin.pond.pond_name}
          </Text>
          <StatusPill status={pin.status} />
        </View>
        <Text style={st.sub} numberOfLines={1}>
          {pin.pond.pond_code}
          {pin.farm_name ? ` · ${pin.farm_name}` : ""}
          {herd ? ` · ${herd.stage_label} · ${formatNumber(herd.head_count, 0)} con` : ""}
        </Text>
        <View style={st.quick}>
          {QUICK.map((q) => {
            const m = pickMetric(pin.measurements, q.code);
            const color = m ? statusColor(m.status === "NONE" ? "OK" : m.status).fg : C.none;
            return (
              <Text key={q.code} style={st.quickItem}>
                <Text style={st.quickLabel}>{q.label} </Text>
                <Text style={{ color, fontWeight: "800" }}>
                  {m ? `${formatNumber(m.measured_value, 1)}${q.unit}` : "–"}
                </Text>
              </Text>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  head: { gap: 10, marginBottom: 4 },
  meta: { color: C.muted, fontSize: 13 },
  chips: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  chipN: { fontSize: 22, fontWeight: "900" },
  chipLabel: { fontSize: 12, fontWeight: "700" },
  search: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text },
  row: { flexDirection: "row", backgroundColor: C.card, borderRadius: 14, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  bar: { width: 5 },
  rowBody: { flex: 1, padding: 12, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "800", color: C.text },
  sub: { color: C.muted, fontSize: 13 },
  quick: { flexDirection: "row", gap: 16, marginTop: 2 },
  quickItem: { fontSize: 14 },
  quickLabel: { color: C.muted },
});
