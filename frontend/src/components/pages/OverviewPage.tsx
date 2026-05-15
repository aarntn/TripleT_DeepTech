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

import { formatCompactEnergy, formatRM, type RuntimePanel } from "../../utils/solarCalculations";

type OverviewPageProps = {
  totals: {
    lostToday: number;
    lostThisWeek: number;
    savedIfCleaned: number;
  };
  panels: RuntimePanel[];
};

const metrics = [
  { label: "Site Consumption", value: "140,25", unit: "kWh", icon: "plug" },
  { label: "Self-Supply Rate", value: "76", unit: "%", icon: "rate" },
  { label: "Forecast Irradiance", value: "5.2", unit: "kWh/m²", icon: "power" },
];

const gridEmissionFactorTonnesPerKwh = 0.000585;

const formatDeltaPercent = (actual: number, expected: number) => {
  if (!expected) return "0%";
  const delta = ((actual - expected) / expected) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
};

const formatTonnes = (value: number) => `${value.toFixed(value >= 10 ? 0 : 1)} t`;

function OverviewIcon({ type }: { type: string }) {
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

function MetricItem({ metric }: { metric: (typeof metrics)[number] }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#e9eaeb] bg-[#fdfdfd] shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
      <div className="flex items-center gap-2.5 px-5 py-3">
        <span className="text-[#181d27]">
          <OverviewIcon type={metric.icon} />
        </span>
        <p className="text-sm font-medium leading-5 text-[#181d27]">{metric.label}</p>
      </div>
      <div className="rounded-xl border border-[#e9eaeb] bg-white p-5 shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
        <p className="flex items-end gap-2 font-semibold tracking-normal text-[#181d27]">
          <span className="text-[30px] leading-[38px]">{metric.value}</span>
          <span className="pb-1 text-sm font-medium text-[#535862]">{metric.unit}</span>
        </p>
      </div>
    </article>
  );
}

function ChangeBadge({ tone, value }: { tone: string; value: string }) {
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

function OperationalMetric({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "loss" | "gain";
}) {
  const valueClass = tone === "loss" ? "text-[#b42318]" : "text-[#067647]";

  return (
    <article className="overflow-hidden rounded-xl border border-[#e9eaeb] bg-[#fdfdfd] shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
      <div className="px-5 py-3">
        <p className="text-sm font-semibold leading-5 text-[#181d27]">{label}</p>
      </div>
      <div className="rounded-xl border border-[#e9eaeb] bg-white p-5 shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
        <p className={`text-[30px] font-semibold leading-[38px] tracking-normal ${valueClass}`}>{value}</p>
        <p className="mt-2 text-sm font-medium leading-5 text-[#535862]">{helper}</p>
      </div>
    </article>
  );
}

export function OverviewPage({ totals, panels }: OverviewPageProps) {
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

  const chartStats = [
    {
      label: "Generated Latest Day",
      value: formatCompactEnergy(latestProduction.actual),
      change: formatDeltaPercent(latestProduction.actual, latestProduction.expected),
      tone: latestProduction.actual >= latestProduction.expected ? "up" : "down",
    },
    {
      label: "Expected Latest Day",
      value: formatCompactEnergy(latestProduction.expected),
      change: "target",
      tone: "up",
    },
    {
      label: "Gap to Target",
      value: formatCompactEnergy(productionGap),
      change: formatDeltaPercent(latestProduction.actual, latestProduction.expected),
      tone: productionGap >= 0 ? "up" : "down",
    },
    {
      label: "CO₂ Avoided",
      value: formatTonnes(co2Avoided),
      change: `peak ${formatCompactEnergy(peakProduction)}`,
      tone: "up",
    },
  ];

  const operationalMetrics = [
    {
      label: "Estimated Loss Today",
      value: formatRM(totals.lostToday),
      helper: "Live avoidable loss from underperforming panel blocks.",
      tone: "loss" as const,
    },
    {
      label: "Estimated Loss This Week",
      value: formatRM(totals.lostThisWeek),
      helper: "Weekly revenue leakage from weather-adjusted production gaps.",
      tone: "loss" as const,
    },
    {
      label: "Recoverable After Cleaning",
      value: formatRM(totals.savedIfCleaned),
      helper: "Estimated value if soiling-classified blocks are cleaned now.",
      tone: "gain" as const,
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
        {operationalMetrics.map((metric) => (
          <OperationalMetric key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {metrics.map((metric) => (
          <MetricItem key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="rounded-xl border border-[#e9eaeb] bg-[#fdfdfd] p-5 shadow-[0_1px_2px_rgba(10,13,18,0.05)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e9eaeb] pb-5">
          <h2 className="text-lg font-semibold leading-7 text-[#181d27]">Energy Production Today</h2>
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
    </div>
  );
}
