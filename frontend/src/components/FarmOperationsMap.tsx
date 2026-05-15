import { getPanelStatus, sensorSamples, type PanelId } from "../data/mockSolarData";
import { formatRM, type RuntimePanel } from "../utils/solarCalculations";

type FarmOperationsMapProps = {
  panels: RuntimePanel[];
  selectedPanel: RuntimePanel;
  sensorTick: number;
  recommendation: {
    title: string;
    action: string;
    impact: string;
    tone: string;
  };
  onSelect: (id: string) => void;
  onClean: (id: string) => void;
};

const panelShapes: Record<PanelId, { points: string; labelX: number; labelY: number }> = {
  A1: { points: "96,122 258,94 294,226 122,262", labelX: 190, labelY: 182 },
  A2: { points: "286,88 452,116 422,252 306,226", labelX: 365, labelY: 176 },
  B1: { points: "116,286 296,250 326,404 142,424", labelX: 224, labelY: 346 },
  B2: { points: "328,256 484,292 458,438 352,408", labelX: 410, labelY: 350 },
  C1: { points: "504,116 664,86 700,222 536,264", labelX: 610, labelY: 176 },
  C2: { points: "540,286 720,242 746,406 568,442", labelX: 644, labelY: 354 },
};

const statusFill = {
  Clean: "rgba(16, 185, 129, 0.62)",
  "Dust suspected": "rgba(245, 158, 11, 0.68)",
  "Heavy loss": "rgba(225, 29, 72, 0.72)",
};

const statusText = {
  Clean: "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Dust suspected": "text-amber-700 bg-amber-50 border-amber-200",
  "Heavy loss": "text-rose-700 bg-rose-50 border-rose-200",
};

