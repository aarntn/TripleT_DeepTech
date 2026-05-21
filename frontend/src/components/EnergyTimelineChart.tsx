import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ScenarioId } from "../data/mockSolarData";
import { formatKwh, type RuntimePanel } from "../utils/solarCalculations";

type EnergyTimelineChartProps = {
  panel: RuntimePanel;
  scenario: ScenarioId;
};

export function EnergyTimelineChart({ panel, scenario }: EnergyTimelineChartProps) {
  const data = panel.timeline;

  const labelDay = scenario === "rainy" ? "Tue" : "Thu";
  const labelText = panel.dataSource === "backend-demo"
    ? "Backend demo CSV signal"
    : scenario === "rainy" ? "Rainy Tuesday / weather event" : "Soiling drop on Thursday";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">7-day production timeline</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{panel.name}: expected vs actual</h2>
        </div>
      </div>

      <div className="mt-5 h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 18, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              domain={["dataMin - 100", "dataMax + 100"]}
              tickFormatter={(value) => `${value}`}
              label={{ value: "kWh", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", boxShadow: "0 12px 30px rgba(15,23,42,0.1)" }}
              formatter={(value, name) => {
                if (value === null || value === undefined) return ["-", String(name)];
                const numeric = typeof value === "number" ? value : Number(value);
                return [Number.isFinite(numeric) ? formatKwh(numeric) : "-", String(name)];
              }}
              labelStyle={{ color: "#0f172a", fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine
              x={labelDay}
              stroke={scenario === "rainy" ? "#0284c7" : "#d97706"}
              strokeDasharray="3 3"
              label={{ value: labelText, fill: scenario === "rainy" ? "#0369a1" : "#b45309", fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="expected"
              name="Expected output"
              stroke="#0f172a"
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual output"
              stroke="#e11d48"
              strokeWidth={2.4}
              connectNulls={false}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
