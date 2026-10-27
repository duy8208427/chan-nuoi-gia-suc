import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fallbackAlerts, fallbackParameters, fetchRealtimeMap, login } from "./api";
import { DEMO_FARM_ID, DEMO_RESIDENT, regionCatalog, UNASSIGNED_FARM_ID } from "./catalog";
import { CameraModal } from "./components/CameraModal";
import { Login } from "./components/Login";
import { WarningBar } from "./components/WarningBar";
import { buildFarmViews, buildPins, buildPlantViews, buildVehicleViews, buildWarnings, preloadPondImages } from "./geo";
import { AlertBell } from "./map/AlertBell";
import { DashboardPane } from "./map/DashboardPane";
import { DetailPanel } from "./map/DetailPanel";
import { FarmPanel } from "./map/FarmPanel";
import { FilterFab } from "./map/FilterFab";
import { HoverCard } from "./map/HoverCard";
import { MobileSheet } from "./map/MobileSheet";
import { INFO_TITLES, InfoPanel, type DashNode, type InfoNode, type InfoTopic } from "./map/InfoPanel";
import { OverviewCard } from "./map/OverviewCard";
import { PlantPanel } from "./map/PlantPanel";
import { PondMap } from "./map/PondMap";
import { TripBoard } from "./map/TripBoard";
import { VehiclePanel } from "./map/VehiclePanel";
import type { AlertRow, AlertStatus, AppRole, Device, HoverInfo, MapLayers, Measurement, Parameter, Pond, PondPin, TaskRow, WarningItem } from "./types";

