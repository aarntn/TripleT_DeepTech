import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getPanelStatus, sensorSamples } from "../../data/mockSolarData";
import { formatRM, type RuntimePanel } from "../../utils/solarCalculations";

type PanelDetailPageProps = {
  panel: RuntimePanel;
  sensorTick: number;
  onBack: () => void;
};

const panelSpecs = {
  capacity: "545 Wp per module",
  brand: "LONGi Hi-MO 5",
  installed: "18 Mar 2024",
  orientation: "182° south",
  tilt: "12° fixed tilt",
};

const statusStyles = {
  Active: "border-emerald-300 bg-emerald-50 text-emerald-700",
  Fault: "border-amber-300 bg-amber-50 text-amber-700",
  Offline: "border-rose-300 bg-rose-50 text-rose-700",
};

const alertStyles = {
  info: "border-sky-200 bg-sky-50 text-sky-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

export function PanelDetailPage({ panel, sensorTick, onBack }: PanelDetailPageProps) {
  const sample = sensorSamples[sensorTick % sensorSamples.length];
  const sensor = panel.backendSensor;
  const sensorHistory = panel.sensorHistory ?? [];
  const status = panel.efficiency < 20 ? "Offline" : panel.efficiency < 55 ? "Fault" : "Active";
  const currentPower = Math.max(0, Math.round(sensor?.actual_output_kwh ?? panel.efficiency * 6.8));
  const todayEnergy = Math.round(panel.timeline[panel.timeline.length - 1]?.actual ?? 0);
  const ambientTemperature = Math.round(sensor?.temp_c ?? sample.panelTemp - 9);
  const weatherRows = panel.weatherRows ?? [];
  const weatherCondition =
    weatherRows.length === 0
      ? "Weather unavailable"
      : (sensor?.rainfall_mm ?? 0) > 0
        ? "Rain"
        : (sensor?.cloud_cover_pct ?? 0) > 60
          ? "Cloudy"
          : "Clear";
  const batteryLevel = Math.max(34, Math.min(96, Math.round(panel.efficiency - 8)));
  const performanceRatio = Math.max(0.54, Math.min(0.96, panel.efficiency / 100 - 0.03));
  const co2Offset = Math.round(todayEnergy * 0.000585 * 1000);
  const estimatedSavings = Math.round(todayEnergy * 0.42);
  const statusLabel = getPanelStatus(panel.efficiency);
  const performanceLabel =
    statusLabel === "Clean" ? "Normal" : statusLabel === "Dust suspected" ? "Soiling suspected" : "High loss";
  const lastUpdated = sensor
    ? new Date(sensor.timestamp).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })
    : "Demo sensor sample";
  const outputUnit = sensor ? "kWh" : "kW";
  const irradianceWatts = Math.round((sensor?.irradiance_kwh_m2 ?? sample.irradiance) * (sensor ? 1000 : 185));
  const latestHistoryDate = sensor?.timestamp.slice(0, 10);
  const latestHistoryRows = latestHistoryDate
    ? sensorHistory.filter((row) => row.timestamp.startsWith(latestHistoryDate))
    : [];

  const hourlyData = latestHistoryRows.length
    ? latestHistoryRows.map((row) => ({
        hour: new Date(row.timestamp).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }),
        actual: Math.round(row.actual_output_kwh),
        expected: Math.round(row.expected_output_kwh),
      }))
    : [
        { hour: "06:00", actual: 8, expected: 10 },
        { hour: "08:00", actual: Math.round(currentPower * 0.24), expected: Math.round(currentPower * 0.32) },
        { hour: "10:00", actual: Math.round(currentPower * 0.62), expected: Math.round(currentPower * 0.78) },
        { hour: "12:00", actual: Math.round(currentPower * 0.88), expected: Math.round(currentPower * 1.04) },
        { hour: "14:00", actual: currentPower, expected: Math.round(currentPower * 1.12) },
        { hour: "16:00", actual: Math.round(currentPower * 0.64), expected: Math.round(currentPower * 0.82) },
        { hour: "18:00", actual: Math.round(currentPower * 0.18), expected: Math.round(currentPower * 0.24) },
      ];

  const monthlyComparison = [
    { month: "Last month", energy: Math.round(todayEnergy * 27.4) },
    { month: "This month", energy: Math.round(todayEnergy * 30.2) },
  ];

  const alerts = [
    {
      severity: panel.classifier.type === "Dust" ? "warning" : "info",
      title: panel.classifier.type === "Dust" ? "Soiling trend detected" : "Output within expected range",
      time: "13:10",
    },
    {
      severity: panel.efficiency < 60 ? "critical" : "info",
      title: panel.efficiency < 60 ? "Efficiency below 60% threshold" : "Inverter telemetry normal",
      time: "12:42",
    },
    {
      severity: "info",
      title: weatherRows.length === 0 ? "Weather source unavailable" : "Weather source: demo CSV",
      time: "12:00",
    },
  ] as const;

  return (
    <div className="space-y-5 rounded-[22px] bg-[#f8faf7] p-4 text-slate-950 shadow-sm ring-1 ring-emerald-100 lg:p-5">
      <header className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="relative p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-lime-300 to-yellow-300" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                type="button"
                onClick={onBack}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Back to panel block monitoring
              </button>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{panel.name}</h1>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  ID {panel.id}-PV-04
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                  {status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Farm A, Selangor, Malaysia · Panel Block {panel.id}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Last updated</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{lastUpdated}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">{performanceLabel}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          ["Latest Output", `${currentPower.toLocaleString("en-MY")} ${outputUnit}`, sensor ? "Backend demo sensor row" : "Estimated AC output", "from-emerald-400/20 to-lime-300/20"],
          ["Today's Energy", `${todayEnergy.toLocaleString("en-MY")} kWh`, "Generated since sunrise", "from-yellow-300/25 to-emerald-300/15"],
          ["Panel Temperature", `${Math.round(sensor?.temp_c ?? sample.panelTemp)}°C`, "Module surface", "from-orange-300/25 to-yellow-300/15"],
          ["Efficiency", `${panel.efficiency}%`, "Compared with expected output", "from-lime-300/25 to-emerald-400/15"],
        ].map(([label, value, helper, gradient]) => (
          <article key={label} className={`rounded-2xl border border-white bg-gradient-to-br ${gradient} p-5 shadow-sm ring-1 ring-slate-200/70`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Production trend</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Hourly power output today</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              Actual vs expected
            </span>
          </div>
          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 16, right: 18, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="energyGlow" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#eab308" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#dbeafe" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="expected"
                  name="Expected output"
                  stroke="#94a3b8"
                  strokeDasharray="6 5"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Actual output"
                  stroke="#16a34a"
                  fill="url(#energyGlow)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#16a34a" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Environmental conditions</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-yellow-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Irradiance</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{irradianceWatts} W/m²</p>
              </div>
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Ambient temp</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{ambientTemperature}°C</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Weather condition</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{weatherCondition}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">System status</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Inverter status</span>
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Online</span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Battery level</span>
                  <span className="font-semibold text-slate-950">{batteryLevel}%</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-lime-300" style={{ width: `${batteryLevel}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Grid flow</span>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">Exporting</span>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Performance summary</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#dbeafe" }} />
                  <Bar dataKey="energy" name="Energy kWh" fill="#84cc16" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">CO₂ offset</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{co2Offset} kg</p>
              </div>
              <div className="rounded-xl bg-lime-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-lime-700">Estimated savings</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{formatRM(estimatedSavings)}</p>
              </div>
              <div className="rounded-xl bg-yellow-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Performance ratio</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{performanceRatio.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alerts</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide">classifier</p>
                    <p className="mt-1 font-semibold">
                      {panel.classifier.type} signal, {Math.round(panel.classifier.confidence)}% confidence
                    </p>
                    <p className="mt-1 text-sm">{panel.classifier.cause}</p>
                  </div>
                </div>
              </div>
              {alerts.map((alert) => (
                <div key={`${alert.title}-${alert.time}`} className={`rounded-xl border px-4 py-3 ${alertStyles[alert.severity]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide">{alert.severity}</p>
                      <p className="mt-1 font-semibold">{alert.title}</p>
                    </div>
                    <span className="text-xs font-semibold">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">PV module specs</p>
            <dl className="mt-4 grid gap-3 text-sm">
              {[
                ["Capacity", panelSpecs.capacity],
                ["Brand", panelSpecs.brand],
                ["Installation date", panelSpecs.installed],
                ["Orientation", panelSpecs.orientation],
                ["Tilt angle", panelSpecs.tilt],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-semibold text-slate-950">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </section>
    </div>
  );
}
