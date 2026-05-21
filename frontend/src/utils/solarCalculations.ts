import type { ClassifierResult, ForecastPoint, PanelArray, TimelinePoint } from "../data/mockSolarData";
import type { ForecastPoint as BackendForecastPoint, SensorReading, WeatherPoint } from "../lib/api";

export type RuntimePanel = PanelArray & {
  efficiency: number;
  lossToday: number;
  cleaned: boolean;
  backendSensor?: SensorReading;
  sensorHistory?: SensorReading[];
  backendForecast?: BackendForecastPoint[];
  weatherRows?: WeatherPoint[];
  dataSource?: "backend-demo" | "mock";
};

export const formatRM = (value: number) => `RM ${Math.round(value).toLocaleString("en-MY")}`;

export const formatKwh = (value: number) => `${Math.round(value).toLocaleString("en-MY")} kWh`;

export const formatCompactEnergy = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} GWh`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000).toLocaleString("en-MY")} MWh`;
  return formatKwh(value);
};

export const classifyForCleanedPanel = (): ClassifierResult => ({
  type: "Normal",
  confidence: 97,
  cause: "Cleaning restored output close to the expected farm baseline.",
});

export const buildRuntimePanels = (
  panels: PanelArray[],
  cleanedIds: Set<string>,
  sensorTick: number,
): RuntimePanel[] => {
  const movement = [-1.4, 0.6, -0.7, 1.1][sensorTick % 4];

  return panels.map((panel) => {
    const cleaned = cleanedIds.has(panel.id);
    if (cleaned) {
      const restored = 94 + ((sensorTick + panel.id.charCodeAt(1)) % 4);
      return {
        ...panel,
        classifier: classifyForCleanedPanel(),
        efficiency: restored,
        lossToday: 0,
        lossThisWeek: Math.round(panel.lossThisWeek * 0.18),
        savedIfCleaned: 0,
        cleaned,
      };
    }

    const dustPenalty = panel.classifier.type === "Dust" ? -sensorTick * 0.5 : 0;
    const weatherSwing = panel.classifier.type === "Weather" ? movement * 1.2 : movement;
    const efficiency = Math.max(48, Math.min(98, Math.round(panel.baseEfficiency + dustPenalty + weatherSwing)));
    const lossToday = Math.max(0, Math.round(panel.baseLossToday * (1 + (panel.baseEfficiency - efficiency) / 100)));

    return { ...panel, efficiency, lossToday, cleaned };
  });
};

export const buildCleanedTimeline = (timeline: TimelinePoint[]): TimelinePoint[] =>
  timeline.map((point, index) => {
    const expected = point.expected;
    const actual = Math.round(expected * (0.94 + Math.min(index, 3) * 0.01));
    return {
      ...point,
      actual,
      efficiency: Math.round((actual / expected) * 100),
      revenueLoss: Math.max(0, Math.round((expected - actual) * 0.42)),
      event: index === 5 ? "Cleaned" : point.event,
    };
  });

export const buildCleanedForecast = (forecast: ForecastPoint[]): ForecastPoint[] =>
  forecast.map((point) => ({
    ...point,
    forecast: Math.round(point.expected * 0.96),
  }));

export const forecastIsDeclining = (forecast: ForecastPoint[]) =>
  forecast.length > 1 && forecast[forecast.length - 1].forecast < forecast[0].forecast;

export const getTotals = (panels: RuntimePanel[]) => {
  const lostToday = panels.reduce((sum, panel) => sum + panel.lossToday, 0);
  const lostThisWeek = panels.reduce((sum, panel) => sum + panel.lossThisWeek, 0);
  const savedIfCleaned = panels.reduce(
    (sum, panel) => sum + (panel.classifier.type === "Dust" ? panel.savedIfCleaned : 0),
    0,
  );

  return { lostToday, lostThisWeek, savedIfCleaned };
};

export const getRecommendationCopy = (panel: RuntimePanel, declining: boolean) => {
  if (panel.classifier.type === "Normal") {
    return {
      title: `${panel.name} is operating normally.`,
      action: "No cleaning action recommended. Continue monitoring output and irradiance.",
      impact: "RM 0 immediate cleaning value",
      tone: "normal",
    };
  }

  if (panel.classifier.type === "Weather") {
    return {
      title: `${panel.name} loss appears weather-related.`,
      action: "Hold cleaning dispatch. Recheck this block after irradiance returns to normal.",
      impact: `${formatRM(panel.lossThisWeek)} at risk this week, but cleaning impact is low`,
      tone: "weather",
    };
  }

  return {
    title: `${panel.name} shows soiling accumulation.`,
    action: declining
      ? "Clean now. Forecast output is still declining."
      : "Clean during the next maintenance window.",
    impact: `Estimated recovery: ${formatRM(panel.savedIfCleaned)} this week`,
    tone: "dust",
  };
};

