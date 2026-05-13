import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HORMUZ, LOCATIONS } from "../constants/marketData";
import {
  buildCumulativeData,
  computeMetrics,
  generateMonthlyData,
} from "../utils/roiCalculations";
import { fmtKwh, fmtPayback, fmtRM } from "../utils/formatters";

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-lg bg-stone-100 p-3 dark:bg-neutral-800 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
      {children}
    </p>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <Card>
      <Label>{label}</Label>
      <p className="my-1 text-base font-medium text-neutral-950 dark:text-neutral-100">
        {value}
      </p>
      <p className="text-[11px] text-neutral-500">{sub}</p>
    </Card>
  );
}

export default function Dashboard() {
  const [mw, setMw] = useState(5);
  const [locKey, setLocKey] = useState("malaysia");
  const [tariff, setTariff] = useState(LOCATIONS.malaysia.baseTariff);
  const [hormuz, setHormuz] = useState(false);

  const location = LOCATIONS[locKey];
  const effectiveTariff = hormuz ? tariff * HORMUZ.tariffMultiplier : tariff;

  const monthly = useMemo(
    () => generateMonthlyData(location, mw, effectiveTariff),
    [location, mw, effectiveTariff],
  );
  const metrics = useMemo(() => computeMetrics(monthly, mw), [monthly, mw]);
  const cumulative = useMemo(() => buildCumulativeData(metrics), [metrics]);
  const payback = fmtPayback(metrics.payback);

  const green = "#1D9E75";
  const coral = "#D85A30";
  const grid = "rgba(128,128,128,0.14)";
  const tick = "#737373";

  function handleLocChange(key) {
    setLocKey(key);
    setTariff(LOCATIONS[key].baseTariff);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 font-sans">
      <header>
        <h1 className="text-xl font-semibold text-neutral-950 dark:text-neutral-100">
          Solar O&M Profit Dashboard
        </h1>
        <p className="text-xs text-neutral-500">
          UM IP: PI 2024000995 (Auto Cleaner) + UI 2023002890 (Water Harvester) - 2026
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <Label>Farm size</Label>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={mw}
            onChange={(event) => setMw(Number(event.target.value))}
            className="mt-1 w-full accent-emerald-700"
          />
          <p className="mt-2 text-base font-medium text-neutral-950 dark:text-neutral-100">
            {mw} MW
          </p>
        </Card>

        <Card>
          <Label>Target market</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {Object.values(LOCATIONS).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleLocChange(item.id)}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  locKey === item.id
                    ? "border-neutral-500 bg-white text-neutral-950 dark:bg-neutral-700 dark:text-neutral-100"
                    : "border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">{location.note}</p>
        </Card>

        <Card>
          <Label>Energy tariff (RM/kWh)</Label>
          <input
            type="range"
            min={0.2}
            max={0.7}
            step={0.01}
            value={tariff}
            onChange={(event) => setTariff(Number(event.target.value))}
            className="mt-1 w-full accent-emerald-700"
          />
          <p className="mt-2 text-base font-medium text-neutral-950 dark:text-neutral-100">
            RM {tariff.toFixed(2)}/kWh
          </p>
        </Card>

        <Card>
          <Label>Hormuz scenario</Label>
          <button
            type="button"
            onClick={() => setHormuz((value) => !value)}
            className="mt-2 flex items-center gap-2"
          >
            <span
              className={`relative h-5 w-9 rounded-full transition-colors ${
                hormuz ? "bg-red-500" : "bg-neutral-300 dark:bg-neutral-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  hormuz ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
            <span className={`text-xs ${hormuz ? "text-red-700" : "text-neutral-600"}`}>
              {hormuz ? "+25% tariff spike active" : "Apply +25% tariff shock"}
            </span>
          </button>
          <p className="mt-1 text-[10px] text-neutral-500">
            Malaysia crude import exposure and Hormuz risk sensitivity case.
          </p>
        </Card>
      </section>

      {hormuz && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <strong>Hormuz scenario active.</strong> {HORMUZ.sourceNote} Updated annual revenue
          recovery: <strong>{fmtRM(metrics.annualRevenue)}</strong>
        </section>
      )}

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Annual revenue recovered"
          value={fmtRM(metrics.annualRevenue)}
          sub={`${fmtKwh(metrics.annualKwhRecovered)}/yr restored`}
        />
        <MetricCard label="Payback period" value={payback.display} sub={payback.label} />
        <MetricCard
          label="NPV (project life)"
          value={fmtRM(metrics.npv)}
          sub="After system cost and O&M"
        />
        <MetricCard
          label="Carbon credits"
          value={`${fmtRM(metrics.annualCarbon)}/yr`}
          sub="@ RM 40/tonne"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-3 text-xs font-medium text-neutral-600">
            Panel efficiency over 12 months (%)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly}>
              <CartesianGrid stroke={grid} strokeWidth={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: tick }} />
              <YAxis domain={[55, 100]} tick={{ fontSize: 10, fill: tick }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="effWith"
                name="With cleaning"
                stroke={green}
                fill={green}
                fillOpacity={0.12}
                strokeWidth={1.8}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="effWithout"
                name="Without cleaning"
                stroke={coral}
                fill={coral}
                fillOpacity={0.08}
                strokeDasharray="4 3"
                strokeWidth={1.8}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-3 text-xs font-medium text-neutral-600">
            Cumulative savings vs system cost (RM '000)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cumulative}>
              <CartesianGrid stroke={grid} strokeWidth={0.5} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: tick }} />
              <YAxis tick={{ fontSize: 10, fill: tick }} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value) => `RM ${value}K`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="systemCostK"
                name="System cost (RM K)"
                fill={coral}
                fillOpacity={0.5}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="cumSavingsK"
                name="Cumulative savings (RM K)"
                fill={green}
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <Card>
        <Label>IP integration - water loop synergy</Label>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-1">
            <div className="mb-1 flex justify-between gap-3">
              <span className="text-xs text-neutral-600">
                Cleaning water supplied by Water Harvester (UI 2023002890)
              </span>
              <span className="text-sm font-medium text-neutral-950 dark:text-neutral-100">
                {Math.round(location.waterSelfSupply * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${location.waterSelfSupply * 100}%`, background: green }}
              />
            </div>
            <p className="mt-2 text-[11px] text-neutral-500">{location.waterNote}</p>
          </div>
          <div className="shrink-0 rounded-lg bg-stone-200 px-4 py-3 text-center dark:bg-neutral-700">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Water saved</p>
            <p className="mt-0.5 text-base font-medium text-neutral-950 dark:text-neutral-100">
              {(mw * location.waterSavedPerMwMonth).toLocaleString()} L
            </p>
            <p className="text-[10px] text-neutral-500">per month</p>
          </div>
        </div>
      </Card>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <p className="mb-3 text-xs font-medium text-neutral-600">
          Monthly dataset - {mw} MW, {location.label}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-700">
                {[
                  "Month",
                  "Eff. w/ cleaning",
                  "Eff. w/o cleaning",
                  "Revenue recovered",
                  "kWh recovered",
                  "Carbon credit",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-neutral-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthly.map((row) => (
                <tr key={row.month} className="border-b border-neutral-50 dark:border-neutral-800">
                  <td className="px-2 py-1.5 text-neutral-500">{row.month}</td>
                  <td className="px-2 py-1.5 font-medium" style={{ color: green }}>
                    {row.effWith}%
                  </td>
                  <td className="px-2 py-1.5" style={{ color: coral }}>
                    {row.effWithout}%
                  </td>
                  <td className="px-2 py-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                    RM {row.rmRecovered.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-neutral-600">
                    {row.kwhRecovered.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-neutral-600">
                    RM {row.carbonValue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
