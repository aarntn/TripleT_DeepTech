import { useEffect, useMemo, useState, useCallback } from "react";

import { DashboardShell } from "./DashboardShell";
import type { NavItem, PageId } from "./Sidebar";
import { BusinessRoiPage } from "./pages/BusinessRoiPage";
import { OverviewPage } from "./pages/OverviewPage";
import { PanelDetailPage } from "./pages/PanelDetailPage";
import { PanelManagementPage } from "./pages/PanelManagementPage";
import { scenarios, type PanelId, type Scenario, type ScenarioId } from "../data/mockSolarData";
import { useSolarGuardData } from "../hooks/useSolarGuardData";
import { api, ROIResponse } from "../lib/api";
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
} from "../utils/solarCalculations";

const navItems: NavItem[] = [
  { id: "overview", label: "Operations Overview", section: "MONITORING", icon: "overview" },
  { id: "map-view", label: "Farm Map", section: "MONITORING", icon: "map" },
  { id: "revenue-intelligence", label: "Revenue & ROI", section: "INSIGHTS", icon: "revenue" },
];

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
  const { sensors, classification, forecasts, weather, loading, refreshing, error, source, lastUpdated, classifyArray, refresh } = 
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

  const scenario: Scenario = {
    ...scenarios[scenarioId],
    label: source === "backend" ? "Farm A live monitoring" : "Farm A (Demo Fallback)",
    summary:
      source === "backend" 
        ? "Connected to Solare API. Real-time sensor and weather telemetry driving classification."
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
  const panels = useMemo(() => {
    const basePanels = buildRuntimePanels(scenarios[scenarioId].panels, cleanedIds, sensorTick);
    if (source !== "backend") return basePanels;

    return basePanels.map(p => {
      const sensor = sensors.find(s => s.array_id === p.id);
      if (!sensor) return p;

      const classifier = classification[p.id] || p.classifier;

      return {
        ...p,
        efficiency: Math.round(sensor.efficiency_pct),
        lossToday: Math.max(0, Math.round(sensor.expected_output_kwh - sensor.actual_output_kwh)),
        classifier: {
          type: classifier.type as any,
          confidence: classifier.confidence,
          cause: classifier.cause,
        }
      };
    });
  }, [scenarioId, cleanedIds, sensorTick, sensors, classification, source]);

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
          expected: panel.forecast[0]?.expected || 600, // Fallback expected
          forecast: Math.round(f.forecast_efficiency_pct * 6), // Simplified scaling for demo
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
            <p className="mt-4 text-sm font-medium text-slate-600">Loading Solare data...</p>
          </div>
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
            onClean={cleanPanel}
          />
        );
      case "overview":
      default:
        return <OverviewPage totals={totals} panels={panels} sensorTick={sensorTick} />;
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
    >
      {page}
    </DashboardShell>
  );
}