export function FarmOperationsMap({
  panels,
  selectedPanel,
  sensorTick,
  recommendation,
  onSelect,
  onClean,
}: FarmOperationsMapProps) {
  const sample = sensorSamples[sensorTick % sensorSamples.length];
  const selectedStatus = getPanelStatus(selectedPanel.efficiency);
  const cleanable = selectedPanel.classifier.type === "Dust" && selectedStatus !== "Clean";
  const activePanels = panels.filter((panel) => panel.efficiency > 0).length;
  const selectedShape = panelShapes[selectedPanel.id];
  const rainProbability = sensorTick < 2 ? 5 : 12;
  const cloudCover = sensorTick < 2 ? 18 : 26;
  const forecastIrradiance = sample.irradiance - 0.1;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid min-h-[640px] xl:grid-cols-[360px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 p-5 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
            >
              Farm A
            </button>
            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700">
              {activePanels} arrays active
            </span>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">LSS Farm A</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">Panel Block Monitoring</h2>
                <p className="mt-1 text-sm text-slate-500">Selangor, Malaysia</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-950">6.0 MW</p>
                <p className="text-sm font-semibold text-emerald-600">O&M ready</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Irradiance</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{sample.irradiance.toFixed(1)}</p>
              <p className="text-xs text-slate-500">kWh/m2</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Panel temp</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{sample.panelTemp}C</p>
              <p className="text-xs text-slate-500">module surface</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Humidity</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{sample.humidity}%</p>
              <p className="text-xs text-slate-500">ambient</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wind</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{sample.wind} m/s</p>
              <p className="text-xs text-slate-500">cleaning window</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-950">Weather forecast input</p>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">Auto</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rain probability</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{rainProbability}%</p>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cloud cover</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{cloudCover}%</p>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Forecast irradiance</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{forecastIrradiance.toFixed(1)}</p>
              </div>
              <div className="rounded-md bg-emerald-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Cleaning window</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">Good</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
              {["Now", "+1", "+2", "+3", "+4"].map((day, index) => (
                <div key={day} className="rounded-md bg-slate-50 px-2 py-3">
                  <p className="font-bold text-slate-700">{day}</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">{index < 2 ? "5%" : "12%"}</p>
                  <p className="text-slate-500">rain</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Forecast shows stable irradiance and low rain probability, so sustained output drops are treated as a
              cleaning-priority signal.
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-950">AI dispatch model</p>
              <span className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white">AI</span>
            </div>
            <div className="mt-4 flex h-10 items-center gap-1">
              {Array.from({ length: 38 }, (_, index) => (
                <span
                  key={index}
                  className={`h-full flex-1 rounded-sm ${
                    index < 10 ? "bg-rose-400" : index < 24 ? "bg-amber-300" : "bg-emerald-400"
                  }`}
                />
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">{recommendation.impact}</p>
          </div>
        </aside>

        <div className="relative min-h-[640px] overflow-hidden bg-slate-900">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(28deg, rgba(120, 113, 84, 0.28) 0 16%, transparent 16% 20%, rgba(22, 101, 52, 0.52) 20% 52%, transparent 52% 55%, rgba(101, 163, 13, 0.42) 55% 75%, rgba(180, 83, 9, 0.35) 75% 100%), linear-gradient(108deg, transparent 0 44%, rgba(241,245,249,0.42) 44% 45%, transparent 45% 100%), radial-gradient(circle at 80% 18%, rgba(226,232,240,0.65), transparent 10%), radial-gradient(circle at 28% 74%, rgba(34,197,94,0.42), transparent 18%)",
              backgroundColor: "#31533f",
            }}
          />
          <div className="absolute left-8 right-8 top-6 z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="rounded-lg bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search monitored block</p>
              <p className="mt-1 text-sm font-bold text-slate-950">Type A1, B2, inverter ID, or work order</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300"
                type="button"
                disabled={!cleanable}
                onClick={() => {
                  if (cleanable) onClean(selectedPanel.id);
                }}
              >
                Create work order
              </button>
              <button className="rounded-md bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-lg" type="button">
                Export
              </button>
            </div>
          </div>

          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 820 540" role="img" aria-label="Solar farm map">
            <defs>
              <pattern id="panelDots" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="rgba(255,255,255,0.55)" />
              </pattern>
            </defs>
            <path d="M0 118 C180 96 256 160 410 136 C570 112 650 46 820 70" stroke="rgba(255,255,255,0.58)" strokeWidth="9" fill="none" />
            <path d="M64 540 C128 420 130 330 246 230 C362 132 492 118 668 0" stroke="rgba(255,255,255,0.42)" strokeWidth="7" fill="none" />
            {panels.map((panel) => {
              const shape = panelShapes[panel.id];
              const status = getPanelStatus(panel.efficiency);
              const active = panel.id === selectedPanel.id;
              return (
                <g key={panel.id} className="cursor-pointer" onClick={() => onSelect(panel.id)}>
                  <polygon
                    points={shape.points}
                    fill={statusFill[status]}
                    stroke={active ? "#ffffff" : "rgba(255,255,255,0.72)"}
                    strokeWidth={active ? 5 : 2}
                  />
                  <polygon points={shape.points} fill="url(#panelDots)" opacity="0.72" />
                  <text x={shape.labelX} y={shape.labelY} textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="800">
                    {panel.id}
                  </text>
                  <text x={shape.labelX} y={shape.labelY + 24} textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
                    {panel.efficiency}% efficiency
                  </text>
                </g>
              );
            })}
            <circle cx={selectedShape.labelX} cy={selectedShape.labelY - 44} r="10" fill="#ffffff" opacity="0.95" />
            <circle cx={selectedShape.labelX} cy={selectedShape.labelY - 44} r="18" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.72" />
          </svg>

          <div className="absolute bottom-6 left-6 hidden rounded-lg border border-white/20 bg-white/90 p-2 shadow-xl backdrop-blur md:block">
            <div className="h-24 w-32 rounded-md bg-[linear-gradient(35deg,#31533f_0_44%,#94a3b8_44%_46%,#65a30d_46%_72%,#92400e_72%_100%)]" />
            <p className="mt-2 text-center text-xs font-bold text-slate-600">Farm minimap</p>
          </div>

          <div className="absolute bottom-6 right-6 top-32 w-[min(360px,calc(100%-48px))] overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected array</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-950">{selectedPanel.name}</h3>
                <p className="mt-1 text-sm text-slate-500">String group #{selectedPanel.id}-PV-04</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusText[selectedStatus]}`}>
                {selectedStatus}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Efficiency</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{selectedPanel.efficiency}%</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">RM loss today</p>
                <p className="mt-1 text-2xl font-bold text-rose-700">{formatRM(selectedPanel.lossToday)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-950">Sensor read</p>
                <span className="text-xs font-bold text-emerald-600">Live</span>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Irradiance</dt>
                  <dd className="font-bold text-slate-950">{sample.irradiance.toFixed(1)} kWh/m2</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Panel temperature</dt>
                  <dd className="font-bold text-slate-950">{sample.panelTemp}C</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Humidity</dt>
                  <dd className="font-bold text-slate-950">{sample.humidity}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Classifier</dt>
                  <dd className="font-bold text-slate-950">
                    {selectedPanel.classifier.type} / {selectedPanel.classifier.confidence}%
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-950">Classifier evidence</p>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  ["Output below expected", selectedPanel.efficiency < 90 ? "Yes" : "No"],
                  ["Irradiance stable", forecastIrradiance >= 4.8 ? "Yes" : "No"],
                  ["Rain forecast low", rainProbability <= 15 ? "Yes" : "No"],
                  ["Peer arrays normal", panels.some((panel) => panel.id !== selectedPanel.id && panel.efficiency > 90) ? "Yes" : "No"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        value === "Yes" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-bold">AI</span>
                <p className="text-sm font-bold">Dispatch insight</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-100">{recommendation.action}</p>
            </div>

            {cleanable && (
              <button
                type="button"
                onClick={() => onClean(selectedPanel.id)}
                className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Schedule cleaning work order
              </button>
            )}
          </div>

          <div className="absolute bottom-6 right-6 flex flex-col gap-2 md:right-auto md:left-[calc(100%-72px)]">
            <button type="button" className="hidden h-10 w-10 rounded-md bg-slate-950/85 text-lg font-bold text-white shadow-lg md:block">
              +
            </button>
            <button type="button" className="hidden h-10 w-10 rounded-md bg-slate-950/85 text-lg font-bold text-white shadow-lg md:block">
              -
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
