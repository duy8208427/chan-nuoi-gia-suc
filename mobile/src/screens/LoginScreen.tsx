import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppRole } from "../../../src/types";
import { ROLE_LABEL, useStore } from "../store";
import { C } from "../theme";
import { Segmented } from "../ui";

/** Nhãn ngắn cho ô chọn vai trò để không bị cắt chữ trên điện thoại hẹp. */
const ROLES = (Object.keys(ROLE_LABEL) as AppRole[]).map((value) => ({
  value,
  label: value === "resident" ? "Công nhân" : ROLE_LABEL[value],
}));

export function LoginScreen() {
  const { signIn, openSaved, prefs } = useStore();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState(prefs.username);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>(prefs.role);
  const [busy, setBusy] = useState<"login" | "saved" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setUsername((current) => current || prefs.username);
    setRole(prefs.role);
  }, [prefs]);

  const run = async (kind: "login" | "saved") => {
    setBusy(kind);
    setError("");
    try {
      if (kind === "login") await signIn(username.trim(), password, role);
      else await openSaved(role);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không mở được dữ liệu.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView style={st.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[st.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={st.brand}>Chăn nuôi gia súc</Text>
        <Text style={st.sub}>Visual Sense Group · giám sát chuồng trại</Text>

        <View style={st.card}>
          <Text style={st.label}>Tài khoản</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            placeholder="Username"
            placeholderTextColor={C.none}
            style={st.input}
            returnKeyType="next"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            placeholder="Mật khẩu"
            placeholderTextColor={C.none}
            style={st.input}
            returnKeyType="go"
            onSubmitEditing={() => void run("login")}
          />

          <Text style={[st.label, { marginTop: 6 }]}>Xem với vai trò</Text>
          <Segmented items={ROLES} value={role} onChange={setRole} />

          {error ? <Text style={st.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [st.primary, (pressed || busy) && { opacity: 0.7 }]}
            disabled={Boolean(busy)}
            onPress={() => void run("login")}
            accessibilityRole="button"
          >
            {busy === "login" ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryText}>Đăng nhập</Text>}
          </Pressable>
          <Pressable
            style={({ pressed }) => [st.ghost, (pressed || busy) && { opacity: 0.7 }]}
            disabled={Boolean(busy)}
            onPress={() => void run("saved")}
            accessibilityRole="button"
          >
            {busy === "saved" ? <ActivityIndicator color={C.brand} /> : <Text style={st.ghostText}>Xem dữ liệu đã lưu</Text>}
          </Pressable>
        </View>
        <Text style={st.foot}>Bản demo dùng dữ liệu mẫu · mật khẩu không được lưu trên điện thoại.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.brandDark },
  scroll: { paddingHorizontal: 20, gap: 6 },
  brand: { color: "#fff", fontSize: 32, fontWeight: "900", textAlign: "center" },
  sub: { color: "#a7c4b2", textAlign: "center", marginBottom: 24 },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 18, gap: 10 },
  label: { fontWeight: "700", color: C.text },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#f8faf8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
    color: C.text,
  },
  error: { backgroundColor: C.highSoft, color: C.high, padding: 10, borderRadius: 10 },
  primary: { backgroundColor: C.brand, borderRadius: 12, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 6 },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ghost: { backgroundColor: C.brandSoft, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  ghostText: { color: C.brand, fontWeight: "800", fontSize: 15 },
  foot: { color: "#a7c4b2", textAlign: "center", marginTop: 16, fontSize: 12 },
});
