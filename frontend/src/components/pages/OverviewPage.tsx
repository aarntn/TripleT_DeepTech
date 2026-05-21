import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { sensorSamples } from "../../data/mockSolarData";
import { useClassifierPerformance } from "../../hooks/useClassifierPerformance";
import { formatCompactEnergy, formatRM, type RuntimePanel } from "../../utils/solarCalculations";
import { ModelPerformanceCard } from "../ModelPerformanceCard";

type OverviewPageProps = {
  totals: {
    lostToday: number;
    lostThisWeek: number;
    savedIfCleaned: number;
  };
  panels: RuntimePanel[];
  sensorTick: number;
};

const panelRatedKw = 40;
const gridEmissionFactorTonnesPerKwh = 0.000585;

const formatDeltaPercent = (actual: number, expected: number) => {
  if (!expected) return "0%";
  const delta = ((actual - expected) / expected) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
};

const formatTonnes = (value: number) => `${value.toFixed(value >= 10 ? 0 : 1)} t`;

const formatKw = (value: number) => value.toLocaleString("en-MY", { maximumFractionDigits: 1 });

function OverviewIcon({ type }: { type: string }) {
  if (type === "money") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 20 20">
        <path d="M10 17.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5Zm1.9-9.5c-.28-.68-.94-1.12-1.9-1.12-1.1 0-1.95.6-1.95 1.48 0 2.08 4.05.84 4.05 3.05 0 .88-.85 1.48-1.95 1.48-1.04 0-1.77-.48-2.06-1.23M10 5.5v9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "weather") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 20 20">
        <path d="M10 3v1.5m0 11V17m7-7h-1.5m-11 0H3m11.95-4.95-1.06 1.06M6.1 13.9l-1.05 1.05m9.9 0-1.06-1.05M6.1 6.1 5.05 5.05M13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "power") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 20 20">
        <path d="m13.75 3.75-7.5 8h4l-1.25 4.5 5.75-7h-4l3-5.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "plug") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 20 20">
        <path d="M7.5 2.75v4m5-4v4M6.25 6.75h7.5v2.5a3.75 3.75 0 0 1-7.5 0v-2.5Zm3.75 6.25v4.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "rate") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 20 20">
        <path d="M10 16.25a6.25 6.25 0 1 0 0-12.5 6.25 6.25 0 0 0 0 12.5Zm0-9v3.25l2.25 1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "active") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 20 20">
        <path d="M7.5 10.25 9.25 12l3.5-4M10 17.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg className="size-5" fill="none" viewBox="0 0 20 20">
      <path d="M4.25 13.75h11.5M5.75 6.25h8.5l1.5 7.5h-11.5l1.5-7.5Zm2.25 0v7.5m4-7.5v7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

type OverviewMetric = {
  label: string;
  value: string;
  unit?: string;
  helper: string;
  icon: string;
  tone?: "default" | "loss" | "gain" | "warning";
};

type ChartTone = "up" | "down" | "neutral";

function MetricItem({ metric }: { metric: OverviewMetric }) {
  const valueClass =
    metric.tone === "loss"
      ? "text-[#b42318]"
      : metric.tone === "gain"
        ? "text-[#067647]"
        : metric.tone === "warning"
          ? "text-[#dc6803]"
          : "text-[#181d27]";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#e9eaeb] bg-[#fdfdfd] shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
      <div className="flex items-center gap-2.5 px-5 py-3">
        <span className="text-[#181d27]">
          <OverviewIcon type={metric.icon} />
        </span>
        <p className="text-sm font-medium leading-5 text-[#181d27]">{metric.label}</p>
      </div>
      <div className="flex flex-1 flex-col rounded-xl border border-[#e9eaeb] bg-white p-5 shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
        <p className={`flex items-end gap-2 font-semibold tracking-normal ${valueClass}`}>
          <span className="text-[30px] leading-[38px]">{metric.value}</span>
          {metric.unit ? <span className="pb-1 text-sm font-medium text-[#535862]">{metric.unit}</span> : null}
        </p>
        <p className="mt-2 text-sm font-normal leading-5 text-[#535862]">{metric.helper}</p>
      </div>
    </article>
  );
}

