// Các khối giao diện nhỏ dùng chung.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { statusLabel } from "../../src/geo";
import type { AlertStatus } from "../../src/types";
import { C, radius, statusColor } from "./theme";

export function StatusPill({ status, label }: { status: AlertStatus; label?: string }) {
  const tone = statusColor(status);
  return (
    <View style={[s.pill, { backgroundColor: tone.bg }]}>
      <View style={[s.dot, { backgroundColor: tone.fg }]} />
      <Text style={[s.pillText, { color: tone.fg }]}>{label ?? statusLabel(status)}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={s.seg}>
      {items.map((item) => {
        const on = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[s.segItem, on && s.segOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[s.segText, on && s.segTextOn]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, kind === "ghost" && s.btnGhost, (pressed || disabled) && { opacity: 0.6 }]}
      accessibilityRole="button"
    >
      <Text style={[s.btnText, kind === "ghost" && s.btnGhostText]}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      {hint ? <Text style={s.muted}>{hint}</Text> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: C.card, borderRadius: radius, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8 },
  section: { fontSize: 15, fontWeight: "800", color: C.text },
  seg: { flexDirection: "row", backgroundColor: C.noneSoft, borderRadius: 10, padding: 3 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  segOn: { backgroundColor: C.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { color: C.muted, fontWeight: "600", fontSize: 13 },
  segTextOn: { color: C.text, fontWeight: "800" },
  btn: { backgroundColor: C.brand, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  btnGhost: { backgroundColor: C.brandSoft },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnGhostText: { color: C.brand },
  empty: { alignItems: "center", padding: 32, gap: 6 },
  emptyTitle: { fontWeight: "800", color: C.text, fontSize: 16 },
  muted: { color: C.muted },
});