const ALL_STATUSES: AlertStatus[] = ["OK", "LOW", "HIGH", "NONE"];
const ALL_LAYERS: MapLayers = { ponds: true, farms: true, routes: false, plants: false };
const ROLE_LABEL: Record<AppRole, string> = { resident: "Công nhân chuồng", farmer: "Chủ trại", admin: "Admin" };

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const onChange = () => setNarrow(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export default function App() {
  const catalog = useMemo(() => regionCatalog(), []);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("admin");
  const narrow = useNarrow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [realtime, setRealtime] = useState<Record<string, Measurement[]>>({});
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<AlertStatus[]>(ALL_STATUSES);
  const [layers, setLayers] = useState<MapLayers>(ALL_LAYERS);
  const [infoTopic, setInfoTopic] = useState<InfoTopic | null>(null);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [infoStack, setInfoStack] = useState<InfoNode[]>([]);
  const [detailDock, setDetailDock] = useState<"map" | "info" | null>(null);
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);
  const [dashStack, setDashStack] = useState<DashNode[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [province, setProvince] = useState("");
  const [farmFilter, setFarmFilter] = useState("");
  const [cameraView, setCameraView] = useState<{ pondId: string; cameraId: string; scope: "pen" | "farm" } | null>(null);
  const hideHover = useRef(0);

  const openCatalog = useCallback(async () => {
    const region = regionCatalog();
    setPonds(region.ponds);
    setDevices(region.devices);
    setParameters(fallbackParameters());
    setRealtime(region.realtime);
    setAlerts(fallbackAlerts(region.devices.map((device) => device.device_code)));
    setTasks(region.tasks);
    setLive(false);
    setReady(true);
  }, []);

  const onDemo = useCallback((nextRole: AppRole) => {
    setError("");
    setAccount(null);
    setRole(nextRole);
    void openCatalog();
  }, [openCatalog]);

  const onLogin = useCallback(
    async (username: string, password: string, nextRole: AppRole) => {
      setLoading(true);
      setError("");
      try {
        const ok = await login(username, password);
        if (!ok) {
          setError("Nhập tài khoản và mật khẩu, hoặc dùng dữ liệu đã lưu.");
          return;
        }
        await openCatalog();
        setRole(nextRole);
        setAccount(username);
      } catch {
        setError("Không mở được bản đồ. Hãy dùng dữ liệu đã lưu.");
      } finally {
        setLoading(false);
      }
    },
    [openCatalog],
  );

  const logout = useCallback(() => {
    setAccount(null);
    setLive(false);
    setReady(false);
    setError("");
    setDashStack([]);
  }, []);

  useEffect(() => {
    if (!ready) return;
    preloadPondImages();
    const timer = window.setInterval(() => {
      void fetchRealtimeMap().then(setRealtime);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (role === "admin") return;
    setLayers({ ponds: true, farms: true, routes: false, plants: false });
  }, [role]);

  const pins = useMemo(
    () =>
      buildPins(ponds, devices, realtime, {
        assets: catalog.assets,
        crops: catalog.crops,
        farms: catalog.farms,
      }),
    [ponds, devices, realtime, catalog],
  );
  const scopedPins = useMemo(() => {
    if (role === "farmer") return pins.filter((pin) => pin.farm_id === DEMO_FARM_ID);
    if (role === "resident") return pins.filter((pin) => pin.pond.resident_name === DEMO_RESIDENT);
    return pins;
  }, [pins, role]);
  const farms = useMemo(() => {
    const views = buildFarmViews(catalog.farms, scopedPins);
    if (role === "farmer") return views.filter((farm) => farm.id === DEMO_FARM_ID);
    if (role === "resident") return [];
    return views;
  }, [catalog.farms, scopedPins, role]);
  // Mở từ chuồng: chỉ thấy camera của chuồng đó. Mở từ trại: được chuyển giữa các chuồng trong trại.
  const openCamera = useCallback((pin: PondPin, cameraId?: string, scope: "pen" | "farm" = "pen") => {
    const cams = pin.assets.filter((item) => item.kind === "camera");
    const nextId = cameraId && cams.some((item) => item.id === cameraId) ? cameraId : (cams[0]?.id ?? "");
    setCameraView({ pondId: pin.pond.id, cameraId: nextId, scope });
  }, []);
  const openFarmCamera = useCallback((pin: PondPin, cameraId?: string) => openCamera(pin, cameraId, "farm"), [openCamera]);
  const cameraPin = cameraView ? (scopedPins.find((item) => item.pond.id === cameraView.pondId) ?? null) : null;
  const cameraPonds = useMemo(() => {
    if (!cameraPin) return [];
    if (cameraView?.scope !== "farm" || !cameraPin.farm_id) return [cameraPin];
    const farm = farms.find((item) => item.id === cameraPin.farm_id);
    const list = farm?.pins ?? [];
    return list.length > 1 ? list : [cameraPin];
  }, [cameraPin, cameraView?.scope, farms]);
  const vehicles = useMemo(() => {
    if (role !== "admin") return [];
    return buildVehicleViews(catalog.vehicles, catalog.trips, scopedPins, catalog.plants, catalog.routes, now);
  }, [catalog, scopedPins, now, role]);
  const plantViews = useMemo(
    () => (role === "admin" ? buildPlantViews(catalog.plants, vehicles) : []),
    [catalog.plants, vehicles, role],
  );
  const warnings = useMemo(() => buildWarnings(scopedPins, vehicles), [scopedPins, vehicles]);
  const scopedTasks = useMemo(() => {
    const ids = new Set(scopedPins.map((pin) => pin.pond.id));
    return tasks.filter((task) => ids.has(task.pond_id));
  }, [tasks, scopedPins]);
  const provinces = useMemo(() => {
    const names = new Set(scopedPins.map((pin) => pin.pond.location.trim() || "Chưa có vị trí"));
    return [...names].sort((a, b) => a.localeCompare(b, "vi"));
  }, [scopedPins]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedPins.filter((pin) => {
      if (!statusFilter.includes(pin.status)) return false;
      const place = pin.pond.location.trim() || "Chưa có vị trí";
      if (province && place !== province) return false;
      if (farmFilter === UNASSIGNED_FARM_ID && pin.farm_id) return false;
      if (farmFilter && farmFilter !== UNASSIGNED_FARM_ID && pin.farm_id !== farmFilter) return false;
      if (!q) return true;
      return `${pin.pond.pond_name} ${pin.pond.pond_code} ${pin.pond.location} ${pin.farm_name ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [scopedPins, query, statusFilter, province, farmFilter]);

  const keepHover = useCallback(() => {
    window.clearTimeout(hideHover.current);
  }, []);

  const onHover = useCallback((info: HoverInfo | null, immediate = false) => {
    window.clearTimeout(hideHover.current);
    if (info) {
      setHover(info);
      return;
    }
    if (immediate) {
      setHover(null);
      return;
    }
    hideHover.current = window.setTimeout(() => setHover(null), 80);
  }, []);

  const toggleStatus = useCallback((status: AlertStatus) => {
    setStatusFilter((current) =>
      current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
    );
  }, []);

  const applySelection = useCallback(
    (node: InfoNode | null) => {
      if (!node) {
        setSelectedId(null);
        setSelectedFarmId(null);
        setSelectedVehicleId(null);
        setSelectedPlantId(null);
        return;
      }
      if (node.kind === "pond") {
        const pin = scopedPins.find((item) => item.pond.id === node.id);
        setSelectedId(node.id);
        setSelectedFarmId(pin?.farm_id ?? null);
        setSelectedVehicleId(null);
        setSelectedPlantId(null);
        return;
      }
      if (node.kind === "farm") {
        setSelectedFarmId(node.id);
        setSelectedId(null);
        setSelectedVehicleId(null);
        setSelectedPlantId(null);
        return;
      }
      if (node.kind === "vehicle") {
        setSelectedVehicleId(node.id);
        setSelectedId(null);
        setSelectedFarmId(null);
        setSelectedPlantId(null);
        return;
      }
      setSelectedPlantId(node.id);
      setSelectedId(null);
      setSelectedFarmId(null);
      setSelectedVehicleId(null);
    },
    [scopedPins],
  );

  const selectOnMap = useCallback(
    (node: InfoNode) => {
      applySelection(node);
      setDetailDock("map");
    },
    [applySelection],
  );

  const pushInfo = useCallback(
    (node: InfoNode) => {
      setInfoStack((current) => [...current, node]);
      applySelection(node);
      setDetailDock("info");
      setInfoCollapsed(false);
    },
    [applySelection],
  );

  const popInfo = useCallback(() => {
    setInfoStack((current) => {
      const next = current.slice(0, -1);
      const leaf = next.at(-1) ?? null;
      applySelection(leaf);
      if (!leaf) setDetailDock(null);
      return next;
    });
  }, [applySelection]);

  const openDashTopic = useCallback((topic: InfoTopic) => {
    setDashStack([{ kind: "list", topic }]);
    setDashboardCollapsed(false);
  }, []);

  const pushDash = useCallback((node: InfoNode) => {
    setDashStack((current) => [...current, node]);
  }, []);

  const popDash = useCallback(() => {
    setDashStack((current) => current.slice(0, -1));
  }, []);

  const selectPond = useCallback((pondId: string) => selectOnMap({ kind: "pond", id: pondId }), [selectOnMap]);
  const selectFarm = useCallback((farmId: string) => selectOnMap({ kind: "farm", id: farmId }), [selectOnMap]);
  const selectVehicle = useCallback((vehicleId: string) => selectOnMap({ kind: "vehicle", id: vehicleId }), [selectOnMap]);
  const selectPlant = useCallback((plantId: string) => selectOnMap({ kind: "plant", id: plantId }), [selectOnMap]);

  const toggleLayer = useCallback((key: keyof MapLayers) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const openWarning = useCallback(
    (item: WarningItem) => {
      if (item.kind === "trip" && item.vehicle_id) {
        pushInfo({ kind: "vehicle", id: item.vehicle_id });
        return;
      }
      if (item.pond_id) pushInfo({ kind: "pond", id: item.pond_id });
    },
    [pushInfo],
  );

  const selected = scopedPins.find((pin) => pin.pond.id === selectedId) ?? null;
  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;
  const selectedVehicle = vehicles.find((item) => item.id === selectedVehicleId) ?? null;
  const selectedPlant = plantViews.find((item) => item.id === selectedPlantId) ?? null;
  const infoLeaf = infoStack.at(-1) ?? null;
  const infoLeafPin = infoLeaf?.kind === "pond" ? scopedPins.find((pin) => pin.pond.id === infoLeaf.id) ?? null : null;
  const infoLeafFarm = infoLeaf?.kind === "farm" ? farms.find((farm) => farm.id === infoLeaf.id) ?? null : null;
  const infoLeafVehicle =
    infoLeaf?.kind === "vehicle" ? vehicles.find((item) => item.id === infoLeaf.id) ?? null : null;
  const infoLeafPlant =
    infoLeaf?.kind === "plant" ? plantViews.find((item) => item.id === infoLeaf.id) ?? null : null;
  const infoLeafTitle = infoLeafPin
    ? infoLeafPin.pond.pond_name
    : infoLeafFarm
      ? infoLeafFarm.name
      : infoLeafVehicle
        ? infoLeafVehicle.plate
        : infoLeafPlant
          ? infoLeafPlant.name
          : infoTopic
            ? INFO_TITLES[infoTopic]
            : undefined;
  const dashLeaf = dashStack.at(-1) ?? null;
  const dashListTopic = dashLeaf?.kind === "list" ? dashLeaf.topic : dashStack[0]?.kind === "list" ? dashStack[0].topic : null;
  const dashLeafPin = dashLeaf?.kind === "pond" ? scopedPins.find((pin) => pin.pond.id === dashLeaf.id) ?? null : null;
  const dashLeafFarm = dashLeaf?.kind === "farm" ? farms.find((farm) => farm.id === dashLeaf.id) ?? null : null;
  const dashLeafVehicle =
    dashLeaf?.kind === "vehicle" ? vehicles.find((item) => item.id === dashLeaf.id) ?? null : null;
  const dashLeafPlant =
    dashLeaf?.kind === "plant" ? plantViews.find((item) => item.id === dashLeaf.id) ?? null : null;
  const dashTitle = dashLeafPin
    ? dashLeafPin.pond.pond_name
    : dashLeafFarm
      ? dashLeafFarm.name
      : dashLeafVehicle
        ? dashLeafVehicle.plate
        : dashLeafPlant
          ? dashLeafPlant.name
          : dashListTopic
            ? INFO_TITLES[dashListTopic]
            : "Tổng quan";

  const openDashWarning = useCallback(
    (item: WarningItem) => {
      if (item.kind === "trip" && item.vehicle_id) {
        pushDash({ kind: "vehicle", id: item.vehicle_id });
        return;
      }
      if (item.pond_id) pushDash({ kind: "pond", id: item.pond_id });
    },
    [pushDash],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (cameraView) {
        setCameraView(null);
        return;
      }
      if (dashStack.length) {
        popDash();
        return;
      }
      if (detailDock === "info" && infoStack.length) {
        popInfo();
        return;
      }
      if (detailDock === "map" && (selectedId || selectedVehicleId || selectedPlantId || selectedFarmId)) {
        applySelection(null);
        setDetailDock(null);
        return;
      }
      if (infoTopic && !infoCollapsed) {
        setInfoCollapsed(true);
        return;
      }
      if (infoTopic) {
        setInfoTopic(null);
        setInfoStack([]);
        return;
      }
      setSelectedFarmId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    cameraView,
    dashStack.length,
    popDash,
    detailDock,
    infoStack.length,
    popInfo,
    applySelection,
    selectedId,
    selectedVehicleId,
    selectedPlantId,
    selectedFarmId,
    infoTopic,
    infoCollapsed,
  ]);

  const sessionLabel =
    account ?? (role === "resident" ? DEMO_RESIDENT : role === "farmer" ? "Trại Vĩnh Châu" : "Dữ liệu đã lưu");
  const briefPond = role === "resident" || (narrow && role === "farmer");
  const lateVehicles = vehicles.filter((item) => item.trip?.status === "late");

  if (!ready) {
    return <Login loading={loading} error={error} onLogin={onLogin} onDemo={onDemo} />;
  }

  const farmOptions = [
    { value: "", label: "Tất cả trại" },
    ...farms.map((farm) => ({ value: farm.id, label: farm.name })),
  ];
  const provinceOptions = [
    { value: "", label: "Tất cả tỉnh" },
    ...provinces.map((name) => ({ value: name, label: name })),
  ];
  const onSearchEnter = () => {
    if (filtered[0]) selectPond(filtered[0].pond.id);
  };

  return (
    <div className="app">
      <DashboardPane
        pins={scopedPins}
        farms={farms}
        devices={scopedPins.reduce((sum, pin) => sum + pin.devices.length, 0)}
        plants={plantViews}
        vehicles={vehicles}
        collapsed={dashboardCollapsed}
        title={dashStack.length ? dashTitle : "Tổng quan"}
        onBack={dashStack.length ? popDash : undefined}
        onToggle={() => setDashboardCollapsed((current) => !current)}
        onOpen={openDashTopic}
        account={account}
        role={role}
        sessionLabel={sessionLabel}
        live={live}
        regionLocation={catalog.region.location}
        onLogout={logout}
      >
        {dashLeaf?.kind === "pond" && dashLeafPin ? (
          <DetailPanel
            pin={dashLeafPin}
            brief={briefPond}
            live={live}
            parameters={parameters}
            alerts={alerts}
            tasks={scopedTasks}
            embedded
            onClose={popDash}
            onCamera={(cameraId) => openCamera(dashLeafPin, cameraId)}
          />
        ) : dashLeaf?.kind === "farm" && dashLeafFarm ? (
          <FarmPanel
            farm={dashLeafFarm}
            tasks={scopedTasks}
            embedded
            onClose={popDash}
            onSelectPond={(pondId) => pushDash({ kind: "pond", id: pondId })}
            onOpenCamera={openFarmCamera}
          />
        ) : dashLeaf?.kind === "vehicle" && dashLeafVehicle ? (
          <VehiclePanel vehicle={dashLeafVehicle} embedded onClose={popDash} />
        ) : dashLeaf?.kind === "plant" && dashLeafPlant ? (
          <PlantPanel
            plant={dashLeafPlant}
            selectedVehicleId={selectedVehicleId}
            embedded
            onClose={popDash}
            onSelectVehicle={(vehicleId) => pushDash({ kind: "vehicle", id: vehicleId })}
          />
        ) : dashListTopic === "warnings" ? (
          <WarningBar items={warnings} onOpen={openDashWarning} stacked />
        ) : dashListTopic === "trips" ? (
          <TripBoard
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelect={(vehicleId) => pushDash({ kind: "vehicle", id: vehicleId })}
            onClose={popDash}
            compact
          />
        ) : dashListTopic === "region" ? (
          <OverviewCard
            regionName={catalog.region.name}
            farms={farms}
            pondPins={scopedPins}
            plants={plantViews}
            vehicles={vehicles}
            selectedFarmId={selectedFarmId}
            selectedVehicleId={selectedVehicleId}
            selectedPlantId={selectedPlantId}
            onSelectFarm={(farmId) => pushDash({ kind: "farm", id: farmId })}
            onSelectVehicle={(vehicleId) => pushDash({ kind: "vehicle", id: vehicleId })}
            onSelectPlant={(plantId) => pushDash({ kind: "plant", id: plantId })}
            embedded
          />
        ) : null}
      </DashboardPane>

      <div className="map-stage">
        <div className="brand map-brand">
          <span className="brand-mark" aria-hidden="true">
            <img src="/vsg-logo.png?v=2" alt="" />
          </span>
          <div>
            <strong>Chăn nuôi gia súc</strong>
            <span>
              {catalog.region.name} · {ROLE_LABEL[role]}
            </span>
          </div>
        </div>
        <AlertBell
          items={warnings}
          onOpen={(item) => {
            if (item.kind === "trip" && item.vehicle_id) {
              selectOnMap({ kind: "vehicle", id: item.vehicle_id });
              return;
            }
            if (item.pond_id) selectOnMap({ kind: "pond", id: item.pond_id });
          }}
        />
        <PondMap
          pins={filtered}
          farms={farms}
          plants={role === "admin" ? catalog.plants : []}
          vehicles={vehicles}
          layers={layers}
          selectedId={selectedId}
          selectedFarmId={selectedFarmId}
          selectedVehicleId={selectedVehicleId}
          selectedPlantId={selectedPlantId}
          onHover={onHover}
          onSelect={selectPond}
          onSelectFarm={selectFarm}
          onSelectVehicle={selectVehicle}
          onSelectPlant={selectPlant}
          onBackground={() => {
            if (detailDock !== "map") return;
            applySelection(null);
            setDetailDock(null);
          }}
        />
        {role === "resident" ? null : (
          <FilterFab
            query={query}
            onQuery={setQuery}
            onSearchEnter={onSearchEnter}
            farmFilter={farmFilter}
            farmOptions={farmOptions}
            onFarm={setFarmFilter}
            province={province}
            provinceOptions={provinceOptions}
            onProvince={setProvince}
            statusFilter={statusFilter}
            onToggleStatus={toggleStatus}
            layers={layers}
            onToggleLayer={toggleLayer}
            showLayers={role === "admin"}
          />
        )}
        {detailDock === "map" ? null : (
          <MobileSheet
            role={role}
            pins={scopedPins}
            farmName={farms[0]?.name ?? "Trại Vĩnh Châu"}
            warnings={warnings}
            lateVehicles={lateVehicles}
            onOpenPond={selectPond}
            onOpenCamera={openCamera}
            onFocus={(kind, id) => {
              if (kind === "vehicle") {
                setSelectedVehicleId(id);
                setSelectedId(null);
                return;
              }
              setSelectedId(id);
              setSelectedVehicleId(null);
            }}
          />
        )}
        {hover ? <HoverCard info={hover} onCamera={openCamera} onKeep={keepHover} /> : null}
        {detailDock === "map" && selected ? (
          <DetailPanel
            pin={selected}
            brief={briefPond}
            live={live}
            parameters={parameters}
            alerts={alerts}
            tasks={scopedTasks}
            onClose={() => {
              applySelection(null);
              setDetailDock(null);
            }}
            onBackFarm={role !== "resident" && selected.farm_id ? () => selectFarm(selected.farm_id as string) : undefined}
            onCamera={(cameraId) => openCamera(selected, cameraId)}
          />
        ) : detailDock === "map" && selectedVehicle ? (
          <VehiclePanel
            vehicle={selectedVehicle}
            onClose={() => {
              applySelection(null);
              setDetailDock(null);
            }}
          />
        ) : detailDock === "map" && selectedPlant ? (
          <PlantPanel
            plant={selectedPlant}
            selectedVehicleId={selectedVehicleId}
            onClose={() => {
              applySelection(null);
              setDetailDock(null);
            }}
            onSelectVehicle={selectVehicle}
          />
        ) : detailDock === "map" && selectedFarm ? (
          <FarmPanel
            farm={selectedFarm}
            tasks={scopedTasks}
            onClose={() => {
              applySelection(null);
              setDetailDock(null);
            }}
            onSelectPond={selectPond}
            onOpenCamera={openFarmCamera}
          />
        ) : null}
      </div>

      {infoTopic ? (
        <InfoPanel
          topic={infoTopic}
          title={infoLeafTitle}
          collapsed={infoCollapsed}
          onCollapse={() => setInfoCollapsed(true)}
          onExpand={() => setInfoCollapsed(false)}
          onBack={infoStack.length ? popInfo : undefined}
        >
          {infoLeaf?.kind === "pond" && infoLeafPin ? (
            <DetailPanel
              pin={infoLeafPin}
              brief={briefPond}
              live={live}
              parameters={parameters}
              alerts={alerts}
              tasks={scopedTasks}
              embedded
              onClose={popInfo}
              onCamera={(cameraId) => openCamera(infoLeafPin, cameraId)}
            />
          ) : infoLeaf?.kind === "farm" && infoLeafFarm ? (
            <FarmPanel
              farm={infoLeafFarm}
              tasks={scopedTasks}
              embedded
              onClose={popInfo}
              onSelectPond={(pondId) => pushInfo({ kind: "pond", id: pondId })}
              onOpenCamera={openFarmCamera}
            />
          ) : infoLeaf?.kind === "vehicle" && infoLeafVehicle ? (
            <VehiclePanel vehicle={infoLeafVehicle} embedded onClose={popInfo} />
          ) : infoLeaf?.kind === "plant" && infoLeafPlant ? (
            <PlantPanel
              plant={infoLeafPlant}
              selectedVehicleId={selectedVehicleId}
              embedded
              onClose={popInfo}
              onSelectVehicle={(vehicleId) => pushInfo({ kind: "vehicle", id: vehicleId })}
            />
          ) : (
            <>
              {infoTopic === "warnings" ? <WarningBar items={warnings} onOpen={openWarning} stacked /> : null}
              {infoTopic === "trips" ? (
                <TripBoard
                  vehicles={vehicles}
                  selectedVehicleId={selectedVehicleId}
                  onSelect={(vehicleId) => pushInfo({ kind: "vehicle", id: vehicleId })}
                  onClose={() => setInfoCollapsed(true)}
                  compact
                />
              ) : null}
              {infoTopic === "region" ? (
                <OverviewCard
                  regionName={catalog.region.name}
                  farms={farms}
                  pondPins={scopedPins}
                  plants={plantViews}
                  vehicles={vehicles}
                  selectedFarmId={selectedFarmId}
                  selectedVehicleId={selectedVehicleId}
                  selectedPlantId={selectedPlantId}
                  onSelectFarm={(farmId) => pushInfo({ kind: "farm", id: farmId })}
                  onSelectVehicle={(vehicleId) => pushInfo({ kind: "vehicle", id: vehicleId })}
                  onSelectPlant={(plantId) => pushInfo({ kind: "plant", id: plantId })}
                  embedded
                />
              ) : null}
            </>
          )}
        </InfoPanel>
      ) : null}

      {cameraPin && cameraView ? (
        <CameraModal
          pin={cameraPin}
          ponds={cameraPonds}
          cameraId={cameraView.cameraId}
          onSelectPond={(pondId) => {
            const next = cameraPonds.find((item) => item.pond.id === pondId);
            if (next) openFarmCamera(next);
          }}
          onSelectCamera={(cameraId) => setCameraView((current) => (current ? { ...current, cameraId } : current))}
          onClose={() => setCameraView(null)}
        />
      ) : null}
    </div>
  );
}
