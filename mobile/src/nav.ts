import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStack = {
  Tabs: undefined;
  Pond: { pondId: string; title: string };
  Vehicle: { vehicleId: string; title: string };
};

export function useRootNav() {
  return useNavigation<NativeStackNavigationProp<RootStack>>();
}

export function clock(ts: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
