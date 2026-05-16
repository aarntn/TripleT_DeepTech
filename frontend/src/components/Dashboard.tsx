import { useEffect, useMemo, useState, useCallback } from "react";

import { DashboardShell } from "./DashboardShell";
import type { NavItem, PageId } from "./Sidebar";
import { BusinessRoiPage } from "./pages/BusinessRoiPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PanelDetailPage } from "./pages/PanelDetailPage";
import { PanelManagementPage } from "./pages/PanelManagementPage";
import { scenarios, type PanelId, type Scenario, type ScenarioId } from "../data/mockSolarData";
import { useSolarGuardData } from "../hooks/useSolarGuardData";
import { api, ROIResponse, SensorReading } from "../lib/api";
import {
  buildCleanedForecast,
  buildCleanedTimeline,
  buildRuntimePanels,
  calculateRoi,
  forecastIsDeclining,
  getRecommendationCopy,
  getTotals,
  marketProfiles,
  type MarketKey,
  type RuntimePanel,
} from "../utils/solarCalculations";

const navItems: NavItem[] = [
  { id: "overview", label: "Operations Overview", section: "MONITORING", icon: "overview" },
  { id: "map-view", label: "Farm Map", section: "MONITORING", icon: "map" },
  { id: "revenue-intelligence", label: "Revenue & ROI", section: "INSIGHTS", icon: "revenue" },
];

const formatSensorDay = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString("en-MY", { month: "short", day: "numeric" });
};

const isStaleTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > 1000 * 60 * 60 * 24 * 7;
};

