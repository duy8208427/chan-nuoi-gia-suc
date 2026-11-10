import { ScrollView, StyleSheet, Text, View } from "react-native";
import appJson from "../../app.json";
import { clock } from "../nav";
import { ROLE_LABEL, useStore } from "../store";
import { C } from "../theme";
import { Button, Card } from "../ui";

export function AccountScreen() {
  const { session, pins, updatedAt, refresh, refreshing, signOut } = useStore();
  if (!session) return null;

  const rows: [string, string][] = [
    ["Tài khoản", session.account ?? "Không đăng nhập"],
    ["Vai trò", ROLE_LABEL[session.role]],
    ["Nguồn dữ liệu", "Dữ liệu mẫu trong app"],
    ["Số chuồng", String(pins.length)],
    ["Cập nhật lúc", clock(updatedAt)],
  ];

  return (
    <ScrollView style={st.page} contentContainerStyle={st.content}>
      <Card style={{ paddingVertical: 4 }}>
        {rows.map(([label, value], i) => (
          <View key={label} style={[st.row, i > 0 && st.rowLine]}>
            <Text style={st.label}>{label}</Text>
            <Text style={st.value}>{value}</Text>
          </View>
        ))}
      </Card>

      <Button label={refreshing ? "Đang làm mới…" : "Làm mới dữ liệu"} kind="ghost" disabled={refreshing} onPress={() => void refresh()} />
      <Button label={session.account ? "Đăng xuất" : "Đăng nhập tài khoản"} onPress={signOut} />

      <Text style={st.foot}>
        Chăn nuôi gia súc {appJson.expo.version} · Bản demo, số liệu lấy từ dữ liệu mẫu của trại.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 12 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  label: { color: C.muted },
  value: { color: C.text, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  foot: { color: C.muted, fontSize: 12, textAlign: "center", marginTop: 8 },
});
