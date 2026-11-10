import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStack } from "./src/nav";
import { AccountScreen } from "./src/screens/AccountScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { PenDetailScreen } from "./src/screens/PenDetailScreen";
import { PensScreen } from "./src/screens/PensScreen";
import { VehicleScreen } from "./src/screens/VehicleScreen";
import { WarningsScreen } from "./src/screens/WarningsScreen";
import { StoreProvider, useStore } from "./src/store";
import { C } from "./src/theme";

const Stack = createNativeStackNavigator<RootStack>();
const Tab = createBottomTabNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: C.brand, background: C.bg, card: C.card, text: C.text, border: C.line },
};

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Icon tab: tab đang chọn có nền xanh nhạt dạng viên thuốc và icon đặc để dễ nhận ra. */
function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: string }) {
  const icon = (focused ? name.replace("-outline", "") : name) as IconName;
  return (
    <View style={[tab.pill, focused && tab.pillOn]}>
      <Ionicons name={icon} color={color} size={22} />
    </View>
  );
}

const tab = StyleSheet.create({
  pill: { width: 56, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: C.brandSoft },
});

function Tabs() {
  const { warnings } = useStore();
  const high = warnings.filter((w) => w.level === "HIGH").length;
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontWeight: "700" },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tab.Screen
        name="Pens"
        component={PensScreen}
        options={{
          title: "Chăn nuôi",
          tabBarLabel: "Chuồng",
          tabBarIcon: ({ color, focused }) => <TabIcon name="home-outline" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Warnings"
        component={WarningsScreen}
        options={{
          title: "Cảnh báo",
          tabBarBadge: high ? high : undefined,
          tabBarBadgeStyle: { backgroundColor: C.high },
          tabBarIcon: ({ color, focused }) => <TabIcon name="warning-outline" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, focused }) => <TabIcon name="person-circle-outline" color={color} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { session } = useStore();
  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    );
  }
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerTitleStyle: { fontWeight: "800" }, headerTintColor: C.brand, headerBackTitle: "Quay lại" }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Pond" component={PenDetailScreen} options={({ route }) => ({ title: route.params.title })} />
        <Stack.Screen name="Vehicle" component={VehicleScreen} options={({ route }) => ({ title: `Xe ${route.params.title}` })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