export type MarketKey = "malaysia" | "gcc";

export type MarketProfile = {
  id: MarketKey;
  label: string;
  baseTariff: number;
  irradiance: number;
  waterSelfSupply: number;
  waterSavedPerMwMonth: number;
  note: string;
  waterNote: string;
  effWith: number[];
  effWithout: number[];
};

export const marketProfiles: Record<MarketKey, MarketProfile> = {
  malaysia: {
    id: "malaysia",
    label: "Malaysia",
    baseTariff: 0.35,
    irradiance: 4.5,
    waterSelfSupply: 0.72,
    waterSavedPerMwMonth: 1200,
    note: "Humid tropical baseline; higher rainfall supports the water loop.",
    waterNote: "Assumes 2,500mm average annual rainfall and seasonal storage.",
    effWith: [97, 94, 97, 94, 97, 94, 97, 94, 97, 94, 97, 94],
    effWithout: [98, 95.5, 93, 90.5, 88, 85.5, 83, 80.5, 78, 75.5, 73, 70.5],
  },
  gcc: {
    id: "gcc",
    label: "GCC desert",
    baseTariff: 0.42,
    irradiance: 5.8,
    waterSelfSupply: 0.18,
    waterSavedPerMwMonth: 1850,
    note: "High irradiance with heavier soiling load and lower water self-supply.",
    waterNote: "Assumes arid climate operation with imported or stored cleaning water.",
    effWith: [96, 88, 96, 88, 96, 88, 96, 88, 96, 88, 96, 88],
    effWithout: [98, 91, 84, 77, 70, 65, 65, 65, 65, 65, 65, 65],
  },
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const carbonPriceRmPerTonne = 40;
const gridEmissionFactorTonnesPerKwh = 0.000585;

export const buildMonthlyRoiData = (market: MarketProfile, farmMw: number, tariffRmPerKwh: number) => {
  const monthlyKwhPerMw = (market.irradiance * 1000 * 365) / 12;

  return months.map((month, index) => {
    const effWith = market.effWith[index];
    const effWithout = market.effWithout[index];
    const kwhWith = monthlyKwhPerMw * farmMw * (effWith / 100);
    const kwhWithout = monthlyKwhPerMw * farmMw * (effWithout / 100);
    const kwhRecovered = kwhWith - kwhWithout;
    const revenueRecovered = kwhRecovered * tariffRmPerKwh;
    const carbonCredit = kwhRecovered * gridEmissionFactorTonnesPerKwh * carbonPriceRmPerTonne;

    return {
      month,
      effWith,
      effWithout,
      revenueRecovered: Math.round(revenueRecovered),
      kwhRecovered: Math.round(kwhRecovered),
      carbonCredit: Math.round(carbonCredit),
    };
  });
};

export const calculateRoi = (
  farmMw: number,
  systemCost: number,
  market: MarketProfile = marketProfiles.malaysia,
  tariffRmPerKwh = market.baseTariff,
) => {
  const monthly = buildMonthlyRoiData(market, farmMw, tariffRmPerKwh);
  const annualSavings = monthly.reduce((sum, item) => sum + item.revenueRecovered, 0);
  const annualKwhRecovered = monthly.reduce((sum, item) => sum + item.kwhRecovered, 0);
  const annualCarbon = monthly.reduce((sum, item) => sum + item.carbonCredit, 0);
  const annualOm = farmMw * 15_000;
  const annualNet = annualSavings - annualOm;
  const payback = annualNet > 0 ? systemCost / annualNet : Number.POSITIVE_INFINITY;
  const discountRate = 0.1;
  const projectLifeYears = 7;
  const annuityFactor = (1 - (1 + discountRate) ** -projectLifeYears) / discountRate;
  const npv = annualNet * annuityFactor - systemCost;

  const cumulative = Array.from({ length: projectLifeYears + 1 }, (_, year) => ({
    year: `Yr ${year}`,
    systemCostK: Math.round(systemCost / 1000),
    cumSavingsK: year === 0 ? 0 : Math.round((annualNet * year) / 1000),
  }));

  const waterSaved = Math.round(farmMw * market.waterSavedPerMwMonth);

  return {
    annualLoss: annualSavings,
    annualSavings,
    annualKwhRecovered,
    annualCarbon,
    annualNet,
    npv,
    payback,
    monthly,
    cumulative,
    waterSaved,
    waterSelfSupply: market.waterSelfSupply,
    pitch: `For a ${farmMw} MW farm, soiled panel blocks may cost ${formatRM(
      annualSavings,
    )} per year. The cleaning system could pay back in ${Number.isFinite(payback) ? payback.toFixed(1) : "N/A"} years.`,
  };
};

export type RoiResult = ReturnType<typeof calculateRoi>;
