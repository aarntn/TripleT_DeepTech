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

import {
  formatCompactEnergy,
  formatRM,
  marketProfiles,
  type MarketKey,
  type MarketProfile,
  type RoiResult,
} from "../utils/solarCalculations";
import { DataSource } from "../hooks/useSolarGuardData";

const chartGrid = "#e2e8f0";
const tick = "#64748b";

type ROICalculatorProps = {
  farmMw: number;
  marketKey: MarketKey;
  tariff: number;
  systemCost: number;
  hormuzShock: boolean;
  market: MarketProfile;
  effectiveTariff: number;
  roi: RoiResult;
  onFarmMwChange: (value: number) => void;
  onMarketKeyChange: (value: MarketKey) => void;
  onTariffChange: (value: number) => void;
  onSystemCostChange: (value: number) => void;
  onHormuzShockChange: (value: boolean) => void;
  dataSource: DataSource;
};

export function ROICalculator({
  farmMw,
  marketKey,
  tariff,
  systemCost,
  hormuzShock,
  market,
  effectiveTariff,
  roi,
  onFarmMwChange,
  onMarketKeyChange,
  onTariffChange,
  onSystemCostChange,
  onHormuzShockChange,
  dataSource,
}: ROICalculatorProps) {
  const isBackend = dataSource === "backend";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            Commercial intelligence + IP integration
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Investment payback summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            UM Auto Cleaner PI 2024000995 + Water Harvester UI 2023002890
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold shadow-sm ${
          isBackend ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
        }`}>
          {isBackend ? "Backend model" : "Frontend mock"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Farm size</span>
            <span className="text-lg font-semibold text-slate-950">{farmMw} MW</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={farmMw}
            onChange={(event) => onFarmMwChange(Number(event.target.value))}
            className="mt-4 w-full accent-emerald-600"
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <span className="text-xs font-semibold text-slate-500">Target market</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.values(marketProfiles).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onMarketKeyChange(item.id)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  marketKey === item.id
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm leading-5 text-slate-500">{market.note}</p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Energy tariff</span>
            <span className="text-lg font-semibold text-slate-950">RM {tariff.toFixed(2)}/kWh</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={0.7}
            step={0.01}
            value={tariff}
            onChange={(event) => onTariffChange(Number(event.target.value))}
            className="mt-4 w-full accent-emerald-600"
          />
        </div>

        <div className={`rounded-lg p-4 ${isBackend ? "bg-slate-100 opacity-80" : "bg-slate-50"}`}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-500">Cleaning system cost</span>
            <span className="text-lg font-semibold text-slate-950">{formatRM(systemCost)}</span>
          </div>
          {isBackend ? (
            <p className="mt-4 text-xs font-medium text-slate-500 italic">
              * Calculated by backend ROI profile based on farm capacity (MW).
            </p>
          ) : (
            <input
              type="range"
              min={120_000}
              max={1_200_000}
              step={20_000}
              value={systemCost}
              onChange={(event) => onSystemCostChange(Number(event.target.value))}
              className="mt-4 w-full accent-emerald-600"
            />
          )}
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-500">Tariff sensitivity</span>
              <p className="mt-2 text-sm text-slate-500">Models recovered revenue with a 25% tariff increase.</p>
            </div>
            <button
              type="button"
              onClick={() => onHormuzShockChange(!hormuzShock)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                hormuzShock ? "bg-rose-500" : "bg-slate-300"
              }`}
              aria-label="Toggle tariff sensitivity scenario"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  hormuzShock ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
          <p className={`mt-2 text-sm font-semibold ${hormuzShock ? "text-rose-600" : "text-slate-500"}`}>
            {hormuzShock ? `Active: RM ${effectiveTariff.toFixed(2)}/kWh effective tariff` : "Inactive"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-600">Annual revenue recovered</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{formatRM(roi.annualSavings)}</p>
          <p className="mt-1 text-sm text-emerald-700">{formatCompactEnergy(roi.annualKwhRecovered)}/yr restored</p>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-xs font-semibold text-indigo-600">Payback period</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-700">
            {Number.isFinite(roi.payback) ? `${roi.payback.toFixed(1)} years` : "N/A"}
          </p>
          <p className="mt-1 text-sm text-indigo-700">Within target range</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">NPV project life</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatRM(roi.npv)}</p>
          <p className="mt-1 text-sm text-slate-500">After system cost and O&M</p>
        </div>
        <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
          <p className="text-xs font-semibold text-cyan-600">Carbon credits</p>
          <p className="mt-2 text-2xl font-semibold text-cyan-700">{formatRM(roi.annualCarbon)}/yr</p>
          <p className="mt-1 text-sm text-cyan-700">@ RM 40/tCO₂e</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Panel block efficiency over 12 months (%)</p>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={roi.monthly}>
                <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: tick }} />
                <YAxis domain={[55, 100]} tick={{ fontSize: 12, fill: tick }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="effWith"
                  name="With cleaning"
                  stroke="#059669"
                  fill="#10b981"
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="effWithout"
                  name="Without cleaning"
                  stroke="#e11d48"
                  fill="#fb7185"
                  fillOpacity={0.1}
                  strokeDasharray="5 4"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Recovered revenue vs system cost (RM '000)</p>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roi.cumulative}>
                <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: tick }} />
                <YAxis tick={{ fontSize: 12, fill: tick }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} formatter={(value) => `RM ${value}K`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="systemCostK" name="System cost" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cumSavingsK" name="Cumulative savings" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-700">
              IP integration - water loop synergy
            </p>
            <p className="mt-3 text-sm text-emerald-900">Cleaning water supplied by Water Harvester UI 2023002890</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-2 flex-1 rounded-full bg-emerald-200">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${roi.waterSelfSupply * 100}%` }} />
              </div>
              <span className="w-12 text-right text-lg font-semibold text-emerald-800">
                {Math.round(roi.waterSelfSupply * 100)}%
              </span>
            </div>
            <p className="mt-3 text-sm text-emerald-700">{market.waterNote}</p>
          </div>
          <div className="rounded-lg bg-white/80 px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Water saved</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{roi.waterSaved.toLocaleString("en-MY")} L</p>
            <p className="text-sm text-slate-500">per month</p>
          </div>
        </div>
      </div>

      <p className="mt-5 rounded-lg bg-slate-950 p-4 text-base font-semibold leading-7 text-white">{roi.pitch}</p>
    </section>
  );
}
