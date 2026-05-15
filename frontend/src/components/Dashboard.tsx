import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "./DashboardShell";
import { PageHeader } from "./PageHeader";
import type { NavItem, PageId } from "./Sidebar";
import { BusinessRoiPage } from "./pages/BusinessRoiPage";
import { PanelManagementPage } from "./pages/PanelManagementPage";
import { scenarios, type PanelId, type Scenario, type ScenarioId } from "../data/mockSolarData";
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
  { id: "panel-management", label: "Panel Management", description: "Detect, classify, clean" },
  { id: "business-roi", label: "Business & ROI", description: "Payback, IP, dataset" },
];

const pageMeta: Record<PageId, { title: string; eyebrow: string; description: string }> = {
  "panel-management": {
    title: "Panel management command center",
    eyebrow: "Operations",
    description:
      "Detect underperforming arrays, separate dust from weather, forecast loss, and trigger cleaning from one operations view.",
  },
  "business-roi": {
    title: "Business case and ROI intelligence",
    eyebrow: "Business case",
    description:
      "Model farm economics, tariff scenarios, IP water synergy, carbon credits, payback, and the transparent mock dataset.",
  },
};

export default function Dashboard() {
  const [activePage, setActivePage] = useState<PageId>("panel-management");
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSensorTick((current) => (current + 1) % 4);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setTariff(marketProfiles[marketKey].baseTariff);
  }, [marketKey]);

  const scenarioId: ScenarioId = "dusty";
  const scenario: Scenario = {
    ...scenarios[scenarioId],
    label: "Farm A live monitoring",
    summary:
      "Weather forecast input is treated as an automatic signal. Current forecast shows stable irradiance, so persistent output drops are prioritized as likely soiling unless a weather event explains them.",
  };
  const market = marketProfiles[marketKey];
  const effectiveTariff = hormuzShock ? tariff * 1.25 : tariff;
  const roi = useMemo(
    () => calculateRoi(farmMw, systemCost, market, effectiveTariff),
    [farmMw, systemCost, market, effectiveTariff],
  );

  const panels = useMemo(
    () => buildRuntimePanels(scenario.panels, cleanedIds, sensorTick),
    [scenario.panels, cleanedIds, sensorTick],
  );

  const selectedPanel = useMemo(() => {
    const panel = panels.find((item) => item.id === selectedId) ?? panels[0];
    if (!panel.cleaned) return panel;

    return {
      ...panel,
      timeline: buildCleanedTimeline(panel.timeline),
      forecast: buildCleanedForecast(panel.forecast),
    };
  }, [panels, selectedId]);

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

  const page = (() => {
    switch (activePage) {
      case "business-roi":
        return (
          <BusinessRoiPage
            farmMw={farmMw}
            marketKey={marketKey}
            tariff={tariff}
            systemCost={systemCost}
            hormuzShock={hormuzShock}
            market={market}
            effectiveTariff={effectiveTariff}
            roi={roi}
            onFarmMwChange={setFarmMw}
            onMarketKeyChange={setMarketKey}
            onTariffChange={setTariff}
            onSystemCostChange={setSystemCost}
            onHormuzShockChange={setHormuzShock}
          />
        );
      case "panel-management":
      default:
        return (
          <PanelManagementPage
            scenario={scenario}
            scenarioId={scenarioId}
            panels={panels}
            selectedPanel={selectedPanel}
            cleaningIds={cleaningIds}
            sensorTick={sensorTick}
            totals={totals}
            recommendation={recommendation}
            dirtyCount={dirtyCount}
            onSelect={(id) => setSelectedId(id as PanelId)}
            onClean={cleanPanel}
            onCleanAll={cleanAllDirtyPanels}
          />
        );
    }
  })();

  const meta = pageMeta[activePage];

  return (
    <DashboardShell
      activePage={activePage}
      navItems={navItems}
      sidebarOpen={sidebarOpen}
      onNavigate={setActivePage}
      onOpenSidebar={() => setSidebarOpen(true)}
      onCloseSidebar={() => setSidebarOpen(false)}
    >
      <PageHeader
        title={meta.title}
        eyebrow={meta.eyebrow}
        description={meta.description}
      />
      <div className="mt-6">{page}</div>
    </DashboardShell>
  );
}