const sensorHistoryToTimeline = (history: SensorReading[]) => {
  const grouped = history.reduce<Record<string, SensorReading[]>>((groups, row) => {
    const dateKey = row.timestamp.slice(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(row);
    return groups;
  }, {});

  return Object.values(grouped).slice(-7).map((rows) => {
    const actual = rows.reduce((sum, row) => sum + row.actual_output_kwh, 0);
    const expected = rows.reduce((sum, row) => sum + row.expected_output_kwh, 0);
    const irradiance = rows.reduce((sum, row) => sum + row.irradiance_kwh_m2, 0);
    const hasRain = rows.some((row) => row.rain_event || row.rainfall_mm > 0);
    const avgCloud = rows.reduce((sum, row) => sum + row.cloud_cover_pct, 0) / rows.length;

    return {
      day: formatSensorDay(rows[0].timestamp),
      expected: Math.round(expected),
      actual: Math.round(actual),
      efficiency: expected > 0 ? Math.round((actual / expected) * 100) : Math.round(rows[rows.length - 1].efficiency_pct),
      weather: hasRain ? "Rain" : avgCloud > 60 ? "Cloudy" : "Clear",
      irradiance: Number(irradiance.toFixed(2)),
      revenueLoss: Math.max(0, Math.round((expected - actual) * 0.42)),
      event: rows.some((row) => row.dust_flag === 1) ? "Soiling signal" : hasRain ? "Rain event" : undefined,
    };
  });
};

export default function Dashboard() {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<PanelId>("A1");
  const [sensorTick, setSensorTick] = useState(0);
  const [cleanedIds, setCleanedIds] = useState<Set<string>>(new Set());
  const [cleaningIds, setCleaningIds] = useState<Set<string>>(new Set());
  const [farmMw, setFarmMw] = useState(5);
  const [marketKey, setMarketKey] = useState<MarketKey>("malaysia");
  const [tariff, setTariff] = useState(marketProfiles.malaysia.baseTariff);
  const [systemCost, setSystemCost] = useState(600_000);
  const [hormuzShock, setHormuzShock] = useState(false);
  const [hormuzMultiplier, setHormuzMultiplier] = useState(1.25);

  const scenarioId: ScenarioId = "dusty";
  const { sensors, classification, forecasts, weather, histories, loading, refreshing, error, source, lastUpdated, refresh } = 
    useSolarGuardData(scenarioId, selectedId);

  const [backendRoi, setBackendRoi] = useState<ROIResponse | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSensorTick((current) => (current + 1) % 4);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setTariff(marketProfiles[marketKey].baseTariff);
  }, [marketKey]);

  // Load Hormuz multiplier and potentially locations from backend
  useEffect(() => {
    if (source === "backend") {
      api.getHormuz().then(res => setHormuzMultiplier(res.tariff_multiplier)).catch(console.error);
    }
  }, [source]);

  const fetchRoi = useCallback(async () => {
    if (source !== "backend") return;
    try {
      const result = await api.calculateROI({
        mw: farmMw,
        location: marketKey,
        tariff_rm_per_kwh: tariff,
        hormuz: hormuzShock,
      });
      setBackendRoi(result);
      // Sync system cost from backend
      setSystemCost(result.system_cost_rm);
    } catch (err) {
      console.error("ROI calculation failed:", err);
    }
  }, [farmMw, marketKey, tariff, hormuzShock, source]);

  useEffect(() => {
    fetchRoi();
  }, [fetchRoi]);

  const sortedSensorTimestamps = sensors
    .map((sensor) => sensor.timestamp)
    .sort();
  const latestSensorTimestamp = sortedSensorTimestamps[sortedSensorTimestamps.length - 1];
  const staleBackendData = source === "backend" && isStaleTimestamp(latestSensorTimestamp);

  const scenario: Scenario = {
    ...scenarios[scenarioId],
    label: source === "backend" ? "Farm A backend demo monitoring" : "Farm A (Demo Fallback)",
    summary:
      source === "backend" 
        ? "Connected to SolarGuard API. Demo CSV sensor rows are driving classification."
        : "Weather forecast input is treated as an automatic signal. Current forecast shows stable irradiance, so persistent output drops are prioritized as likely soiling unless a weather event explains them.",
  };
  
  const market = marketProfiles[marketKey];
  const effectiveTariff = hormuzShock ? tariff * hormuzMultiplier : tariff;
  
  const roi = useMemo(() => {
    if (source === "backend" && backendRoi) {
      return {
        annualLoss: backendRoi.annual_revenue_rm,
        annualSavings: backendRoi.annual_revenue_rm,
        annualKwhRecovered: backendRoi.annual_kwh_recovered,
        annualCarbon: backendRoi.annual_carbon_rm,
        annualNet: backendRoi.annual_net_rm,
        npv: backendRoi.npv_rm,
        payback: backendRoi.payback_years,
        systemCost: backendRoi.system_cost_rm, // Added explicitly
        monthly: backendRoi.monthly.map((m: any) => ({
          month: m.month,
          effWith: m.eff_with,
          effWithout: m.eff_without,
          revenueRecovered: m.rm_recovered,
          kwhRecovered: m.kwh_recovered,
          carbonCredit: m.carbon_value_rm,
        })),
        cumulative: backendRoi.cumulative.map((c: any) => ({
          year: c.year,
          systemCostK: c.system_cost_k,
          cumSavingsK: c.cum_savings_k,
        })),
        waterSaved: Math.round(farmMw * market.waterSavedPerMwMonth),
        waterSelfSupply: market.waterSelfSupply,
        pitch: `For a ${farmMw} MW farm, dirty panels may cost RM ${backendRoi.annual_revenue_rm.toLocaleString()} per year. Installing the UM cleaning system could pay back in ${backendRoi.payback_years.toFixed(1)} years.`
      };
    }
    const baseRoi = calculateRoi(farmMw, systemCost, market, effectiveTariff);
    return { ...baseRoi, systemCost }; // Ensure systemCost is present
  }, [farmMw, systemCost, market, effectiveTariff, source, backendRoi, hormuzMultiplier]);

  // Adapt backend sensors to panels if available
  const panels = useMemo<RuntimePanel[]>(() => {
    const basePanels = buildRuntimePanels(scenarios[scenarioId].panels, cleanedIds, sensorTick);
    if (source !== "backend") return basePanels;

    return basePanels.map(p => {
      const sensor = sensors.find(s => s.array_id === p.id);
      if (!sensor) return p;

      const classifier = classification[p.id] || p.classifier;
      const sensorHistory = histories[p.id] || [];
      const backendTimeline = sensorHistoryToTimeline(sensorHistory);

      return {
        ...p,
        efficiency: Math.round(sensor.efficiency_pct),
        lossToday: Math.max(0, Math.round(sensor.expected_output_kwh - sensor.actual_output_kwh)),
        lossThisWeek: backendTimeline.reduce((sum, point) => sum + point.revenueLoss, 0),
        savedIfCleaned: sensor.dust_flag === 1 ? Math.max(0, Math.round((sensor.expected_output_kwh - sensor.actual_output_kwh) * 0.42)) : 0,
        timeline: backendTimeline.length ? backendTimeline : p.timeline,
        classifier: {
          type: classifier.type as any,
          confidence: classifier.confidence,
          cause: classifier.cause,
        },
        backendSensor: sensor,
        sensorHistory,
        backendForecast: forecasts[p.id],
        weatherRows: weather[p.id],
        dataSource: "backend-demo",
      };
    });
  }, [scenarioId, cleanedIds, sensorTick, sensors, classification, histories, forecasts, weather, source]);

  const selectedPanel = useMemo(() => {
    const panel = panels.find((item) => item.id === selectedId) ?? panels[0];
    
    // Inject backend forecast and weather if available
    const backendForecast = forecasts[selectedId];
    const backendWeather = weather[selectedId];

    let adaptedPanel = { ...panel };

    if (source === "backend" && backendForecast) {
      adaptedPanel.forecast = backendForecast.map((f, i) => {
        // Find matching weather if available
        const w = backendWeather?.[i];
        let weatherLabel = "Forecast";
        if (w) {
          if (w.rainfall_mm > 0.5) weatherLabel = "Rain";
          else if (w.cloud_cover_pct > 60) weatherLabel = "Cloudy";
          else weatherLabel = "Clear";
        }

        return {
          day: f.date,
          expected: Math.round(f.upper_bound),
          forecast: Math.round(f.forecast_efficiency_pct),
          lowerBound: f.lower_bound,
          upperBound: f.upper_bound,
          revenue: f.forecast_revenue_rm,
          weather: weatherLabel
        } as any;
      });
    }

    if (!panel.cleaned) return adaptedPanel;

    return {
      ...adaptedPanel,
      timeline: buildCleanedTimeline(panel.timeline),
      forecast: buildCleanedForecast(adaptedPanel.forecast),
    };
  }, [panels, selectedId, forecasts, weather, source]);

  const totals = useMemo(() => getTotals(panels), [panels]);
  const dirtyCount = panels.filter((panel) => panel.classifier.type === "Dust" && panel.efficiency < 91).length;
  const decliningForecast = forecastIsDeclining(selectedPanel.forecast);
  const recommendation = getRecommendationCopy(selectedPanel, decliningForecast);

  const cleanPanel = (id: string) => {
    setSelectedId(id as PanelId);
    setCleaningIds((current) => new Set(current).add(id));

    window.setTimeout(() => {
      setCleanedIds((current) => new Set(current).add(id));
      setCleaningIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, 850);
  };

  const cleanAllDirtyPanels = () => {
    panels
      .filter((panel) => panel.classifier.type === "Dust" && panel.efficiency < 91)
      .forEach((panel, index) => {
        window.setTimeout(() => cleanPanel(panel.id), index * 120);
      });
  };

  const openPanelDetail = (id: string) => {
    setSelectedId(id as PanelId);
    setActivePage("panel-detail");
  };

  const page = (() => {
    if (loading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-sm font-medium text-slate-600">Loading SolarGuard data...</p>
          </div>
        </div>
      );
    }

    if (source === "error") {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
          <p className="text-sm font-semibold">Backend connection failed</p>
          <p className="mt-2 text-sm">{error ?? "Protected backend endpoints are unavailable."}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          >
            Retry backend
          </button>
        </div>
      );
    }

    switch (activePage) {
      case "revenue-intelligence":
        return (
          <BusinessRoiPage
            farmMw={farmMw}
            marketKey={marketKey}
            tariff={tariff}
            systemCost={systemCost}
            hormuzShock={hormuzShock}
            market={market}
            effectiveTariff={effectiveTariff}
            roi={roi as any}
            onFarmMwChange={setFarmMw}
            onMarketKeyChange={setMarketKey}
            onTariffChange={setTariff}
            onSystemCostChange={setSystemCost}
            onHormuzShockChange={setHormuzShock}
            dataSource={source}
          />
        );
      case "panel-detail":
        return (
          <PanelDetailPage
            panel={selectedPanel}
            sensorTick={sensorTick}
            onBack={() => setActivePage("map-view")}
          />
        );
      case "map-view":
        return (
          <PanelManagementPage
            panels={panels}
            cleaningIds={cleaningIds}
            scenarioId={scenarioId}
            selectedId={selectedId}
            onPanelSelected={(id) => setSelectedId(id as PanelId)}
            onClean={cleanPanel}
          />
        );
      case "overview":
      default:
        return <OverviewPage totals={totals} panels={panels} />;
    }
  })();

  return (
    <DashboardShell
      activePage={activePage}
      navItems={navItems}
      sidebarOpen={sidebarOpen}
      fullHeight={activePage === "map-view"}
      onNavigate={setActivePage}
      onOpenSidebar={() => setSidebarOpen(true)}
      onCloseSidebar={() => setSidebarOpen(false)}
      dataSource={source}
      status={{
        source,
        error,
        lastUpdated,
        refreshing,
        staleBackendData,
        latestSensorTimestamp,
        weatherUnavailable: source === "backend" && (weather[selectedId]?.length ?? 0) === 0,
        onRefresh: refresh,
      }}
    >
      {page}
    </DashboardShell>
  );
}