function ChangeBadge({ tone, value }: { tone: "up" | "down" | "neutral"; value: string }) {
  if (tone === "neutral") {
    return (
      <span className="inline-flex items-center rounded-md border border-[#d5d7da] bg-[#fafafa] px-1.5 py-0.5 text-sm font-medium text-[#535862]">
        {value}
      </span>
    );
  }

  const up = tone === "up";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-sm font-medium ${
        up ? "border-[#abefc6] bg-[#ecfdf3] text-[#067647]" : "border-[#fecdca] bg-[#fef3f2] text-[#b42318]"
      }`}
    >
      <span>{up ? "↗" : "↘"}</span>
      {value}
    </span>
  );
}

export function OverviewPage({ totals, panels, sensorTick }: OverviewPageProps) {
  const { data: classifierData, source: classifierSource, retro: classifierRetro } = useClassifierPerformance();
  const sensorSample = sensorSamples[sensorTick % sensorSamples.length];
  const productionData =
    panels[0]?.timeline.map((point, index) => ({
      day: point.day,
      actual: panels.reduce((sum, panel) => sum + (panel.timeline[index]?.actual ?? 0), 0),
      expected: panels.reduce((sum, panel) => sum + (panel.timeline[index]?.expected ?? 0), 0),
    })) ?? [];
  const latestProduction = productionData[productionData.length - 1] ?? { actual: 0, expected: 0 };
  const peakProduction = productionData.reduce((peak, point) => Math.max(peak, point.actual), 0);
  const productionGap = latestProduction.actual - latestProduction.expected;
  const co2Avoided = latestProduction.actual * gridEmissionFactorTonnesPerKwh;
  const currentFarmOutput = panels.reduce((sum, panel) => sum + (panel.efficiency / 100) * panelRatedKw, 0);
  const expectedFarmOutput = panels.length * panelRatedKw;
  const weatherAdjustedEfficiency = latestProduction.expected
    ? Math.round((latestProduction.actual / latestProduction.expected) * 100)
    : 0;
  const needsCleaningCount = panels.filter((panel) => panel.classifier.type === "Dust" && panel.efficiency < 91).length;

  const chartStats: Array<{ label: string; value: string; change: string; tone: ChartTone }> = [
    {
      label: "Latest Generation",
      value: formatCompactEnergy(latestProduction.actual),
      change: formatDeltaPercent(latestProduction.actual, latestProduction.expected),
      tone: latestProduction.actual >= latestProduction.expected ? "up" : "down",
    },
    {
      label: "Weather-Adjusted Target",
      value: formatCompactEnergy(latestProduction.expected),
      change: "baseline",
      tone: "neutral" as const,
    },
    {
      label: "Production Gap",
      value: formatCompactEnergy(productionGap),
      change: formatDeltaPercent(latestProduction.actual, latestProduction.expected),
      tone: productionGap >= 0 ? "up" : "down",
    },
    {
      label: "CO₂ Avoided",
      value: formatTonnes(co2Avoided),
      change: `peak ${formatCompactEnergy(peakProduction)}`,
      tone: "neutral" as const,
    },
  ];

  const overviewMetrics: OverviewMetric[] = [
    {
      label: "Estimated Loss Today",
      value: formatRM(totals.lostToday),
      helper: "Avoidable revenue loss from blocks under target output.",
      icon: "money",
      tone: "loss",
    },
    {
      label: "Recoverable After Cleaning",
      value: formatRM(totals.savedIfCleaned),
      helper: "Estimated value if soiling-classified blocks are cleaned now.",
      icon: "money",
      tone: "gain",
    },
    {
      label: "Blocks Needing Cleaning",
      value: `${needsCleaningCount}`,
      unit: `/ ${panels.length}`,
      helper: "Dust-classified blocks below the operating threshold.",
      icon: "active",
      tone: needsCleaningCount > 0 ? "warning" : "gain",
    },
    {
      label: "Current Farm Output",
      value: formatKw(currentFarmOutput),
      unit: "kW",
      helper: `Live output against ${formatKw(expectedFarmOutput)} kW block capacity.`,
      icon: "power",
      tone: "default",
    },
    {
      label: "Weather-Adjusted Efficiency",
      value: `${weatherAdjustedEfficiency}`,
      unit: "%",
      helper: "Actual production compared with expected output for current conditions.",
      icon: "rate",
      tone: weatherAdjustedEfficiency >= 90 ? "gain" : weatherAdjustedEfficiency >= 75 ? "warning" : "loss",
    },
    {
      label: "Solar Irradiation",
      value: sensorSample.irradiance.toFixed(1),
      unit: "kWh/m²",
      helper: `Module temp ${sensorSample.panelTemp} °C, wind ${sensorSample.wind} m/s.`,
      icon: "weather",
      tone: "default",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-5">
        <h1 className="text-2xl font-semibold leading-8 tracking-normal text-[#181d27]">Operations Overview</h1>
        <div className="flex h-11 items-center gap-1.5 rounded-xl border border-[#e9eaeb] bg-[#fafafa] px-4 py-2.5">
          <svg className="size-5 text-[#181d27]" fill="none" viewBox="0 0 20 20">
            <path d="M10 2.5v2m0 11v2m7.5-7.5h-2m-11 0h-2m12.8-5.3-1.42 1.42M6.12 13.88 4.7 15.3m10.6 0-1.42-1.42M6.12 6.12 4.7 4.7M13.25 10a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
          <span className="text-sm font-semibold text-[#181d27]">35 °C</span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {overviewMetrics.map((metric) => (
          <MetricItem key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="rounded-xl border border-[#e9eaeb] bg-[#fdfdfd] p-5 shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e9eaeb] pb-5">
          <div>
            <h2 className="text-lg font-semibold leading-7 text-[#181d27]">Farm Production Trend</h2>
            <p className="mt-1 text-sm font-medium leading-5 text-[#535862]">
              7-day actual production compared with the weather-adjusted target.
            </p>
          </div>
          <button
            type="button"
            aria-label="More options"
            className="rounded-md p-1 text-[#717680] transition hover:bg-[#fafafa] hover:text-[#181d27]"
          >
            ⋮
          </button>
        </div>

        <div className="grid gap-4 py-6 lg:grid-cols-4">
          {chartStats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <p className="text-sm font-medium leading-5 text-[#535862]">{stat.label}</p>
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-[30px] font-semibold leading-[38px] text-[#181d27]">{stat.value}</p>
                <div className="pb-1.5">
                  <ChangeBadge tone={stat.tone} value={stat.change} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-px bg-[#e9eaeb]" />

        <div className="h-[280px] pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={productionData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="overviewEnergyFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#12b76a" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#12b76a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eef0f2" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#535862", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e9eaeb",
                  borderRadius: 12,
                  boxShadow: "0 8px 20px rgba(10,13,18,0.08)",
                }}
                formatter={(value, name) => {
                  const numeric = typeof value === "number" ? value : Number(value);
                  const label = name === "actual" ? "Actual" : "Expected";
                  return [Number.isFinite(numeric) ? formatCompactEnergy(numeric) : "-", label];
                }}
              />
              <Line
                type="monotone"
                dataKey="expected"
                stroke="#94a3b8"
                strokeDasharray="6 5"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#12b76a"
                strokeWidth={2}
                fill="url(#overviewEnergyFill)"
                dot={false}
                activeDot={{ r: 4, fill: "#12b76a", stroke: "white", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <ModelPerformanceCard data={classifierData} source={classifierSource} retro={classifierRetro} />
      </section>
    </div>
  );
}
