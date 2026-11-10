import { useMemo } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import type { WarningItem, WarningKind } from "../../../src/types";
import { useRootNav } from "../nav";
import { useStore } from "../store";
import { C, statusColor } from "../theme";
import { Empty } from "../ui";

const KIND_TITLE: Record<WarningKind, string> = { pond: "Chuồng", asset: "Thiết bị", trip: "Xe vận chuyển" };

export function WarningsScreen() {
  const { warnings, pins, vehicles, refreshing, refresh } = useStore();
  const nav = useRootNav();
  const sections = useMemo(
    () =>
      (["pond", "asset", "trip"] as WarningKind[])
        .map((kind) => ({ title: KIND_TITLE[kind], data: warnings.filter((w) => w.kind === kind) }))
        .filter((section) => section.data.length),
    [warnings],
  );

  /** Cảnh báo xe mở thông tin xe; cảnh báo chuồng và thiết bị mở chuồng. */
  const target = (item: WarningItem): (() => void) | null => {
    if (item.kind === "trip") {
      const vehicle = vehicles.find((v) => v.id === item.vehicle_id);
      return vehicle ? () => nav.navigate("Vehicle", { vehicleId: vehicle.id, title: vehicle.plate }) : null;
    }
    const pin = item.pond_id ? pins.find((p) => p.pond.id === item.pond_id) : undefined;
    return pin ? () => nav.navigate("Pond", { pondId: pin.pond.id, title: pin.pond.pond_name }) : null;
  };

  return (
    <SectionList
      style={st.page}
      contentContainerStyle={st.content}
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={C.brand} colors={[C.brand]} />}
      ListEmptyComponent={<Empty title="Không có cảnh báo" hint="Mọi chuồng và thiết bị đang ổn." />}
      renderSectionHeader={({ section }) => (
        <Text style={st.section}>
          {section.title} · {section.data.length}
        </Text>
      )}
      renderItem={({ item }) => {
        const tone = statusColor(item.level);
        const open = target(item);
        const canOpen = Boolean(open);
        return (
          <Pressable
            onPress={() => open?.()}
            disabled={!canOpen}
            style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]}
            accessibilityRole={canOpen ? "button" : undefined}
          >
            <View style={[st.dot, { backgroundColor: tone.fg }]} />
            <View style={{ flex: 1 }}>
              <Text style={st.title}>{item.title}</Text>
              <Text style={st.detail}>{item.detail}</Text>
            </View>
            {canOpen ? <Text style={st.chev}>›</Text> : null}
          </Pressable>
        );
      }}
    />
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  section: { color: C.muted, fontWeight: "800", marginTop: 8, marginBottom: 2, textTransform: "uppercase", fontSize: 12, letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontWeight: "800", color: C.text, fontSize: 15 },
  detail: { color: C.muted, marginTop: 2 },
  chev: { color: C.none, fontSize: 24, fontWeight: "300" },
});
