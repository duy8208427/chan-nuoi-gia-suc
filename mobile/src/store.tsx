// Trạng thái dữ liệu của app: cùng nguồn dữ liệu và cách lọc theo vai trò với src/App.tsx của bản web.
// Bản web hiện là bản demo (src/api.ts không gọi máy chủ), nên mobile cũng đọc thẳng catalog + data/*.json.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fallbackAlerts, fallbackParameters, login } from "../../src/api";
import { DEMO_FARM_ID, DEMO_RESIDENT, regionCatalog } from "../../src/catalog";
import { buildPins, buildVehicleViews, buildWarnings } from "../../src/geo";
import type { AlertRow, AppRole, Parameter, Plant, PondPin, TaskRow, VehicleView, WarningItem } from "../../src/types";

const PREFS_KEY = "channuoi.prefs";

export const ROLE_LABEL: Record<AppRole, string> = { resident: "Công nhân chuồng", farmer: "Chủ trại", admin: "Admin" };

type Session = { account: string | null; role: AppRole };

export type Prefs = { username: string; role: AppRole };

type Store = {
  session: Session | null;
  pins: PondPin[];
  vehicles: VehicleView[];
  plants: Plant[];
  warnings: WarningItem[];
  parameters: Parameter[];
  alerts: AlertRow[];
  tasks: TaskRow[];
  updatedAt: number | null;
  refreshing: boolean;
  prefs: Prefs;
  signIn: (username: string, password: string, role: AppRole) => Promise<void>;
  openSaved: (role: AppRole) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const region = useMemo(() => regionCatalog(), []);
  const parameters = useMemo(() => fallbackParameters(), []);
  const alerts = useMemo(() => fallbackAlerts(region.devices.map((d) => d.device_code)), [region]);
  const [session, setSession] = useState<Session | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ username: "", role: "resident" });

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (raw) setPrefs((current) => ({ ...current, ...(JSON.parse(raw) as Partial<Prefs>) }));
      })
      .catch(() => undefined);
  }, []);

  const savePrefs = useCallback((next: Prefs) => {
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const signIn = useCallback(
    async (username: string, password: string, role: AppRole) => {
      const ok = await login(username, password);
      if (!ok) throw new Error("Nhập tài khoản và mật khẩu, hoặc dùng dữ liệu đã lưu.");
      savePrefs({ username, role });
      setSession({ account: username, role });
      setUpdatedAt(Date.now());
    },
    [savePrefs],
  );

  const openSaved = useCallback(
    async (role: AppRole) => {
      savePrefs({ ...prefs, role });
      setSession({ account: null, role });
      setUpdatedAt(Date.now());
    },
    [prefs, savePrefs],
  );

  /** Dữ liệu demo không đổi; làm mới chỉ cập nhật mốc thời gian và vị trí xe. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setUpdatedAt(Date.now());
    setTimeout(() => setRefreshing(false), 300);
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    setUpdatedAt(null);
  }, []);

  const pins = useMemo(() => {
    if (!session) return [];
    const all = buildPins(region.ponds, region.devices, region.realtime, {
      assets: region.assets,
      crops: region.crops,
      farms: region.farms,
    });
    if (session.role === "farmer") return all.filter((pin) => pin.farm_id === DEMO_FARM_ID);
    if (session.role === "resident") return all.filter((pin) => pin.pond.resident_name === DEMO_RESIDENT);
    return all;
  }, [session, region]);

  /** Xe chở heo, bò và bồn sữa chỉ dành cho Admin, giống bản web. */
  const vehicles = useMemo(() => {
    if (session?.role !== "admin") return [];
    return buildVehicleViews(region.vehicles, region.trips, pins, region.plants, region.routes, updatedAt ?? Date.now());
  }, [pins, session, region, updatedAt]);

  const warnings = useMemo(() => (session ? buildWarnings(pins, vehicles) : []), [pins, vehicles, session]);

  const value = useMemo<Store>(
    () => ({
      session,
      pins,
      vehicles,
      plants: region.plants,
      warnings,
      parameters,
      alerts,
      tasks: region.tasks,
      updatedAt,
      refreshing,
      prefs,
      signIn,
      openSaved,
      refresh,
      signOut,
    }),
    [session, pins, vehicles, region, warnings, parameters, alerts, updatedAt, refreshing, prefs, signIn, openSaved, refresh, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore phải nằm trong StoreProvider");
  return store;
}
